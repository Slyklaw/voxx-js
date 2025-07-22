import './style.css';
import * as THREE from 'three';
import Stats from 'stats.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createNoise2D } from 'simplex-noise';
import { World } from './world.js';
import { VoxelModifier } from './voxelModifier.js';
import { VoxelInteractionSystem } from './voxelInteractionSystem.js';

// 1. SCENE SETUP
// =================================================================

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue

// Camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(16, 200, 16); // Raised initial position

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 10, 7.5);
scene.add(directionalLight);

// FPS Counter
const stats = new Stats();
stats.showPanel(0); // 0: fps, 1: ms, 2: mb
document.body.appendChild(stats.dom);

// 3. WORLD GENERATION
// =================================================================

const noiseSeed = Math.random();
const noise = createNoise2D(() => noiseSeed);
const world = new World(noiseSeed, scene);

// Create loading indicator
const loadingIndicator = document.createElement('div');
loadingIndicator.id = 'loading-indicator';
loadingIndicator.style.position = 'absolute';
loadingIndicator.style.top = '50%';
loadingIndicator.style.left = '50%';
loadingIndicator.style.transform = 'translate(-50%, -50%)';
loadingIndicator.style.color = 'white';
loadingIndicator.style.fontSize = '18px';
loadingIndicator.style.fontFamily = 'sans-serif';
loadingIndicator.style.textAlign = 'center';
loadingIndicator.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
loadingIndicator.style.padding = '20px';
loadingIndicator.style.borderRadius = '10px';
loadingIndicator.style.zIndex = '2000';
loadingIndicator.innerHTML = `
  <div>Loading Initial Chunk...</div>
  <div style="margin-top: 10px; font-size: 14px; opacity: 0.8;">
    Generating terrain at spawn location
  </div>
`;
document.body.appendChild(loadingIndicator);

// Preload the initial chunk where the camera spawns
let worldInitialized = false;
world.preloadInitialChunk(camera.position).then(() => {
  console.log('Initial chunk loaded, enabling full world updates');
  worldInitialized = true;
  
  // Remove loading indicator
  document.body.removeChild(loadingIndicator);
  
  // Now allow normal world updates
  world.update(camera.position);
});

// 4. VOXEL MODIFICATION SYSTEM
// =================================================================

// Create block outline for visual feedback
let blockOutline = null;
let targetedVoxelInfo = null;

function createBlockOutline() {
  // Create wireframe box geometry
  const geometry = new THREE.BoxGeometry(1.05, 1.05, 1.05); // Slightly larger than voxel
  const edges = new THREE.EdgesGeometry(geometry);
  const material = new THREE.LineBasicMaterial({ 
    color: 0x000000, // Black outline
    linewidth: 3,
    transparent: true,
    opacity: 0.9
  });
  
  blockOutline = new THREE.LineSegments(edges, material);
  blockOutline.visible = false; // Initially hidden
  
  // Add a subtle pulsing animation
  blockOutline.userData = { 
    originalScale: 1.0,
    pulseSpeed: 2.0,
    time: 0
  };
  
  scene.add(blockOutline);
}

function updateBlockOutline() {
  if (!blockOutline) return;
  
  const previousTargetInfo = targetedVoxelInfo;
  
  // Perform raycast to find targeted voxel
  const mouse = new THREE.Vector2(0, 0); // Center of screen
  const hitResult = voxelInteractionSystem.raycaster.raycastFromScreen(mouse, camera, playerModifier.maxRange);
  
  if (hitResult && hitResult.hit) {
    // Determine target position based on current mode
    let targetPos;
    if (isDestroyMode) {
      // For destroy mode, highlight the voxel that will be destroyed
      targetPos = hitResult.voxelPosition;
    } else {
      // For place mode, highlight where the new voxel will be placed
      targetPos = voxelInteractionSystem.raycaster.getPlacementPosition(hitResult);
      
      // Check if placement position is valid
      if (!targetPos || !voxelInteractionSystem.raycaster.isValidPlacementPosition(targetPos)) {
        blockOutline.visible = false;
        targetedVoxelInfo = null;
        // Update UI if target changed
        if (previousTargetInfo !== null) {
          updateVoxelUI();
        }
        return;
      }
    }
    
    // Position the outline at the target voxel
    blockOutline.position.set(
      targetPos.x + 0.5, // Center of voxel
      targetPos.y + 0.5,
      targetPos.z + 0.5
    );
    
    // Change color based on mode and validity
    if (isDestroyMode) {
      blockOutline.material.color.setHex(0xff0000); // Red for destroy
    } else {
      blockOutline.material.color.setHex(0x00ff00); // Green for place
    }
    
    blockOutline.visible = true;
    const newTargetInfo = {
      position: targetPos.clone(),
      mode: isDestroyMode ? 'destroy' : 'place',
      distance: hitResult.distance
    };
    
    // Check if target changed significantly to avoid excessive UI updates
    const targetChanged = !previousTargetInfo || 
      !previousTargetInfo.position.equals(newTargetInfo.position) ||
      previousTargetInfo.mode !== newTargetInfo.mode;
    
    targetedVoxelInfo = newTargetInfo;
    
    if (targetChanged) {
      updateVoxelUI();
    }
  } else {
    // No valid target found
    blockOutline.visible = false;
    targetedVoxelInfo = null;
    
    // Update UI if we had a target before
    if (previousTargetInfo !== null) {
      updateVoxelUI();
    }
  }
}

