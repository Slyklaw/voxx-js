import { WorkerPool } from './workers/workerPool.js';
import { Chunk, CHUNK_WIDTH, CHUNK_DEPTH } from './chunk.js';
import ChunkWorker from './workers/chunkWorker.js?worker';

export class World {
  constructor(noiseSeed, scene) {
    this.chunks = {}; // key: `${chunkX},${chunkZ}`
    this.noiseSeed = noiseSeed;
    this.scene = scene;
    this.pendingChunks = new Map();
    this.workerPool = new WorkerPool(
      ChunkWorker,
      4
    );
    
    // Priority loading system
    this.initialChunkLoaded = false;
    this.initialChunkPosition = null;
    this.priorityQueue = [];
    this.isInitializing = false;
    
    // AO optimization statistics
    this.aoStats = {
      chunksWithAO: 0,
      chunksWithoutAO: 0,
      chunksUpgraded: 0
    };
  }

  getChunk(chunkX, chunkZ, isPriority = false) {
    const key = `${chunkX},${chunkZ}`;
    if (!this.chunks[key]) {
      // Create placeholder chunk
      const chunk = new Chunk(chunkX, chunkZ, this);
      this.chunks[key] = chunk;
      this.pendingChunks.set(key, chunk);

      // Queue generation task with priority handling
      const taskData = { chunkX, chunkZ, noiseSeed: this.noiseSeed };
      const callback = (chunkData) => {
        if (!this.chunks[key]) return; // Chunk was unloaded before generation completed
        
        chunk.voxels = new Uint8Array(chunkData.voxels);
        chunk.isGenerated = true;
        this.pendingChunks.delete(key);
        
        // Try to create mesh with AO if neighbors are ready, otherwise create basic mesh
        this.createChunkMeshIfReady(chunk);
        
        // Mark initial chunk as loaded if this was the priority chunk
        if (isPriority && this.initialChunkPosition && 
            chunkX === this.initialChunkPosition.x && 
            chunkZ === this.initialChunkPosition.z) {
          this.initialChunkLoaded = true;
          console.log('Initial chunk loaded at:', chunkX, chunkZ);
        }
        
        // Check if any neighbors can now create their AO meshes or need mesh regeneration for face culling
        this.checkNeighborsForAO(chunkX, chunkZ);
        this.regenerateNeighborMeshesForFaceCulling(chunkX, chunkZ);
      };

      if (isPriority) {
        // Add to front of queue for priority processing
        this.workerPool.enqueuePriorityTask(taskData, callback);
      } else {
        this.workerPool.enqueueTask(taskData, callback);
      }
    }
    return this.chunks[key];
  }

  /**
   * Preload the chunk at the given camera position with high priority
   * @param {THREE.Vector3} cameraPosition - Initial camera position
   * @returns {Promise} Promise that resolves when initial chunk is loaded
   */
  async preloadInitialChunk(cameraPosition) {
    if (this.isInitializing) return;
    
    this.isInitializing = true;
    const camChunkX = Math.floor(cameraPosition.x / CHUNK_WIDTH);
    const camChunkZ = Math.floor(cameraPosition.z / CHUNK_DEPTH);
    
    this.initialChunkPosition = { x: camChunkX, z: camChunkZ };
    
    console.log('Preloading initial chunk at:', camChunkX, camChunkZ);
    
    // Load the initial chunk with high priority
    this.getChunk(camChunkX, camChunkZ, true);
    
    // Wait for initial chunk to load
    return new Promise((resolve) => {
      const checkLoaded = () => {
        if (this.initialChunkLoaded) {
          resolve();
        } else {
          setTimeout(checkLoaded, 50); // Check every 50ms
        }
      };
      checkLoaded();
    });
  }

