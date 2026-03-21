import { gl, canvas, isContextLost, registerContextResources } from './gl/context.js';
import { initRenderer, setupRenderState, clear, renderSky, renderChunks, updateCamera, updateTimeOfDay, voxelAttribs, voxelUniforms, loadTextureAtlas, setDebugMode, updateSSAOSettings, renderVoxelsToGBuffer } from './gl/render.js';
import { createChunkMeshFromData, VERTEX_FORMAT } from './gl/buffers.js';
import { initPerformance, beginFrame, getFPS, getFPSDisplay, beginRenderTiming, endRenderTiming, logPerformance, getDrawCalls } from './gl/performance.js';
import { createProgram, getUniformLocations } from './gl/shaders.js';
import { World } from '../world.js';
import { BiomeCalculator } from '../biomes.js';
import { RENDER_CONFIG, PLAYER_CONFIG, SUN_CYCLE_CONFIG, DEBUG } from '../config.js';
import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './constants.js';

console.log('WebGL2 main initializing...');

let isPointerLocked = false;
let keys = {};
let cameraPosition = { x: 50, y: 200, z: 50 };
let cameraRotation = { x: 0.5, y: 0 };  // Looking down at terrain
let selectedBlockType = 1;
let renderDistance = 8;
let targetedBlock = null;
let wireframeMode = false;
let debugColorsMode = false;

// Convert yaw angle to cardinal direction (N, NE, E, SE, S, SW, W, NW)
function getCardinalDirection(yaw) {
  // Normalize yaw to 0-360 degrees
  let degrees = ((yaw * 180 / Math.PI) % 360 + 360) % 360;
  // Map degrees to cardinal directions (45-degree segments centered on 22.5° offsets)
  if (degrees >= 337.5 || degrees < 22.5) return 'N';
  if (degrees >= 22.5 && degrees < 67.5) return 'NE';
  if (degrees >= 67.5 && degrees < 112.5) return 'E';
  if (degrees >= 112.5 && degrees < 157.5) return 'SE';
  if (degrees >= 157.5 && degrees < 202.5) return 'S';
  if (degrees >= 202.5 && degrees < 247.5) return 'SW';
  if (degrees >= 247.5 && degrees < 292.5) return 'W';
  return 'NW'; // 292.5 to 337.5
}

// Get day phase based on hour (0-23)
function getDayPhase(hours) {
  if (hours >= 5 && hours < 7) return 'Dawn';
  if (hours >= 7 && hours < 17) return 'Day';
  if (hours >= 17 && hours < 19) return 'Dusk';
  return 'Night';
}

// Update block selection UI to highlight current selection
function updateBlockSelectionUI() {
  document.querySelectorAll('.block-item').forEach(item => {
    const blockNum = parseInt(item.dataset.block);
    item.classList.toggle('selected', blockNum === selectedBlockType);
  });
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

let world;
let biomeCalculator;
let chunkMeshes = new Map();

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
  const size = 0.51; // Slightly larger than block to avoid z-fighting
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
  
  // Create model matrix for targeted block position
  const model = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    targetedBlock.x + 0.5, targetedBlock.y + 0.5, targetedBlock.z + 0.5, 1
  ]);
  
  // Multiply MVP * Model
  const finalMVP = multiplyMatrices(mvpMatrix, model);
  
  gl.uniformMatrix4fv(outlineUniforms.uModelViewProjection, false, finalMVP);
  gl.uniform4f(outlineUniforms.uColor, 1.0, 0.0, 1.0, 1.0); // Magenta
  
  gl.bindVertexArray(outlineVAO);
  gl.lineWidth(2.0);
  gl.drawArrays(gl.LINES, 0, 24); // 12 edges * 2 vertices
  gl.bindVertexArray(null);
  
  // Re-enable depth test for other rendering
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

