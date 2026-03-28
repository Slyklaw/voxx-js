import { MESH_CONFIG, BLOCK_CONFIG } from '../../config.js';
import { registerContextResources } from './context.js';

const FLOAT_SIZE = 4;
// Use config constants for vertex format
const VERTEX_SIZE = MESH_CONFIG.VERTEX_SIZE;
const STRIDE = MESH_CONFIG.STRIDE_BYTES;

/**
 * Buffer pool for reusing WebGL buffer objects to reduce allocation overhead.
 * Maintains separate pools for VBOs, VAOs, and IBOs with a configurable max size.
 */
export class BufferPool {
  constructor(gl, maxSize = 32) {
    this.gl = gl;
    this.maxSize = maxSize;
    this.availableVBOs = [];
    this.availableVAOs = [];
    this.availableIBOs = [];
    this.availableWireIBOs = [];
  }

  acquireVBO() {
    if (this.availableVBOs.length > 0) {
      return this.availableVBOs.pop();
    }
    return this.gl.createBuffer();
  }

  releaseVBO(vbo) {
    if (!vbo) return;
    if (this.availableVBOs.length < this.maxSize) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(0), this.gl.STATIC_DRAW);
      this.availableVBOs.push(vbo);
    } else {
      this.gl.deleteBuffer(vbo);
    }
  }

  acquireVAO() {
    if (this.availableVAOs.length > 0) {
      return this.availableVAOs.pop();
    }
    return this.gl.createVertexArray();
  }

  releaseVAO(vao) {
    if (!vao) return;
    if (this.availableVAOs.length < this.maxSize) {
      this.availableVAOs.push(vao);
    } else {
      this.gl.deleteVertexArray(vao);
    }
  }

  acquireIBO() {
    if (this.availableIBOs.length > 0) {
      return this.availableIBOs.pop();
    }
    return this.gl.createBuffer();
  }

  acquireWireIBO() {
    if (this.availableWireIBOs.length > 0) {
      return this.availableWireIBOs.pop();
    }
    return this.gl.createBuffer();
  }

  releaseIBO(ibo) {
    if (!ibo) return;
    if (this.availableIBOs.length < this.maxSize) {
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, ibo);
      this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(0), this.gl.STATIC_DRAW);
      this.availableIBOs.push(ibo);
    } else {
      this.gl.deleteBuffer(ibo);
    }
  }

  releaseWireIBO(ibo) {
    if (!ibo) return;
    if (this.availableWireIBOs.length < this.maxSize) {
      this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, ibo);
      this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(0), this.gl.STATIC_DRAW);
      this.availableWireIBOs.push(ibo);
    } else {
      this.gl.deleteBuffer(ibo);
    }
  }

  dispose() {
    const gl = this.gl;
    this.availableVBOs.forEach(vbo => gl.deleteBuffer(vbo));
    this.availableVAOs.forEach(vao => gl.deleteVertexArray(vao));
    this.availableIBOs.forEach(ibo => gl.deleteBuffer(ibo));
    this.availableWireIBOs.forEach(ibo => gl.deleteBuffer(ibo));
    this.availableVBOs = [];
    this.availableVAOs = [];
    this.availableIBOs = [];
    this.availableWireIBOs = [];
  }
}

let _bufferPool = null;

export function initBufferPool(gl, maxSize = 32) {
  if (_bufferPool) {
    _bufferPool.dispose();
  }
  _bufferPool = new BufferPool(gl, maxSize);
  return _bufferPool;
}

export function getBufferPool() {
  return _bufferPool;
}

export function createVBO(gl, data, usage = gl.STATIC_DRAW) {
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, usage);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return vbo;
}

export function createVAO(gl) {
  const vao = gl.createVertexArray();
  return vao;
}

export function setupVAO(gl, vao, vbo, attribs = {}) {
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

  // Use explicit layout locations matching shader
  // Position: location 0
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);

  // Color: location 1
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, STRIDE, 12);

  // Normal: location 2
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 3, gl.FLOAT, false, STRIDE, 24);

  // UV: location 3
  gl.enableVertexAttribArray(3);
  gl.vertexAttribPointer(3, 2, gl.FLOAT, false, STRIDE, 36);

  // TileBase: location 4
  gl.enableVertexAttribArray(4);
  gl.vertexAttribPointer(4, 2, gl.FLOAT, false, STRIDE, 44);

  // TriangleVariant: location 5
  gl.enableVertexAttribArray(5);
  gl.vertexAttribPointer(5, 1, gl.FLOAT, false, STRIDE, 52);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

export function bindChunk(gl, vao) {
  gl.bindVertexArray(vao);
}

export function unbindChunk(gl) {
  gl.bindVertexArray(null);
}

export function deleteChunk(gl, vao, vbos) {
  if (vao) {
    gl.deleteVertexArray(vao);
  }
  if (vbos) {
    if (Array.isArray(vbos)) {
      vbos.forEach(vbo => gl.deleteBuffer(vbo));
    } else {
      gl.deleteBuffer(vbos);
    }
  }
}

export function createChunkMesh(gl, vertices, colors, normals) {
  const vertexCount = vertices.length / 3;
  const data = new Float32Array(vertexCount * VERTEX_SIZE);

  for (let i = 0; i < vertexCount; i++) {
    const base = i * VERTEX_SIZE;
    data[base + 0] = vertices[i * 3 + 0];
    data[base + 1] = vertices[i * 3 + 1];
    data[base + 2] = vertices[i * 3 + 2];
    data[base + 3] = colors[i * 3 + 0];
    data[base + 4] = colors[i * 3 + 1];
    data[base + 5] = colors[i * 3 + 2];
    data[base + 6] = normals[i * 3 + 0];
    data[base + 7] = normals[i * 3 + 1];
    data[base + 8] = normals[i * 3 + 2];
  }

  const vbo = createVBO(gl, data, gl.STATIC_DRAW);
  const vao = createVAO(gl);

  return { vbo, vao, vertexCount };
}

