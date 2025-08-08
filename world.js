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

      // Enqueue async generation via worker if not already pending
      if (!this.pendingChunks.has(key)) {
        const payload = { chunkX, chunkZ, noiseSeed: this.noiseSeed };
        const onComplete = (chunkData) => {
          // Guard if chunk was unloaded while job ran
          if (!this.chunks[key]) {
            this.pendingChunks.delete(key);
            return;
          }
          // Set voxel data from worker
          if (chunkData && chunkData.voxels) {
            this.chunks[key].voxels = new Uint8Array(chunkData.voxels);
          }
          // Build mesh from worker data
          if (chunkData && chunkData.meshData) {
            this.chunks[key].fromWorkerMesh(chunkData.meshData);
          }
          this.pendingChunks.delete(key);
        };
        this.pendingChunks.set(key, true);
        this.pool.enqueueTask(payload, onComplete);
      }
      return chunk;
    }
    return this.chunks[key];
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
    return Object.values(this.chunks).filter(chunk => chunk.mesh);
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
