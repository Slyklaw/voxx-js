/**
 * WebGPU Voxel Engine Main File
 */

import { WebGPURenderer } from './renderer.js';
import { WebGPUCamera } from './camera.js';
import { WebGPUWorld } from './world.js';
import { BiomeCalculator } from './biomes.js';
import { BLOCK_TYPES } from './blocks.js';
import { 
  RENDER_CONFIG, 
  LIGHTING_CONFIG, 
  PLAYER_CONFIG, 
  SUN_CYCLE_CONFIG, 
  SKY_COLORS, 
  UI_CONFIG 
} from './config.js';

// Global variables
let renderer, camera, world, biomeCalculator;
let canvas, stats;
let isPointerLocked = false;
let keys = {};
let selectedBlockType = BLOCK_TYPES.STONE;
let sunCycleTime = 0;

// Lighting state
let lightDirection = [0.5, -1.0, 0.5];
let lightColor = [1.0, 1.0, 1.0];
let ambientColor = [0.4, 0.4, 0.6];

// Initialize the application
async function init() {
  try {
    // Create canvas
    canvas = document.createElement('canvas');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    // Initialize WebGPU renderer
    renderer = new WebGPURenderer();
    await renderer.init(canvas);

    // Create camera
    camera = new WebGPUCamera(
      RENDER_CONFIG.FOV,
      window.innerWidth / window.innerHeight,
      RENDER_CONFIG.NEAR_PLANE,
      RENDER_CONFIG.FAR_PLANE
    );

    // Create world
    const noiseSeed = Math.random();
    world = new WebGPUWorld(noiseSeed, renderer.device);
    biomeCalculator = new BiomeCalculator(noiseSeed);

    // Initial world generation
    world.update(camera.position);

    // Setup controls
    setupControls();
    setupUI();

    // Setup FPS counter
    setupStats();

    // Start render loop
    requestAnimationFrame(animate);

    console.log('WebGPU Voxel Engine initialized successfully');
  } catch (error) {
    console.error('Failed to initialize WebGPU:', error);
    showWebGPUError(error.message);
  }
}

function setupControls() {
  // Pointer lock
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

  // Mouse movement
  document.addEventListener('mousemove', (event) => {
    if (!isPointerLocked) return;

    const sensitivity = 0.002;
    camera.rotation.y -= event.movementX * sensitivity;
    camera.rotation.x -= event.movementY * sensitivity;
    
    // Clamp vertical rotation
    camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
  });

  // Keyboard input
  document.addEventListener('keydown', (event) => {
    keys[event.code] = true;
  });

  document.addEventListener('keyup', (event) => {
    keys[event.code] = false;
  });

  // Mouse wheel for block selection
  document.addEventListener('wheel', (event) => {
    if (!isPointerLocked) return;
    event.preventDefault();
    
    const blockItems = document.querySelectorAll('.block-item');
    let currentIndex = -1;
    
    blockItems.forEach((item, index) => {
      if (item.classList.contains('selected')) {
        currentIndex = index;
      }
    });

    let newIndex;
    if (event.deltaY > 0) {
      newIndex = (currentIndex + 1) % blockItems.length;
    } else {
      newIndex = (currentIndex - 1 + blockItems.length) % blockItems.length;
    }

    blockItems.forEach(i => i.classList.remove('selected'));
    blockItems[newIndex].classList.add('selected');
    selectedBlockType = parseInt(blockItems[newIndex].dataset.block);
  });

  // Prevent context menu
  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });
}

function setupUI() {
  // Block selector
  const blockItems = document.querySelectorAll('.block-item');
  blockItems[0].classList.add('selected');

  blockItems.forEach((item) => {
    item.addEventListener('click', () => {
      blockItems.forEach(i => i.classList.remove('selected'));
      item.classList.add('selected');
      selectedBlockType = parseInt(item.dataset.block);
    });
  });
}

