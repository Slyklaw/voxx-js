// Initialize Three.js scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB); // Sky blue background

// Create camera
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 20, 0);

// Create renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);

// Add lighting
const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(1, 1, 0.5).normalize();
scene.add(directionalLight);

// Noise system with configurable parameters
const noiseParams = {
    scale: 0.005, // Increased frequency for more detailed terrain
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2.0,
    seed: Math.random()
};

// Create chunk manager
const chunkManager = new window.ChunkManager(scene, noiseParams, 32, 3);

// First-person controls
const moveSpeed = 0.2;
const keys = {
    w: false, a: false, s: false, d: false,
    space: false, shift: false
};

window.addEventListener('keydown', (e) => {
    if (e.key === 'w') keys.w = true;
    if (e.key === 'a') keys.a = true;
    if (e.key === 's') keys.s = true;
    if (e.key === 'd') keys.d = true;
    if (e.key === ' ') keys.space = true;
    if (e.key === 'Shift') keys.shift = true;
});

window.addEventListener('keyup', (e) => {
    if (e.key === 'w') keys.w = false;
    if (e.key === 'a') keys.a = false;
    if (e.key === 's') keys.s = false;
    if (e.key === 'd') keys.d = false;
    if (e.key === ' ') keys.space = false;
    if (e.key === 'Shift') keys.shift = false;
});

// Mouse look
let prevMouseX = 0;
let prevMouseY = 0;
let yaw = 0;
let pitch = 0;

window.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === renderer.domElement) {
        const dx = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
        const dy = e.movementY || e.mozMovementY || e.webkitMovementY || 0;
        
        yaw -= dx * 0.002;
        pitch -= dy * 0.002;
        pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
    }
});

renderer.domElement.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
});

// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Update camera rotation
    camera.rotation.set(pitch, yaw, 0, 'YXZ');
    
    // Update camera position based on keys
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    
    if (keys.w) camera.position.add(forward.multiplyScalar(moveSpeed));
    if (keys.s) camera.position.add(forward.multiplyScalar(-moveSpeed));
    if (keys.a) camera.position.add(right.multiplyScalar(-moveSpeed));
    if (keys.d) camera.position.add(right.multiplyScalar(moveSpeed));
    if (keys.space) camera.position.y += moveSpeed;
    if (keys.shift) camera.position.y -= moveSpeed;
    
    // Update chunk manager based on camera position
    chunkManager.update(camera.position);
    
    renderer.render(scene, camera);
}
animate();