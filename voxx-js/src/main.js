import { gl, canvas, isContextLost } from './gl/context.js';
import { initRenderer, setupRenderState, clear, renderSky, renderChunks, updateCamera, updateTimeOfDay, voxelAttribs, voxelUniforms } from './gl/render.js';
import { createChunkMeshFromData, VERTEX_FORMAT } from './gl/buffers.js';
import { initPerformance, beginFrame, getFPS, getFPSDisplay, beginRenderTiming, endRenderTiming } from './gl/performance.js';
import { World } from '../world.js';
import { BiomeCalculator } from '../biomes.js';
import { RENDER_CONFIG, PLAYER_CONFIG, SUN_CYCLE_CONFIG } from '../config.js';
import { CHUNK_WIDTH, CHUNK_DEPTH } from '../chunk.js';

console.log('WebGL2 main initializing...');

let isPointerLocked = false;
let keys = {};
let cameraPosition = { x: 16, y: 60, z: 16 };
let cameraRotation = { x: -0.5, y: 0 };
let selectedBlockType = 1;
let targetedBlock = null;

let world;
let biomeCalculator;
let chunkMeshes = new Map();

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
    cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraRotation.x));
  });

  document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
  });

  document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
  });

  document.getElementById('render-inc')?.addEventListener('click', () => {
    const el = document.getElementById('render-distance-value');
    if (el) el.textContent = Math.max(1, parseInt(el.textContent) + 1);
  });

  document.getElementById('render-dec')?.addEventListener('click', () => {
    const el = document.getElementById('render-distance-value');
    if (el) el.textContent = Math.max(1, parseInt(el.textContent) - 1);
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
  const z = normalize([eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]]);
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

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, canvas.width, canvas.height);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

setupControls();
setupRenderState(gl);
initPerformance();

initRenderer(gl);

const noiseSeed = Math.random();
world = new World(noiseSeed);
biomeCalculator = new BiomeCalculator(noiseSeed);

let lastTime = 0;
let sunCycleTime = SUN_CYCLE_CONFIG.TOTAL_CYCLE * (8/24);

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
    chunk._webglMesh = webglMesh;
    chunkMeshes.set(key, webglMesh);
    console.log(`[WebGL2] Created mesh for chunk ${key}: ${webglMesh.vertexCount} vertices`);
    return webglMesh;
  } catch (e) {
    console.error(`[WebGL2] Error creating mesh for chunk ${key}:`, e);
    return null;
  }
}

function updateChunks() {
  const visibleChunks = world.getVisibleChunks();
  
  for (const chunk of visibleChunks) {
    if (!chunk._webglMesh && chunk.meshData) {
      syncChunkToWebGL(chunk);
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

  sunCycleTime += deltaTime * SUN_CYCLE_CONFIG.TIME_SCALE;
  if (sunCycleTime >= SUN_CYCLE_CONFIG.TOTAL_CYCLE) {
    sunCycleTime = 0;
  }

  const hours = Math.floor(sunCycleTime / SUN_CYCLE_CONFIG.TOTAL_CYCLE * 24);
  const minutes = Math.floor((sunCycleTime / SUN_CYCLE_CONFIG.TOTAL_CYCLE * 24 - hours) * 60);
  const isDaytime = hours >= 6 && hours < 18;
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  
  const timeEl = document.getElementById('time-display');
  if (timeEl) timeEl.textContent = `${isDaytime ? 'Day' : 'Night'}: ${timeString}`;

  const fpsEl = document.querySelector('.debug-fps');
  if (fpsEl) fpsEl.textContent = `FPS: ${getFPSDisplay()} (est: ${getFPS()})`;

  const posEl = document.getElementById('camera-position');
  if (posEl) {
    posEl.textContent = `X: ${cameraPosition.x.toFixed(2)} Y: ${cameraPosition.y.toFixed(2)} Z: ${cameraPosition.z.toFixed(2)}`;
  }

  const renderDistance = parseInt(document.getElementById('render-distance-value')?.textContent || '8');
  world.update(cameraPosition, renderDistance);
  
  updateChunks();

  const viewMatrix = createViewMatrix();
  const projectionMatrix = createProjectionMatrix();

  beginRenderTiming();
  
  clear(gl, canvas);

  const timeOfDay = (sunCycleTime / SUN_CYCLE_CONFIG.TOTAL_CYCLE) % 1;
  renderSky(gl, viewMatrix, projectionMatrix, timeOfDay);

  updateCamera(gl, viewMatrix, projectionMatrix);
  updateTimeOfDay(gl, sunCycleTime / SUN_CYCLE_CONFIG.TOTAL_CYCLE * 24);

  const visibleChunks = world.getVisibleChunks();
  const webglChunks = [];
  
  for (const chunk of visibleChunks) {
    if (chunk._webglMesh && chunk._webglMesh.vao) {
      webglChunks.push(chunk._webglMesh);
    }
  }

  if (webglChunks.length > 0) {
    renderChunks(gl, webglChunks, [], viewMatrix, projectionMatrix);
  }
  
  endRenderTiming();

  requestAnimationFrame(render);
}

requestAnimationFrame(render);

console.log('WebGL2 voxel engine initialized');
