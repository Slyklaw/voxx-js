/**
 * World implementation
 */

import { Chunk } from './chunk.js';
import { CHUNK_WIDTH, CHUNK_DEPTH } from './src/constants.js';
import { createNoise2D } from 'https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js';
import { BiomeCalculator } from './biomes.js';
import { WorkerPool } from './workerPool.js';
import { DEBUG } from './config.js';

// Hot chunk retention configuration
const HOT_CHUNK_TIME_MS = 30000;  // Chunk is hot if accessed within 30 seconds
const HOT_CHUNK_MIN_ACCESS = 10;   // Chunk is hot if accessed 10+ times

export class World {
  constructor(noiseSeed, gl = null) {
    this.chunks = {};
    this.noiseSeed = noiseSeed;
    this._gl = gl; // Store GL context for proper WebGL resource disposal

    // Track pending worker jobs keyed by "x,z"
    this.pendingChunks = new Map();

    // Worker pool for chunk generation/meshing (reuse existing chunkWorker.js)
    this.pool = new WorkerPool('./chunkWorker.js');

    // Create noise functions (kept for any main-thread quick tests, not used for generation now)
    this.heightNoise = createNoise2D(() => noiseSeed);
    this.biomeNoise = createNoise2D(() => noiseSeed + 1000);
    this.biomeCalculator = new BiomeCalculator(noiseSeed);

    // Hot chunk retention: track access timestamps and counts
    this.chunkAccessMap = new Map(); // chunkKey -> { lastAccess: timestamp, accessCount: number }
  }

  getChunk(chunkX, chunkZ) {
    const key = `${chunkX},${chunkZ}`;
    if (!this.chunks[key]) {
      const chunk = new Chunk(chunkX, chunkZ);
      this.chunks[key] = chunk;
      
      // Set up neighbors immediately for existing chunks
      this.setupChunkNeighbors(chunkX, chunkZ);

      // Enqueue async generation via worker if not already pending
      if (!this.pendingChunks.has(key)) {
        const payload = { chunkX, chunkZ, noiseSeed: this.noiseSeed };
        const onComplete = (chunkData) => {
          // console.log(`[World] Chunk ${chunkX},${chunkZ} generation completed:`, chunkData ? 'success' : 'failed');
          
          // Guard if chunk was unloaded while job ran
          if (!this.chunks[key]) {
            this.pendingChunks.delete(key);
            return;
          }
          
          // Set voxel data and mark as having data
          if (chunkData && chunkData.voxels) {
            this.chunks[key].voxels = new Uint8Array(chunkData.voxels);
            this.chunks[key].hasVoxelData = true;
            
            // If mesh data is available from worker, use it directly
            if (chunkData.meshData) {
              this.chunks[key].fromWorkerMesh(chunkData.meshData);
            }
          } else {
            console.error(`[World] Failed to generate chunk ${chunkX},${chunkZ} - no data received`);
          }
          
          // Set up neighbors after chunk is loaded
          this.setupChunkNeighbors(chunkX, chunkZ);
          
          // Generate mesh if we don't have it from worker and can generate it
          if (!this.chunks[key].meshReady && this.chunks[key].canGenerateMesh()) {
            this.chunks[key].updateMesh();
          }
          
          // Also update neighboring chunks that might now be able to generate meshes
          this.updateNeighborMeshes(chunkX, chunkZ);
          
          this.pendingChunks.delete(key);
        };
        
        this.pendingChunks.set(key, true);
        
        // Calculate priority based on distance to player (lower = higher priority)
        // Stored in _playerChunkX/_playerChunkZ, updated in world.update()
        const playerX = this._playerChunkX || 0;
        const playerZ = this._playerChunkZ || 0;
        const dx = chunkX - playerX;
        const dz = chunkZ - playerZ;
        const priority = dx * dx + dz * dz; // Squared distance as priority
        
        this.pool.enqueueTask(payload, onComplete, priority);
      }
      return chunk;
    }
    return this.chunks[key];
  }

