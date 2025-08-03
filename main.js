import './style.css';
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js';
import Stats from './stats.js';
import { PointerLockControls } from 'https://cdn.jsdelivr.net/npm/three@0.179.1/examples/jsm/controls/PointerLockControls.js';
import { createNoise2D } from 'https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/cjs/simplex-noise.min.js';
import { World } from './world.js';
import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './chunk.js';
import { BiomeCalculator } from './biomes.js';
import { 
  RENDER_CONFIG, 
  LIGHTING_CONFIG, 
  PLAYER_CONFIG, 
  SUN_CYCLE_CONFIG, 
  SKY_COLORS, 
  UI_CONFIG, 
  TEST_CONFIG 
} from './config.js';
import { BLOCK_TYPES } from './blocks.js';

// 1. SCENE SETUP
// =================================================================

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(LIGHTING_CONFIG.SKY_COLOR);

// Add fog for atmospheric depth
const fog = new THREE.Fog(LIGHTING_CONFIG.SKY_COLOR, RENDER_CONFIG.FOG_NEAR, RENDER_CONFIG.FOG_FAR);
scene.fog = fog;

// Camera
const camera = new THREE.PerspectiveCamera(
  RENDER_CONFIG.FOV, 
  window.innerWidth / window.innerHeight, 
  RENDER_CONFIG.NEAR_PLANE, 
  RENDER_CONFIG.FAR_PLANE
);
camera.position.set(
  PLAYER_CONFIG.SPAWN_POSITION.x, 
  PLAYER_CONFIG.SPAWN_POSITION.y, 
  PLAYER_CONFIG.SPAWN_POSITION.z
);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.VSMShadowMap; // Variance Shadow Maps can reduce banding
renderer.outputColorSpace = THREE.SRGBColorSpace; // Ensure proper color space
renderer.toneMapping = THREE.ACESFilmicToneMapping; // Add tone mapping to reduce banding
renderer.toneMappingExposure = RENDER_CONFIG.TONE_MAPPING_EXPOSURE;
document.body.appendChild(renderer.domElement);

// Lighting - Sun Cycle System
const ambientLight = new THREE.AmbientLight(LIGHTING_CONFIG.SKY_COLOR, LIGHTING_CONFIG.AMBIENT_INTENSITY);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, LIGHTING_CONFIG.DIRECTIONAL_INTENSITY);
directionalLight.position.set(
  LIGHTING_CONFIG.DIRECTIONAL_LIGHT_POSITION.x,
  LIGHTING_CONFIG.DIRECTIONAL_LIGHT_POSITION.y,
  LIGHTING_CONFIG.DIRECTIONAL_LIGHT_POSITION.z
);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = RENDER_CONFIG.SHADOW_MAP_SIZE;
directionalLight.shadow.mapSize.height = RENDER_CONFIG.SHADOW_MAP_SIZE;
directionalLight.shadow.camera.near = RENDER_CONFIG.SHADOW_CAMERA_NEAR;
directionalLight.shadow.camera.far = RENDER_CONFIG.SHADOW_CAMERA_FAR;
directionalLight.shadow.camera.left = -RENDER_CONFIG.SHADOW_CAMERA_BOUNDS;
directionalLight.shadow.camera.right = RENDER_CONFIG.SHADOW_CAMERA_BOUNDS;
directionalLight.shadow.camera.top = RENDER_CONFIG.SHADOW_CAMERA_BOUNDS;
directionalLight.shadow.camera.bottom = -RENDER_CONFIG.SHADOW_CAMERA_BOUNDS;
// Fixed bias settings to eliminate banding
directionalLight.shadow.bias = LIGHTING_CONFIG.SHADOW_BIAS;
directionalLight.shadow.normalBias = LIGHTING_CONFIG.SHADOW_NORMAL_BIAS;
directionalLight.shadow.radius = LIGHTING_CONFIG.SHADOW_RADIUS;
scene.add(directionalLight);
scene.add(directionalLight.target);

// Add a subtle fill light to brighten shadowed areas
const fillLight = new THREE.DirectionalLight(LIGHTING_CONFIG.SKY_COLOR, LIGHTING_CONFIG.FILL_INTENSITY);
fillLight.position.set(
  LIGHTING_CONFIG.FILL_LIGHT_POSITION.x,
  LIGHTING_CONFIG.FILL_LIGHT_POSITION.y,
  LIGHTING_CONFIG.FILL_LIGHT_POSITION.z
);
scene.add(fillLight);

