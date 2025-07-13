import './style.css';
import * as THREE from 'three';
import Stats from 'stats.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { createNoise2D } from 'simplex-noise';
import { World } from './world.js';

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
world.update(camera.position); // Initial world generation

// 2. PLAYER CONTROLS
// =================================================================

const controls = new PointerLockControls(camera, document.body);
const instructions = document.getElementById('instructions');

document.body.addEventListener('click', () => {
  controls.lock();
});

controls.addEventListener('lock', () => {
  instructions.style.display = 'none';
});

controls.addEventListener('unlock', () => {
  instructions.style.display = 'block';
});

const keys = {};
document.addEventListener('keydown', (event) => (keys[event.code] = true));
document.addEventListener('keyup', (event) => (keys[event.code] = false));

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

  // Update world based on camera position
  world.update(camera.position);

  // Update camera position display
  document.getElementById('camera-position').textContent = 
    `X: ${camera.position.x.toFixed(2)} Y: ${camera.position.y.toFixed(2)} Z: ${camera.position.z.toFixed(2)}`;

  renderer.render(scene, camera);
  stats.end();
}

// Start animation
animate();
