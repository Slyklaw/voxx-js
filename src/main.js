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
let faceHighlight = null;
let placementPreview = null;
let targetedVoxelInfo = null;

function createBlockOutline() {
  // Create wireframe box geometry for the target block
  const geometry = new THREE.BoxGeometry(1.05, 1.05, 1.05); // Slightly larger than voxel
  const edges = new THREE.EdgesGeometry(geometry);
  const material = new THREE.LineBasicMaterial({ 
    color: 0xffffff, // White outline
    linewidth: 2,
    transparent: true,
    opacity: 0.8
  });
  
  blockOutline = new THREE.LineSegments(edges, material);
  blockOutline.visible = false; // Initially hidden
  
  // Create face highlight - a plane that shows which face is targeted
  const faceGeometry = new THREE.PlaneGeometry(1.02, 1.02);
  const faceMaterial = new THREE.MeshBasicMaterial({
    color: 0xff6600, // Orange highlight
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide
  });
  
  faceHighlight = new THREE.Mesh(faceGeometry, faceMaterial);
  faceHighlight.visible = false;
  
  // Create placement preview - shows where new block will be placed
  const previewGeometry = new THREE.BoxGeometry(1.02, 1.02, 1.02);
  const previewMaterial = new THREE.MeshBasicMaterial({
    color: 0x00ff00, // Green preview
    transparent: true,
    opacity: 0.3,
    wireframe: true
  });
  
  placementPreview = new THREE.Mesh(previewGeometry, previewMaterial);
  placementPreview.visible = false;
  
  // Add pulsing animation data
  blockOutline.userData = { 
    originalScale: 1.0,
    pulseSpeed: 2.0,
    time: 0
  };
  
  scene.add(blockOutline);
  scene.add(faceHighlight);
  scene.add(placementPreview);
}

function updateBlockOutline() {
  if (!blockOutline || !faceHighlight || !placementPreview) return;
  
  const previousTargetInfo = targetedVoxelInfo;
  
  // Perform raycast to find targeted voxel
  const mouse = new THREE.Vector2(0, 0); // Center of screen
  const hitResult = voxelInteractionSystem.raycaster.raycastFromScreen(mouse, camera, playerModifier.maxRange);
  
  if (hitResult && hitResult.hit) {
    const destroyPos = hitResult.voxelPosition;
    const placePos = voxelInteractionSystem.raycaster.getPlacementPosition(hitResult);
    const canPlace = placePos && voxelInteractionSystem.raycaster.isValidPlacementPosition(placePos);
    
    // Position the outline at the target voxel (destroy target)
    blockOutline.position.set(
      destroyPos.x + 0.5, // Center of voxel
      destroyPos.y + 0.5,
      destroyPos.z + 0.5
    );
    blockOutline.visible = true;
    
    // Position and orient the face highlight
    positionFaceHighlight(hitResult.face, destroyPos);
    faceHighlight.visible = true;
    
    // Show placement preview if valid
    if (canPlace) {
      placementPreview.position.set(
        placePos.x + 0.5,
        placePos.y + 0.5,
        placePos.z + 0.5
      );
      placementPreview.visible = true;
    } else {
      placementPreview.visible = false;
    }
    
    const newTargetInfo = {
      destroyPosition: destroyPos.clone(),
      placePosition: placePos ? placePos.clone() : null,
      face: hitResult.face,
      normal: hitResult.normal.clone(),
      distance: hitResult.distance,
      canPlace: canPlace
    };
    
    // Check if target changed significantly to avoid excessive UI updates
    const targetChanged = !previousTargetInfo || 
      !previousTargetInfo.destroyPosition.equals(newTargetInfo.destroyPosition) ||
      (previousTargetInfo.placePosition && newTargetInfo.placePosition && 
       !previousTargetInfo.placePosition.equals(newTargetInfo.placePosition)) ||
      previousTargetInfo.face !== newTargetInfo.face ||
      previousTargetInfo.canPlace !== newTargetInfo.canPlace;
    
    targetedVoxelInfo = newTargetInfo;
    
    if (targetChanged) {
      updateVoxelUI();
    }
  } else {
    // No valid target found
    blockOutline.visible = false;
    faceHighlight.visible = false;
    placementPreview.visible = false;
    targetedVoxelInfo = null;
    
    // Update UI if we had a target before
    if (previousTargetInfo !== null) {
      updateVoxelUI();
    }
  }
}

