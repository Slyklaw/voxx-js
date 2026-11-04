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
import { createInstanceBuffer, getInstanceBuffer, getInstanceCount, disposeInstanceBuffer, getVisibleChunks } from '../chunk/chunkManager.js';
import { CHUNK_SIZE, defaultChunkManager } from '../chunk/chunkManager.js';
import { DEBUG, LIGHTING_CONFIG, LIGHTING_DEFAULTS, ATLAS_CONFIG, SKY_STOP_POSITIONS, SKY_TOP_COLOR_STOPS, SKY_BOTTOM_COLOR_STOPS, SUN_LIGHT_DIRECTION_STOPS, SUN_LIGHT_COLOR_STOPS, SUN_LIGHT_INTENSITY_STOPS, SSAO_CONFIG } from '../../config.js';

const renderState = {
  currentLightSpaceMatrix: null,
  lastShadowPassDuration: 0,
  skyProgram: null,
  skyUniforms: null,
  skyAttribs: null,
  skyVBO: null,
  skyVAO: null,
  selectionProgram: null,
  selectionUniforms: null,
  selectionAttribs: null,
  selectionVBO: null,
  selectionIBO: null,
  selectionVAO: null,
  cameraUBO: null,
  globalUBO: null,
  textureAtlas: null,
  textureAtlasLoaded: false,
  gbuffer: null,
  gbufferSupported: false,
  gbufferSupportInfo: null,
  gbufferActive: false,
  ssaoProgram: null,
  ssaoUniforms: null,
  ssaoBuffer: null,
  ssaoBlurBuffer: null,
  ssaoKernel: null,
  ssaoNoiseTexture: null,
  blurProgram: null,
  blurUniforms: null,
  compositeProgram: null,
  compositeUniforms: null,
  shadowProgram: null,
  shadowUniforms: null,
  currentWireframeMode: false,
  currentDebugMode: false,
  renderCallback: null,
  animationFrameId: null,
  lastTimestamp: 0,
  glContext: null,
  currentViewMatrix: null,
  currentProjectionMatrix: null,
  currentTimeOfDay: 0.5,
  canvas: null,
};


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


export function getShadowPassDuration() {
  return renderState.lastShadowPassDuration;
}

export let voxelProgram = null;
export let voxelUniforms = null;
export let voxelAttribs = null;




// G-buffer for deferred rendering / SSAO

// SSAO resources
// ssaoBlurBuffer initialized in renderState

// Shadow Mapping resources
export let shadowMapObj = null;

export let ssaoSettings = {
  enabled: SSAO_CONFIG.ENABLED,
  intensity: SSAO_CONFIG.INTENSITY,
  radius: SSAO_CONFIG.RADIUS,
  bias: SSAO_CONFIG.BIAS
};


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
  renderState.skyProgram = createSkyProgram(gl);
  renderState.skyUniforms = getSkyUniforms(gl, renderState.skyProgram);
  renderState.skyAttribs = getSkyAttribs(gl, renderState.skyProgram);

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

  renderState.skyVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, renderState.skyVBO);
  gl.bufferData(gl.ARRAY_BUFFER, skyVertices, gl.STATIC_DRAW);

  renderState.skyVAO = gl.createVertexArray();
  gl.bindVertexArray(renderState.skyVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, renderState.skyVBO);
  gl.enableVertexAttribArray(renderState.skyAttribs.aPosition);
  gl.vertexAttribPointer(renderState.skyAttribs.aPosition, 3, gl.FLOAT, false, 0, 0);

  const skyIBO = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyIBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, skyIndices, gl.STATIC_DRAW);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  gl.useProgram(renderState.skyProgram);
  // Initialize with default colors (noon)
  gl.uniform3f(renderState.skyUniforms.uTopColor, 0.53, 0.81, 0.92);
  gl.uniform3f(renderState.skyUniforms.uBottomColor, 1.0, 1.0, 1.0);
  gl.useProgram(null);
}