  update(cameraPosition, renderDistance = 12) {
    // Don't update until initial chunk is loaded (unless we're not initializing)
    if (this.isInitializing && !this.initialChunkLoaded) {
      return;
    }

    // Determine current camera chunk
    const camChunkX = Math.floor(cameraPosition.x / CHUNK_WIDTH);
    const camChunkZ = Math.floor(cameraPosition.z / CHUNK_DEPTH);

    // Create a set for chunks that should be loaded
    const chunksToKeep = new Set();
    const chunksToLoad = [];

    // Collect chunks that need to be loaded and calculate distances
    for (let x = camChunkX - renderDistance; x <= camChunkX + renderDistance; x++) {
      for (let z = camChunkZ - renderDistance; z <= camChunkZ + renderDistance; z++) {
        const key = `${x},${z}`;
        chunksToKeep.add(key);
        
        if (!this.chunks[key]) {
          // Calculate distance from camera chunk for prioritization
          const dx = x - camChunkX;
          const dz = z - camChunkZ;
          const distance = Math.sqrt(dx * dx + dz * dz);
          
          chunksToLoad.push({ x, z, distance, key });
        }
      }
    }

    // Sort chunks by distance (closest first) for better loading order
    chunksToLoad.sort((a, b) => a.distance - b.distance);

    // Load chunks in order of proximity
    for (const chunkInfo of chunksToLoad) {
      this.getChunk(chunkInfo.x, chunkInfo.z);
    }

    // Unload chunks that are too far away
    for (const key in this.chunks) {
      if (!chunksToKeep.has(key)) {
        const chunk = this.chunks[key];
        
        // Cancel pending generation if exists
        if (this.pendingChunks.has(key)) {
          this.pendingChunks.delete(key);
        }
        
        this.scene.remove(chunk.mesh);
        chunk.dispose();
        delete this.chunks[key];
      }
    }
  }

  /**
   * Create a mesh for a chunk, with AO if neighbors are ready
   * @param {Chunk} chunk - The chunk to create a mesh for
   */
  createChunkMeshIfReady(chunk) {
    if (chunk.hasMesh) return; // Already has a mesh
    
    const hasAO = chunk.areNeighborsReady();
    const mesh = chunk.createMesh();
    mesh.position.set(chunk.chunkX * CHUNK_WIDTH, 0, chunk.chunkZ * CHUNK_DEPTH);
    
    // Enable shadows on chunk meshes
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    this.scene.add(mesh);
    chunk.mesh = mesh;
    
    // Update statistics
    if (hasAO) {
      this.aoStats.chunksWithAO++;
    } else {
      this.aoStats.chunksWithoutAO++;
    }
  }

  /**
   * Check if neighboring chunks can now create AO meshes
   * @param {number} chunkX - X coordinate of the newly loaded chunk
   * @param {number} chunkZ - Z coordinate of the newly loaded chunk
   */
  checkNeighborsForAO(chunkX, chunkZ) {
    // Check all 4 direct neighbors
    const neighbors = [
      [chunkX - 1, chunkZ], // West
      [chunkX + 1, chunkZ], // East
      [chunkX, chunkZ - 1], // North
      [chunkX, chunkZ + 1]  // South
    ];
    
    for (const [x, z] of neighbors) {
      const key = `${x},${z}`;
      const neighbor = this.chunks[key];
      
      // If neighbor exists, is generated, but doesn't have proper AO mesh yet
      if (neighbor && neighbor.isGenerated && neighbor.areNeighborsReady()) {
        console.log(`Upgrading chunk (${x}, ${z}) to AO mesh - neighbors now ready`);
        
        // Remove old mesh if it exists
        if (neighbor.mesh) {
          this.scene.remove(neighbor.mesh);
          neighbor.mesh.geometry.dispose();
          neighbor.mesh.material.dispose();
          neighbor.hasMesh = false;
          
          // Update statistics - remove from without AO count
          this.aoStats.chunksWithoutAO = Math.max(0, this.aoStats.chunksWithoutAO - 1);
        }
        
        // Create new mesh with proper AO
        this.createChunkMeshIfReady(neighbor);
        this.aoStats.chunksUpgraded++;
      }
    }
  }

  /**
   * Regenerate meshes for neighboring chunks to fix AO boundary seams
   * @param {number} chunkX - X coordinate of the newly loaded chunk
   * @param {number} chunkZ - Z coordinate of the newly loaded chunk
   */
  regenerateNeighborMeshes(chunkX, chunkZ) {
    // This method is now handled by checkNeighborsForAO
    // Keep for backward compatibility but delegate to the new method
    this.checkNeighborsForAO(chunkX, chunkZ);
  }

