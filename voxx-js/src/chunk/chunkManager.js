const CHUNK_SIZE = 16;

// Instance buffer for instanced rendering (PERF-01)
// Stores per-chunk world offsets: [chunkX * CHUNK_SIZE, 0, chunkZ * CHUNK_SIZE]
let instanceBuffer = null;
let instanceData = null;
let instanceCount = 0;

export function createInstanceBuffer(gl, chunks) {
  if (!chunks || chunks.length === 0) {
    return null;
  }
  
  // Create Float32Array with 3 floats per chunk (x, y, z offset)
  instanceData = new Float32Array(chunks.length * 3);
  
  chunks.forEach((chunk, i) => {
    const offsetX = chunk.x * CHUNK_SIZE;
    const offsetY = 0;
    const offsetZ = chunk.z * CHUNK_SIZE;
    instanceData[i * 3 + 0] = offsetX;
    instanceData[i * 3 + 1] = offsetY;
    instanceData[i * 3 + 2] = offsetZ;
  });
  
  instanceCount = chunks.length;
  
  // Create or update WebGL buffer
  if (instanceBuffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  } else {
    instanceBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
  
  return instanceBuffer;
}

export function getInstanceBuffer() {
  return instanceBuffer;
}

export function getInstanceCount() {
  return instanceCount;
}

export function getInstanceData() {
  return instanceData;
}

export function disposeInstanceBuffer(gl) {
  if (instanceBuffer) {
    gl.deleteBuffer(instanceBuffer);
    instanceBuffer = null;
  }
  instanceData = null;
  instanceCount = 0;
}

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
    // PERF-02: Spatial index for O(1) chunk lookup by coordinates
    this.spatialIndex = new Map();
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
  
  // PERF-02: O(1) chunk lookup using spatial index
  getChunkAt(x, z) {
    return this.spatialIndex.get(`${x},${z}`) || null;
  }
  
  // PERF-02: Grid-based visible chunk iteration - O(1) lookups within render distance
  // Only iterates render distance grid (max 289 for distance=8) instead of all chunks
  getVisibleChunks(cameraX, cameraZ, renderDistance = this.renderDistance) {
    const visibleChunks = [];
    const camChunkX = Math.floor(cameraX / CHUNK_SIZE);
    const camChunkZ = Math.floor(cameraZ / CHUNK_SIZE);
    
    // Iterate only render distance range
    for (let x = camChunkX - renderDistance; x <= camChunkX + renderDistance; x++) {
      for (let z = camChunkZ - renderDistance; z <= camChunkZ + renderDistance; z++) {
        const chunk = this.spatialIndex.get(`${x},${z}`);
        if (chunk) {
          visibleChunks.push(chunk);
        }
      }
    }
    
    return visibleChunks;
  }
  
  createChunk(x, z) {
    const key = this.getKey(x, z);
    if (this.chunks.has(key)) {
      return this.chunks.get(key);
    }
    const chunk = new Chunk(x, z);
    this.chunks.set(key, chunk);
    // PERF-02: Also add to spatial index for O(1) lookup
    this.spatialIndex.set(`${x},${z}`, chunk);
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
  
  getAllLoadedChunks() {
    // Returns array of all loaded chunks with their positions
    const result = [];
    for (const chunk of this.chunks.values()) {
      // Only include chunks with valid meshes
      if (chunk.mesh && !chunk.isDirty()) {
        result.push({ x: chunk.x, z: chunk.z, mesh: chunk.mesh });
      }
    }
    return result;
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
  
  removeChunk(x, z, gl = null) {
    const key = this.getKey(x, z);
    const chunk = this.chunks.get(key);
    if (chunk && gl) {
      // Dispose GPU resources before removing chunk
      if (chunk.mesh) {
        if (chunk.mesh.vao) gl.deleteVertexArray(chunk.mesh.vao);
        if (chunk.mesh.vbo) gl.deleteBuffer(chunk.mesh.vbo);
        if (chunk.mesh.ibo) gl.deleteBuffer(chunk.mesh.ibo);
        if (chunk.mesh.wireIbo) gl.deleteBuffer(chunk.mesh.wireIbo);
        chunk.mesh = null;
      }
    }
    this.chunks.delete(key);
    // PERF-02: Also remove from spatial index
    this.spatialIndex.delete(`${x},${z}`);
  }
  
  clear() {
    this.chunks.clear();
    this.spatialIndex.clear();
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
    this.spatialIndex.clear();
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

// PERF-02: Standalone function for render loop to get visible chunks
export function getVisibleChunks(cameraX, cameraZ, renderDistance) {
  return defaultChunkManager.getVisibleChunks(cameraX, cameraZ, renderDistance);
}

export { CHUNK_SIZE };