// Debug helper for shadow camera (toggle with 'H' key)
const shadowCameraHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
shadowCameraHelper.visible = false;
scene.add(shadowCameraHelper);

// Toggle shadow camera helper with H key
document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyH' && controls.isLocked) {
    shadowCameraHelper.visible = !shadowCameraHelper.visible;
  }
});

// Test shadow cube (toggle with 'T' key for testing)
const testGeometry = new THREE.BoxGeometry(
  TEST_CONFIG.CUBE_SIZE.width,
  TEST_CONFIG.CUBE_SIZE.height,
  TEST_CONFIG.CUBE_SIZE.depth
);
const testMaterial = new THREE.MeshStandardMaterial({ color: TEST_CONFIG.CUBE_COLOR });
const testCube = new THREE.Mesh(testGeometry, testMaterial);
testCube.position.set(
  TEST_CONFIG.CUBE_POSITION.x,
  TEST_CONFIG.CUBE_POSITION.y,
  TEST_CONFIG.CUBE_POSITION.z
);
testCube.castShadow = true;
testCube.receiveShadow = true;
testCube.visible = false; // Hidden by default
scene.add(testCube);

// Toggle test cube with T key
document.addEventListener('keydown', (event) => {
  if (event.code === 'KeyT' && controls.isLocked) {
    testCube.visible = !testCube.visible;
  }
});

// Sky colors for different times of day (converted to THREE.Color objects)
const SKY_COLOR_OBJECTS = {
  day: new THREE.Color(SKY_COLORS.DAY),
  sunset: new THREE.Color(SKY_COLORS.SUNSET),
  night: new THREE.Color(SKY_COLORS.NIGHT),
  sunrise: new THREE.Color(SKY_COLORS.SUNRISE),
};

// Sun cycle state
let sunCycleTime = 0; // Current time in the cycle

// FPS Counter
const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb
document.body.appendChild(stats.dom);

// 3. WORLD GENERATION
// =================================================================

const noiseSeed = Math.random();
const noise = createNoise2D(() => noiseSeed);
const world = new World(noiseSeed, scene);
const biomeCalculator = new BiomeCalculator(noiseSeed);
world.update(camera.position); // Initial world generation

// 2. PLAYER CONTROLS
// =================================================================

const controls = new PointerLockControls(camera, document.body);
const instructions = document.getElementById('instructions');
const crosshair = document.getElementById('crosshair');

document.body.addEventListener('click', () => {
  controls.lock();
});

controls.addEventListener('lock', () => {
  instructions.style.display = 'none';
  crosshair.style.display = 'block';
});

controls.addEventListener('unlock', () => {
  instructions.style.display = 'block';
  crosshair.style.display = 'none';
});

const keys = {};
document.addEventListener('keydown', (event) => (keys[event.code] = true));
document.addEventListener('keyup', (event) => (keys[event.code] = false));

// 4. VOXEL EDITING
// =================================================================

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Block selection system
let selectedBlockType = BLOCK_TYPES.STONE; // Default to stone
const blockSelector = document.getElementById('block-selector');
const blockItems = blockSelector.querySelectorAll('.block-item');

// Initialize first block as selected
blockItems[0].classList.add('selected');

// Selection outline
const outlineGeometry = new THREE.BoxGeometry(
  UI_CONFIG.SELECTION_OUTLINE_SIZE,
  UI_CONFIG.SELECTION_OUTLINE_SIZE,
  UI_CONFIG.SELECTION_OUTLINE_SIZE
);
const outlineMaterial = new THREE.MeshBasicMaterial({
  color: UI_CONFIG.SELECTION_OUTLINE_COLOR,
  wireframe: true,
  transparent: true,
  opacity: UI_CONFIG.SELECTION_OUTLINE_OPACITY
});
const selectionOutline = new THREE.Mesh(outlineGeometry, outlineMaterial);
selectionOutline.visible = false;
scene.add(selectionOutline);

// Current selected block
let selectedBlock = null;
let selectedFace = null;