function setupStats() {
  // Simple FPS counter
  let frameCount = 0;
  let lastTime = performance.now();
  
  const fpsDisplay = document.createElement('div');
  fpsDisplay.style.position = 'absolute';
  fpsDisplay.style.top = '10px';
  fpsDisplay.style.left = '10px';
  fpsDisplay.style.color = 'white';
  fpsDisplay.style.fontFamily = 'monospace';
  fpsDisplay.style.background = 'rgba(0,0,0,0.8)';
  fpsDisplay.style.padding = '8px';
  fpsDisplay.style.borderRadius = '4px';
  fpsDisplay.style.zIndex = '1000';
  document.body.appendChild(fpsDisplay);

  setInterval(() => {
    const now = performance.now();
    const fps = Math.round(frameCount * 1000 / (now - lastTime));
    fpsDisplay.textContent = `FPS: ${fps}`;
    frameCount = 0;
    lastTime = now;
  }, 1000);

  stats = { begin: () => frameCount++, end: () => {} };
}

function updateMovement(deltaTime) {
  if (!isPointerLocked) return;

  const forward = camera.getWorldDirection();
  const right = {
    x: forward.z,
    y: 0,
    z: -forward.x
  };

  // Normalize right vector
  const rightLength = Math.sqrt(right.x * right.x + right.z * right.z);
  right.x /= rightLength;
  right.z /= rightLength;

  const speed = PLAYER_CONFIG.MOVE_SPEED * deltaTime;

  if (keys['KeyW']) {
    camera.position.x += forward.x * speed;
    camera.position.z += forward.z * speed;
  }
  if (keys['KeyS']) {
    camera.position.x -= forward.x * speed;
    camera.position.z -= forward.z * speed;
  }
  if (keys['KeyA']) {
    camera.position.x += right.x * speed;
    camera.position.z += right.z * speed;
  }
  if (keys['KeyD']) {
    camera.position.x -= right.x * speed;
    camera.position.z -= right.z * speed;
  }
  if (keys['Space']) {
    camera.position.y += speed;
  }
  if (keys['ShiftLeft']) {
    camera.position.y -= speed;
  }
}

function updateSunCycle(deltaTime) {
  sunCycleTime += deltaTime;
  if (sunCycleTime >= SUN_CYCLE_CONFIG.TOTAL_CYCLE) {
    sunCycleTime = 0;
  }

  const cycleProgress = sunCycleTime / SUN_CYCLE_CONFIG.TOTAL_CYCLE;
  
  // Calculate sun position
  const minElevation = SUN_CYCLE_CONFIG.MIN_ELEVATION_DEG * Math.PI / 180;
  const maxElevation = SUN_CYCLE_CONFIG.MAX_ELEVATION_DEG * Math.PI / 180;
  
  const sunAngle = cycleProgress * Math.PI * 2;
  const elevation = minElevation + (Math.sin(sunAngle) * 0.5 + 0.5) * (maxElevation - minElevation);
  const azimuth = sunAngle * 0.5;

  // Update light direction
  lightDirection[0] = Math.cos(azimuth) * Math.cos(elevation);
  lightDirection[1] = -Math.sin(elevation);
  lightDirection[2] = Math.sin(azimuth) * Math.cos(elevation);

  // Update light intensity
  const elevationNormalized = (elevation - minElevation) / (maxElevation - minElevation);
  const lightIntensity = Math.max(0.2, elevationNormalized * 1.2);
  
  lightColor[0] = lightIntensity;
  lightColor[1] = lightIntensity;
  lightColor[2] = lightIntensity;

  // Update ambient light
  const ambientIntensity = Math.max(0.25, elevationNormalized * 0.4 + 0.2);
  ambientColor[0] = ambientIntensity * 0.4;
  ambientColor[1] = ambientIntensity * 0.4;
  ambientColor[2] = ambientIntensity * 0.6;

  // Update time display
  const dayTime = (cycleProgress < 0.5) ? cycleProgress * 2 : (cycleProgress - 0.5) * 2;
  const hours = Math.floor(dayTime * 24);
  const minutes = Math.floor((dayTime * 24 - hours) * 60);
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const dayNight = (cycleProgress < 0.5) ? 'Day' : 'Night';
  document.getElementById('time-display').textContent = `${dayNight}: ${timeString}`;
}