function initSelection(gl) {
  renderState.selectionProgram = createSelectionProgram(gl);
  renderState.selectionUniforms = getSelectionUniforms(gl, renderState.selectionProgram);
  renderState.selectionAttribs = getSelectionAttribs(gl, renderState.selectionProgram);

  const vertices = createWireframeCubeVertices();
  const indices = createWireframeCubeIndices();

  renderState.selectionVBO = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, renderState.selectionVBO);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

  renderState.selectionVAO = gl.createVertexArray();
  gl.bindVertexArray(renderState.selectionVAO);
  gl.bindBuffer(gl.ARRAY_BUFFER, renderState.selectionVBO);
  gl.enableVertexAttribArray(renderState.selectionAttribs.aPosition);
  gl.vertexAttribPointer(renderState.selectionAttribs.aPosition, 3, gl.FLOAT, false, 0, 0);

  renderState.selectionIBO = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, renderState.selectionIBO);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

  gl.bindVertexArray(null);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

  gl.useProgram(renderState.selectionProgram);
  gl.uniform3fv(renderState.selectionUniforms.uSelectionColor, DEFAULT_SELECTION_COLOR);
  gl.uniform1f(renderState.selectionUniforms.uBlockSize, DEFAULT_BLOCK_SIZE);
  gl.useProgram(null);
}