function setupControls() {
  canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
  });

  document.addEventListener('pointerlockchange', () => {
    isPointerLocked = document.pointerLockElement === canvas;
    const instructions = document.getElementById('instructions');
    const crosshair = document.getElementById('crosshair');

    if (isPointerLocked) {
      instructions.style.display = 'none';
      crosshair.style.display = 'block';
    } else {
      instructions.style.display = 'block';
      crosshair.style.display = 'none';
    }
  });

  document.addEventListener('mousemove', (event) => {
    if (!isPointerLocked) return;

    const sensitivity = 0.002;
    cameraRotation.y -= event.movementX * sensitivity;
    cameraRotation.x -= event.movementY * sensitivity;
    const maxPitch = (Math.PI / 2) - 0.001;
    const clampedPitch = Math.max(-maxPitch, Math.min(maxPitch, cameraRotation.x));
    if (clampedPitch !== cameraRotation.x) {
      cameraRotation.x = clampedPitch;
      if (DEBUG) console.log('[Camera] Pitch clamped to bounds');
    }
  });

  document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
    
    // Block selection - update selectedBlockType for keys 1-9
    const num = parseInt(event.key);
    if (num >= 1 && num <= 9 && isPointerLocked) {
      selectedBlockType = num;
      if (DEBUG) console.log(`[BlockEdit] Key ${event.key} pressed -> selectedBlockType = ${selectedBlockType}`);
      updateBlockSelectionUI();
    }
    
    // Toggle debug colors mode (V key)
    if (event.code === 'KeyV' && isPointerLocked) {
      debugColorsMode = !debugColorsMode;
      if (DEBUG) console.log(`[Debug] Debug colors mode: ${debugColorsMode ? 'ON' : 'OFF'}`);
      updateDebugUI();
    }
    
    // Toggle wireframe mode (F key)
    if (event.code === 'KeyF' && isPointerLocked) {
      wireframeMode = !wireframeMode;
      if (DEBUG) console.log(`[Debug] Wireframe mode: ${wireframeMode ? 'ON' : 'OFF'}`);
      updateDebugUI();
    }
  });

  // Mousewheel for block selection
  document.addEventListener('wheel', (event) => {
    if (!isPointerLocked) return;
    
    const blockCount = 9; // Allow selecting blocks 1-9
    
    if (event.deltaY > 0) {
      // Scroll down - next block
      selectedBlockType = (selectedBlockType % blockCount) + 1;
    } else if (event.deltaY < 0) {
      // Scroll up - previous block
      selectedBlockType = ((selectedBlockType - 2 + blockCount) % blockCount) + 1;
    }
    
    if (DEBUG) console.log(`[BlockEdit] Wheel -> selectedBlockType = ${selectedBlockType}`);
    updateBlockSelectionUI();
  });

  document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
  });

  // Block editing mouse events
  document.addEventListener('mousedown', (event) => {
    if (!isPointerLocked) return;
    if (DEBUG) console.log(`[BlockEdit] mousedown: button=${event.button}, target=${targetedBlock ? `(${targetedBlock.x},${targetedBlock.y},${targetedBlock.z})` : 'none'}`);
    
    if (event.button === 0) {
      // Left click - break block
      destroyBlock();
    } else if (event.button === 2) {
      // Right click - place block
      placeBlock();
    }
  });

  // Prevent context menu on right click
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  document.getElementById('render-inc')?.addEventListener('click', () => {
    const el = document.getElementById('render-distance-value');
    if (el) {
      renderDistance = Math.min(32, renderDistance + 1);
      el.textContent = renderDistance;
    }
  });

  document.getElementById('render-dec')?.addEventListener('click', () => {
    const el = document.getElementById('render-distance-value');
    if (el) {
      renderDistance = Math.max(1, renderDistance - 1);
      el.textContent = renderDistance;
    }
  });

  document.getElementById('speed-inc')?.addEventListener('click', () => {
    const el = document.getElementById('move-speed-value');
    if (el) PLAYER_CONFIG.MOVE_SPEED = Math.min(200, parseInt(el.textContent) + 10);
    el.textContent = PLAYER_CONFIG.MOVE_SPEED;
  });

  document.getElementById('speed-dec')?.addEventListener('click', () => {
    const el = document.getElementById('move-speed-value');
    if (el) PLAYER_CONFIG.MOVE_SPEED = Math.max(1, parseInt(el.textContent) - 10);
    el.textContent = PLAYER_CONFIG.MOVE_SPEED;
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

  // SSAO toggle
  document.getElementById('ssao-toggle')?.addEventListener('change', (e) => {
    const enabled = e.target.checked;
    updateSSAOSettings(gl, { enabled });
    if (DEBUG) console.log(`[SSAO] ${enabled ? 'Enabled' : 'Disabled'}`);
  });

  // SSAO intensity slider
  document.getElementById('ssao-intensity')?.addEventListener('input', (e) => {
    const value = parseInt(e.target.value) / 100;
    const valueEl = document.getElementById('ssao-intensity-value');
    if (valueEl) valueEl.textContent = value.toFixed(1);
    updateSSAOSettings(gl, { intensity: value });
  });

  // SSAO radius slider
  document.getElementById('ssao-radius')?.addEventListener('input', (e) => {
    const value = parseInt(e.target.value) / 10;
    const valueEl = document.getElementById('ssao-radius-value');
    if (valueEl) valueEl.textContent = value.toFixed(1);
    updateSSAOSettings(gl, { radius: value });
  });
}

// Set time of day (hour: 0-24)
function setTimeOfDay(hour) {
  sunCycleTime = SUN_CYCLE_CONFIG.TOTAL_CYCLE * (hour / 24);
  if (DEBUG) console.log(`[Debug] Time set to ${hour}:00`);
}

function updateMovement(deltaTime) {
  if (!isPointerLocked) return;

  const yaw = cameraRotation.y;
  const forward = {
    x: -Math.sin(yaw),
    y: 0,
    z: -Math.cos(yaw)
  };

  const right = {
    x: forward.z,
    y: 0,
    z: -forward.x
  };

  const speed = PLAYER_CONFIG.MOVE_SPEED * deltaTime;

  if (keys['KeyW']) {
    cameraPosition.x += forward.x * speed;
    cameraPosition.z += forward.z * speed;
  }
  if (keys['KeyS']) {
    cameraPosition.x -= forward.x * speed;
    cameraPosition.z -= forward.z * speed;
  }
  if (keys['KeyA']) {
    cameraPosition.x += right.x * speed;
    cameraPosition.z += right.z * speed;
  }
  if (keys['KeyD']) {
    cameraPosition.x -= right.x * speed;
    cameraPosition.z -= right.z * speed;
  }
  if (keys['Space']) {
    cameraPosition.y += speed;
  }
  if (keys['ShiftLeft'] || keys['ShiftRight']) {
    cameraPosition.y -= speed;
  }

  const MIN_POS = -10000;
  const MAX_POS = 10000;
  let clamped = false;
  if (cameraPosition.x < MIN_POS || cameraPosition.x > MAX_POS) {
    cameraPosition.x = Math.max(MIN_POS, Math.min(MAX_POS, cameraPosition.x));
    clamped = true;
  }
  if (cameraPosition.y < MIN_POS || cameraPosition.y > MAX_POS) {
    cameraPosition.y = Math.max(MIN_POS, Math.min(MAX_POS, cameraPosition.y));
    clamped = true;
  }
  if (cameraPosition.z < MIN_POS || cameraPosition.z > MAX_POS) {
    cameraPosition.z = Math.max(MIN_POS, Math.min(MAX_POS, cameraPosition.z));
    clamped = true;
  }
  if (clamped && DEBUG) console.log('[Camera] Position clamped to world bounds');
}

function createViewMatrix() {
  const eye = [cameraPosition.x, cameraPosition.y, cameraPosition.z];
  
  // Calculate forward direction from rotation
  const yaw = cameraRotation.y;
  const pitch = cameraRotation.x;
  
  const forward = [
    -Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch)
  ];
  
  const target = [
    eye[0] + forward[0],
    eye[1] + forward[1],
    eye[2] + forward[2]
  ];
  
  return lookAt(eye, target, [0, 1, 0]);
}