// Initialize block outline
createBlockOutline();

// Initialize voxel modification system
const voxelInteractionSystem = new VoxelInteractionSystem(world, scene);
const playerModifier = new VoxelModifier({
  canPlace: true,
  canDestroy: true,
  availableBlocks: [1, 2, 3, 5], // stone, dirt, grass, snow
  currentBlockType: 1, // start with stone
  maxRange: 10,
  minRange: 1,
  modificationCooldown: 150 // 150ms cooldown
});

// Track current mode (place or destroy)
let isDestroyMode = false;

// Set up voxel modification event callbacks
voxelInteractionSystem.onVoxelModified = (event) => {
  console.log(`Voxel ${event.action}d at position:`, event.position, 'Block type:', event.blockType);
  updateVoxelUI();
};

voxelInteractionSystem.onChunkUpdated = (chunkKeys) => {
  console.log(`Updated ${chunkKeys.length} chunks:`, chunkKeys);
};

// Create UI for voxel modification
function createVoxelUI() {
  // Create UI container
  const uiContainer = document.createElement('div');
  uiContainer.id = 'voxel-ui';
  uiContainer.style.position = 'absolute';
  uiContainer.style.top = '10px';
  uiContainer.style.left = '10px';
  uiContainer.style.color = 'white';
  uiContainer.style.fontFamily = 'monospace';
  uiContainer.style.fontSize = '14px';
  uiContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  uiContainer.style.padding = '10px';
  uiContainer.style.borderRadius = '5px';
  uiContainer.style.zIndex = '1000';
  uiContainer.style.pointerEvents = 'none'; // Don't interfere with pointer lock
  
  document.body.appendChild(uiContainer);
  
  // Create crosshair
  const crosshair = document.createElement('div');
  crosshair.id = 'crosshair';
  crosshair.style.position = 'absolute';
  crosshair.style.top = '50%';
  crosshair.style.left = '50%';
  crosshair.style.width = '20px';
  crosshair.style.height = '20px';
  crosshair.style.marginTop = '-10px';
  crosshair.style.marginLeft = '-10px';
  crosshair.style.border = '2px solid white';
  crosshair.style.borderRadius = '50%';
  crosshair.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
  crosshair.style.zIndex = '1001';
  crosshair.style.pointerEvents = 'none';
  
  document.body.appendChild(crosshair);
  
  updateVoxelUI();
}

function updateVoxelUI() {
  const uiContainer = document.getElementById('voxel-ui');
  if (!uiContainer) return;
  
  const blockNames = {
    1: 'Stone',
    2: 'Dirt', 
    3: 'Grass',
    5: 'Snow'
  };

  const stats = voxelInteractionSystem.getStatistics();
  
  // Target information
  let targetInfo = '';
  if (targetedVoxelInfo) {
    const pos = targetedVoxelInfo.position;
    targetInfo = `
      <div><strong>Target:</strong></div>
      <div>Position: ${pos.x}, ${pos.y}, ${pos.z}</div>
      <div>Distance: ${targetedVoxelInfo.distance.toFixed(1)}m</div>
      <div>Action: ${targetedVoxelInfo.mode}</div>
      <br>
    `;
  } else {
    targetInfo = `
      <div><strong>Target:</strong> None</div>
      <br>
    `;
  }
  
  uiContainer.innerHTML = `
    <div><strong>Voxel Builder</strong></div>
    <div>Mode: ${isDestroyMode ? 'Destroy' : 'Place'}</div>
    <div>Block: ${blockNames[playerModifier.currentBlockType]}</div>
    <div>Range: ${playerModifier.minRange}-${playerModifier.maxRange}</div>
    <div>Cooldown: ${playerModifier.modificationCooldown}ms</div>
    <div>Dirty Chunks: ${stats.dirtyChunksCount}</div>
    <br>
    ${targetInfo}
    <div><strong>Controls:</strong></div>
    <div>Left Click: ${isDestroyMode ? 'Destroy' : 'Place'} voxel</div>
    <div>Right Click: ${isDestroyMode ? 'Place' : 'Destroy'} voxel</div>
    <div>Q: Cycle block type</div>
    <div>E: Toggle place/destroy mode</div>
  `;
}

