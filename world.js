/**
 * World implementation
 */

import { Chunk, CHUNK_WIDTH, CHUNK_DEPTH } from './chunk.js';
import { createNoise2D } from 'https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js';
import { BiomeCalculator } from './biomes.js';
import { WorkerPool } from './workerPool.js';

export class World {
  constructor(noiseSeed) {
    this.chunks = {};
    this.noiseSeed = noiseSeed;

    // Track pending worker jobs keyed by "x,z"
    this.pendingChunks = new Map();

    // Worker pool for chunk generation/meshing (reuse existing chunkWorker.js)
    this.pool = new WorkerPool('./chunkWorker.js');

    // Create noise functions (kept for any main-thread quick tests, not used for generation now)
    this.heightNoise = createNoise2D(() => noiseSeed);
    this.biomeNoise = createNoise2D(() => noiseSeed + 1000);
    this.biomeCalculator = new BiomeCalculator(noiseSeed);
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
        this.pool.enqueueTask(payload, onComplete);
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

  // Main-thread generation retained for reference or debugging; no longer used in normal flow.
  generateChunk(chunk) {
    chunk.generate(this.heightNoise, this.biomeNoise);
    chunk.updateMesh();
  }

  update(cameraPosition, renderDistance = 8) {
    const camChunkX = Math.floor(cameraPosition.x / CHUNK_WIDTH);
    const camChunkZ = Math.floor(cameraPosition.z / CHUNK_DEPTH);

    const chunksToKeep = new Set();

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
      if (!this.chunks[key]) {
        this.getChunk(c.x, c.z);
      }
    }

    // Unload distant chunks (and ignore any late worker results)
    for (const key in this.chunks) {
      if (!chunksToKeep.has(key)) {
        const chunk = this.chunks[key];
        chunk.dispose();
        delete this.chunks[key];
        // Mark as not needed. We cannot cancel an in-flight worker easily, but we can ignore late results.
        // pendingChunks entry will be cleared when the result arrives; leaving it is harmless.
      }
    }
  }

  getVisibleChunks() {
    return Object.values(this.chunks).filter(chunk => chunk.mesh && chunk.meshReady);
  }

  dispose() {
    for (const key in this.chunks) {
      this.chunks[key].dispose();
    }
    this.chunks = {};
    this.pendingChunks.clear();
    if (this.pool) this.pool.terminate();
  }
}