function positionFaceHighlight(face, voxelPos) {
  const offset = 0.1; // Very close to the voxel face (10% distance)
  
  switch (face) {
    case 'top':
      faceHighlight.position.set(voxelPos.x + 0.5, voxelPos.y + 1 + offset, voxelPos.z + 0.5);
      faceHighlight.rotation.set(-Math.PI / 2, 0, 0); // Horizontal plane
      break;
    case 'bottom':
      faceHighlight.position.set(voxelPos.x + 0.5, voxelPos.y - offset, voxelPos.z + 0.5);
      faceHighlight.rotation.set(Math.PI / 2, 0, 0); // Horizontal plane
      break;
    case 'north':
      faceHighlight.position.set(voxelPos.x + 0.5, voxelPos.y + 0.5, voxelPos.z - offset);
      faceHighlight.rotation.set(0, 0, 0); // Vertical plane facing Z
      break;
    case 'south':
      faceHighlight.position.set(voxelPos.x + 0.5, voxelPos.y + 0.5, voxelPos.z + 1 + offset);
      faceHighlight.rotation.set(0, Math.PI, 0); // Vertical plane facing Z
      break;
    case 'west':
      faceHighlight.position.set(voxelPos.x - offset, voxelPos.y + 0.5, voxelPos.z + 0.5);
      faceHighlight.rotation.set(0, Math.PI / 2, 0); // Vertical plane facing X
      break;
    case 'east':
      faceHighlight.position.set(voxelPos.x + 1 + offset, voxelPos.y + 0.5, voxelPos.z + 0.5);
      faceHighlight.rotation.set(0, -Math.PI / 2, 0); // Vertical plane facing X
      break;
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

// No longer need mode tracking - using direct mouse button mapping

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
    const destroyPos = targetedVoxelInfo.destroyPosition;
    const placePos = targetedVoxelInfo.placePosition;
    const face = targetedVoxelInfo.face;
    targetInfo = `
      <div><strong>Target:</strong></div>
      <div>Destroy: ${destroyPos.x}, ${destroyPos.y}, ${destroyPos.z}</div>
      <div>Face: ${face.charAt(0).toUpperCase() + face.slice(1)}</div>
      ${placePos && targetedVoxelInfo.canPlace ? 
        `<div>Place: ${placePos.x}, ${placePos.y}, ${placePos.z}</div>` : 
        '<div>Place: Invalid position</div>'}
      <div>Distance: ${targetedVoxelInfo.distance.toFixed(1)}m</div>
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
    <div>Block: ${blockNames[playerModifier.currentBlockType]}</div>
    <div>Range: ${playerModifier.minRange}-${playerModifier.maxRange}</div>
    <div>Cooldown: ${playerModifier.modificationCooldown}ms</div>
    <div>Dirty Chunks: ${stats.dirtyChunksCount}</div>
    <br>
    ${targetInfo}
    <div><strong>Controls:</strong></div>
    <div>Left Click: Destroy voxel</div>
    <div>Right Click: Place voxel</div>
    <div>Mouse Wheel: Cycle block type</div>
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
  
  // Hide all visual elements when not in pointer lock mode
  if (blockOutline) {
    blockOutline.visible = false;
  }
  if (faceHighlight) {
    faceHighlight.visible = false;
  }
  if (placementPreview) {
    placementPreview.visible = false;
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

// Mouse wheel handling for block cycling
document.addEventListener('wheel', (event) => {
  if (controls.isLocked) {
    event.preventDefault(); // Prevent page scrolling
    
    if (event.deltaY > 0) {
      // Scroll down - next block
      const nextBlockType = playerModifier.getNextBlockType();
      playerModifier.setCurrentBlockType(nextBlockType);
      updateVoxelUI();
    } else if (event.deltaY < 0) {
      // Scroll up - previous block
      const prevBlockType = playerModifier.getPreviousBlockType();
      playerModifier.setCurrentBlockType(prevBlockType);
      updateVoxelUI();
    }
  }
});

function handleVoxelClick(event) {
  // Use center of screen for raycasting (crosshair position)
  const mouse = new THREE.Vector2(0, 0); // Center of screen
  
  // Determine action based on mouse button - direct mapping
  let action;
  
  if (event.button === 0) { // Left click - destroy
    action = 'destroy';
  } else if (event.button === 2) { // Right click - place
    action = 'place';
  } else {
    // Ignore other mouse buttons (middle click, etc.)
    return;
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
    
    // Animate visual elements with subtle pulsing
    if (blockOutline && blockOutline.visible) {
      blockOutline.userData.time += delta;
      const pulse = 1.0 + Math.sin(blockOutline.userData.time * blockOutline.userData.pulseSpeed) * 0.03;
      blockOutline.scale.setScalar(pulse);
    }
    
    // Animate face highlight with a different phase
    if (faceHighlight && faceHighlight.visible) {
      const faceOpacity = 0.4 + Math.sin(Date.now() * 0.003) * 0.1;
      faceHighlight.material.opacity = faceOpacity;
    }
    
    // Animate placement preview
    if (placementPreview && placementPreview.visible) {
      const previewOpacity = 0.3 + Math.sin(Date.now() * 0.005) * 0.1;
      placementPreview.material.opacity = previewOpacity;
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