  // Set up neighbor relationships for a chunk and its neighbors
  setupChunkNeighbors(chunkX, chunkZ) {
    const chunk = this.chunks[`${chunkX},${chunkZ}`];
    if (!chunk) return;

    // Get neighbor chunks
    const north = this.chunks[`${chunkX},${chunkZ - 1}`];
    const south = this.chunks[`${chunkX},${chunkZ + 1}`];
    const east = this.chunks[`${chunkX + 1},${chunkZ}`];
    const west = this.chunks[`${chunkX - 1},${chunkZ}`];

    // Set up neighbor relationships

    // Set neighbors for the current chunk
    chunk.setNeighbors(north, south, east, west);

    // Also update the neighbors to point back to this chunk
    if (north) {
      const northNeighbors = this.getChunkNeighbors(chunkX, chunkZ - 1);
      north.setNeighbors(northNeighbors.north, chunk, northNeighbors.east, northNeighbors.west);
    }
    if (south) {
      const southNeighbors = this.getChunkNeighbors(chunkX, chunkZ + 1);
      south.setNeighbors(chunk, southNeighbors.south, southNeighbors.east, southNeighbors.west);
    }
    if (east) {
      const eastNeighbors = this.getChunkNeighbors(chunkX + 1, chunkZ);
      east.setNeighbors(eastNeighbors.north, eastNeighbors.south, eastNeighbors.east, chunk);
    }
    if (west) {
      const westNeighbors = this.getChunkNeighbors(chunkX - 1, chunkZ);
      west.setNeighbors(westNeighbors.north, westNeighbors.south, chunk, westNeighbors.west);
    }
  }

  // Helper method to get neighbors for a chunk
  getChunkNeighbors(chunkX, chunkZ) {
    return {
      north: this.chunks[`${chunkX},${chunkZ - 1}`] || null,
      south: this.chunks[`${chunkX},${chunkZ + 1}`] || null,
      east: this.chunks[`${chunkX + 1},${chunkZ}`] || null,
      west: this.chunks[`${chunkX - 1},${chunkZ}`] || null
    };
  }

  // Update meshes for neighboring chunks that might now be able to generate
  updateNeighborMeshes(chunkX, chunkZ) {
    const neighborCoords = [
      [chunkX, chunkZ - 1], // north
      [chunkX, chunkZ + 1], // south
      [chunkX + 1, chunkZ], // east
      [chunkX - 1, chunkZ]  // west
    ];

    neighborCoords.forEach(([nx, nz]) => {
      const neighborChunk = this.chunks[`${nx},${nz}`];
      if (neighborChunk && neighborChunk.hasVoxelData && neighborChunk.canGenerateMesh()) {
        neighborChunk.updateMesh();
      }
    });
  }

  update(cameraPosition, renderDistance = 8) {
    const camChunkX = Math.floor(cameraPosition.x / CHUNK_WIDTH);
    const camChunkZ = Math.floor(cameraPosition.z / CHUNK_DEPTH);

    // Track player chunk position for priority calculations and stale request clearing
    this._playerChunkX = camChunkX;
    this._playerChunkZ = camChunkZ;

    // Clear stale worker requests for chunks that are now far away
    if (this.pool && this.pool.clearStaleRequests) {
      this.pool.clearStaleRequests(camChunkX, camChunkZ, renderDistance);
    }

    const chunksToKeep = new Set();
    const accessOrder = []; // Track access order for eviction priority

    // Prioritize loading near-to-far by pushing coordinates into a list with distance sort
    const coords = [];
    for (let x = camChunkX - renderDistance; x <= camChunkX + renderDistance; x++) {
      for (let z = camChunkZ - renderDistance; z <= camChunkZ + renderDistance; z++) {
        const dx = x - camChunkX;
        const dz = z - camChunkZ;
        coords.push({ x, z, d2: dx * dx + dz * dz });
      }
    }
    coords.sort((a, b) => a.d2 - b.d2);

    for (const c of coords) {
      const key = `${c.x},${c.z}`;
      chunksToKeep.add(key);
      // Track access for hot chunk retention (chunks we're keeping are "accessed")
      this.updateChunkAccess(key);
      accessOrder.push({ key, d2: c.d2 });
      
      if (!this.chunks[key]) {
        this.getChunk(c.x, c.z);
      }
    }

    // Smart unload: prioritize evicting cold + distant chunks
    // First pass: collect all unload candidates (not in chunksToKeep and not hot)
    const unloadCandidates = [];
    for (const key in this.chunks) {
      if (!chunksToKeep.has(key)) {
        if (this.shouldUnloadChunk(key, camChunkX, camChunkZ, renderDistance)) {
          // Sort by distance from player (furthest first), but hot chunks are already excluded
          const parts = key.split(',');
          const chunkX = parseInt(parts[0]);
          const chunkZ = parseInt(parts[1]);
          const dx = chunkX - camChunkX;
          const dz = chunkZ - camChunkZ;
          unloadCandidates.push({ key, d2: dx * dx + dz * dz });
        }
      }
    }
    
    // Sort unload candidates by distance (furthest first)
    unloadCandidates.sort((a, b) => b.d2 - a.d2);

    // Unload the distant/cold chunks
    for (const candidate of unloadCandidates) {
      const chunk = this.chunks[candidate.key];
      if (chunk) {
        chunk.dispose(this._gl);
        delete this.chunks[candidate.key];
        this.pendingChunks.delete(candidate.key);
      }
    }

    // Clean up access map entries for unloaded chunks
    this.cleanupAccessMap();
  }