function drawFullscreenQuad(gl) {
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function initSSAO(gl) {
  // Generate kernel samples
  renderState.ssaoKernel = generateKernelSamples(32);
  // Create noise texture
  renderState.ssaoNoiseTexture = createNoiseTexture(gl, 4);
  // Compile SSAO shader
  renderState.ssaoProgram = createSSAOProgram(gl);
  renderState.ssaoUniforms = getSSAOUniforms(gl, renderState.ssaoProgram);
  // Upload kernel samples to uniform array
  gl.useProgram(renderState.ssaoProgram);
  for (let i = 0; i < renderState.ssaoKernel.length; ++i) {
    gl.uniform3fv(gl.getUniformLocation(renderState.ssaoProgram, `samples[${i}]`), renderState.ssaoKernel[i]);
  }
  // Create SSAO buffers at half resolution
  if (renderState.gbufferSupported) {
    renderState.ssaoBuffer = createSSAOBuffer(gl, gl.canvas.width, gl.canvas.height, renderState.gbufferSupportInfo);
    renderState.ssaoBlurBuffer = createSSAOBuffer(gl, gl.canvas.width, gl.canvas.height, renderState.gbufferSupportInfo);  // Separate buffer for blur output
  }
  // Create blur shader
  renderState.blurProgram = createBlurProgram(gl);
  renderState.blurUniforms = getBlurUniforms(gl, renderState.blurProgram);
  // Create composite shader
  renderState.compositeProgram = createCompositeProgram(gl);
  renderState.compositeUniforms = getCompositeUniforms(gl, renderState.compositeProgram);
  gl.useProgram(null);
}

export function updateSSAOSettings(gl, settings) {
  Object.assign(ssaoSettings, settings);
  
  if (renderState.ssaoProgram && renderState.ssaoUniforms) {
    gl.useProgram(renderState.ssaoProgram);
    if (settings.radius !== undefined) gl.uniform1f(renderState.ssaoUniforms.radius, ssaoSettings.radius);
    if (settings.bias !== undefined) gl.uniform1f(renderState.ssaoUniforms.bias, ssaoSettings.bias);
  }
  
  if (renderState.compositeProgram && renderState.compositeUniforms) {
    gl.useProgram(renderState.compositeProgram);
    if (settings.intensity !== undefined) gl.uniform1f(renderState.compositeUniforms.uAOIntensity, ssaoSettings.intensity);
  }
}

function renderSSAOPass(gl, projectionMatrix) {
  if (!renderState.gbuffer || !renderState.ssaoProgram || !renderState.ssaoBuffer || !ssaoSettings.enabled) return;
  
  // Bind SSAO FBO
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderState.ssaoBuffer.fbo);
  gl.viewport(0, 0, renderState.ssaoBuffer.width, renderState.ssaoBuffer.height);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  // Reset state
  gl.disable(gl.SCISSOR_TEST);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  
  // Use SSAO program
  gl.useProgram(renderState.ssaoProgram);
  
  // Bind G-buffer textures
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, renderState.gbuffer.color[1]); // oct-encoded normals
  gl.uniform1i(renderState.ssaoUniforms.gNormal, 0);
  
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, renderState.gbuffer.color[2]); // view-space position
  gl.uniform1i(renderState.ssaoUniforms.gPosition, 1);
  
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, renderState.ssaoNoiseTexture);
  gl.uniform1i(renderState.ssaoUniforms.texNoise, 2);
  
  // Upload projection matrix (needed to project sample positions to clip space)
  if (projectionMatrix && renderState.ssaoUniforms.projection !== null) {
    gl.uniformMatrix4fv(renderState.ssaoUniforms.projection, false, projectionMatrix);
  }
  
  // Set uniforms
  gl.uniform2f(renderState.ssaoUniforms.noiseScale, 
    renderState.ssaoBuffer.width / 4.0, renderState.ssaoBuffer.height / 4.0);
  gl.uniform1f(renderState.ssaoUniforms.radius, ssaoSettings.radius);
  gl.uniform1f(renderState.ssaoUniforms.bias, ssaoSettings.bias);
  
  // Draw fullscreen quad
  drawFullscreenQuad(gl);
  
  gl.useProgram(null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function renderBlurPass(gl) {
  if (!renderState.ssaoBuffer || !renderState.ssaoBlurBuffer || !renderState.blurProgram) return;
  
  // Bind blur FBO (separate from SSAO to avoid feedback loop)
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderState.ssaoBlurBuffer.fbo);
  gl.viewport(0, 0, renderState.ssaoBlurBuffer.width, renderState.ssaoBlurBuffer.height);
  gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
  gl.clear(gl.COLOR_BUFFER_BIT);
  
  // Reset state
  gl.disable(gl.SCISSOR_TEST);
  gl.disable(gl.DEPTH_TEST);
  gl.disable(gl.BLEND);
  
  gl.useProgram(renderState.blurProgram);
  
  // Bind SSAO output texture as input
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, renderState.ssaoBuffer.texture);
  gl.uniform1i(renderState.blurUniforms.ssaoInput, 0);

  // Bind G-buffer positions to detect edges during blur (prevents bleeding)
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, renderState.gbuffer.color[2]);
  gl.uniform1i(renderState.blurUniforms.gPosition, 1);
  
  drawFullscreenQuad(gl);
  
  gl.useProgram(null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function renderCompositePass(gl, canvas) {
  if (!renderState.compositeProgram || !renderState.gbuffer || !renderState.ssaoBlurBuffer) return;
  
  // Bind default framebuffer (screen)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  
  // Reset state that might leak from previous passes
  gl.disable(gl.SCISSOR_TEST);
  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST);
  
  gl.useProgram(renderState.compositeProgram);
  
  // Bind G-buffer albedo (color[0]) to texture unit 0
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, renderState.gbuffer.color[0]);
  gl.uniform1i(renderState.compositeUniforms.gAlbedo, 0);
  
  // Bind blurred AO to texture unit 1
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, renderState.ssaoBlurBuffer.texture);
  gl.uniform1i(renderState.compositeUniforms.ssaoBlur, 1);
  
  // Set intensity uniform
  gl.uniform1f(renderState.compositeUniforms.uAOIntensity, ssaoSettings.intensity);
  
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

  renderState.cameraUBO = createCameraUBO(gl);
  renderState.globalUBO = createGlobalUBO(gl);

  initSky(gl);
  initSelection(gl);

  // Initialize G-buffer for deferred rendering
  renderState.gbufferSupportInfo = checkFloatTextureSupport(gl);
  renderState.gbufferSupported = renderState.gbufferSupportInfo.supported;
  if (renderState.gbufferSupported) {
    try {
      renderState.gbuffer = createGBufferFBO(gl, gl.canvas.width, gl.canvas.height, renderState.gbufferSupportInfo);
      if (DEBUG) console.log('[Renderer] G-buffer initialized');
    } catch (e) {
      console.error('[Renderer] Failed to create G-buffer:', e);
      renderState.gbufferSupported = false;
    }
  } else {
    console.warn('[Renderer] Float textures not supported, SSAO disabled');
  }

  // Initialize Shadow Map (High Resolution 4096)
  try {
    shadowMapObj = createShadowMapFBO(gl, 4096);
    renderState.shadowProgram = createShadowProgram(gl);
    renderState.shadowUniforms = getShadowUniforms(gl, renderState.shadowProgram);
    if (DEBUG) console.log('[Renderer] Shadow Map initialized');
  } catch (e) {
    console.error('[Renderer] Failed to init Shadow Map:', e);
  }

  // Initialize SSAO resources
  if (renderState.gbufferSupported) {
    initSSAO(gl);
  }

  return {
    program: voxelProgram,
    uniforms: voxelUniforms,
    attribs: voxelAttribs,
    sky: { program: renderState.skyProgram, uniforms: renderState.skyUniforms },
    selection: { program: renderState.selectionProgram, uniforms: renderState.selectionUniforms }
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
  
  renderState.textureAtlas = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, renderState.textureAtlas);
  
  // Set 1x1 blue pixel as placeholder while loading
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    new Uint8Array([255, 0, 255, 255])); // Magenta placeholder
  
  const image = new Image();
  image.crossOrigin = 'anonymous';
  image.onload = () => {
    if (DEBUG) console.log(`[Renderer] Texture image loaded: ${image.width}x${image.height}`);
    gl.bindTexture(gl.TEXTURE_2D, renderState.textureAtlas);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    
    // Set texture parameters for pixel art (nearest neighbor)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    // Use CLAMP_TO_EDGE for texture atlas - UVs should stay within tile bounds
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    renderState.textureAtlasLoaded = true;
    if (DEBUG) console.log(`[Renderer] ✓ Texture atlas loaded and ready: ${image.width}x${image.height}`);
  };
  image.onerror = (e) => {
    console.error(`[Renderer] ✗ Failed to load texture atlas: ${url}`, e);
  };
  image.src = url;
  
  return renderState.textureAtlas;
}

