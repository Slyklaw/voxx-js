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
let textureAtlas = null;
let textureAtlasLoaded = false;

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
    0, 1, 2, 0, 2, 3,      // Front face
    4, 5, 6, 4, 6, 7,      // Back face
    8, 9, 10, 8, 10, 11,   // Left face
    12, 13, 14, 12, 14, 15, // Right face
    16, 17, 18, 16, 18, 19, // Bottom face
    20, 21, 22, 20, 22, 23  // Top face
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
  console.log('[Renderer] Initializing voxel renderer...');
  voxelProgram = createVoxelProgram(gl);
  if (!voxelProgram) {
    console.error('[Renderer] Failed to create voxel shader program!');
    return null;
  }
  voxelUniforms = getVoxelUniforms(gl, voxelProgram);
  voxelAttribs = getVoxelAttribs(gl, voxelProgram);
  console.log('[Renderer] Voxel shader program created');
  console.log('[Renderer] Attribs:', voxelAttribs);
  console.log('[Renderer] Uniforms:', {
    uModelViewProjection: !!voxelUniforms.uModelViewProjection,
    uModelMatrix: !!voxelUniforms.uModelMatrix,
    uLightDirection: !!voxelUniforms.uLightDirection,
    uTextureAtlas: voxelUniforms.uTextureAtlas,
    uTextureAtlasIsNull: voxelUniforms.uTextureAtlas === null
  });

  gl.useProgram(voxelProgram);
  gl.uniform3fv(voxelUniforms.uLightDirection, DEFAULT_LIGHT_DIRECTION);
  gl.uniform1f(voxelUniforms.uAmbient, 0.6);
  gl.uniform1f(voxelUniforms.uDiffuse, 0.4);
  gl.uniform1i(voxelUniforms.uDebugMode, 0);  // Show textures
  // Set tile span (16 pixels / 1024 atlas width = 0.015625)
  gl.uniform2f(voxelUniforms.uTileSpan, 16/1024, 16/512);
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

/**
 * Load texture atlas from URL
 * @param {WebGL2RenderingContext} gl 
 * @param {string} url - Path to texture atlas image
 * @returns {WebGLTexture|null} The loaded texture or null on failure
 */
export function loadTextureAtlas(gl, url = 'textures-atlas.png') {
  console.log(`[Renderer] Loading texture atlas: ${url}`);
  
  textureAtlas = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureAtlas);
  
  // Set 1x1 blue pixel as placeholder while loading
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([255, 0, 255, 255])); // Magenta placeholder
  
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => {
    console.log(`[Renderer] Texture image loaded: ${image.width}x${image.height}`);
    gl.bindTexture(gl.TEXTURE_2D, textureAtlas);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    // Set texture parameters for pixel art (nearest neighbor)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // Use CLAMP_TO_EDGE for texture atlas - UVs should stay within tile bounds
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    textureAtlasLoaded = true;
    console.log(`[Renderer] ✓ Texture atlas loaded and ready: ${image.width}x${image.height}`);
  };
  image.onerror = (e) => {
    console.error(`[Renderer] ✗ Failed to load texture atlas: ${url}`, e);
  };
  image.src = url;
  
  return textureAtlas;
}

export function isTextureLoaded() {
  return textureAtlasLoaded;
}

export function renderChunk(gl, chunkMesh, modelMatrix, viewMatrix, projectionMatrix) {
  if (!chunkMesh || !chunkMesh.vao) {
    return;
  }

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
  
  // Bind texture atlas (always bind placeholder or real texture)
      if (textureAtlas) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureAtlas);
        if (voxelUniforms.uTextureAtlas !== null && voxelUniforms.uTextureAtlas !== undefined) {
          gl.uniform1i(voxelUniforms.uTextureAtlas, 0);
        }
        // Debug: log on first successful bind
        if (!renderChunk._loggedTextureBinding) {
          console.log(`[Renderer] Texture bound (loaded=${textureAtlasLoaded})`);
          renderChunk._loggedTextureBinding = true;
        }
      } else {
        console.warn('[Renderer] No texture atlas to bind!');
      }
  
  // gl.disable(gl.CULL_FACE); // DEBUG: Show all faces
  
  bindChunk(gl, chunkMesh.vao);
  
  if (chunkMesh.ibo && chunkMesh.indexCount > 0) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, chunkMesh.ibo);
    gl.drawElements(gl.TRIANGLES, chunkMesh.indexCount, gl.UNSIGNED_INT, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  } else {
    gl.drawArrays(gl.TRIANGLES, 0, chunkMesh.vertexCount || 0);
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
  // Computes out = a * b * c (projection * view * model)
  // First compute temp = b * c (view * model)
  const temp = new Float32Array(16);
  
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      temp[j * 4 + i] = 
        b[i] * c[j * 4] + 
        b[4 + i] * c[j * 4 + 1] + 
        b[8 + i] * c[j * 4 + 2] + 
        b[12 + i] * c[j * 4 + 3];
    }
  }
  
  // Then compute out = a * temp (projection * viewmodel)
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      out[j * 4 + i] = 
        a[i] * temp[j * 4] + 
        a[4 + i] * temp[j * 4 + 1] + 
        a[8 + i] * temp[j * 4 + 2] + 
        a[12 + i] * temp[j * 4 + 3];
    }
  }
  
  return out;
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

  // Test with STONE texture at atlas position [0, 0]
  const ATLAS_W = 1024;
  const ATLAS_H = 512;
  const TILE = 16;
  
  // Stone texture position
  const stoneAtlasX = 0;
  const stoneAtlasY = 0;
  
  // Calculate UV bounds for stone texture
  const uMin = stoneAtlasX / ATLAS_W;  // 0/1024 = 0
  const vMin = stoneAtlasY / ATLAS_H;  // 0/512 = 0
  const uMax = (stoneAtlasX + TILE) / ATLAS_W;  // 16/1024 = 0.0156
  const vMax = (stoneAtlasY + TILE) / ATLAS_H;  // 16/512 = 0.03125

  console.log(`[TestCube] Stone UVs: [${uMin}, ${vMin}] to [${uMax}, ${vMax}]`);

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
    
    // UV coordinates - map to stone texture in atlas
    // Each face of the cube gets the full stone texture
    const cornerIndex = i % 4;
    switch (cornerIndex) {
      case 0: // bottom-left
        data[base + 9] = uMin;
        data[base + 10] = vMax;  // V is flipped (bottom of texture)
        break;
      case 1: // bottom-right
        data[base + 9] = uMax;
        data[base + 10] = vMax;
        break;
      case 2: // top-left
        data[base + 9] = uMin;
        data[base + 10] = vMin;  // V is flipped (top of texture)
        break;
      case 3: // top-right
        data[base + 9] = uMax;
        data[base + 10] = vMin;
        break;
    }
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

  gl.enableVertexAttribArray(voxelAttribs.aUV);
  gl.vertexAttribPointer(voxelAttribs.aUV, 2, gl.FLOAT, false, VERTEX_FORMAT.STRIDE, VERTEX_FORMAT.UV_OFFSET);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // Remove test cube - terrain is working
  return null;
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
