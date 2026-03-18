import { createVoxelProgram, getVoxelUniforms, getVoxelAttribs, DEFAULT_LIGHT_DIRECTION, DEFAULT_AMBIENT, DEFAULT_DIFFUSE } from '../shaders/voxel.js';
import { createSkyProgram, getSkyUniforms, getSkyAttribs, getDefaultColors } from '../shaders/sky.js';
import { createSelectionProgram, getSelectionUniforms, getSelectionAttribs, DEFAULT_SELECTION_COLOR, DEFAULT_BLOCK_SIZE, createWireframeCubeVertices, createWireframeCubeIndices } from '../shaders/selection.js';
import { createCameraUBO, createGlobalUBO, updateCameraUBO, updateGlobalUBO, bindCameraUBO, bindGlobalUBO, UBO_SIZES } from './ubo.js';
import { bindChunk, unbindChunk, VERTEX_FORMAT } from './buffers.js';

let voxelProgram = null;
let voxelUniforms = null;
let voxelAttribs = null;

let skyProgram = null;
let skyUniforms = null;
let skyAttribs = null;
let skyVBO = null;
let skyVAO = null;

let selectionProgram = null;
let selectionUniforms = null;
let selectionAttribs = null;
let selectionVBO = null;
let selectionIBO = null;
let selectionVAO = null;

let cameraUBO = null;
let globalUBO = null;

const SKY_BLUE = [0.53, 0.81, 0.92, 1.0];

const skyColors = getDefaultColors();

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

function initSky(gl) {
  skyProgram = createSkyProgram(gl);
  skyUniforms = getSkyUniforms(gl, skyProgram);
  skyAttribs = getSkyAttribs(gl, skyProgram);

  const skyVertices = new Float32Array([
    -100, -100, -100,  100, -100, -100,  100, 100, -100, -100, 100, -100,
    -100, -100,  100,  100, -100,  100,  100,  100,  100, -100, 100,  100
  ]);

  const skyIndices = new Uint16Array([
    0, 1, 2, 0, 2, 3,
    4, 6, 5, 4, 7, 6,
    0, 4, 5, 0, 5, 1,
    2, 6, 7, 2, 7, 3,
    0, 3, 7, 0, 7, 4,
    1, 5, 6, 1, 6, 2
  ]);

  skyVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, skyVBO);
  gl.bufferData(gl.ARRAY_BUFFER, skyVertices, gl.STATIC_DRAW);

  skyVAO = gl.createVertexArray();
  gl.bindVertexArray(skyVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, skyVBO);
  gl.enableVertexAttribArray(skyAttribs.aPosition);
  gl.vertexAttribPointer(skyAttribs.aPosition, 3, gl.FLOAT, false, 0, 0);

  const skyIBO = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyIBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, skyIndices, gl.STATIC_DRAW);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  gl.useProgram(skyProgram);
  gl.uniform3fv(skyUniforms.uDayTopColor, skyColors.dayTop);
  gl.uniform3fv(skyUniforms.uDayBottomColor, skyColors.dayBottom);
  gl.uniform3fv(skyUniforms.uNightTopColor, skyColors.nightTop);
  gl.uniform3fv(skyUniforms.uNightBottomColor, skyColors.nightBottom);
  gl.useProgram(null);
}

function initSelection(gl) {
  selectionProgram = createSelectionProgram(gl);
  selectionUniforms = getSelectionUniforms(gl, selectionProgram);
  selectionAttribs = getSelectionAttribs(gl, selectionProgram);

  const vertices = createWireframeCubeVertices();
  const indices = createWireframeCubeIndices();

  selectionVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, selectionVBO);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  selectionVAO = gl.createVertexArray();
  gl.bindVertexArray(selectionVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, selectionVBO);
  gl.enableVertexAttribArray(selectionAttribs.aPosition);
  gl.vertexAttribPointer(selectionAttribs.aPosition, 3, gl.FLOAT, false, 0, 0);

  selectionIBO = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, selectionIBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  gl.useProgram(selectionProgram);
  gl.uniform3fv(selectionUniforms.uSelectionColor, DEFAULT_SELECTION_COLOR);
  gl.uniform1f(selectionUniforms.uBlockSize, DEFAULT_BLOCK_SIZE);
  gl.useProgram(null);
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

  cameraUBO = createCameraUBO(gl);
  globalUBO = createGlobalUBO(gl);

  initSky(gl);
  initSelection(gl);

  return {
    program: voxelProgram,
    uniforms: voxelUniforms,
    attribs: voxelAttribs,
    sky: { program: skyProgram, uniforms: skyUniforms },
    selection: { program: selectionProgram, uniforms: selectionUniforms }
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

export function renderSky(gl, viewMatrix, projectionMatrix, timeOfDay = 0.5) {
  if (!skyProgram) return;

  gl.depthMask(false);
  gl.useProgram(skyProgram);

  const identityMatrix = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);

  gl.uniformMatrix4fv(skyUniforms.uModelMatrix, false, identityMatrix);
  gl.uniformMatrix4fv(skyUniforms.uViewMatrix, false, viewMatrix);
  gl.uniformMatrix4fv(skyUniforms.uProjectionMatrix, false, projectionMatrix);
  gl.uniform1f(skyUniforms.uTimeOfDay, timeOfDay);

  gl.bindVertexArray(skyVAO);
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
  gl.bindVertexArray(null);

  gl.useProgram(null);
  gl.depthMask(true);
}

export function renderSelection(gl, blockPos, modelViewProjection) {
  if (!selectionProgram || !blockPos) return;

  gl.useProgram(selectionProgram);
  gl.uniformMatrix4fv(selectionUniforms.uModelViewProjection, false, modelViewProjection);
  gl.uniform3fv(selectionUniforms.uBlockPosition, blockPos);

  gl.bindVertexArray(selectionVAO);
  gl.drawElements(gl.LINES, 24, gl.UNSIGNED_SHORT, 0);
  gl.bindVertexArray(null);

  gl.useProgram(null);
}

export function updateCamera(gl, viewMatrix, projectionMatrix) {
  if (!cameraUBO) return;
  updateCameraUBO(gl, cameraUBO, viewMatrix, projectionMatrix);
}

export function updateTimeOfDay(gl, time) {
  if (!globalUBO) return;
  const normalizedTime = (time % 24) / 24;
  updateGlobalUBO(gl, globalUBO, DEFAULT_LIGHT_DIRECTION, normalizedTime, [1, 1, 1]);
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