export function isTextureLoaded() {
  return renderState.textureAtlasLoaded;
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
    gl.uniform1i(voxelUniforms.uUseFloatTextures, renderState.gbufferActive ? 1 : 0);
  }
  
  // Set shadow uniforms if they exist
  if (renderState.currentLightSpaceMatrix && voxelUniforms.uLightSpaceMatrix !== undefined) {
    gl.uniformMatrix4fv(voxelUniforms.uLightSpaceMatrix, false, renderState.currentLightSpaceMatrix);
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
      if (renderState.textureAtlas) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, renderState.textureAtlas);
        if (voxelUniforms.uTextureAtlas !== null && voxelUniforms.uTextureAtlas !== undefined) {
          gl.uniform1i(voxelUniforms.uTextureAtlas, 0);
        }
        // Debug: log on first successful bind
        if (DEBUG && !renderChunk._loggedTextureBinding) {
          console.log(`[Renderer] Texture bound (loaded=${renderState.textureAtlasLoaded})`);
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
  renderState.currentWireframeMode = enabled;
}

export function setDebugMode(gl, enabled) {
  renderState.currentDebugMode = enabled;
  if (voxelUniforms && voxelUniforms.uDebugMode !== undefined) {
    gl.useProgram(voxelProgram);
    gl.uniform1i(voxelUniforms.uDebugMode, enabled ? 1 : 0);
  }
}

