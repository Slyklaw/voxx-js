import { createVoxelProgram, getVoxelUniforms, getVoxelAttribs, DEFAULT_LIGHT_DIRECTION, DEFAULT_AMBIENT, DEFAULT_DIFFUSE } from '../shaders/voxel.js';
import { createSkyProgram, getSkyUniforms, getSkyAttribs } from '../shaders/sky.js';
import { createSelectionProgram, getSelectionUniforms, getSelectionAttribs, DEFAULT_SELECTION_COLOR, DEFAULT_BLOCK_SIZE, createWireframeCubeVertices, createWireframeCubeIndices } from '../shaders/selection.js';
import { createSSAOProgram, getSSAOUniforms, generateKernelSamples, createNoiseTexture } from '../shaders/ssao.js';
import { createBlurProgram, getBlurUniforms } from '../shaders/blur.js';
import { createCompositeProgram, getCompositeUniforms } from '../shaders/composite.js';
import { createCameraUBO, createGlobalUBO, updateCameraUBO, updateGlobalUBO, bindCameraUBO, bindGlobalUBO, UBO_SIZES } from './ubo.js';
import { initPerformance, beginFrame, getFPS, getMetrics, logPerformance, beginDrawCalls, incrementDrawCalls, checkFPSWarning } from './performance.js';
import { bindChunk, unbindChunk, initBufferPool } from './buffers.js';
import { createGBufferFBO, disposeGBuffer, checkFloatTextureSupport, createSSAOBuffer, resizeSSAOBuffer, disposeSSAOBuffer, createShadowMapFBO, disposeShadowMapFBO } from './fbo.js';
import { createShadowProgram, getShadowUniforms } from '../shaders/shadow.js';
import { createInstanceBuffer, getInstanceBuffer, getInstanceCount, disposeInstanceBuffer } from '../chunk/chunkManager.js';
import { CHUNK_SIZE } from '../chunk/chunkManager.js';
import { DEBUG, LIGHTING_CONFIG, LIGHTING_DEFAULTS, ATLAS_CONFIG, SKY_STOP_POSITIONS, SKY_TOP_COLOR_STOPS, SKY_BOTTOM_COLOR_STOPS, SUN_LIGHT_DIRECTION_STOPS, SUN_LIGHT_COLOR_STOPS, SUN_LIGHT_INTENSITY_STOPS, SSAO_CONFIG } from '../../config.js';

// Interpolate between two RGB arrays
function lerpColor(color1, color2, t) {
  return [
    color1[0] + (color2[0] - color1[0]) * t,
    color1[1] + (color2[1] - color1[1]) * t,
    color1[2] + (color2[2] - color1[2]) * t
  ];
}

// Get sky colors for a given hour (0-24)
function getSkyColorsForHour(hour) {
  const stops = SKY_STOP_POSITIONS;
  const topStops = SKY_TOP_COLOR_STOPS;
  const bottomStops = SKY_BOTTOM_COLOR_STOPS;
  
  // Handle wraparound (hour >= 24)
  if (hour >= stops[stops.length - 1]) {
    return { top: topStops[topStops.length - 1], bottom: bottomStops[bottomStops.length - 1] };
  }
  
  // Find the interval
  for (let i = 0; i < stops.length - 1; i++) {
    if (hour >= stops[i] && hour < stops[i + 1]) {
      const start = stops[i];
      const end = stops[i + 1];
      const t = (hour - start) / (end - start);
      const top = lerpColor(topStops[i], topStops[i + 1], t);
      const bottom = lerpColor(bottomStops[i], bottomStops[i + 1], t);
      return { top, bottom };
    }
  }
  
  // Default to noon
  return { top: topStops[4], bottom: bottomStops[4] };
}

// Interpolate between two 3D vectors
function lerpVec3(v1, v2, t) {
  return [
    v1[0] + (v2[0] - v1[0]) * t,
    v1[1] + (v2[1] - v1[1]) * t,
    v1[2] + (v2[2] - v1[2]) * t
  ];
}

