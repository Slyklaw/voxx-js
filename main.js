/**
 * Three.js Voxel Engine Main File
 */

import { Renderer } from './renderer.js';
import { Camera } from './camera.js';
import { World } from './world.js';
import { BiomeCalculator } from './biomes.js';
import { BLOCK_TYPES } from './blocks.js';
import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './chunk.js';
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
let sunCycleTime = SUN_CYCLE_CONFIG.TOTAL_CYCLE * (8/24); // Start at 08:00 (morning)
 // Axial tilt not used anymore; equatorial (no tilt) straight-overhead path
 const AXIAL_TILT_DEG = 0.0;
let targetedBlock = null;

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

    // Initialize renderer
    renderer = new Renderer();
    await renderer.init(canvas);

    // Create camera
    camera = new Camera(
      RENDER_CONFIG.FOV,
      window.innerWidth / window.innerHeight,
      RENDER_CONFIG.NEAR_PLANE,
      RENDER_CONFIG.FAR_PLANE
    );

    // Create world
    const noiseSeed = Math.random();
    world = new World(noiseSeed);
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

    console.log('Voxel Engine initialized successfully');
  } catch (error) {
    console.error('Failed to initialize renderer:', error);
    showRendererError(error.message);
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

  // Mouse click handlers for block placement/removal
  document.addEventListener('mousedown', (event) => {
    if (!isPointerLocked) return;
    event.preventDefault();

    if (event.button === 0) { // Left click - destroy block
      destroyBlock();
    } else if (event.button === 2) { // Right click - place block
      placeBlock();
    }
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

  stats = { begin: () => frameCount++, end: () => { } };
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

// Sky data for rendering
let skyData = {
  sunDirection: [0.5, -1.0, 0.5],
  moonDirection: [-0.5, -0.5, -0.5],
  cycleProgress: 0,
  sunElevation: 0,
  moonElevation: 0
};

function updateSunCycle(deltaTime) {
  sunCycleTime += deltaTime;
  if (sunCycleTime >= SUN_CYCLE_CONFIG.TOTAL_CYCLE) {
    sunCycleTime = 0;
  }

  const cycleProgress = sunCycleTime / SUN_CYCLE_CONFIG.TOTAL_CYCLE;

  // Convert cycle progress to 24-hour time
  // 0.00 = 00:00, 0.25 = 06:00, 0.50 = 12:00, 0.75 = 18:00
  const hoursFloat = cycleProgress * 24;
  const hours = Math.floor(hoursFloat);
  const minutes = Math.floor((hoursFloat - hours) * 60);
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

  // Equatorial, no-tilt model:
  // Sun and moon travel along the due-east -> zenith -> due-west great circle in the X-Y plane,
  // with Z kept at 0 (no north/south component). Sun is up from 06:00 to 18:00, moon from 18:00 to 06:00.
  // Parameterize with an angle θ such that:
  //  - Sun: θ_sun goes 0..π from 06:00..18:00, giving dir = (cos(θ), sin(θ), 0).
  //  - Moon: θ_moon goes 0..π from 18:00..06:00, opposite to sun when below horizon.
  const isDaytime = hours >= 6 && hours < 18;

  let sunDir, moonDir;

  if (isDaytime) {
    const dayProgress = (hoursFloat - 6) / 12; // 0 at 06:00, 1 at 18:00
    const theta = dayProgress * Math.PI;       // 0..π

    // East (1,0,0) at sunrise, zenith (0,1,0) at noon, West (-1,0,0) at sunset
    sunDir = [Math.cos(theta), Math.sin(theta), 0];

    // Moon is below the horizon on the exact opposite half of the great circle
    moonDir = [-sunDir[0], -sunDir[1], 0];
  } else {
    // Night: 18:00..06:00 mapped to 0..1
    let nightProgress;
    if (hours >= 18) {
      nightProgress = (hoursFloat - 18) / 12; // 0..0.5 (18:00..24:00)
    } else {
      nightProgress = (hoursFloat + 6) / 12;  // 0.5..1.0 (00:00..06:00)
    }
    const theta = nightProgress * Math.PI; // 0..π

    // Moon rises due east at 18:00, reaches zenith at 00:00, sets due west at 06:00
    moonDir = [Math.cos(theta), Math.sin(theta), 0];

    // Sun is opposite and below horizon
    sunDir = [-moonDir[0], -moonDir[1], 0];
  }

  // Update lighting based on whichever body is above the horizon (positive Y)
  if (isDaytime) {
    // Invert for shader which uses -uniforms.lightDirection.xyz
    lightDirection[0] = -sunDir[0];
    lightDirection[1] = -sunDir[1];
    lightDirection[2] = -sunDir[2];

    const sunElev = Math.max(0, sunDir[1]);
    const lightIntensity = Math.max(0.3, sunElev * 1.2);
    lightColor[0] = lightIntensity;
    lightColor[1] = lightIntensity;
    lightColor[2] = lightIntensity;

    const ambientIntensity = Math.max(0.3, sunElev * 0.5 + 0.3);
    ambientColor[0] = ambientIntensity * 0.4;
    ambientColor[1] = ambientIntensity * 0.4;
    ambientColor[2] = ambientIntensity * 0.6;
  } else {
    // Invert for shader which uses -uniforms.lightDirection.xyz
    lightDirection[0] = -moonDir[0];
    lightDirection[1] = -moonDir[1];
    lightDirection[2] = -moonDir[2];

    const moonElev = Math.max(0, moonDir[1]);
    const lightIntensity = Math.max(0.1, moonElev * 0.4);
    lightColor[0] = lightIntensity * 0.8;
    lightColor[1] = lightIntensity * 0.9;
    lightColor[2] = lightIntensity * 1.0;

    const ambientIntensity = Math.max(0.15, moonElev * 0.2 + 0.15);
    ambientColor[0] = ambientIntensity * 0.3;
    ambientColor[1] = ambientIntensity * 0.3;
    ambientColor[2] = ambientIntensity * 0.5;
  }

  // Update sky shader inputs
  skyData.sunDirection = [sunDir[0], sunDir[1], sunDir[2]];
  skyData.moonDirection = [moonDir[0], moonDir[1], moonDir[2]];
  skyData.cycleProgress = cycleProgress;
  skyData.sunElevation = Math.max(0, sunDir[1]);
  skyData.moonElevation = Math.max(0, moonDir[1]);

  // Occasional debug
  if (Math.random() < 0.01) {
    console.log(`Time: ${timeString}, isDaytime: ${isDaytime}`);
    console.log(`Sun dir: [${sunDir.map(v => v.toFixed(3)).join(', ')}], Moon dir: [${moonDir.map(v => v.toFixed(3)).join(', ')}]`);
  }

  // Update time display
  const dayNight = isDaytime ? 'Day' : 'Night';
  const el = document.getElementById('time-display');
  if (el) el.textContent = `${dayNight}: ${timeString}`;
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

function updateCompass() {
  // Get camera's Y rotation (yaw) in radians
  const yaw = camera.rotation.y;

  // Convert to degrees and normalize to 0-360
  // Flip the sign to match coordinate system where -X is west, +X is east
  let degrees = (-yaw * 180 / Math.PI) % 360;
  if (degrees < 0) degrees += 360;

  // Determine cardinal direction
  let direction;
  if (degrees >= 337.5 || degrees < 22.5) {
    direction = 'N';
  } else if (degrees >= 22.5 && degrees < 67.5) {
    direction = 'NE';
  } else if (degrees >= 67.5 && degrees < 112.5) {
    direction = 'E';
  } else if (degrees >= 112.5 && degrees < 157.5) {
    direction = 'SE';
  } else if (degrees >= 157.5 && degrees < 202.5) {
    direction = 'S';
  } else if (degrees >= 202.5 && degrees < 247.5) {
    direction = 'SW';
  } else if (degrees >= 247.5 && degrees < 292.5) {
    direction = 'W';
  } else {
    direction = 'NW';
  }

  // Update compass needle rotation (pointing in the direction the camera is facing)
  const needle = document.querySelector('.compass-needle');
  if (needle) {
    needle.style.transform = `translate(-50%, -100%) rotate(${degrees}deg)`;
  }

  // Update compass text
  const compassText = document.querySelector('.compass-text');
  if (compassText) {
    compassText.textContent = direction;
  }
}

function updateTargetedBlock() {
  if (!isPointerLocked) {
    targetedBlock = null;
    return;
  }

  targetedBlock = raycastBlock();
}

// Raycasting for block selection
function raycastBlock(maxDistance = 10) {
  const start = camera.position;
  const direction = camera.getWorldDirection();

  // Step along the ray
  const step = 0.1;
  const steps = Math.floor(maxDistance / step);

  for (let i = 0; i < steps; i++) {
    const distance = i * step;
    const x = start.x + direction.x * distance;
    const y = start.y + direction.y * distance;
    const z = start.z + direction.z * distance;

    // Convert world coordinates to chunk and local coordinates
    const chunkX = Math.floor(x / CHUNK_WIDTH);
    const chunkZ = Math.floor(z / CHUNK_DEPTH);
    const localX = Math.floor(x - chunkX * CHUNK_WIDTH);
    const localY = Math.floor(y);
    const localZ = Math.floor(z - chunkZ * CHUNK_DEPTH);

    // Check if we're within valid bounds
    if (localY < 0 || localY >= CHUNK_HEIGHT) continue;
    if (localX < 0 || localX >= CHUNK_WIDTH || localZ < 0 || localZ >= CHUNK_DEPTH) continue;

    const chunk = world.chunks[`${chunkX},${chunkZ}`];
    if (!chunk) continue;

    const blockType = chunk.getVoxel(localX, localY, localZ);

    if (blockType !== 0) { // Found a solid block
      return {
        hit: true,
        chunkX,
        chunkZ,
        localX,
        localY,
        localZ,
        worldX: chunkX * CHUNK_WIDTH + localX,
        worldY: localY,
        worldZ: chunkZ * CHUNK_DEPTH + localZ,
        blockType,
        distance
      };
    }
  }

  return { hit: false };
}

function destroyBlock() {
  const hit = raycastBlock();
  if (!hit.hit) return;

  const chunk = world.chunks[`${hit.chunkX},${hit.chunkZ}`];
  if (!chunk) return;

  // Remove the block (set to air)
  chunk.setVoxel(hit.localX, hit.localY, hit.localZ, 0);

  // Update the mesh
  chunk.updateMesh();
}

function placeBlock() {
  const hit = raycastBlock();
  if (!hit.hit) return;

  // Find the position to place the block (step back along the ray)
  const start = camera.position;
  const direction = camera.getWorldDirection();

  // Step back a bit from the hit point to find the air block adjacent to the hit
  const placeDistance = hit.distance - 0.2;
  const x = start.x + direction.x * placeDistance;
  const y = start.y + direction.y * placeDistance;
  const z = start.z + direction.z * placeDistance;

  // Convert to chunk coordinates
  const chunkX = Math.floor(x / CHUNK_WIDTH);
  const chunkZ = Math.floor(z / CHUNK_DEPTH);
  const localX = Math.floor(x - chunkX * CHUNK_WIDTH);
  const localY = Math.floor(y);
  const localZ = Math.floor(z - chunkZ * CHUNK_DEPTH);

  // Check bounds
  if (localY < 0 || localY >= CHUNK_HEIGHT) return;
  if (localX < 0 || localX >= CHUNK_WIDTH || localZ < 0 || localZ >= CHUNK_DEPTH) return;

  const chunk = world.chunks[`${chunkX},${chunkZ}`];
  if (!chunk) return;

  // Only place if the position is empty (air)
  if (chunk.getVoxel(localX, localY, localZ) === 0) {
    chunk.setVoxel(localX, localY, localZ, selectedBlockType);
    chunk.updateMesh();
  }
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

  // Update targeted block for outline rendering
  updateTargetedBlock();

  // Update compass
  updateCompass();

  // Update camera position display
  const targetInfo = targetedBlock && targetedBlock.hit ?
    ` | Target: (${targetedBlock.worldX}, ${targetedBlock.worldY}, ${targetedBlock.worldZ})` :
    ' | No target';
  document.getElementById('camera-position').textContent =
    `X: ${camera.position.x.toFixed(2)} Y: ${camera.position.y.toFixed(2)} Z: ${camera.position.z.toFixed(2)}${targetInfo}`;

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

  // Send separate view and projection matrices
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
  renderer.render(visibleChunks, camera, targetedBlock, skyData);

  stats.end();
}

function showRendererError(message) {
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
    <h2>Renderer Error</h2>
    <p>${message}</p>
    <p>Please check your browser supports WebGL.</p>
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
