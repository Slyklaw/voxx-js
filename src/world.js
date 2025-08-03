import { WorkerPool } from './workers/workerPool.js';
import { Chunk, CHUNK_WIDTH, CHUNK_DEPTH } from './chunk.js';

export class World {
  constructor(noiseSeed, scene) {
    this.chunks = {}; // key: `${chunkX},${chunkZ}`
    this.noiseSeed = noiseSeed;
    this.scene = scene;
    this.pendingChunks = new Map();
    this.workerPool = new WorkerPool(
      new URL('./workers/chunkWorker.js', import.meta.url).href,
      4
    );
  }

  getChunk(chunkX, chunkZ) {
    const key = `${chunkX},${chunkZ}`;
    if (!this.chunks[key]) {
      // Create placeholder chunk
      const chunk = new Chunk(chunkX, chunkZ);
      this.chunks[key] = chunk;
      this.pendingChunks.set(key, chunk);

      // Queue generation task
      this.workerPool.enqueueTask(
        { chunkX, chunkZ, noiseSeed: this.noiseSeed },
        (chunkData) => {
          if (!this.chunks[key]) return; // Chunk was unloaded before generation completed
          
          chunk.voxels = new Uint8Array(chunkData.voxels);
          const mesh = chunk.createMesh();
          mesh.position.set(chunkX * CHUNK_WIDTH, 0, chunkZ * CHUNK_DEPTH);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          this.scene.add(mesh);
          chunk.mesh = mesh;
          this.pendingChunks.delete(key);
        }
      );
    }
    return this.chunks[key];
  }

  update(cameraPosition, renderDistance = 8) {
    // Determine current camera chunk
    const camChunkX = Math.floor(cameraPosition.x / CHUNK_WIDTH);
    const camChunkZ = Math.floor(cameraPosition.z / CHUNK_DEPTH);

    // Create a set for chunks that should be loaded
    const chunksToKeep = new Set();

    // Load chunks around the camera
    for (let x = camChunkX - renderDistance; x <= camChunkX + renderDistance; x++) {
      for (let z = camChunkZ - renderDistance; z <= camChunkZ + renderDistance; z++) {
        const key = `${x},${z}`;
        chunksToKeep.add(key);
        if (!this.chunks[key]) {
          this.getChunk(x, z);
        }
      }
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