// Block selection UI handlers
blockItems.forEach((item, index) => {
  item.addEventListener('click', () => {
    // Remove selected class from all items
    blockItems.forEach(i => i.classList.remove('selected'));
    // Add selected class to clicked item
    item.classList.add('selected');
    // Update selected block type (index + 1 because block types start at 1)
    selectedBlockType = parseInt(item.dataset.block);
  });
});

// Mouse wheel handler for block selection
document.addEventListener('wheel', (event) => {
  if (!controls.isLocked) return;

  event.preventDefault();

  // Get current selected index
  let currentIndex = -1;
  blockItems.forEach((item, index) => {
    if (item.classList.contains('selected')) {
      currentIndex = index;
    }
  });

  // Calculate new index based on wheel direction
  let newIndex;
  if (event.deltaY > 0) {
    // Scroll down - next block
    newIndex = (currentIndex + 1) % blockItems.length;
  } else {
    // Scroll up - previous block
    newIndex = (currentIndex - 1 + blockItems.length) % blockItems.length;
  }

  // Update selection
  blockItems.forEach(i => i.classList.remove('selected'));
  blockItems[newIndex].classList.add('selected');
  selectedBlockType = parseInt(blockItems[newIndex].dataset.block);
});

// Mouse click handlers
document.addEventListener('mousedown', (event) => {
  if (!controls.isLocked) return;

  if (selectedBlock) {
    const { chunk, x, y, z } = selectedBlock;

    if (event.button === 0) { // Left click - destroy block
      chunk.setVoxel(x, y, z, BLOCK_TYPES.AIR); // Set to air
      updateChunkMesh(chunk);
    } else if (event.button === 2) { // Right click - place block
      if (selectedFace) {
        const newX = x + selectedFace.x;
        const newY = y + selectedFace.y;
        const newZ = z + selectedFace.z;

        // Check bounds
        if (newX >= 0 && newX < CHUNK_WIDTH &&
          newY >= 0 && newY < CHUNK_HEIGHT &&
          newZ >= 0 && newZ < CHUNK_DEPTH) {
          chunk.setVoxel(newX, newY, newZ, selectedBlockType); // Place selected block type
          updateChunkMesh(chunk);
        }
      }
    }
  }
});

// Prevent context menu on right click
document.addEventListener('contextmenu', (event) => {
  event.preventDefault();
});

// Update chunk mesh after modification
function updateChunkMesh(chunk) {
  if (chunk.mesh) {
    scene.remove(chunk.mesh);
    chunk.mesh.geometry.dispose();
    chunk.mesh.material.dispose();
  }

  const newMesh = chunk.createMesh();
  newMesh.position.set(chunk.chunkX * CHUNK_WIDTH, 0, chunk.chunkZ * CHUNK_DEPTH);
  newMesh.castShadow = true;
  newMesh.receiveShadow = true;
  scene.add(newMesh);
  chunk.mesh = newMesh;
}

// Sun cycle update function
/**
 * Dynamically fit the directional light's shadow camera to the region around the player.
 * This keeps shadows sharp and visible where the player looks, reducing clipping and improving texel density.
 */
function updateShadowFrustum() {
  const shadowCam = directionalLight.shadow.camera;

  // Center the shadow camera on the player position
  directionalLight.target.position.copy(camera.position);
  directionalLight.target.updateMatrixWorld();

  // Use tighter bounds for better shadow precision and less banding
  shadowCam.left = -100;
  shadowCam.right = 100;
  shadowCam.top = 100;
  shadowCam.bottom = -100;
  shadowCam.near = 1;
  shadowCam.far = 400;

  shadowCam.updateProjectionMatrix();
}

/**
 * Prevent the sun from going perfectly overhead to keep visible shadows throughout the day.
 * Also updates sky and light color/intensity.
 */