export function renderChunks(gl, chunks, chunkPositions = [], viewMatrix, projectionMatrix, wireframe = false, debugMode = false, cameraPos = null) {
  if (!chunks || chunks.length === 0) return;
  
  beginDrawCalls();
  
  // PERF-02: Use grid-based visibility check if camera position is provided
  // Otherwise fall back to scanning all chunks (backward compatibility)
  let visibleChunks;
  if (cameraPos && typeof cameraPos[0] === 'number' && typeof cameraPos[2] === 'number') {
    // Use O(1) spatial index lookup - only iterates render distance grid
    const renderDistance = defaultChunkManager.getRenderDistance();
    visibleChunks = getVisibleChunks(cameraPos[0], cameraPos[2], renderDistance);
    // Still filter for chunks with WebGL mesh
    visibleChunks = visibleChunks.filter(chunk => chunk && chunk._webglMesh);
  } else {
    // Fallback: filter all chunks (original behavior)
    visibleChunks = chunks
      .filter(chunk => {
        // chunk is a Chunk object with .chunkX and .chunkZ properties
        // Also check it has a ready WebGL mesh
        return chunk && chunk._webglMesh;
      });
  }
  
  // Sort for deterministic draw order
  visibleChunks = visibleChunks.sort((a, b) => {
    // Sort by key for deterministic draw order
    const keyA = `${a.chunkX},${a.chunkZ}`;
    const keyB = `${b.chunkX},${b.chunkZ}`;
    return keyA.localeCompare(keyB);
  });
  
  if (visibleChunks.length === 0) return;
  
  // Set up shader and uniforms once for all chunks
  gl.useProgram(voxelProgram);
  
  // Bind texture atlas (required for voxel shader)
  if (renderState.textureAtlas) {
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, renderState.textureAtlas);
    if (voxelUniforms.uTextureAtlas !== null && voxelUniforms.uTextureAtlas !== undefined) {
      gl.uniform1i(voxelUniforms.uTextureAtlas, 0);
    }
  }
  
  // Bind shadow map (required for shadow calculations)
  if (shadowMapObj && voxelUniforms.uShadowMap !== undefined && shadowMapObj.texture) {
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, shadowMapObj.texture);
    gl.uniform1i(voxelUniforms.uShadowMap, 2);
  }
  
  // Set light space matrix for shadow calculations
  if (renderState.currentLightSpaceMatrix && voxelUniforms.uLightSpaceMatrix) {
    gl.uniformMatrix4fv(voxelUniforms.uLightSpaceMatrix, false, renderState.currentLightSpaceMatrix);
  }
  
  // Render each chunk individually
  // Note: Each chunk has its own mesh with world-space vertices from greedyMesh
  // The instance buffer approach requires all chunks to share the same local vertex buffer
  // which would need changes to greedyMesh. Using loop for now - still benefits from
  // reduced state changes (shader/textures bound once).
  for (const chunk of visibleChunks) {
    const chunkMesh = chunk._webglMesh;
    if (!chunkMesh || !chunkMesh.vao) continue;
    
    // Get chunk world position for model matrix
    const chunkX = chunk.x || chunk.chunkX || 0;
    const chunkZ = chunk.z || chunk.chunkZ || 0;
    const modelMatrix = createModelMatrix(chunkX * CHUNK_SIZE, 0, chunkZ * CHUNK_SIZE);
    
    // Render chunk
    gl.bindVertexArray(chunkMesh.vao);
    
    if (voxelUniforms && viewMatrix && projectionMatrix) {
      if (voxelUniforms.uViewMatrix !== undefined && voxelUniforms.uViewMatrix !== null) {
        gl.uniformMatrix4fv(voxelUniforms.uViewMatrix, false, viewMatrix);
      }
      if (voxelUniforms.uProjectionMatrix !== undefined && voxelUniforms.uProjectionMatrix !== null) {
        gl.uniformMatrix4fv(voxelUniforms.uProjectionMatrix, false, projectionMatrix);
      }
      if (voxelUniforms.uModelMatrix !== undefined && voxelUniforms.uModelMatrix !== null) {
        gl.uniformMatrix4fv(voxelUniforms.uModelMatrix, false, modelMatrix);
      }
    }
    
    // Bind element buffer and draw
    if (chunkMesh.ibo && chunkMesh.indexCount > 0) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, chunkMesh.ibo);
      gl.drawElements(gl.TRIANGLES, chunkMesh.indexCount, gl.UNSIGNED_INT, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, chunkMesh.vertexCount || 0);
    }
    
    gl.bindVertexArray(null);
  }
  
  incrementDrawCalls(visibleChunks.length);
      
  
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
  if (!renderState.skyProgram) return;

  // Compute sky colors for this time of day
  const colors = getSkyColorsForHour(timeOfDay);

  gl.depthMask(false);
  gl.useProgram(renderState.skyProgram);

  const identityMatrix = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);

  gl.uniformMatrix4fv(renderState.skyUniforms.uModelMatrix, false, identityMatrix);
  gl.uniformMatrix4fv(renderState.skyUniforms.uViewMatrix, false, viewMatrix);
  gl.uniformMatrix4fv(renderState.skyUniforms.uProjectionMatrix, false, projectionMatrix);
  gl.uniform1f(renderState.skyUniforms.uTimeOfDay, timeOfDay);
  
  // Pass computed sky colors
  gl.uniform3f(renderState.skyUniforms.uTopColor, colors.top[0], colors.top[1], colors.top[2]);
  gl.uniform3f(renderState.skyUniforms.uBottomColor, colors.bottom[0], colors.bottom[1], colors.bottom[2]);

  gl.bindVertexArray(renderState.skyVAO);
  gl.drawElements(gl.TRIANGLES, 36, gl.UNSIGNED_SHORT, 0);
  gl.bindVertexArray(null);

  gl.useProgram(null);
  gl.depthMask(true);
}

