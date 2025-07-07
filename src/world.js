import { Chunk, CHUNK_WIDTH, CHUNK_DEPTH } from './chunk.js';

export class World {
  constructor(noise, scene) {
    this.chunks = {}; // key: `${chunkX},${chunkZ}`
    this.noise = noise;
    this.scene = scene;
  }

  getChunk(chunkX, chunkZ) {
    const key = `${chunkX},${chunkZ}`;
    if (!this.chunks[key]) {
      const chunk = new Chunk(chunkX, chunkZ);
      chunk.generate(this.noise);
      const mesh = chunk.createMesh();
      mesh.position.set(chunkX * CHUNK_WIDTH, 0, chunkZ * CHUNK_DEPTH);
      this.scene.add(mesh);
      chunk.mesh = mesh; // Ensure the chunk's mesh is set
      this.chunks[key] = chunk;
    }
    return this.chunks[key];
  }

  update(cameraPosition, renderDistance = 16) {
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
        this.scene.remove(chunk.mesh);
        chunk.dispose();
        delete this.chunks[key];
      }
    }
  }
}