function updateSunCycle(deltaTime) {
  sunCycleTime += deltaTime;
  if (sunCycleTime >= SUN_CYCLE_CONFIG.TOTAL_CYCLE) {
    sunCycleTime = 0; // Reset cycle
  }

  // Calculate sun position (0 = sunrise, 0.5 = sunset, 1 = sunrise again)
  const cycleProgress = sunCycleTime / SUN_CYCLE_CONFIG.TOTAL_CYCLE;

  // Keep a minimum elevation so shadows remain noticeable
  const minElevation = THREE.MathUtils.degToRad(SUN_CYCLE_CONFIG.MIN_ELEVATION_DEG);
  const maxElevation = THREE.MathUtils.degToRad(SUN_CYCLE_CONFIG.MAX_ELEVATION_DEG);

  // Create a more natural sun arc
  const sunAngle = cycleProgress * Math.PI * 2; // Full circle
  const elevation = minElevation + (Math.sin(sunAngle) * 0.5 + 0.5) * (maxElevation - minElevation);
  const azimuth = sunAngle * 0.5; // Slower azimuth change for more natural movement

  const r = SUN_CYCLE_CONFIG.SUN_RADIUS;
  const sunPos = new THREE.Vector3(
    Math.cos(azimuth) * Math.cos(elevation) * r + camera.position.x,
    Math.sin(elevation) * r + SUN_CYCLE_CONFIG.SUN_HEIGHT + camera.position.y,
    Math.sin(azimuth) * Math.cos(elevation) * r + camera.position.z
  );

  directionalLight.position.copy(sunPos);

  // Update shadow camera to follow the player and keep tight bounds
  updateShadowFrustum();

  // Update shadow camera helper if visible
  if (shadowCameraHelper.visible) {
    shadowCameraHelper.update();
  }

  // Calculate light intensity based on elevation
  const elevationNormalized = (elevation - minElevation) / (maxElevation - minElevation);
  const lightIntensity = Math.max(0.2, elevationNormalized * 1.2);

  directionalLight.intensity = lightIntensity;

  // Update fill light intensity inversely to main light for better balance
  fillLight.intensity = Math.max(0.3, 0.6 - elevationNormalized * 0.3);

  // Update ambient light intensity based on time of day
  const ambientIntensity = Math.max(0.25, elevationNormalized * 0.4 + 0.2);
  ambientLight.intensity = ambientIntensity;

  // Update sky color based on sun position
  let skyColor;
  const timeOfDay = cycleProgress;

  if (timeOfDay < 0.15) { // Early morning (0-0.15)
    skyColor = SKY_COLOR_OBJECTS.night.clone().lerp(SKY_COLOR_OBJECTS.sunrise, timeOfDay / 0.15);
  } else if (timeOfDay < 0.25) { // Sunrise to day (0.15-0.25)
    skyColor = SKY_COLOR_OBJECTS.sunrise.clone().lerp(SKY_COLOR_OBJECTS.day, (timeOfDay - 0.15) / 0.1);
  } else if (timeOfDay < 0.75) { // Day (0.25-0.75)
    skyColor = SKY_COLOR_OBJECTS.day;
  } else if (timeOfDay < 0.85) { // Day to sunset (0.75-0.85)
    skyColor = SKY_COLOR_OBJECTS.day.clone().lerp(SKY_COLOR_OBJECTS.sunset, (timeOfDay - 0.75) / 0.1);
  } else if (timeOfDay < 0.95) { // Sunset to night (0.85-0.95)
    skyColor = SKY_COLOR_OBJECTS.sunset.clone().lerp(SKY_COLOR_OBJECTS.night, (timeOfDay - 0.85) / 0.1);
  } else { // Night (0.95-1.0)
    skyColor = SKY_COLOR_OBJECTS.night;
  }

  scene.background = skyColor;

  // Update fog color to match sky
  if (scene.fog) {
    scene.fog.color.copy(skyColor);
  }

  // Update ambient and fill light colors to match sky
  ambientLight.color.copy(skyColor);
  fillLight.color.copy(skyColor);

  // Update sun light color based on elevation
  if (elevationNormalized < 0.3) { // Near horizon
    const orangeAmount = (0.3 - elevationNormalized) / 0.3;
    const sunColor = new THREE.Color(0xffffff).lerp(new THREE.Color(0xffa500), orangeAmount);
    directionalLight.color.copy(sunColor);
  } else {
    directionalLight.color.setHex(0xffffff); // White
  }

  // Update time display
  const dayTime = (timeOfDay < 0.5) ? timeOfDay * 2 : (timeOfDay - 0.5) * 2; // 0-1 for day portion
  const hours = Math.floor(dayTime * 24);
  const minutes = Math.floor((dayTime * 24 - hours) * 60);
  const timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  const dayNight = (timeOfDay < 0.5) ? 'Day' : 'Night';
  document.getElementById('time-display').textContent = `${dayNight}: ${timeString}`;
}