// Get sun lighting info for a given hour (0-24)
function getSunInfo(hour) {
  const stops = SKY_STOP_POSITIONS;
  const dirStops = SUN_LIGHT_DIRECTION_STOPS;
  const colorStops = SUN_LIGHT_COLOR_STOPS;
  const intensityStops = SUN_LIGHT_INTENSITY_STOPS;
  
  // Handle wraparound
  if (hour >= stops[stops.length - 1]) {
    return {
      direction: dirStops[dirStops.length - 1],
      color: colorStops[colorStops.length - 1],
      intensity: intensityStops[intensityStops.length - 1]
    };
  }
  
  // Find the interval
  for (let i = 0; i < stops.length - 1; i++) {
    if (hour >= stops[i] && hour < stops[i + 1]) {
      const start = stops[i];
      const end = stops[i + 1];
      const t = (hour - start) / (end - start);
      return {
        direction: lerpVec3(dirStops[i], dirStops[i + 1], t),
        color: lerpColor(colorStops[i], colorStops[i + 1], t),
        intensity: intensityStops[i] + (intensityStops[i + 1] - intensityStops[i]) * t
      };
    }
  }
  
  // Default to noon
  return {
    direction: dirStops[4],
    color: colorStops[4],
    intensity: intensityStops[4]
  };
}

let currentLightSpaceMatrix = null;

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

// G-buffer for deferred rendering / SSAO
let gbuffer = null;
let gbufferSupported = false;
let gbufferSupportInfo = null;
let gbufferActive = false;

// SSAO resources
let ssaoProgram = null;
let ssaoUniforms = null;
let ssaoBuffer = null;
let ssaoBlurBuffer = null;  // Separate buffer for blur output (prevents feedback loop)
let ssaoKernel = null;
let ssaoNoiseTexture = null;
let blurProgram = null;
let blurUniforms = null;
let compositeProgram = null;
let compositeUniforms = null;

// Shadow Mapping resources
let shadowProgram = null;
let shadowUniforms = null;
export let shadowMapObj = null;

export let ssaoSettings = {
  enabled: SSAO_CONFIG.ENABLED,
  intensity: SSAO_CONFIG.INTENSITY,
  radius: SSAO_CONFIG.RADIUS,
  bias: SSAO_CONFIG.BIAS
};

let currentWireframeMode = false;
let currentDebugMode = false;

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
  // Initialize with default colors (noon)
  gl.uniform3f(skyUniforms.uTopColor, 0.53, 0.81, 0.92);
  gl.uniform3f(skyUniforms.uBottomColor, 1.0, 1.0, 1.0);
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