// Initialize UI
createVoxelUI();

// 2. PLAYER CONTROLS
// =================================================================

const controls = new PointerLockControls(camera, document.body);
const instructions = document.getElementById('instructions');

document.body.addEventListener('click', () => {
  controls.lock();
});

controls.addEventListener('lock', () => {
  instructions.style.display = 'none';
  document.body.classList.add('pointer-locked');
});

controls.addEventListener('unlock', () => {
  instructions.style.display = 'block';
  document.body.classList.remove('pointer-locked');
  
  // Hide block outline when not in pointer lock mode
  if (blockOutline) {
    blockOutline.visible = false;
  }
  targetedVoxelInfo = null;
  updateVoxelUI();
});

const keys = {};
document.addEventListener('keydown', (event) => (keys[event.code] = true));
document.addEventListener('keyup', (event) => (keys[event.code] = false));

// Mouse click handling for voxel modification
document.addEventListener('mousedown', (event) => {
  if (controls.isLocked) {
    handleVoxelClick(event);
  }
});

// Keyboard controls for voxel modification
document.addEventListener('keydown', (event) => {
  if (controls.isLocked) {
    switch (event.code) {
      case 'KeyQ':
        // Cycle to next block type
        const nextBlockType = playerModifier.getNextBlockType();
        playerModifier.setCurrentBlockType(nextBlockType);
        updateVoxelUI();
        break;
      case 'KeyE':
        // Toggle between place and destroy mode
        isDestroyMode = !isDestroyMode;
        updateVoxelUI();
        break;
      case 'KeyR':
        // Quick destroy mode (hold R and click)
        break;
    }
  }
});

function handleVoxelClick(event) {
  // Use center of screen for raycasting (crosshair position)
  const mouse = new THREE.Vector2(0, 0); // Center of screen
  
  // Determine action based on mouse button and mode
  let action = 'place';
  
  if (event.button === 0) { // Left click
    action = isDestroyMode ? 'destroy' : 'place';
  } else if (event.button === 1) { // Middle click - always destroy
    action = 'destroy';
  } else if (event.button === 2) { // Right click
    action = isDestroyMode ? 'place' : 'destroy';
  }
  
  const success = voxelInteractionSystem.handleVoxelClick(
    mouse,
    camera,
    playerModifier,
    action
  );

  // Visual feedback
  const crosshair = document.getElementById('crosshair');
  if (success) {
    // Flash green for success
    crosshair.style.backgroundColor = 'rgba(0, 255, 0, 0.6)';
    setTimeout(() => {
      crosshair.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    }, 150);
  } else {
    // Flash red for failure
    crosshair.style.backgroundColor = 'rgba(255, 0, 0, 0.6)';
    setTimeout(() => {
      crosshair.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
    }, 150);
    console.log(`Failed to ${action} voxel - check range, cooldown, or target validity`);
  }
}

// Prevent context menu on right click
document.addEventListener('contextmenu', (event) => {
  if (controls.isLocked) {
    event.preventDefault();
  }
});

const clock = new THREE.Clock();
const moveSpeed = 15;

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

    if (keys['KeyW']) camera.position.addScaledVector(forward, moveSpeed * delta);
    if (keys['KeyS']) camera.position.addScaledVector(forward, -moveSpeed * delta);
    if (keys['KeyA']) camera.position.addScaledVector(right, moveSpeed * delta);
    if (keys['KeyD']) camera.position.addScaledVector(right, -moveSpeed * delta);
    if (keys['Space']) camera.position.y += moveSpeed * delta;
    if (keys['ShiftLeft']) camera.position.y -= moveSpeed * delta;
  }

  // Update world based on camera position (only after initial chunk is loaded)
  if (worldInitialized) {
    world.update(camera.position);
  }

  // Update block outline for visual feedback
  if (controls.isLocked) {
    updateBlockOutline();
    
    // Animate block outline with subtle pulsing
    if (blockOutline && blockOutline.visible) {
      blockOutline.userData.time += delta;
      const pulse = 1.0 + Math.sin(blockOutline.userData.time * blockOutline.userData.pulseSpeed) * 0.05;
      blockOutline.scale.setScalar(pulse);
    }
  }

  // Update camera position display
  document.getElementById('camera-position').textContent = 
    `X: ${camera.position.x.toFixed(2)} Y: ${camera.position.y.toFixed(2)} Z: ${camera.position.z.toFixed(2)}`;

  renderer.render(scene, camera);
  stats.end();
}

// Start animation
animate();