  /**
   * Regenerate meshes for neighboring chunks to improve face culling at boundaries
   * @param {number} chunkX - X coordinate of the newly loaded chunk
   * @param {number} chunkZ - Z coordinate of the newly loaded chunk
   */
  regenerateNeighborMeshesForFaceCulling(chunkX, chunkZ) {
    // Check all 4 direct neighbors
    const neighbors = [
      [chunkX - 1, chunkZ], // West
      [chunkX + 1, chunkZ], // East
      [chunkX, chunkZ - 1], // North
      [chunkX, chunkZ + 1]  // South
    ];
    
    for (const [x, z] of neighbors) {
      const key = `${x},${z}`;
      const neighbor = this.chunks[key];
      
      // If neighbor exists, is generated, and has a mesh, regenerate it for better face culling
      if (neighbor && neighbor.isGenerated && neighbor.mesh && !this.pendingChunks.has(key)) {
        console.log(`Regenerating chunk (${x}, ${z}) mesh for improved face culling`);
        
        // Remove old mesh
        this.scene.remove(neighbor.mesh);
        neighbor.mesh.geometry.dispose();
        neighbor.mesh.material.dispose();
        neighbor.hasMesh = false;
        
        // Create new mesh with improved face culling
        this.createChunkMeshIfReady(neighbor);
      }
    }
  }

  /**
   * Get voxel value at world coordinates
   * @param {number} worldX - World X coordinate
   * @param {number} worldY - World Y coordinate
   * @param {number} worldZ - World Z coordinate
   * @returns {number} Voxel value (0 = air, >0 = solid)
   */
  getVoxel(worldX, worldY, worldZ) {
    // Calculate which chunk contains this world coordinate
    const chunkX = Math.floor(worldX / CHUNK_WIDTH);
    const chunkZ = Math.floor(worldZ / CHUNK_DEPTH);
    
    // Get local coordinates within the chunk
    const localX = worldX - (chunkX * CHUNK_WIDTH);
    const localZ = worldZ - (chunkZ * CHUNK_DEPTH);
    
    // Check if the chunk exists
    const chunkKey = `${chunkX},${chunkZ}`;
    const chunk = this.chunks[chunkKey];
    
    if (!chunk || this.pendingChunks.has(chunkKey)) {
      // Chunk doesn't exist or is still loading
      // For AO calculations, we need to make a reasonable assumption
      // Treat unloaded chunks as air for now
      return 0;
    }
    
    // Use the chunk's safe voxel getter
    return chunk.getVoxelSafe(localX, worldY, localZ);
  }

  /**
   * Force AO recalculation for a specific chunk
   * @param {number} chunkX - X coordinate of the chunk
   * @param {number} chunkZ - Z coordinate of the chunk
   */
  forceChunkAORecalculation(chunkX, chunkZ) {
    const key = `${chunkX},${chunkZ}`;
    const chunk = this.chunks[key];
    
    if (chunk && chunk.isGenerated && chunk.mesh) {
      // Remove old mesh
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      chunk.mesh.material.dispose();
      chunk.hasMesh = false;
      
      // Create new mesh with forced AO calculation
      const mesh = chunk.createMesh(true); // Force AO even if neighbors aren't ready
      mesh.position.set(chunkX * CHUNK_WIDTH, 0, chunkZ * CHUNK_DEPTH);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      
      this.scene.add(mesh);
      chunk.mesh = mesh;
    }
  }

  /**
   * Get AO optimization statistics
   * @returns {Object} Statistics about AO calculations
   */
  getAOStats() {
    return {
      ...this.aoStats,
      totalChunks: this.aoStats.chunksWithAO + this.aoStats.chunksWithoutAO,
      aoPercentage: this.aoStats.chunksWithAO + this.aoStats.chunksWithoutAO > 0 ? 
        (this.aoStats.chunksWithAO / (this.aoStats.chunksWithAO + this.aoStats.chunksWithoutAO) * 100).toFixed(1) : 0
    };
  }

  dispose() {
    this.workerPool.terminate();
    for (const key in this.chunks) {
      const chunk = this.chunks[key];
      this.scene.remove(chunk.mesh);
      chunk.dispose();
    }
    this.chunks = {};
    this.pendingChunks.clear();
  }
}