function drawFullscreenQuad(gl) {
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function initSSAO(gl) {
  // Generate kernel samples
  ssaoKernel = generateKernelSamples(32);
  // Create noise texture
  ssaoNoiseTexture = createNoiseTexture(gl, 4);
  // Compile SSAO shader
  ssaoProgram = createSSAOProgram(gl);
  ssaoUniforms = getSSAOUniforms(gl, ssaoProgram);
  // Upload kernel samples to uniform array
  gl.useProgram(ssaoProgram);
  for (let i = 0; i < ssaoKernel.length; ++i) {
    gl.uniform3fv(gl.getUniformLocation(ssaoProgram, `samples[${i}]`), ssaoKernel[i]);
  }
  // Create SSAO buffers at half resolution
  if (gbufferSupported) {
    ssaoBuffer = createSSAOBuffer(gl, gl.canvas.width, gl.canvas.height, gbufferSupportInfo);
    ssaoBlurBuffer = createSSAOBuffer(gl, gl.canvas.width, gl.canvas.height, gbufferSupportInfo);  // Separate buffer for blur output
  }
  // Create blur shader
  blurProgram = createBlurProgram(gl);
  blurUniforms = getBlurUniforms(gl, blurProgram);
  // Create composite shader
  compositeProgram = createCompositeProgram(gl);
  compositeUniforms = getCompositeUniforms(gl, compositeProgram);
  gl.useProgram(null);
}

export function updateSSAOSettings(gl, settings) {
  Object.assign(ssaoSettings, settings);
  
  if (ssaoProgram && ssaoUniforms) {
    gl.useProgram(ssaoProgram);
    if (settings.radius !== undefined) gl.uniform1f(ssaoUniforms.radius, ssaoSettings.radius);
    if (settings.bias !== undefined) gl.uniform1f(ssaoUniforms.bias, ssaoSettings.bias);
  }
  
  if (compositeProgram && compositeUniforms) {
    gl.useProgram(compositeProgram);
    if (settings.intensity !== undefined) gl.uniform1f(compositeUniforms.uAOIntensity, ssaoSettings.intensity);
  }
}

function renderSSAOPass(gl, projectionMatrix) {
  if (!gbuffer || !ssaoProgram || !ssaoBuffer || !ssaoSettings.enabled) return;
  
  // Bind SSAO FBO
  gl.bindFramebuffer(gl.FRAMEBUFFER, ssaoBuffer.fbo);
  gl.viewport(0, 0, ssaoBuffer.width, ssaoBuffer.height);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  // Reset state
  gl.disable(gl.SCISSOR_TEST);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  
  // Use SSAO program
  gl.useProgram(ssaoProgram);
  
  // Bind G-buffer textures
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gbuffer.color[1]); // oct-encoded normals
  gl.uniform1i(ssaoUniforms.gNormal, 0);
  
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, gbuffer.color[2]); // view-space position
  gl.uniform1i(ssaoUniforms.gPosition, 1);
  
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, ssaoNoiseTexture);
  gl.uniform1i(ssaoUniforms.texNoise, 2);
  
  // Upload projection matrix (needed to project sample positions to clip space)
  if (projectionMatrix && ssaoUniforms.projection !== null) {
    gl.uniformMatrix4fv(ssaoUniforms.projection, false, projectionMatrix);
  }
  
  // Set uniforms
  gl.uniform2f(ssaoUniforms.noiseScale, 
    ssaoBuffer.width / 4.0, ssaoBuffer.height / 4.0);
  gl.uniform1f(ssaoUniforms.radius, ssaoSettings.radius);
  gl.uniform1f(ssaoUniforms.bias, ssaoSettings.bias);
  
  // Draw fullscreen quad
  drawFullscreenQuad(gl);
  
  gl.useProgram(null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function renderBlurPass(gl) {
  if (!ssaoBuffer || !ssaoBlurBuffer || !blurProgram) return;
  
  // Bind blur FBO (separate from SSAO to avoid feedback loop)
  gl.bindFramebuffer(gl.FRAMEBUFFER, ssaoBlurBuffer.fbo);
  gl.viewport(0, 0, ssaoBlurBuffer.width, ssaoBlurBuffer.height);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  // Reset state
  gl.disable(gl.SCISSOR_TEST);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  
  gl.useProgram(blurProgram);
  
  // Bind SSAO output texture as input
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, ssaoBuffer.texture);
  gl.uniform1i(blurUniforms.ssaoInput, 0);

  // Bind G-buffer positions to detect edges during blur (prevents bleeding)
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, gbuffer.color[2]);
  gl.uniform1i(blurUniforms.gPosition, 1);
  
  drawFullscreenQuad(gl);
  
  gl.useProgram(null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function renderCompositePass(gl, canvas) {
  if (!compositeProgram || !gbuffer || !ssaoBlurBuffer) return;
  
  // Bind default framebuffer (screen)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  
  // Reset state that might leak from previous passes
  gl.disable(gl.SCISSOR_TEST);
  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  
  gl.useProgram(compositeProgram);
  
  // Bind G-buffer albedo (color[0]) to texture unit 0
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gbuffer.color[0]);
  gl.uniform1i(compositeUniforms.gAlbedo, 0);
  
  // Bind blurred AO to texture unit 1
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, ssaoBlurBuffer.texture);
  gl.uniform1i(compositeUniforms.ssaoBlur, 1);
  
  // Set intensity uniform
  gl.uniform1f(compositeUniforms.uAOIntensity, ssaoSettings.intensity);
  
  drawFullscreenQuad(gl);
  
  gl.useProgram(null);
}