function lookAt(eye, center, up) {
  let z = [eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]];
  const zLen = Math.sqrt(z[0]*z[0] + z[1]*z[1] + z[2]*z[2]);
  if (zLen < 0.0001) z = [0, 0, -1]; // Handle looking at self
  else z = [z[0]/zLen, z[1]/zLen, z[2]/zLen];
  
  // Process right and up vectors naturally - pitch clamping prevents true zero normals
  const x = normalize(cross(up, z));
  const y = cross(z, x);
  
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1
  ]);
}

function normalize(v) {
  const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
  return [v[0]/len, v[1]/len, v[2]/len];
}

function cross(a, b) {
  return [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0]
  ];
}

function dot(a, b) {
  return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}

// Simple voxel raycast using DDA algorithm
function raycastBlock(origin, direction, maxDistance = 8) {
  const x = Math.floor(origin[0]);
  const y = Math.floor(origin[1]);
  const z = Math.floor(origin[2]);
  
  const stepX = direction[0] >= 0 ? 1 : -1;
  const stepY = direction[1] >= 0 ? 1 : -1;
  const stepZ = direction[2] >= 0 ? 1 : -1;
  
  const tDeltaX = direction[0] !== 0 ? Math.abs(1 / direction[0]) : Infinity;
  const tDeltaY = direction[1] !== 0 ? Math.abs(1 / direction[1]) : Infinity;
  const tDeltaZ = direction[2] !== 0 ? Math.abs(1 / direction[2]) : Infinity;
  
  let tMaxX = direction[0] !== 0 ? ((stepX > 0 ? x + 1 : x) - origin[0]) / direction[0] : Infinity;
  let tMaxY = direction[1] !== 0 ? ((stepY > 0 ? y + 1 : y) - origin[1]) / direction[1] : Infinity;
  let tMaxZ = direction[2] !== 0 ? ((stepZ > 0 ? z + 1 : z) - origin[2]) / direction[2] : Infinity;
  
  let currentX = x, currentY = y, currentZ = z;
  let lastX = currentX, lastY = currentY, lastZ = currentZ;
  
  for (let i = 0; i < maxDistance * 3; i++) {
    // Get voxel at current position
    const chunkX = Math.floor(currentX / CHUNK_WIDTH);
    const chunkZ = Math.floor(currentZ / CHUNK_WIDTH);
    const chunk = world.getChunk(chunkX, chunkZ);
    
    if (chunk) {
      const localX = ((currentX % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH;
      const localZ = ((currentZ % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH;
      const localY = currentY;
      
      if (localY >= 0 && localY < CHUNK_HEIGHT) {
        const voxel = chunk.getVoxel(localX, localY, localZ);
        if (voxel !== 0) {
          // Found a solid block - return hit info
          return {
            hit: true,
            x: currentX, y: currentY, z: currentZ,
            chunkX, chunkZ,
            localX, localY, localZ,
            // The face that was hit (normal pointing back to origin)
            normalX: lastX - currentX,
            normalY: lastY - currentY,
            normalZ: lastZ - currentZ,
            voxel
          };
        }
      }
    }
    
    lastX = currentX; lastY = currentY; lastZ = currentZ;
    
    // Step to next voxel boundary
    if (tMaxX < tMaxY) {
      if (tMaxX < tMaxZ) {
        currentX += stepX;
        tMaxX += tDeltaX;
      } else {
        currentZ += stepZ;
        tMaxZ += tDeltaZ;
      }
    } else {
      if (tMaxY < tMaxZ) {
        currentY += stepY;
        tMaxY += tDeltaY;
      } else {
        currentZ += stepZ;
        tMaxZ += tDeltaZ;
      }
    }
    
    if (tMaxX > maxDistance && tMaxY > maxDistance && tMaxZ > maxDistance) {
      break;
    }
  }
  
  return { hit: false };
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
  // Center of shadow frustum follows player
  const center = [cameraPos.x, cameraPos.y, cameraPos.z];
  // Calculate light origin relatively far back along the sun direction
  const dist = 150.0;
  const lightPos = [
    center[0] + sunDir[0] * dist,
    center[1] + sunDir[1] * dist,
    center[2] + sunDir[2] * dist
  ];
  
  // Look down the sun vector at the player, protecting against exactly vertical sun rays causing gimbal-lock NaNs
  const sunNormY = Math.abs(sunDir[1] / Math.sqrt(sunDir[0]*sunDir[0] + sunDir[1]*sunDir[1] + sunDir[2]*sunDir[2]));
  const upVec = sunNormY > 0.99 ? [1, 0, 0] : [0, 1, 0];
  const view = lookAt(lightPos, center, upVec);
  
  // Ortho projection covers roughly the visible surrounding area
  const size = 64.0; // Span 64 units off center in all directions (128x128 footprint)
  const proj = createOrthoMatrix(-size, size, -size, size, 1.0, dist * 2.0);
  
  return multiplyMatrices(proj, view);
}

window.createLightSpaceMatrix = createLightSpaceMatrix;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

setupControls();
updateBlockSelectionUI(); // Initialize block selector UI
updateDebugUI(); // Initialize debug mode indicators
setupRenderState(gl);
initPerformance();
initBlockOutline();
initRenderer(gl);

  // Load texture atlas for block textures
  loadTextureAtlas(gl, 'textures-atlas.png');

registerContextResources({ dispose: disposeWebGLResources, init: initWebGLResources });

const noiseSeed = Math.random();
world = new World(noiseSeed, gl);
biomeCalculator = new BiomeCalculator(noiseSeed);

let lastTime = 0;
let sunCycleTime = SUN_CYCLE_CONFIG.TOTAL_CYCLE * (8/24);
let timePaused = false;

// Update targeted block based on camera direction
function updateTargetedBlock() {
  if (!isPointerLocked) {
    targetedBlock = null;
    return;
  }
  
  const yaw = cameraRotation.y;
  const pitch = cameraRotation.x;
  
  const direction = [
    -Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch)
  ];
  
  const origin = [cameraPosition.x, cameraPosition.y, cameraPosition.z];
  const result = raycastBlock(origin, direction, 8);
  
  if (result.hit) {
    if (!targetedBlock || targetedBlock.x !== result.x || targetedBlock.y !== result.y || targetedBlock.z !== result.z) {
      if (DEBUG) console.log(`[BlockEdit] Target: ${result.x},${result.y},${result.z} (type=${result.voxel})`);
    }
    targetedBlock = result;
  } else {
    if (targetedBlock) {
      if (DEBUG) console.log('[BlockEdit] Target lost');
    }
    targetedBlock = null;
  }
}

// Destroy block at targeted position
function destroyBlock() {
  if (!targetedBlock || !targetedBlock.hit) {
    if (DEBUG) console.log('[BlockEdit] destroyBlock: no target');
    return;
  }
  
  const chunk = world.getChunk(targetedBlock.chunkX, targetedBlock.chunkZ);
  if (chunk) {
    chunk.setVoxel(targetedBlock.localX, targetedBlock.localY, targetedBlock.localZ, 0);
    
    // Regenerate mesh data for WebGL2 (updateMesh doesn't update meshData for WebGL2)
    chunk.meshData = chunk.generateMeshData();
    
    // Delete old WebGL mesh so it gets recreated with new data
    if (chunk._webglMesh) {
      gl.deleteBuffer(chunk._webglMesh.vbo);
      gl.deleteBuffer(chunk._webglMesh.ibo);
      gl.deleteVertexArray(chunk._webglMesh.vao);
      chunk._webglMesh = null;
      chunkMeshes.delete(`${chunk.chunkX},${chunk.chunkZ}`);
    }
    
    // Mark neighbor chunks for update if block is on boundary
    markNeighborChunksForUpdate(targetedBlock.chunkX, targetedBlock.chunkZ, 
                                  targetedBlock.localX, targetedBlock.localY, targetedBlock.localZ);
    
    if (DEBUG) console.log(`[BlockEdit] Destroyed block at ${targetedBlock.x},${targetedBlock.y},${targetedBlock.z}`);
  }
}

// Place block at targeted position
function placeBlock() {
  if (!targetedBlock || !targetedBlock.hit) {
    if (DEBUG) console.log('[BlockEdit] placeBlock: no target');
    return;
  }
  
  // Place on the face we hit (step back from hit)
  const placeX = targetedBlock.x + targetedBlock.normalX;
  const placeY = targetedBlock.y + targetedBlock.normalY;
  const placeZ = targetedBlock.z + targetedBlock.normalZ;
  
  const chunkX = Math.floor(placeX / CHUNK_WIDTH);
  const chunkZ = Math.floor(placeZ / CHUNK_WIDTH);
  const chunk = world.getChunk(chunkX, chunkZ);
  
  if (chunk) {
    const localX = ((placeX % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH;
    const localZ = ((placeZ % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH;
    
    if (placeY >= 0 && placeY < CHUNK_HEIGHT) {
      const existing = chunk.getVoxel(localX, placeY, localZ);
      if (existing === 0) {
        chunk.setVoxel(localX, placeY, localZ, selectedBlockType);
        
        // Regenerate mesh data for WebGL2
        chunk.meshData = chunk.generateMeshData();
        
        // Delete old WebGL mesh so it gets recreated with new data
        if (chunk._webglMesh) {
          gl.deleteBuffer(chunk._webglMesh.vbo);
          gl.deleteBuffer(chunk._webglMesh.ibo);
          gl.deleteVertexArray(chunk._webglMesh.vao);
          chunk._webglMesh = null;
          chunkMeshes.delete(`${chunk.chunkX},${chunk.chunkZ}`);
        }
        
        // Mark neighbor chunks for update if block is on boundary
        markNeighborChunksForUpdate(chunkX, chunkZ, localX, placeY, localZ);
        
        if (DEBUG) console.log(`[BlockEdit] Placed block type ${selectedBlockType} at ${placeX},${placeY},${placeZ}`);
        updateBlockSelectionUI();
      } else {
        if (DEBUG) console.log('[BlockEdit] placeBlock: position occupied');
      }
    }
  }
}

// Mark neighboring chunks for update when block changes near boundary
function markNeighborChunksForUpdate(chunkX, chunkZ, localX, localY, localZ) {
  // Check each axis - if on boundary, mark neighbor
  const neighbors = [];
  
  // West neighbor (localX == 0)
  if (localX === 0) {
    neighbors.push({ x: chunkX - 1, z: chunkZ });
  }
  // East neighbor (localX == CHUNK_WIDTH - 1)
  if (localX === CHUNK_WIDTH - 1) {
    neighbors.push({ x: chunkX + 1, z: chunkZ });
  }
  // North neighbor (localZ == 0)
  if (localZ === 0) {
    neighbors.push({ x: chunkX, z: chunkZ - 1 });
  }
  // South neighbor (localZ == CHUNK_DEPTH - 1)
  if (localZ === CHUNK_DEPTH - 1) {
    neighbors.push({ x: chunkX, z: chunkZ + 1 });
  }
  
  for (const n of neighbors) {
    const neighborChunk = world.getChunk(n.x, n.z);
    if (neighborChunk && neighborChunk.hasVoxelData) {
      neighborChunk.meshData = neighborChunk.generateMeshData();
      neighborChunk.needsUpdate = true;
      if (DEBUG) console.log(`[BlockEdit] Marked neighbor chunk ${n.x},${n.z} for update`);
    }
  }
}

function syncChunkToWebGL(chunk) {
  const key = `${chunk.chunkX},${chunk.chunkZ}`;
  
  if (chunk._webglMesh) {
    return chunk._webglMesh;
  }

  if (!chunk.meshData || !chunk.meshData.positions || chunk.meshData.positions.length === 0) {
    // console.log(`[WebGL2] Chunk ${key} has no mesh data yet`);
    return null;
  }

  try {
    const webglMesh = createChunkMeshFromData(gl, chunk.meshData, voxelAttribs);
    if (webglMesh) {
      chunk._webglMesh = webglMesh;
      chunkMeshes.set(key, webglMesh);
      if (DEBUG) console.log(`[WebGL2] Created mesh for chunk ${key}: ${webglMesh.vertexCount} vertices`);
      
      // Debug: log first few colors from mesh data (commented - spam)
      // if (chunk.meshData.colors && chunk.meshData.colors.length >= 6) {
      //   console.log(`[WebGL2] First colors:`, chunk.meshData.colors.slice(0, 9));
      // }
      // Debug: log first few positions
      // if (chunk.meshData.positions && chunk.meshData.positions.length >= 6) {
      //   console.log(`[WebGL2] First positions:`, chunk.meshData.positions.slice(0, 9));
      // }
      // Debug: log first few UVs
      // if (chunk.meshData.uvs && chunk.meshData.uvs.length >= 4) {
      //   console.log(`[WebGL2] First UVs:`, chunk.meshData.uvs.slice(0, 8));
      // }
    }
    return webglMesh;
  } catch (e) {
    console.error(`[WebGL2] Error creating mesh for chunk ${key}:`, e);
    return null;
  }
}

// Chunk rebuild throttling to prevent frame drops
const MAX_REBUILDS_PER_FRAME = 2;

function updateChunks() {
  const visibleChunks = world.getVisibleChunks();
  
  // console.log(`[WebGL2] updateChunks: ${visibleChunks.length} visible chunks`);
  
  for (const chunk of visibleChunks) {
    const key = `${chunk.chunkX},${chunk.chunkZ}`;
    // Check if chunk has mesh data but no WebGL mesh
    if (!chunk._webglMesh) {
      if (chunk.meshData && chunk.meshData.positions && chunk.meshData.positions.length > 0) {
        // console.log(`[WebGL2] Syncing chunk ${key}: ${chunk.meshData.positions.length/3} vertices`);
        syncChunkToWebGL(chunk);
      }
      // else {
      //   console.log(`[WebGL2] Chunk ${key}: no mesh data yet (hasVoxelData=${chunk.hasVoxelData}, meshReady=${chunk.meshReady})`);
      // }
    }
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

  updateMovement(deltaTime);
  
  // Update block targeting each frame
  updateTargetedBlock();

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
    const direction = getCardinalDirection(cameraRotation.y);
    compassTextEl.textContent = direction;
  }

  const compassNeedleEl = document.querySelector('.compass-needle');
  if (compassNeedleEl) {
    // Rotate needle opposite to camera rotation (inverted for compass display)
    const needleRotation = -cameraRotation.y * 180 / Math.PI;
    compassNeedleEl.style.transform = `translate(-50%, -100%) rotate(${needleRotation}deg)`;
  }

  const fpsEl = document.querySelector('.debug-fps');
  if (fpsEl) fpsEl.textContent = `FPS: ${getFPSDisplay()} (est: ${getFPS()}) | Block: ${selectedBlockType}`;

  const posEl = document.getElementById('camera-position');
  if (posEl) {
    posEl.textContent = `X: ${cameraPosition.x.toFixed(2)} Y: ${cameraPosition.y.toFixed(2)} Z: ${cameraPosition.z.toFixed(2)}`;
  }

  // Update biome display based on player position
  if (biomeCalculator) {
    const biomeContributions = biomeCalculator.getBiomeContributions(cameraPosition.x, cameraPosition.z);
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

  world.update(cameraPosition, renderDistance);
  
  updateChunks();

  const viewMatrix = createViewMatrix();
  const projectionMatrix = createProjectionMatrix();

  beginRenderTiming();
  
  clear(gl, canvas);

  const timeOfDayHours = (sunCycleTime / SUN_CYCLE_CONFIG.TOTAL_CYCLE) * 24;
  // Sky is rendered into the G-buffer albedo inside renderVoxelsToGBuffer

  updateCamera(gl, viewMatrix, projectionMatrix);
  updateTimeOfDay(gl, timeOfDayHours);

  const visibleChunks = world.getVisibleChunks();
  const mvpMatrix = multiplyMatrices(projectionMatrix, viewMatrix);
  
  // Render chunks with textures or wireframe (sky rendered inside as part of G-buffer pass)
  if (visibleChunks.length > 0) {
    renderVoxelsToGBuffer(gl, canvas, visibleChunks, [], viewMatrix, projectionMatrix, wireframeMode, debugColorsMode, timeOfDayHours, () => renderBlockOutline(mvpMatrix), cameraPosition);
  } else {
    // No chunks yet: at least render the sky directly
    renderSky(gl, viewMatrix, projectionMatrix, timeOfDayHours);
    renderBlockOutline(mvpMatrix);
  }
  
  // Check for WebGL errors
  const err = gl.getError();
  if (err !== gl.NO_ERROR) {
    console.error(`[Renderer] WebGL error: ${err}`);
  }
  
  // Log performance metrics in debug mode
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