  getVisibleChunks() {
    // WebGL2: check for meshData (not Three.js chunk.mesh)
    const allChunks = Object.values(this.chunks);
    const visible = allChunks.filter(chunk => chunk.meshData && chunk.meshReady);
    
    // Debug logging
    if (DEBUG && visible.length > 0 && visible.length !== this._lastVisibleCount) {
      console.log(`[World] getVisibleChunks: ${visible.length}/${allChunks.length} chunks ready`);
      this._lastVisibleCount = visible.length;
    }
    
    // Track access for hot chunk retention
    for (const chunk of visible) {
      this.updateChunkAccess(`${chunk.chunkX},${chunk.chunkZ}`);
    }
    return visible;
  }

  /**
   * Update the access record for a chunk (called when chunk is rendered or accessed).
   * @param {string} chunkKey - The chunk key (e.g., "0,-1")
   */
  updateChunkAccess(chunkKey) {
    const now = performance.now();
    let record = this.chunkAccessMap.get(chunkKey);
    if (!record) {
      record = { lastAccess: now, accessCount: 0 };
      this.chunkAccessMap.set(chunkKey, record);
    }
    record.lastAccess = now;
    record.accessCount++;
  }

  /**
   * Check if a chunk is "hot" (frequently used, should be retained).
   * A chunk is hot if accessed within HOT_CHUNK_TIME_MS OR accessCount >= HOT_CHUNK_MIN_ACCESS.
   */
  isHotChunk(chunkKey) {
    const record = this.chunkAccessMap.get(chunkKey);
    if (!record) return false;
    
    const now = performance.now();
    const timeSinceAccess = now - record.lastAccess;
    return timeSinceAccess < HOT_CHUNK_TIME_MS || record.accessCount >= HOT_CHUNK_MIN_ACCESS;
  }

  /**
   * Determine if a chunk should be unloaded (not hot and distant).
   * @param {string} chunkKey - The chunk key to check
   * @param {number} camChunkX - Camera chunk X
   * @param {number} camChunkZ - Camera chunk Z
   * @param {number} renderDistance - Current render distance
   */
  shouldUnloadChunk(chunkKey, camChunkX, camChunkZ, renderDistance) {
    // Never unload hot chunks
    if (this.isHotChunk(chunkKey)) return false;
    
    // Parse chunk coordinates
    const parts = chunkKey.split(',');
    const chunkX = parseInt(parts[0]);
    const chunkZ = parseInt(parts[1]);
    
    const dx = Math.abs(chunkX - camChunkX);
    const dz = Math.abs(chunkZ - camChunkZ);
    
    // Unload if beyond render distance
    return dx > renderDistance || dz > renderDistance;
  }

  /**
   * Clean up old entries from the access map (no longer existing chunks).
   */
  cleanupAccessMap() {
    for (const key of this.chunkAccessMap.keys()) {
      if (!this.chunks[key]) {
        this.chunkAccessMap.delete(key);
      }
    }
  }

  dispose(gl = null) {
    const glCtx = gl || this._gl;
    for (const key in this.chunks) {
      this.chunks[key].dispose(glCtx);
    }
    this.chunks = {};
    this.pendingChunks.clear();
    if (this.pool) this.pool.terminate();
  }
}