export function initRenderer(gl) {
  if (DEBUG) console.log('[Renderer] Initializing voxel renderer...');
  
  // Initialize buffer pool for WebGL resource reuse
  initBufferPool(gl, 32);
  if (DEBUG) console.log('[Renderer] Buffer pool initialized');
  voxelProgram = createVoxelProgram(gl);
  if (!voxelProgram) {
    console.error('[Renderer] Failed to create voxel shader program!');
    return null;
  }
  voxelUniforms = getVoxelUniforms(gl, voxelProgram);
  voxelAttribs = getVoxelAttribs(gl, voxelProgram);
  if (DEBUG) {
    console.log('[Renderer] Voxel shader program created');
    console.log('[Renderer] Attribs:', voxelAttribs);
    console.log('[Renderer] Uniforms:', {
      uViewMatrix: !!voxelUniforms.uViewMatrix,
      uProjectionMatrix: !!voxelUniforms.uProjectionMatrix,
      uModelMatrix: !!voxelUniforms.uModelMatrix,
      uLightDirection: !!voxelUniforms.uLightDirection,
      uTextureAtlas: voxelUniforms.uTextureAtlas,
      uTextureAtlasIsNull: voxelUniforms.uTextureAtlas === null
    });
  }

  gl.useProgram(voxelProgram);
  gl.uniform3fv(voxelUniforms.uLightDirection, DEFAULT_LIGHT_DIRECTION);
  gl.uniform3f(voxelUniforms.uLightColor, 1.0, 1.0, 1.0);  // Default white
  gl.uniform1f(voxelUniforms.uLightIntensity, 1.0);          // Default full intensity
  gl.uniform1f(voxelUniforms.uAmbient, LIGHTING_DEFAULTS.AMBIENT);
  gl.uniform1f(voxelUniforms.uDiffuse, LIGHTING_DEFAULTS.DIFFUSE);
  gl.uniform1i(voxelUniforms.uDebugMode, 0);  // Show textures
  // Set tile span using atlas config
  gl.uniform2f(voxelUniforms.uTileSpan, ATLAS_CONFIG.UV_SCALE_U, ATLAS_CONFIG.UV_SCALE_V);
  gl.useProgram(null);

  // Bind CameraUBO to voxel shader if block exists
  const cameraUBOBlockIndex = gl.getUniformBlockIndex(voxelProgram, 'CameraUBO');
  if (cameraUBOBlockIndex !== gl.INVALID_INDEX) {
    gl.uniformBlockBinding(voxelProgram, cameraUBOBlockIndex, 0); // binding point 0
    if (DEBUG) console.log('[Renderer] CameraUBO bound to voxel shader');
  }

  cameraUBO = createCameraUBO(gl);
  globalUBO = createGlobalUBO(gl);

  initSky(gl);
  initSelection(gl);

  // Initialize G-buffer for deferred rendering
  gbufferSupportInfo = checkFloatTextureSupport(gl);
  gbufferSupported = gbufferSupportInfo.supported;
  if (gbufferSupported) {
    try {
      gbuffer = createGBufferFBO(gl, gl.canvas.width, gl.canvas.height, gbufferSupportInfo);
      if (DEBUG) console.log('[Renderer] G-buffer initialized');
    } catch (e) {
      console.error('[Renderer] Failed to create G-buffer:', e);
      gbufferSupported = false;
    }
  } else {
    console.warn('[Renderer] Float textures not supported, SSAO disabled');
  }

  // Initialize Shadow Map (High Resolution 4096)
  try {
    shadowMapObj = createShadowMapFBO(gl, 4096);
    shadowProgram = createShadowProgram(gl);
    shadowUniforms = getShadowUniforms(gl, shadowProgram);
    if (DEBUG) console.log('[Renderer] Shadow Map initialized');
  } catch (e) {
    console.error('[Renderer] Failed to init Shadow Map:', e);
  }

  // Initialize SSAO resources
  if (gbufferSupported) {
    initSSAO(gl);
  }

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
  if (DEBUG) console.log(`[Renderer] Loading texture atlas: ${url}`);
  
  textureAtlas = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, textureAtlas);
  
  // Set 1x1 blue pixel as placeholder while loading
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([255, 0, 255, 255])); // Magenta placeholder
  
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => {
    if (DEBUG) console.log(`[Renderer] Texture image loaded: ${image.width}x${image.height}`);
    gl.bindTexture(gl.TEXTURE_2D, textureAtlas);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    // Set texture parameters for pixel art (nearest neighbor)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // Use CLAMP_TO_EDGE for texture atlas - UVs should stay within tile bounds
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    textureAtlasLoaded = true;
    if (DEBUG) console.log(`[Renderer] ✓ Texture atlas loaded and ready: ${image.width}x${image.height}`);
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

export function renderChunk(gl, chunkMesh, modelMatrix, viewMatrix, projectionMatrix, wireframe = false, debugMode = false, chunkX = 0, chunkZ = 0) {
  if (!chunkMesh || !chunkMesh.vao) {
    return;
  }

  gl.useProgram(voxelProgram);
  
  // Use identity matrix - vertex positions transformed by instance offset in shader
  // PERF-01: Chunk world position computed in vertex shader using aChunkOffset
  const identity = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
  
  if (voxelUniforms && viewMatrix && projectionMatrix) {
    // Pass separate view and projection matrices (for view-space transforms)
    if (voxelUniforms.uViewMatrix !== undefined && voxelUniforms.uViewMatrix !== null) {
      gl.uniformMatrix4fv(voxelUniforms.uViewMatrix, false, viewMatrix);
    }
    if (voxelUniforms.uProjectionMatrix !== undefined && voxelUniforms.uProjectionMatrix !== null) {
      gl.uniformMatrix4fv(voxelUniforms.uProjectionMatrix, false, projectionMatrix);
    }
    gl.uniformMatrix4fv(voxelUniforms.uModelMatrix, false, identity);
  }
  
  // Set float texture fallback uniform if exists
  if (voxelUniforms.uUseFloatTextures !== undefined && voxelUniforms.uUseFloatTextures !== null) {
    gl.uniform1i(voxelUniforms.uUseFloatTextures, gbufferActive ? 1 : 0);
  }
  
  // Set shadow uniforms if they exist
  if (currentLightSpaceMatrix && voxelUniforms.uLightSpaceMatrix !== undefined) {
    gl.uniformMatrix4fv(voxelUniforms.uLightSpaceMatrix, false, currentLightSpaceMatrix);
  }
  if (shadowMapObj && voxelUniforms.uShadowMap !== undefined && shadowMapObj.texture) {
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, shadowMapObj.texture);
    gl.uniform1i(voxelUniforms.uShadowMap, 2);
  }
  
  // Set debug mode uniform
  if (voxelUniforms && voxelUniforms.uDebugMode !== undefined) {
    gl.uniform1i(voxelUniforms.uDebugMode, debugMode ? 1 : 0);
  }
  
  // Bind texture atlas (always bind placeholder or real texture)
      if (textureAtlas) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, textureAtlas);
        if (voxelUniforms.uTextureAtlas !== null && voxelUniforms.uTextureAtlas !== undefined) {
          gl.uniform1i(voxelUniforms.uTextureAtlas, 0);
        }
        // Debug: log on first successful bind
        if (DEBUG && !renderChunk._loggedTextureBinding) {
          console.log(`[Renderer] Texture bound (loaded=${textureAtlasLoaded})`);
          renderChunk._loggedTextureBinding = true;
        }
      } else {
        console.warn('[Renderer] No texture atlas to bind!');
      }
  
  // gl.disable(gl.CULL_FACE); // DEBUG: Show all faces
  
  bindChunk(gl, chunkMesh.vao);
  
  if (wireframe && chunkMesh.wireIbo && chunkMesh.wireIndexCount > 0) {
    // Wireframe mode: draw as lines using wireframe indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, chunkMesh.wireIbo);
    gl.drawElements(gl.LINES, chunkMesh.wireIndexCount, gl.UNSIGNED_INT, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  } else if (chunkMesh.ibo && chunkMesh.indexCount > 0) {
    // Normal mode: draw triangles using regular indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, chunkMesh.ibo);
    gl.drawElements(gl.TRIANGLES, chunkMesh.indexCount, gl.UNSIGNED_INT, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
  } else {
    gl.drawArrays(gl.TRIANGLES, 0, chunkMesh.vertexCount || 0);
  }
  
  unbindChunk(gl);
}

export function setWireframeMode(gl, enabled) {
  currentWireframeMode = enabled;
}

export function setDebugMode(gl, enabled) {
  currentDebugMode = enabled;
  if (voxelUniforms && voxelUniforms.uDebugMode !== undefined) {
    gl.useProgram(voxelProgram);
    gl.uniform1i(voxelUniforms.uDebugMode, enabled ? 1 : 0);
  }
}

export function renderChunks(gl, chunks, chunkPositions = [], viewMatrix, projectionMatrix, wireframe = false, debugMode = false) {
  if (!chunks || chunks.length === 0) return;
  
  beginDrawCalls();
  
  // Filter to visible chunks, then sort for deterministic rendering
  // Note: frustum culling was removed due to issues with plane extraction math
  const visibleChunks = chunks
    .filter(chunk => {
      // chunk is a Chunk object with .chunkX and .chunkZ properties
      // Also check it has a ready WebGL mesh
      return chunk && chunk._webglMesh;
    })
    .sort((a, b) => {
      // Sort by key for deterministic draw order
      const keyA = `${a.chunkX},${a.chunkZ}`;
      const keyB = `${b.chunkX},${b.chunkZ}`;
      return keyA.localeCompare(keyB);
    });
  
  if (visibleChunks.length === 0) return;
  
  // PERF-01: Set up instance buffer with per-chunk world positions
  // This moves matrix calculation from JavaScript to vertex shader
  const instanceBuffer = createInstanceBuffer(gl, visibleChunks);
  
  // Set up chunk offset attribute (location 6 = aChunkOffset in voxel shader)
  const chunkOffsetLoc = 6; // matches layout(location = 6) in voxel.js
  if (instanceBuffer && voxelAttribs) {
    gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
    gl.enableVertexAttribArray(chunkOffsetLoc);
    gl.vertexAttribPointer(chunkOffsetLoc, 3, gl.FLOAT, false, 0, 0);
    // Set divisor to 1 so attribute advances once per instance (chunk), not per vertex
    gl.vertexAttribDivisor(chunkOffsetLoc, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }
  
  // Render each visible chunk using instance attribute for position
  for (let i = 0; i < visibleChunks.length; i++) {
    const chunk = visibleChunks[i];
    // chunk._webglMesh is the WebGL mesh object created by createChunkMeshFromData
    // Pass chunk position as instance data - shader will use aChunkOffset attribute
    renderChunk(gl, chunk._webglMesh, null, viewMatrix, projectionMatrix, wireframe, debugMode, chunk.chunkX, chunk.chunkZ);
    incrementDrawCalls(1);
  }
  
  // Clean up instance attribute state (reset divisor for other renders)
  if (instanceBuffer) {
    gl.vertexAttribDivisor(chunkOffsetLoc, 0);
    gl.disableVertexAttribArray(chunkOffsetLoc);
  }
  
  if (DEBUG && visibleChunks.length > 0) {
    console.log(`[Renderer] Chunks: ${chunks.length} total, ${visibleChunks.length} visible (${chunks.length - visibleChunks.length} culled)`);
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

  // Compute sky colors for this time of day
  const colors = getSkyColorsForHour(timeOfDay);

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
  
  // Pass computed sky colors
  gl.uniform3f(skyUniforms.uTopColor, colors.top[0], colors.top[1], colors.top[2]);
  gl.uniform3f(skyUniforms.uBottomColor, colors.bottom[0], colors.bottom[1], colors.bottom[2]);

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
  
  // Get dynamic sun lighting for this time
  const sunInfo = getSunInfo(time);
  
  const normalizedTime = (time % 24) / 24;
  updateGlobalUBO(gl, globalUBO, sunInfo.direction, normalizedTime, sunInfo.color);
  
  // Also update voxel shader uniforms directly with dynamic lighting
  if (voxelProgram && voxelUniforms) {
    gl.useProgram(voxelProgram);
    gl.uniform3fv(voxelUniforms.uLightDirection, sunInfo.direction);
    gl.uniform3f(voxelUniforms.uLightColor, sunInfo.color[0], sunInfo.color[1], sunInfo.color[2]);
    gl.uniform1f(voxelUniforms.uLightIntensity, sunInfo.intensity);
    gl.useProgram(null);
  }
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

  if (DEBUG) console.log(`[TestCube] Stone UVs: [${uMin}, ${vMin}] to [${uMax}, ${vMax}]`);

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
    
    // Check FPS and warn if below threshold
    checkFPSWarning();
    
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

export function renderVoxelsToGBuffer(gl, canvas, chunks, chunkPositions, viewMatrix, projectionMatrix, wireframe = false, debugMode = false, timeOfDay = 0.5, renderOutlineCallback = null, cameraPos = null) {
  // DEBUG: Skip G-buffer and render directly to test if voxels work
  if (window.__DEBUG_SKIP_GBUFFER) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.7, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    renderChunks(gl, chunks, chunkPositions, viewMatrix, projectionMatrix, wireframe, debugMode);
    return;
  }
  
  if (!isGBufferSupported() || !gbuffer) {
    // Fallback: render directly to screen
    renderChunks(gl, chunks, chunkPositions, viewMatrix, projectionMatrix, wireframe, debugMode);
    return;
  }
  
  // ── PASS 0: Shadow Map ──────────────────────────────────────────────────
  currentLightSpaceMatrix = null;
  if (shadowMapObj && shadowProgram && window.createLightSpaceMatrix && cameraPos) {
    const sunInfo = getSunInfo(timeOfDay);
    currentLightSpaceMatrix = window.createLightSpaceMatrix(cameraPos, sunInfo.direction);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, shadowMapObj.fbo);
    gl.viewport(0, 0, shadowMapObj.size, shadowMapObj.size);
    gl.clear(gl.DEPTH_BUFFER_BIT);
    
    // Disable culling entirely for the shadow pass because voxel meshes only contain outer shell faces!
    // Front face culling here would delete the only geometry available to cast the shadows.
    gl.disable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    
    // Disable color rendering during depth pass
    gl.colorMask(false, false, false, false);
    
    gl.useProgram(shadowProgram);
    gl.uniformMatrix4fv(shadowUniforms.uLightSpaceMatrix, false, currentLightSpaceMatrix);
    
    // Draw all chunks rapidly to depth buffer
    for (let i = 0; i < chunks.length; i++) {
      const chunkMesh = chunks[i];
      // Skip chunks that don't have valid geometry structures
      if (!chunkMesh || !chunkMesh.vao || !chunkMesh.ibo || !chunkMesh.indexCount) continue;
      bindChunk(gl, chunkMesh.vao);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, chunkMesh.ibo);
      gl.drawElements(gl.TRIANGLES, chunkMesh.indexCount, gl.UNSIGNED_INT, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
      unbindChunk(gl);
    }
    
    // Restore generic state
    gl.disable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.colorMask(true, true, true, true);
  }
  
  // Bind G-buffer FBO
  const bound = bindGBuffer(gl);
  if (!bound) {
    renderChunks(gl, chunks, chunkPositions, viewMatrix, projectionMatrix, wireframe, debugMode);
    return;
  }
  
  gbufferActive = true;
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  gl.depthMask(true);
  
  // Clear all G-buffer channels and depth
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
  // ── Pass 1a: Sky into albedo only ─────────────────────────────────────────
  // Render sky to albedo attachment only; normals+position remain zero (sky detection)
  gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
  renderSky(gl, viewMatrix, projectionMatrix, timeOfDay);
  
  // ── Pass 1b: Geometry to full MRT ─────────────────────────────────────────
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
  gl.depthMask(true);
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);
  renderChunks(gl, chunks, chunkPositions, viewMatrix, projectionMatrix, wireframe, debugMode);
  
  if (renderOutlineCallback) {
    // Only draw wireframe outline to albedo attachment (COLOR_ATTACHMENT0) so it doesn't mess with SSAO normal/depth passes
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.enable(gl.DEPTH_TEST);
    renderOutlineCallback();
  }
  
  // Unbind G-buffer
  unbindGBuffer(gl, canvas);
  gbufferActive = false;
  
  if (ssaoSettings.enabled && ssaoProgram && ssaoBuffer && ssaoBlurBuffer) {
    // ── Pass 2: SSAO ────────────────────────────────────────────────────────
    renderSSAOPass(gl, projectionMatrix);
    
    // ── Pass 3: Blur ────────────────────────────────────────────────────────
    renderBlurPass(gl);
    
    // ── Pass 4: Composite (albedo × AO → screen) ────────────────────────────
    renderCompositePass(gl, canvas);
  } else {
    // SSAO disabled: blit albedo directly to screen without AO
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    if (compositeProgram && compositeUniforms) {
      gl.useProgram(compositeProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, gbuffer.color[0]);
      gl.uniform1i(compositeUniforms.gAlbedo, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, gbuffer.color[0]); // dummy AO
      gl.uniform1i(compositeUniforms.ssaoBlur, 1);
      gl.uniform1f(compositeUniforms.uAOIntensity, 0.0); // 0 = passthrough albedo
      drawFullscreenQuad(gl);
      gl.useProgram(null);
    }
  }
}

export { getFPS, getMetrics, logPerformance };

// G-buffer management functions
export function bindGBuffer(gl) {
  if (!gbuffer) return false;
  gl.bindFramebuffer(gl.FRAMEBUFFER, gbuffer.fbo);
  gl.viewport(0, 0, gbuffer.width, gbuffer.height);
  // CRITICAL: Must set drawBuffers for MRT - not persisted across FBO binds
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
  // Fix pixel alignment for non-4-aligned widths
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
  return true;
}

export function unbindGBuffer(gl, canvas) {
  // Unbind framebuffer first
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  // Then reset draw buffers for the default framebuffer
  gl.drawBuffers([gl.BACK]);
  if (canvas) {
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
}

export function getGBufferTextures() {
  if (!gbuffer) return null;
  return {
    albedo: gbuffer.color[0],
    normal: gbuffer.color[1],
    depth: gbuffer.depth
  };
}

export function isGBufferSupported() {
  return gbufferSupported;
}

export function getSSAOProgram() {
  return ssaoProgram;
}

export function getSSAOUniformsState() {
  return ssaoUniforms;
}

export function getSSAOBuffer() {
  return ssaoBuffer;
}

export function getGBuffer() {
  return gbuffer;
}

export function resizeGBufferForCanvas(gl, canvas) {
  if (gbuffer && canvas.width > 0 && canvas.height > 0) {
    if (gbuffer.width !== canvas.width || gbuffer.height !== canvas.height) {
      const newGbuffer = createGBufferFBO(gl, canvas.width, canvas.height, gbufferSupportInfo);
      disposeGBuffer(gl, gbuffer);
      gbuffer = newGbuffer;
      if (DEBUG) console.log(`[Renderer] G-buffer resized to ${canvas.width}x${canvas.height}`);
    }
  }
}
