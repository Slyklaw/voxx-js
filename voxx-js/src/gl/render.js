import { createVoxelProgram, getVoxelUniforms, getVoxelAttribs, DEFAULT_LIGHT_DIRECTION, DEFAULT_AMBIENT, DEFAULT_DIFFUSE } from '../shaders/voxel.js';
import { createSkyProgram, getSkyUniforms, getSkyAttribs, getDefaultColors } from '../shaders/sky.js';
import { createSelectionProgram, getSelectionUniforms, getSelectionAttribs, DEFAULT_SELECTION_COLOR, DEFAULT_BLOCK_SIZE, createWireframeCubeVertices, createWireframeCubeIndices } from '../shaders/selection.js';
import { createCameraUBO, createGlobalUBO, updateCameraUBO, updateGlobalUBO, bindCameraUBO, bindGlobalUBO, UBO_SIZES } from './ubo.js';
import { bindChunk, unbindChunk, VERTEX_FORMAT } from './buffers.js';
import { initPerformance, beginFrame, getFPS, getMetrics, logPerformance } from './performance.js';

export let voxelProgram = null;
export let voxelUniforms = null;
export let voxelAttribs = null;

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

export function renderChunk(gl, chunkMesh, modelMatrix, viewMatrix, projectionMatrix) {
  if (!chunkMesh || !chunkMesh.vao) return;

  gl.useProgram(voxelProgram);
  
  // Use identity matrix - vertex positions are already in world space from worker
  const identity = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
  
  if (voxelUniforms && viewMatrix && projectionMatrix) {
    const mvp = new Float32Array(16);
    multiplyMatrices(mvp, projectionMatrix, viewMatrix, identity);
    gl.uniformMatrix4fv(voxelUniforms.uModelViewProjection, false, mvp);
    gl.uniformMatrix4fv(voxelUniforms.uModelMatrix, false, identity);
  }
  
  gl.disable(gl.CULL_FACE); // Disable culling for now to see all faces
  
  bindChunk(gl, chunkMesh.vao);
  
  if (chunkMesh.ibo && chunkMesh.indexCount > 0) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, chunkMesh.ibo);
    gl.drawElements(gl.TRIANGLES, chunkMesh.indexCount, gl.UNSIGNED_INT, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  } else {
    gl.drawArrays(gl.TRIANGLES, 0, chunkMesh.vertexCount);
  }
  
  unbindChunk(gl);
}

export function renderChunks(gl, chunks, chunkPositions = [], viewMatrix, projectionMatrix) {
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    renderChunk(gl, chunk, null, viewMatrix, projectionMatrix);
  }
}

function createModelMatrix(x, y, z) {
  return new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    x, y, z, 1
  ]);
}

function multiplyMatrices(out, a, b, c) {
  const ae = a, be = b, ce = c;
  
  const a00 = ae[0], a01 = ae[1], a02 = ae[2], a03 = ae[3];
  const a10 = ae[4], a11 = ae[5], a12 = ae[6], a13 = ae[7];
  const a20 = ae[8], a21 = ae[9], a22 = ae[10], a23 = ae[11];
  const a30 = ae[12], a31 = ae[13], a32 = ae[14], a33 = ae[15];

  let b0 = be[0], b1 = be[1], b2 = be[2], b3 = be[3];
  out[0] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[1] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[2] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[3] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

  b0 = be[4]; b1 = be[5]; b2 = be[6]; b3 = be[7];
  out[4] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[5] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[6] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[7] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

  b0 = be[8]; b1 = be[9]; b2 = be[10]; b3 = be[11];
  out[8] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[9] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[10] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[11] = b0*a03 + b1*a13 + b2*a23 + b3*a33;

  b0 = be[12]; b1 = be[13]; b2 = be[14]; b3 = be[15];
  out[12] = b0*a00 + b1*a10 + b2*a20 + b3*a30;
  out[13] = b0*a01 + b1*a11 + b2*a21 + b3*a31;
  out[14] = b0*a02 + b1*a12 + b2*a22 + b3*a32;
  out[15] = b0*a03 + b1*a13 + b2*a23 + b3*a33;
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

let renderCallback = null;
let animationFrameId = null;
let lastTimestamp = 0;
let canvas = null;
let glContext = null;
let currentViewMatrix = null;
let currentProjectionMatrix = null;
let currentTimeOfDay = 0.5;

export function renderLoop(canvasEl, gl, renderFn) {
  canvas = canvasEl;
  glContext = gl;
  renderCallback = renderFn;
  lastTimestamp = 0;
  
  initPerformance();
  
  function frame(timestamp) {
    const deltaTime = beginFrame(timestamp);
    
    if (renderCallback) {
      renderCallback(gl, deltaTime, timestamp);
    }
    
    if (currentViewMatrix && currentProjectionMatrix) {
      renderSky(glContext, currentViewMatrix, currentProjectionMatrix, currentTimeOfDay);
    }
    
    animationFrameId = requestAnimationFrame(frame);
  }
  
  animationFrameId = requestAnimationFrame(frame);
  
  return {
    stop: () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    },
    setViewMatrix: (view, proj) => {
      currentViewMatrix = view;
      currentProjectionMatrix = proj;
    },
    setTimeOfDay: (time) => {
      currentTimeOfDay = time;
    }
  };
}

export { getFPS, getMetrics, logPerformance };