export function createChunkMeshFromData(gl, meshData, attribs = null) {
  if (!meshData || !meshData.positions || meshData.positions.length === 0) {
    return null;
  }

  const positions = meshData.positions;
  const colors = meshData.colors || new Float32Array(positions.length);
  const normals = meshData.normals || new Float32Array(positions.length);
  const uvs = meshData.uvs || new Float32Array((positions.length / 3) * 2);
  const tileBase = meshData.tileBase || new Float32Array((positions.length / 3) * 2);
  const triangleVariant = meshData.triangleVariant || new Float32Array(positions.length / 3);
  const indices = meshData.indices;

  const vertexCount = positions.length / 3;
  
  const data = new Float32Array(vertexCount * VERTEX_SIZE);

  for (let i = 0; i < vertexCount; i++) {
    const base = i * VERTEX_SIZE;
    data[base + 0] = positions[i * 3 + 0];
    data[base + 1] = positions[i * 3 + 1];
    data[base + 2] = positions[i * 3 + 2];
    
    if (colors[i * 3] !== undefined) {
      data[base + 3] = colors[i * 3 + 0];
      data[base + 4] = colors[i * 3 + 1];
      data[base + 5] = colors[i * 3 + 2];
    } else {
      data[base + 3] = BLOCK_CONFIG.DEFAULT_COLOR_R;
      data[base + 4] = BLOCK_CONFIG.DEFAULT_COLOR_G;
      data[base + 5] = BLOCK_CONFIG.DEFAULT_COLOR_B;
    }
    
    if (normals[i * 3] !== undefined) {
      data[base + 6] = normals[i * 3 + 0];
      data[base + 7] = normals[i * 3 + 1];
      data[base + 8] = normals[i * 3 + 2];
    } else {
      data[base + 6] = BLOCK_CONFIG.DEFAULT_NORMAL_X;
      data[base + 7] = BLOCK_CONFIG.DEFAULT_NORMAL_Y;
      data[base + 8] = BLOCK_CONFIG.DEFAULT_NORMAL_Z;
    }

    // UV coordinates
    data[base + 9] = uvs[i * 2 + 0] || 0;
    data[base + 10] = uvs[i * 2 + 1] || 0;
    
    // Tile base coordinates for atlas wrapping
    data[base + 11] = tileBase[i * 2 + 0] || 0;
    data[base + 12] = tileBase[i * 2 + 1] || 0;
    
    // Triangle variant for debug mode
    data[base + 13] = triangleVariant[i] !== undefined ? triangleVariant[i] : 0.0;
  }

  // Use buffer pool if available, otherwise fall back to direct creation
  const pool = getBufferPool();
  const vbo = pool ? pool.acquireVBO() : gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  const vao = pool ? pool.acquireVAO() : gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, STRIDE, 0);

  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, STRIDE, 12);

  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 3, gl.FLOAT, false, STRIDE, 24);

  gl.enableVertexAttribArray(3);
  gl.vertexAttribPointer(3, 2, gl.FLOAT, false, STRIDE, 36);

  gl.enableVertexAttribArray(4);
  gl.vertexAttribPointer(4, 2, gl.FLOAT, false, STRIDE, 44);

  gl.enableVertexAttribArray(5);
  gl.vertexAttribPointer(5, 1, gl.FLOAT, false, STRIDE, 52);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // Create index buffer
  let ibo = null;
  let indexCount = 0;
  if (indices && indices.length > 0) {
    ibo = pool ? pool.acquireIBO() : gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);
    indexCount = indices.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }

  // Create wireframe index buffer (convert triangles to lines)
  let wireIbo = null;
  let wireIndexCount = 0;
  if (indices && indices.length > 0) {
    // For each triangle (3 indices), create 3 lines: (i0,i1), (i1,i2), (i2,i0)
    const wireIndices = [];
    for (let i = 0; i < indices.length; i += 3) {
      wireIndices.push(indices[i], indices[i + 1]);     // Edge 1
      wireIndices.push(indices[i + 1], indices[i + 2]); // Edge 2
      wireIndices.push(indices[i + 2], indices[i]);     // Edge 3
    }
    wireIbo = pool ? pool.acquireWireIBO() : gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, wireIbo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(wireIndices), gl.STATIC_DRAW);
    wireIndexCount = wireIndices.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }

  // Register all resources with context registry for lifecycle management
  registerContextResources({
    dispose: () => {
      // Delete VAO
      if (vao) gl.deleteVertexArray(vao);
      // Delete VBO
      if (vbo) gl.deleteBuffer(vbo);
      // Delete IBO
      if (ibo) gl.deleteBuffer(ibo);
      // Delete wire IBO
      if (wireIbo) gl.deleteBuffer(wireIbo);
    },
    init: null // Buffers will be recreated on mesh rebuild, not context restore
  });

  return { vbo, vao, ibo, wireIbo, indexCount, wireIndexCount, vertexCount };
}

export const VERTEX_FORMAT = {
  STRIDE,
  POSITION_OFFSET: 0,
  COLOR_OFFSET: 12,
  NORMAL_OFFSET: 24,
  UV_OFFSET: 36,
  TILE_BASE_OFFSET: 44,
  TRIANGLE_VARIANT_OFFSET: 52,
  FLOATS_PER_VERTEX: VERTEX_SIZE
};
