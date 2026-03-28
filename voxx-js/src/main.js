import { gl, canvas, isContextLost, registerContextResources, addContextLossListener } from './gl/context.js';

// Context loss notification overlay
function createContextLostOverlay() {
  const overlay = document.createElement('div');
  overlay.id = 'context-lost-overlay';
  overlay.innerHTML = 'Reconnecting...';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: none;
    justify-content: center;
    align-items: center;
    color: white;
    font-family: sans-serif;
    font-size: 24px;
    font-weight: bold;
    z-index: 9999;
    text-align: center;
  `;
  document.body.appendChild(overlay);
  return overlay;
}

const contextLostOverlay = createContextLostOverlay();

export function showContextLostNotification() {
  if (contextLostOverlay) {
    contextLostOverlay.style.display = 'flex';
  }
}

export function hideContextLostNotification() {
  if (contextLostOverlay) {
    contextLostOverlay.style.display = 'none';
  }
}

// Wire up context loss listeners
addContextLossListener(() => {
  if (isContextLost()) {
    showContextLostNotification();
  } else {
    hideContextLostNotification();
  }
});
import { initRenderer, setupRenderState, clear, renderSky, updateCamera, updateTimeOfDay, voxelAttribs, voxelUniforms, loadTextureAtlas, updateSSAOSettings, renderVoxelsToGBuffer } from './gl/render.js';
import { createChunkMeshFromData, VERTEX_FORMAT } from './gl/buffers.js';
import { initPerformance, beginFrame, getFPS, getFPSDisplay, beginRenderTiming, endRenderTiming, logPerformance, getDrawCalls } from './gl/performance.js';
import { createProgram, getUniformLocations } from './gl/shaders.js';
import { World } from '../world.js';
import { BiomeCalculator } from '../biomes.js';
import { RENDER_CONFIG, PLAYER_CONFIG, SUN_CYCLE_CONFIG, DEBUG } from '../config.js';
import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './constants.js';
import { InputHandler } from './input/InputHandler.js';
import { BlockEditor } from './blockEditor/BlockEditor.js';
import { Camera } from './camera/Camera.js';

// Export notification functions for context.js
window.showContextLostNotification = showContextLostNotification;
window.hideContextLostNotification = hideContextLostNotification;

console.log('WebGL2 main initializing...');

let renderDistance = 8;
let wireframeMode = false;
let debugColorsMode = false;

// Get day phase based on hour (0-23)
function getDayPhase(hours) {
  if (hours >= 5 && hours < 7) return 'Dawn';
  if (hours >= 7 && hours < 17) return 'Day';
  if (hours >= 17 && hours < 19) return 'Dusk';
  return 'Night';
}

// Update debug mode UI indicator
function updateDebugUI() {
  const wireEl = document.getElementById('wireframe-indicator');
  const debugEl = document.getElementById('debug-indicator');
  if (wireEl) {
    wireEl.textContent = wireframeMode ? 'WIRE' : '';
    wireEl.style.display = wireframeMode ? 'block' : 'none';
  }
  if (debugEl) {
    debugEl.textContent = debugColorsMode ? 'DEBUG' : '';
    debugEl.style.display = debugColorsMode ? 'block' : 'none';
  }
}

// Global references for callbacks
let world;
let biomeCalculator;
let chunkMeshes = new Map();
let camera;
let inputHandler;
let blockEditor;
let targetedBlock = null;

let outlineProgram = null;
let outlineVAO = null;
let outlineUniforms = null;

function disposeWebGLResources() {
  if (gl && outlineVAO) gl.deleteVertexArray(outlineVAO);
  outlineProgram = null;
  outlineVAO = null;
  outlineUniforms = null;
  for (const chunk of Object.values(world?.chunks || {})) {
    if (chunk._webglMesh) {
      const m = chunk._webglMesh;
      if (m.vao) gl.deleteVertexArray(m.vao);
      if (m.vbo) gl.deleteBuffer(m.vbo);
      if (m.ibo) gl.deleteBuffer(m.ibo);
      chunk._webglMesh = null;
    }
  }
  chunkMeshes.clear();
  if (DEBUG) console.log('[WebGL] Resources disposed on context loss');
}

function initWebGLResources() {
  initBlockOutline();
  initRenderer(gl);
  loadTextureAtlas(gl, 'textures-atlas.png');
  for (const chunk of Object.values(world?.chunks || {})) {
    if (chunk.meshData && chunk.meshReady) {
      chunk._webglMesh = null;
    }
  }
  if (DEBUG) console.log('[WebGL] Resources reinitialized on context restore');
}

function initBlockOutline() {
  const vertexSource = `#version 300 es
    in vec3 aPosition;
    uniform mat4 uModelViewProjection;
    void main() {
      gl_Position = uModelViewProjection * vec4(aPosition, 1.0);
    }
  `;
  
  const fragmentSource = `#version 300 es
    precision highp float;
    uniform vec4 uColor;
    out vec4 fragColor;
    void main() {
      fragColor = uColor;
    }
  `;
  
  outlineProgram = createProgram(gl, vertexSource, fragmentSource);
  outlineUniforms = getUniformLocations(gl, outlineProgram, ['uModelViewProjection', 'uColor']);
  
  // Create unit cube wireframe vertices (12 edges)
  const size = 0.51;
  const vertices = new Float32Array([
    // Bottom face
    -size, -size, -size,   size, -size, -size,
    size, -size, -size,    size, -size,  size,
    size, -size,  size,   -size, -size,  size,
    -size, -size,  size,  -size, -size, -size,
    // Top face
    -size,  size, -size,   size,  size, -size,
    size,  size, -size,    size,  size,  size,
    size,  size,  size,   -size,  size,  size,
    -size,  size,  size,  -size,  size, -size,
    // Vertical edges
    -size, -size, -size,  -size,  size, -size,
    size, -size, -size,   size,  size, -size,
    size, -size,  size,   size,  size,  size,
    -size, -size,  size,  -size,  size,  size,
  ]);
  
  outlineVAO = gl.createVertexArray();
  gl.bindVertexArray(outlineVAO);
  
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  
  gl.bindVertexArray(null);
}

function renderBlockOutline(mvpMatrix) {
  if (!targetedBlock || !outlineProgram) return;
  
  gl.useProgram(outlineProgram);
  
  const model = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    targetedBlock.x + 0.5, targetedBlock.y + 0.5, targetedBlock.z + 0.5, 1
  ]);
  
  const finalMVP = multiplyMatrices(mvpMatrix, model);
  
  gl.uniformMatrix4fv(outlineUniforms.uModelViewProjection, false, finalMVP);
  gl.uniform4f(outlineUniforms.uColor, 1.0, 0.0, 1.0, 1.0);
  
  gl.bindVertexArray(outlineVAO);
  gl.lineWidth(2.0);
  gl.drawArrays(gl.LINES, 0, 24);
  gl.bindVertexArray(null);
  
  gl.enable(gl.DEPTH_TEST);
}

function multiplyMatrices(a, b) {
  const result = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result[j * 4 + i] = 0;
      for (let k = 0; k < 4; k++) {
        result[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k];
      }
    }
  }
  return result;
}

function createProjectionMatrix() {
  const fov = RENDER_CONFIG.FOV * Math.PI / 180;
  const aspect = canvas.width / canvas.height;
  const near = RENDER_CONFIG.NEAR_PLANE;
  const far = RENDER_CONFIG.FAR_PLANE;

  const f = 1 / Math.tan(fov / 2);
  const rangeInv = 1 / (near - far);

  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (near + far) * rangeInv, -1,
    0, 0, near * far * rangeInv * 2, 0
  ]);
}

function createOrthoMatrix(left, right, bottom, top, near, far) {
  return new Float32Array([
    2 / (right - left), 0, 0, 0,
    0, 2 / (top - bottom), 0, 0,
    0, 0, -2 / (far - near), 0,
    -(right + left) / (right - left), -(top + bottom) / (top - bottom), -(far + near) / (far - near), 1
  ]);
}

function createLightSpaceMatrix(cameraPos, sunDir) {
  const center = [cameraPos.x, cameraPos.y, cameraPos.z];
  const dist = 150.0;
  const lightPos = [
    center[0] + sunDir[0] * dist,
    center[1] + sunDir[1] * dist,
    center[2] + sunDir[2] * dist
  ];
  
  const sunNormY = Math.abs(sunDir[1] / Math.sqrt(sunDir[0]*sunDir[0] + sunDir[1]*sunDir[1] + sunDir[2]*sunDir[2]));
  const upVec = sunNormY > 0.99 ? [1, 0, 0] : [0, 1, 0];
  const view = camera.lookAt(lightPos, center, upVec);
  
  const size = 64.0;
  const proj = createOrthoMatrix(-size, size, -size, size, 1.0, dist * 2.0);
  
  return multiplyMatrices(proj, view);
}

window.createLightSpaceMatrix = createLightSpaceMatrix;

// Set time of day (hour: 0-24)
let sunCycleTime = SUN_CYCLE_CONFIG.TOTAL_CYCLE * (8/24);
let timePaused = false;

function setTimeOfDay(hour) {
  sunCycleTime = SUN_CYCLE_CONFIG.TOTAL_CYCLE * (hour / 24);
  if (DEBUG) console.log(`[Debug] Time set to ${hour}:00`);
}

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Time of day buttons
document.getElementById('time-dawn')?.addEventListener('click', () => setTimeOfDay(6));
document.getElementById('time-noon')?.addEventListener('click', () => setTimeOfDay(12));
document.getElementById('time-dusk')?.addEventListener('click', () => setTimeOfDay(18));
document.getElementById('time-night')?.addEventListener('click', () => setTimeOfDay(20));

// Time pause toggle
const timePauseBtn = document.getElementById('time-pause');
timePauseBtn?.addEventListener('click', () => {
  timePaused = !timePaused;
  timePauseBtn.textContent = timePaused ? 'Play' : 'Pause';
  timePauseBtn.style.backgroundColor = timePaused ? '#4a4' : '';
});

// Wireframe toggle from UI
document.getElementById('wireframe-toggle')?.addEventListener('change', (e) => {
  wireframeMode = e.target.checked;
  if (DEBUG) console.log(`[Debug] Wireframe mode: ${wireframeMode ? 'ON' : 'OFF'}`);
  updateDebugUI();
});

// Debug colors toggle from UI
document.getElementById('debug-toggle')?.addEventListener('change', (e) => {
  debugColorsMode = e.target.checked;
  if (DEBUG) console.log(`[Debug] Debug colors mode: ${debugColorsMode ? 'ON' : 'OFF'}`);
  updateDebugUI();
});

// Expose toggle functions for InputHandler
window.toggleWireframe = () => {
  wireframeMode = !wireframeMode;
  const el = document.getElementById('wireframe-toggle');
  if (el) el.checked = wireframeMode;
  if (DEBUG) console.log(`[Debug] Wireframe mode: ${wireframeMode ? 'ON' : 'OFF'}`);
  updateDebugUI();
};

window.toggleDebugColors = () => {
  debugColorsMode = !debugColorsMode;
  const el = document.getElementById('debug-toggle');
  if (el) el.checked = debugColorsMode;
  if (DEBUG) console.log(`[Debug] Debug colors mode: ${debugColorsMode ? 'ON' : 'OFF'}`);
  updateDebugUI();
};

// Expose render distance setter
window.setRenderDistance = (dist) => {
  renderDistance = dist;
};

updateDebugUI();
setupRenderState(gl);
initPerformance();
initBlockOutline();
initRenderer(gl);
loadTextureAtlas(gl, 'textures-atlas.png');

registerContextResources({ dispose: disposeWebGLResources, init: initWebGLResources });

// Expose SSAO settings updater
window.updateSSAOSettings = (settings) => {
  updateSSAOSettings(gl, settings);
  if (DEBUG) console.log(`[SSAO] Settings updated`);
};

// Initialize world
const noiseSeed = Math.random();
world = new World(noiseSeed, gl);
biomeCalculator = new BiomeCalculator(noiseSeed);

// Initialize Camera
camera = new Camera({ x: 50, y: 200, z: 50 }, { x: 0.5, y: 0 });

// Initialize BlockEditor
blockEditor = new BlockEditor(world, gl, chunkMeshes, voxelAttribs);

// Initialize InputHandler with callbacks
inputHandler = new InputHandler(
  canvas,
  (blockType) => { blockEditor.setSelectedBlockType(blockType); },
  () => { blockEditor.destroyBlock(); },
  () => { blockEditor.placeBlock(inputHandler.getSelectedBlockType()); }
);

let lastTime = 0;

// Chunk rebuild throttling
const MAX_REBUILDS_PER_FRAME = 2;

function updateChunks() {
  const visibleChunks = world.getVisibleChunks();
  
  for (const chunk of visibleChunks) {
    const key = `${chunk.chunkX},${chunk.chunkZ}`;
    if (!chunk._webglMesh) {
      if (chunk.meshData && chunk.meshData.positions && chunk.meshData.positions.length > 0) {
        syncChunkToWebGL(chunk);
      }
    }
  }
}

function syncChunkToWebGL(chunk) {
  const key = `${chunk.chunkX},${chunk.chunkZ}`;
  
  if (chunk._webglMesh) {
    return chunk._webglMesh;
  }

  if (!chunk.meshData || !chunk.meshData.positions || chunk.meshData.positions.length === 0) {
    return null;
  }

  try {
    const webglMesh = createChunkMeshFromData(gl, chunk.meshData, voxelAttribs);
    if (webglMesh) {
      chunk._webglMesh = webglMesh;
      chunkMeshes.set(key, webglMesh);
      if (DEBUG) console.log(`[WebGL2] Created mesh for chunk ${key}: ${webglMesh.vertexCount} vertices`);
    }
    return webglMesh;
  } catch (e) {
    console.error(`[WebGL2] Error creating mesh for chunk ${key}:`, e);
    return null;
  }
}

function render(currentTime) {
  if (isContextLost()) {
    requestAnimationFrame(render);
    return;
  }

  beginFrame(currentTime);

  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  // Update camera movement using InputHandler keys
  camera.updateMovement(deltaTime, inputHandler.getKeys());
  
  // Sync rotation from InputHandler to Camera (mouselook)
  const inputRotation = inputHandler.getRotation();
  camera.setRotation(inputRotation.x, inputRotation.y);
  
  // Update block targeting using BlockEditor
  blockEditor.updateTargetedBlock(camera.getPosition(), camera.getRotation());
  targetedBlock = blockEditor.getTargetedBlock();

  // Update sun cycle (unless paused)
  if (!timePaused) {
    sunCycleTime += deltaTime * SUN_CYCLE_CONFIG.TIME_SCALE;
    if (sunCycleTime >= SUN_CYCLE_CONFIG.TOTAL_CYCLE) {
      sunCycleTime = 0;
    }
  }

  const hours = Math.floor(sunCycleTime / SUN_CYCLE_CONFIG.TOTAL_CYCLE * 24);
  const minutes = Math.floor((sunCycleTime / SUN_CYCLE_CONFIG.TOTAL_CYCLE * 24 - hours) * 60);
  const isDaytime = hours >= 6 && hours < 18;
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  const timeEl = document.getElementById('time-display');
  const dayPhase = getDayPhase(hours);
  if (timeEl) timeEl.textContent = `${isDaytime ? 'Day' : 'Night'}: ${timeString} (${dayPhase})`;

  // Update compass direction text and needle
  const compassTextEl = document.querySelector('.compass-text');
  if (compassTextEl) {
    compassTextEl.textContent = camera.getCardinalDirection();
  }

  const compassNeedleEl = document.querySelector('.compass-needle');
  if (compassNeedleEl) {
    const needleRotation = -camera.getRotation().y * 180 / Math.PI;
    compassNeedleEl.style.transform = `translate(-50%, -100%) rotate(${needleRotation}deg)`;
  }

  const fpsEl = document.querySelector('.debug-fps');
  if (fpsEl) fpsEl.textContent = `FPS: ${getFPSDisplay()} (est: ${getFPS()}) | Block: ${inputHandler.getSelectedBlockType()}`;

  const posEl = document.getElementById('camera-position');
  if (posEl) {
    const pos = camera.getPosition();
    posEl.textContent = `X: ${pos.x.toFixed(2)} Y: ${pos.y.toFixed(2)} Z: ${pos.z.toFixed(2)}`;
  }

  // Update biome display based on player position
  if (biomeCalculator) {
    const pos = camera.getPosition();
    const biomeContributions = biomeCalculator.getBiomeContributions(pos.x, pos.z);
    const lowlandBar = document.querySelector('.biome-fill.lowland');
    const lowlandPercent = document.querySelector('.biome-item:first-child .biome-percent');
    const mountainBar = document.querySelector('.biome-fill.mountains');
    const mountainPercent = document.querySelector('.biome-item:last-child .biome-percent');
    
    if (biomeContributions && biomeContributions.length >= 2) {
      const lowlandContrib = biomeContributions.find(c => c.biome.name === 'Lowland');
      const mountainContrib = biomeContributions.find(c => c.biome.name === 'Mountains');
      
      if (lowlandBar && lowlandPercent && lowlandContrib) {
        lowlandBar.style.width = `${lowlandContrib.contribution}%`;
        lowlandPercent.textContent = `${lowlandContrib.contribution}%`;
      }
      if (mountainBar && mountainPercent && mountainContrib) {
        mountainBar.style.width = `${mountainContrib.contribution}%`;
        mountainPercent.textContent = `${mountainContrib.contribution}%`;
      }
    }
  }

  world.update(camera.getPosition(), renderDistance);
  
  updateChunks();

  const viewMatrix = camera.createViewMatrix();
  const projectionMatrix = createProjectionMatrix();

  beginRenderTiming();
  
  clear(gl, canvas);

  const timeOfDayHours = (sunCycleTime / SUN_CYCLE_CONFIG.TOTAL_CYCLE) * 24;

  updateCamera(gl, viewMatrix, projectionMatrix);
  updateTimeOfDay(gl, timeOfDayHours);

  const visibleChunks = world.getVisibleChunks();
  const mvpMatrix = multiplyMatrices(projectionMatrix, viewMatrix);
  
  if (visibleChunks.length > 0) {
    renderVoxelsToGBuffer(gl, canvas, visibleChunks, [], viewMatrix, projectionMatrix, wireframeMode, debugColorsMode, timeOfDayHours, () => renderBlockOutline(mvpMatrix), camera.getPosition());
  } else {
    renderSky(gl, viewMatrix, projectionMatrix, timeOfDayHours);
    renderBlockOutline(mvpMatrix);
  }
  
  const err = gl.getError();
  if (err !== gl.NO_ERROR) {
    console.error(`[Renderer] WebGL error: ${err}`);
  }
  
  logPerformance();
  if (DEBUG) {
    console.log(`[Performance] Draw calls this frame: ${getDrawCalls()}`);
  }
  
  endRenderTiming();

  requestAnimationFrame(render);
}

requestAnimationFrame(render);

console.log('WebGL2 voxel engine initialized');
console.log('[BlockEdit] Block editing features loaded');
console.log('[BlockEdit] Keys 1-9: select block type');
console.log('[BlockEdit] Left-click: break block | Right-click: place block');
