const FLOAT_SIZE = 4;
const VERTEX_SIZE = 9;
const STRIDE = VERTEX_SIZE * FLOAT_SIZE;

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

  const {
    position = { size: 3, type: gl.FLOAT, normalized: false, offset: 0 },
    color = { size: 3, type: gl.FLOAT, normalized: false, offset: 12 },
    normal = { size: 3, type: gl.FLOAT, normalized: false, offset: 24 }
  } = attribs;

  if (position.size > 0) {
    const posLoc = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'aPosition');
    if (posLoc >= 0) {
      gl.enableVertexAttribArray(posLoc);
      gl.vertexAttribPointer(posLoc, position.size, position.type, position.normalized, STRIDE, position.offset);
    }
  }

  if (color.size > 0) {
    const colLoc = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'aColor');
    if (colLoc >= 0) {
      gl.enableVertexAttribArray(colLoc);
      gl.vertexAttribPointer(colLoc, color.size, color.type, color.normalized, STRIDE, color.offset);
    }
  }

  if (normal.size > 0) {
    const normLoc = gl.getAttribLocation(gl.getParameter(gl.CURRENT_PROGRAM), 'aNormal');
    if (normLoc >= 0) {
      gl.enableVertexAttribArray(normLoc);
      gl.vertexAttribPointer(normLoc, normal.size, normal.type, normal.normalized, STRIDE, normal.offset);
    }
  }

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
      data[base + 3] = 0.8;
      data[base + 4] = 0.8;
      data[base + 5] = 0.8;
    }
    
    if (normals[i * 3] !== undefined) {
      data[base + 6] = normals[i * 3 + 0];
      data[base + 7] = normals[i * 3 + 1];
      data[base + 8] = normals[i * 3 + 2];
    } else {
      data[base + 6] = 0;
      data[base + 7] = 1;
      data[base + 8] = 0;
    }
  }

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

  const posLoc = attribs?.aPosition ?? 0;
  const colLoc = attribs?.aColor ?? 1;
  const normLoc = attribs?.aNormal ?? 2;

  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, STRIDE, 0);

  gl.enableVertexAttribArray(colLoc);
  gl.vertexAttribPointer(colLoc, 3, gl.FLOAT, false, STRIDE, 12);

  gl.enableVertexAttribArray(normLoc);
  gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, STRIDE, 24);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // Create index buffer
  let ibo = null;
  let indexCount = 0;
  if (indices && indices.length > 0) {
    ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices), gl.STATIC_DRAW);
    indexCount = indices.length;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  }

  return { vbo, vao, ibo, indexCount };
}

export const VERTEX_FORMAT = {
  STRIDE,
  POSITION_OFFSET: 0,
  COLOR_OFFSET: 12,
  NORMAL_OFFSET: 24,
  FLOATS_PER_VERTEX: VERTEX_SIZE
};
