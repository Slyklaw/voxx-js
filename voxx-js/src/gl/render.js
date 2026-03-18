import { createVoxelProgram, getVoxelUniforms, getVoxelAttribs, DEFAULT_LIGHT_DIRECTION, DEFAULT_AMBIENT, DEFAULT_DIFFUSE } from '../shaders/voxel.js';
import { bindChunk, unbindChunk, VERTEX_FORMAT } from './buffers.js';

let voxelProgram = null;
let voxelUniforms = null;
let voxelAttribs = null;

const SKY_BLUE = [0.53, 0.81, 0.92, 1.0];

function createCubeMesh() {
  const positions = [
    -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5,  0.5, -0.5, -0.5,  0.5, -0.5,
    -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5,
    -0.5, -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5,  0.5, -0.5, -0.5,  0.5,
     0.5, -0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5,  0.5, -0.5,  0.5,
    -0.5, -0.5, -0.5,  0.5, -0.5, -0.5,  0.5, -0.5,  0.5, -0.5, -0.5,  0.5,
    -0.5,  0.5, -0.5,  0.5,  0.5, -0.5,  0.5,  0.5,  0.5, -0.5,  0.5,  0.5
  ];

  const indices = [
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    8, 9, 10, 8, 10, 11,
    12, 14, 13, 12, 15, 14,
    16, 17, 18, 16, 18, 19,
    20, 22, 21, 20, 23, 22
  ];

  const normals = [];
  const faces = [
    [0, 0, -1], [0, 0, 1], [-1, 0, 0], [1, 0, 0], [0, -1, 0], [0, 1, 0]
  ];

  for (let face = 0; face < 6; face++) {
    for (let i = 0; i < 4; i++) {
      normals.push(faces[face][0], faces[face][1], faces[face][2]);
    }
  }

  const colors = [];
  const cubeColor = [0.8, 0.2, 0.2];
  for (let i = 0; i < 24; i++) {
    colors.push(cubeColor[0], cubeColor[1], cubeColor[2]);
  }

  return { positions, indices, colors, normals };
}

export function initRenderer(gl) {
  voxelProgram = createVoxelProgram(gl);
  voxelUniforms = getVoxelUniforms(gl, voxelProgram);
  voxelAttribs = getVoxelAttribs(gl, voxelProgram);

  gl.useProgram(voxelProgram);
  gl.uniform3fv(voxelUniforms.uLightDirection, DEFAULT_LIGHT_DIRECTION);
  gl.uniform1f(voxelUniforms.uAmbient, DEFAULT_AMBIENT);
  gl.uniform1f(voxelUniforms.uDiffuse, DEFAULT_DIFFUSE);
  gl.useProgram(null);

  return {
    program: voxelProgram,
    uniforms: voxelUniforms,
    attribs: voxelAttribs
  };
}

export function renderChunk(gl, chunkMesh) {
  if (!chunkMesh || !chunkMesh.vao) return;

  bindChunk(gl, chunkMesh.vao);
  gl.drawArrays(gl.TRIANGLES, 0, chunkMesh.vertexCount);
  unbindChunk(gl);
}

export function renderChunks(gl, chunks) {
  for (const chunk of chunks) {
    renderChunk(gl, chunk);
  }
}

export function clear(gl, canvas) {
  gl.clearColor(SKY_BLUE[0], SKY_BLUE[1], SKY_BLUE[2], SKY_BLUE[3]);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}

export function setupRenderState(gl) {
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.frontFace(gl.CCW);
}

export function createMockChunkMesh(gl) {
  const cube = createCubeMesh();
  const vertexCount = cube.positions.length / 3;

  const data = new Float32Array(vertexCount * VERTEX_FORMAT.FLOATS_PER_VERTEX);

  for (let i = 0; i < vertexCount; i++) {
    const base = i * VERTEX_FORMAT.FLOATS_PER_VERTEX;
    data[base + 0] = cube.positions[i * 3 + 0];
    data[base + 1] = cube.positions[i * 3 + 1];
    data[base + 2] = cube.positions[i * 3 + 2];
    data[base + 3] = cube.colors[i * 3 + 0];
    data[base + 4] = cube.colors[i * 3 + 1];
    data[base + 5] = cube.colors[i * 3 + 2];
    data[base + 6] = cube.normals[i * 3 + 0];
    data[base + 7] = cube.normals[i * 3 + 1];
    data[base + 8] = cube.normals[i * 3 + 2];
  }

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

  gl.enableVertexAttribArray(voxelAttribs.aPosition);
  gl.vertexAttribPointer(voxelAttribs.aPosition, 3, gl.FLOAT, false, VERTEX_FORMAT.STRIDE, VERTEX_FORMAT.POSITION_OFFSET);

  gl.enableVertexAttribArray(voxelAttribs.aColor);
  gl.vertexAttribPointer(voxelAttribs.aColor, 3, gl.FLOAT, false, VERTEX_FORMAT.STRIDE, VERTEX_FORMAT.COLOR_OFFSET);

  gl.enableVertexAttribArray(voxelAttribs.aNormal);
  gl.vertexAttribPointer(voxelAttribs.aNormal, 3, gl.FLOAT, false, VERTEX_FORMAT.STRIDE, VERTEX_FORMAT.NORMAL_OFFSET);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  return { vao, vbo, vertexCount };
}
