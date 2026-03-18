const CHUNK_SIZE = 16;

class Chunk {
  constructor(x, z) {
    this.x = x;
    this.z = z;
    this.dirty = true;
    this.mesh = null;
    this.lastModified = Date.now();
  }
  
  get key() {
    return `${this.x},${this.z}`;
  }
  
  markDirty() {
    this.dirty = true;
    this.lastModified = Date.now();
  }
  
  clearDirty() {
    this.dirty = false;
  }
  
  isDirty() {
    return this.dirty;
  }
  
  setMesh(mesh) {
    this.mesh = mesh;
    this.dirty = false;
  }
}

export class ChunkManager {
  constructor(renderDistance = 8) {
    this.chunks = new Map();
    this.renderDistance = renderDistance;
    this.centerX = 0;
    this.centerZ = 0;
  }
  
  getKey(x, z) {
    return `${x},${z}`;
  }
  
  getChunk(x, z) {
    const key = this.getKey(x, z);
    return this.chunks.get(key) || null;
  }
  
  createChunk(x, z) {
    const key = this.getKey(x, z);
    if (this.chunks.has(key)) {
      return this.chunks.get(key);
    }
    const chunk = new Chunk(x, z);
    this.chunks.set(key, chunk);
    return chunk;
  }
  
  setDirty(x, z) {
    const chunk = this.getChunk(x, z);
    if (chunk) {
      chunk.markDirty();
    }
  }
  
  markDirty(key) {
    const chunk = this.chunks.get(key);
    if (chunk) {
      chunk.markDirty();
    }
  }
  
  clearDirty(key) {
    const chunk = this.chunks.get(key);
    if (chunk) {
      chunk.clearDirty();
    }
  }
  
  isDirty(key) {
    const chunk = this.chunks.get(key);
    return chunk ? chunk.isDirty() : false;
  }
  
  setChunkMesh(x, z, mesh) {
    const chunk = this.getChunk(x, z) || this.createChunk(x, z);
    chunk.setMesh(mesh);
  }
  
  getChunksInRange(centerX, centerZ, distance = this.renderDistance) {
    const chunks = [];
    const minX = centerX - distance;
    const maxX = centerX + distance;
    const minZ = centerZ - distance;
    const maxZ = centerZ + distance;
    
    for (let x = minX; x <= maxX; x++) {
      for (let z = minZ; z <= maxZ; z++) {
        const chunk = this.getChunk(x, z);
        if (chunk) {
          chunks.push(chunk);
        }
      }
    }
    
    return chunks;
  }
  
  getDirtyChunks() {
    const dirty = [];
    for (const chunk of this.chunks.values()) {
      if (chunk.isDirty()) {
        dirty.push(chunk);
      }
    }
    return dirty;
  }
  
  getCleanChunks() {
    const clean = [];
    for (const chunk of this.chunks.values()) {
      if (!chunk.isDirty()) {
        clean.push(chunk);
      }
    }
    return clean;
  }
  
  setRenderDistance(distance) {
    this.renderDistance = distance;
  }
  
  getRenderDistance() {
    return this.renderDistance;
  }
  
  updateCenter(x, z) {
    this.centerX = x;
    this.centerZ = z;
  }
  
  removeChunk(x, z) {
    const key = this.getKey(x, z);
    this.chunks.delete(key);
  }
  
  clear() {
    this.chunks.clear();
  }
  
  getChunkCount() {
    return this.chunks.size;
  }
  
  dispose(gl) {
    for (const chunk of this.chunks.values()) {
      if (chunk.mesh) {
        if (chunk.mesh.vao) {
          gl.deleteVertexArray(chunk.mesh.vao);
        }
        if (chunk.mesh.vbo) {
          gl.deleteBuffer(chunk.mesh.vbo);
        }
        if (chunk.mesh.ibo) {
          gl.deleteBuffer(chunk.mesh.ibo);
        }
      }
    }
    this.chunks.clear();
  }
}

export function createChunkKey(x, z) {
  return `${x},${z}`;
}

export function parseChunkKey(key) {
  const [x, z] = key.split(',').map(Number);
  return { x, z };
}

export const defaultChunkManager = new ChunkManager(8);

export function getChunk(x, z) {
  return defaultChunkManager.getChunk(x, z);
}

export function markDirty(key) {
  return defaultChunkManager.markDirty(key);
}

export function getRenderDistance() {
  return defaultChunkManager.getRenderDistance();
}

export { CHUNK_SIZE };