export function renderSelection(gl, blockPos, modelViewProjection) {
  if (!renderState.selectionProgram || !blockPos) return;

  gl.useProgram(renderState.selectionProgram);
  gl.uniformMatrix4fv(renderState.selectionUniforms.uModelViewProjection, false, modelViewProjection);
  gl.uniform3fv(renderState.selectionUniforms.uBlockPosition, blockPos);

  gl.bindVertexArray(renderState.selectionVAO);
  gl.drawElements(gl.LINES, 24, gl.UNSIGNED_SHORT, 0);
  gl.bindVertexArray(null);

  gl.useProgram(null);
}

export function updateCamera(gl, viewMatrix, projectionMatrix) {
  if (!renderState.cameraUBO) return;
  updateCameraUBO(gl, renderState.cameraUBO, viewMatrix, projectionMatrix);
}

export function updateTimeOfDay(gl, time) {
  if (!renderState.globalUBO) return;
  
  // Get dynamic sun lighting for this time
  const sunInfo = getSunInfo(time);
  
  const normalizedTime = (time % 24) / 24;
  updateGlobalUBO(gl, renderState.globalUBO, sunInfo.direction, normalizedTime, sunInfo.color);
  
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


export function renderLoop(canvasEl, gl, renderFn) {
  renderState.canvas = canvasEl;
  renderState.glContext = gl;
  renderState.renderCallback = renderFn;
  renderState.lastTimestamp = 0;
  
  initPerformance();
  
  function frame(timestamp) {
    const deltaTime = beginFrame(timestamp);
    
    if (renderState.renderCallback) {
      renderState.renderCallback(gl, deltaTime, timestamp);
    }
    
    if (renderState.currentViewMatrix && renderState.currentProjectionMatrix) {
      renderSky(renderState.glContext, renderState.currentViewMatrix, renderState.currentProjectionMatrix, renderState.currentTimeOfDay);
    }
    
    // Check FPS and warn if below threshold
    checkFPSWarning();
    
    renderState.animationFrameId = requestAnimationFrame(frame);
  }
  
  renderState.animationFrameId = requestAnimationFrame(frame);
  
  return {
    stop: () => {
      if (renderState.animationFrameId) {
        cancelAnimationFrame(renderState.animationFrameId);
        renderState.animationFrameId = null;
      }
    },
    setViewMatrix: (view, proj) => {
      renderState.currentViewMatrix = view;
      renderState.currentProjectionMatrix = proj;
    },
    setTimeOfDay: (time) => {
      renderState.currentTimeOfDay = time;
    }
  };
}

/**
 * Check if a chunk's bounding box intersects the shadow camera's frustum.
 * Transforms chunk center to light-space and checks against orthographic bounds.
 */
function isChunkInShadowFrustum(chunk, lightSpaceMatrix, frustumSize, near, far) {
  const chunkX = chunk.x !== undefined ? chunk.x : (chunk.chunkX || 0);
  const chunkZ = chunk.z !== undefined ? chunk.z : (chunk.chunkZ || 0);
  
  // Compute chunk center world position
  const cx = chunkX * CHUNK_SIZE + CHUNK_SIZE / 2;
  const cy = 0;
  const cz = chunkZ * CHUNK_SIZE + CHUNK_SIZE / 2;
  
  // Transform chunk center by lightSpaceMatrix to get light-space coordinates
  const x = lightSpaceMatrix[0] * cx + lightSpaceMatrix[4] * cy + lightSpaceMatrix[8] * cz + lightSpaceMatrix[12];
  const y = lightSpaceMatrix[1] * cx + lightSpaceMatrix[5] * cy + lightSpaceMatrix[9] * cz + lightSpaceMatrix[13];
  const z = lightSpaceMatrix[2] * cx + lightSpaceMatrix[6] * cy + lightSpaceMatrix[10] * cz + lightSpaceMatrix[14];
  const w = lightSpaceMatrix[3] * cx + lightSpaceMatrix[7] * cy + lightSpaceMatrix[11] * cz + lightSpaceMatrix[15];
  
  if (w === 0) return true; // Avoid division by zero
  
  const ndcX = x / w;
  const ndcY = y / w;
  const ndcZ = z / w;
  
  // Check against orthographic bounds in NDC space
  // Orthographic projection maps [-size, size] to [-1, 1] in X/Y
  // and [near, far] to [-1, 1] in Z
  return ndcX >= -1.0 && ndcX <= 1.0 &&
         ndcY >= -1.0 && ndcY <= 1.0 &&
         ndcZ >= -1.0 && ndcZ <= 1.0;
}

export function renderVoxelsToGBuffer(gl, canvas, chunks, chunkPositions, viewMatrix, projectionMatrix, wireframe = false, debugMode = false, timeOfDay = 0.5, renderOutlineCallback = null, cameraPos = null) {
  // DEBUG: Skip G-buffer and render directly to test if voxels work
  if (window.__DEBUG_SKIP_GBUFFER) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.7, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    renderChunks(gl, chunks, chunkPositions, viewMatrix, projectionMatrix, wireframe, debugMode, cameraPos);
    return;
  }
  
  if (!isGBufferSupported() || !renderState.gbuffer) {
    // Fallback: render directly to screen
    renderChunks(gl, chunks, chunkPositions, viewMatrix, projectionMatrix, wireframe, debugMode, cameraPos);
    return;
  }
  
  // ── PASS 0: Shadow Map ──────────────────────────────────────────────────
  renderState.currentLightSpaceMatrix = null;
  const shadowPassStart = performance.now();
  if (shadowMapObj && renderState.shadowProgram && window.createLightSpaceMatrix && cameraPos) {
    const sunInfo = getSunInfo(timeOfDay);
    renderState.currentLightSpaceMatrix = window.createLightSpaceMatrix(cameraPos, sunInfo.direction);
    
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
    
    gl.useProgram(renderState.shadowProgram);
    gl.uniformMatrix4fv(renderState.shadowUniforms.uLightSpaceMatrix, false, renderState.currentLightSpaceMatrix);
    
    // Draw all chunks rapidly to depth buffer
    const frustumSize = window._shadowFrustumSize || 320;
    const farPlane = window._shadowFarPlane || 450;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkMesh = chunk._webglMesh;
      // Skip chunks that don't have valid geometry structures
      if (!chunkMesh || !chunkMesh.vao || !chunkMesh.ibo || !chunkMesh.indexCount) continue;
      
      // Frustum culling: skip chunks outside shadow camera view
      if (renderState.currentLightSpaceMatrix && !isChunkInShadowFrustum(chunkMesh, renderState.currentLightSpaceMatrix, frustumSize, 1.0, farPlane)) continue;
      
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
  renderState.lastShadowPassDuration = performance.now() - shadowPassStart;
  if (renderState.lastShadowPassDuration > 2) {
    console.warn(`[Shadow] Pass took ${renderState.lastShadowPassDuration.toFixed(2)}ms (target: <2ms for 60fps)`);
  }
  
  // Bind G-buffer FBO
  const bound = bindGBuffer(gl);
  if (!bound) {
    renderChunks(gl, chunks, chunkPositions, viewMatrix, projectionMatrix, wireframe, debugMode, cameraPos);
    return;
  }
  
  renderState.gbufferActive = true;
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
  renderChunks(gl, chunks, chunkPositions, viewMatrix, projectionMatrix, wireframe, debugMode, cameraPos);
  
  if (renderOutlineCallback) {
    // Only draw wireframe outline to albedo attachment (COLOR_ATTACHMENT0) so it doesn't mess with SSAO normal/depth passes
    gl.drawBuffers([gl.COLOR_ATTACHMENT0]);
    gl.enable(gl.DEPTH_TEST);
    renderOutlineCallback();
  }
  
  // Unbind G-buffer
  unbindGBuffer(gl, canvas);
  renderState.gbufferActive = false;
  
  if (ssaoSettings.enabled && renderState.ssaoProgram && renderState.ssaoBuffer && renderState.ssaoBlurBuffer) {
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
    if (renderState.compositeProgram && renderState.compositeUniforms) {
      gl.useProgram(renderState.compositeProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, renderState.gbuffer.color[0]);
      gl.uniform1i(renderState.compositeUniforms.gAlbedo, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, renderState.gbuffer.color[0]); // dummy AO
      gl.uniform1i(renderState.compositeUniforms.ssaoBlur, 1);
      gl.uniform1f(renderState.compositeUniforms.uAOIntensity, 0.0); // 0 = passthrough albedo
      drawFullscreenQuad(gl);
      gl.useProgram(null);
    }
  }
}

export { getFPS, getMetrics, logPerformance };

// G-buffer management functions
export function bindGBuffer(gl) {
  if (!renderState.gbuffer) return false;
  gl.bindFramebuffer(gl.FRAMEBUFFER, renderState.gbuffer.fbo);
  gl.viewport(0, 0, renderState.gbuffer.width, renderState.gbuffer.height);
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
  if (!renderState.gbuffer) return null;
  return {
    albedo: renderState.gbuffer.color[0],
    normal: renderState.gbuffer.color[1],
    depth: renderState.gbuffer.depth
  };
}

export function isGBufferSupported() {
  return renderState.gbufferSupported;
}

export function getSSAOProgram() {
  return renderState.ssaoProgram;
}

export function getSSAOUniformsState() {
  return renderState.ssaoUniforms;
}

export function getSSAOBuffer() {
  return renderState.ssaoBuffer;
}

export function getGBuffer() {
  return renderState.gbuffer;
}

export function resizeGBufferForCanvas(gl, canvas) {
  if (renderState.gbuffer && canvas.width > 0 && canvas.height > 0) {
    if (renderState.gbuffer.width !== canvas.width || renderState.gbuffer.height !== canvas.height) {
      const newGbuffer = createGBufferFBO(gl, canvas.width, canvas.height, renderState.gbufferSupportInfo);
      disposeGBuffer(gl, renderState.gbuffer);
      renderState.gbuffer = newGbuffer;
      if (DEBUG) console.log(`[Renderer] G-buffer resized to ${canvas.width}x${canvas.height}`);
    }
  }
}