// Raycasting for block selection
function updateBlockSelection() {
  if (!controls.isLocked) {
    selectionOutline.visible = false;
    selectedBlock = null;
    return;
  }

  raycaster.setFromCamera(mouse, camera);

  // Get all chunk meshes
  const meshes = [];
  for (const key in world.chunks) {
    const chunk = world.chunks[key];
    if (chunk.mesh && chunk.voxels) {
      meshes.push(chunk.mesh);
    }
  }

  const intersects = raycaster.intersectObjects(meshes);

  if (intersects.length > 0 && intersects[0].distance <= PLAYER_CONFIG.MAX_REACH) {
    const intersection = intersects[0];
    const mesh = intersection.object;

    // Find which chunk this mesh belongs to
    let targetChunk = null;
    for (const key in world.chunks) {
      const chunk = world.chunks[key];
      if (chunk.mesh === mesh) {
        targetChunk = chunk;
        break;
      }
    }

    if (targetChunk) {
      // Calculate local voxel coordinates
      const localX = Math.floor(intersection.point.x - mesh.position.x);
      const localY = Math.floor(intersection.point.y);
      const localZ = Math.floor(intersection.point.z - mesh.position.z);

      // Adjust for the face we're looking at
      const normal = intersection.face.normal;
      const blockX = localX - (normal.x > 0 ? 1 : 0);
      const blockY = localY - (normal.y > 0 ? 1 : 0);
      const blockZ = localZ - (normal.z > 0 ? 1 : 0);

      // Ensure coordinates are within bounds
      if (blockX >= 0 && blockX < CHUNK_WIDTH &&
        blockY >= 0 && blockY < CHUNK_HEIGHT &&
        blockZ >= 0 && blockZ < CHUNK_DEPTH) {

        selectedBlock = {
          chunk: targetChunk,
          x: blockX,
          y: blockY,
          z: blockZ
        };

        selectedFace = { x: normal.x, y: normal.y, z: normal.z };

        // Update selection outline position
        selectionOutline.position.set(
          mesh.position.x + blockX + 0.5,
          blockY + 0.5,
          mesh.position.z + blockZ + 0.5
        );
        selectionOutline.visible = true;
      }
    }
  } else {
    selectionOutline.visible = false;
    selectedBlock = null;
  }
}

// Biome display update timer
let biomeUpdateTimer = 0;

// Update biome display based on camera position
function updateBiomeDisplay(deltaTime) {
  if (!controls.isLocked) return;

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

// 5. ANIMATION LOOP
// =================================================================

const clock = new THREE.Clock();

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  stats.begin();

  const delta = clock.getDelta();

  if (controls.isLocked) {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(camera.up, forward).normalize();

    if (keys['KeyW']) camera.position.addScaledVector(forward, PLAYER_CONFIG.MOVE_SPEED * delta);
    if (keys['KeyS']) camera.position.addScaledVector(forward, -PLAYER_CONFIG.MOVE_SPEED * delta);
    if (keys['KeyA']) camera.position.addScaledVector(right, PLAYER_CONFIG.MOVE_SPEED * delta);
    if (keys['KeyD']) camera.position.addScaledVector(right, -PLAYER_CONFIG.MOVE_SPEED * delta);
    if (keys['Space']) camera.position.y += PLAYER_CONFIG.MOVE_SPEED * delta;
    if (keys['ShiftLeft']) camera.position.y -= PLAYER_CONFIG.MOVE_SPEED * delta;
  }

  // Update world based on camera position
  world.update(camera.position);

  // Update sun cycle
  updateSunCycle(delta);

  // Update block selection
  updateBlockSelection();

    // Update camera position display
  document.getElementById('camera-position').textContent =
    `X: ${camera.position.x.toFixed(2)} Y: ${camera.position.y.toFixed(2)} Z: ${camera.position.z.toFixed(2)}`;

  // Update biome display
  updateBiomeDisplay(delta);

  renderer.render(scene, camera);
  stats.end();
}

// Start animation
animate();