let biomeUpdateTimer = 0;

function updateBiomeDisplay(deltaTime) {
  if (!isPointerLocked) return;

  biomeUpdateTimer += deltaTime;
  if (biomeUpdateTimer < UI_CONFIG.BIOME_UPDATE_INTERVAL) return;
  
  biomeUpdateTimer = 0;

  const contributions = biomeCalculator.getBiomeContributions(camera.position.x, camera.position.z);
  const biomeItems = document.querySelectorAll('.biome-item');
  
  contributions.forEach((contrib, index) => {
    if (index < biomeItems.length) {
      const item = biomeItems[index];
      const fill = item.querySelector('.biome-fill');
      const percent = item.querySelector('.biome-percent');
      
      fill.style.width = `${contrib.contribution}%`;
      percent.textContent = `${contrib.contribution}%`;
    }
  });
}

let lastTime = 0;

function animate(currentTime) {
  requestAnimationFrame(animate);
  stats.begin();

  const deltaTime = (currentTime - lastTime) / 1000;
  lastTime = currentTime;

  // Update movement
  updateMovement(deltaTime);

  // Update world
  world.update(camera.position);

  // Update sun cycle
  updateSunCycle(deltaTime);

  // Update biome display
  updateBiomeDisplay(deltaTime);

  // Update camera position display
  document.getElementById('camera-position').textContent =
    `X: ${camera.position.x.toFixed(2)} Y: ${camera.position.y.toFixed(2)} Z: ${camera.position.z.toFixed(2)}`;

  // Update camera matrices
  camera.updateViewProjectionMatrix();

  // Debug camera position occasionally
  if (Math.random() < 0.01) { // 1% chance per frame
    console.log(`Camera: ${camera.position.x.toFixed(1)}, ${camera.position.y.toFixed(1)}, ${camera.position.z.toFixed(1)}`);
    console.log(`Camera rotation: ${camera.rotation.x.toFixed(2)}, ${camera.rotation.y.toFixed(2)}, ${camera.rotation.z.toFixed(2)}`);
    console.log(`Visible chunks: ${world.getVisibleChunks().length}`);
    
    // Show which chunks are around the camera
    const visibleChunks = world.getVisibleChunks();
    if (visibleChunks.length > 0) {
      console.log(`Sample chunks: ${visibleChunks.slice(0, 3).map(c => `(${c.chunkX},${c.chunkZ})`).join(', ')}`);
    }
  }

  // Update renderer uniforms
  const modelMatrix = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);

  // Send separate view and projection matrices (renderer composes VP in the shader)
  renderer.updateUniforms(
    camera.viewMatrix,
    camera.projectionMatrix,
    modelMatrix,
    lightDirection,
    lightColor,
    ambientColor
  );

  // Render
  const visibleChunks = world.getVisibleChunks();
  renderer.render(visibleChunks, camera);

  stats.end();
}

function showWebGPUError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.style.position = 'fixed';
  errorDiv.style.top = '50%';
  errorDiv.style.left = '50%';
  errorDiv.style.transform = 'translate(-50%, -50%)';
  errorDiv.style.background = 'rgba(255, 0, 0, 0.9)';
  errorDiv.style.color = 'white';
  errorDiv.style.padding = '20px';
  errorDiv.style.borderRadius = '10px';
  errorDiv.style.textAlign = 'center';
  errorDiv.style.zIndex = '10000';
  errorDiv.innerHTML = `
    <h2>WebGPU Not Available</h2>
    <p>${message}</p>
    <p>Please use a browser that supports WebGPU (Chrome 113+, Edge 113+)</p>
    <p>Make sure WebGPU is enabled in your browser flags.</p>
  `;
  document.body.appendChild(errorDiv);
}

// Handle window resize
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  camera.setAspect(window.innerWidth / window.innerHeight);
  renderer.resize(window.innerWidth, window.innerHeight);
});

// Start the application
init();
