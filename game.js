// Block system definitions
const BlockType = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    WOOD: 4,
    LEAVES: 5
};

// Block class representing a single block in the world
class Block {
    constructor(type = BlockType.AIR, position = { x: 0, y: 0, z: 0 }) {
        this.type = type;
        this.position = { ...position };
        this.metadata = null;
    }
    
    // Get block type name for debugging
    getTypeName() {
        const typeNames = {
            [BlockType.AIR]: 'Air',
            [BlockType.GRASS]: 'Grass',
            [BlockType.DIRT]: 'Dirt',
            [BlockType.STONE]: 'Stone',
            [BlockType.WOOD]: 'Wood',
            [BlockType.LEAVES]: 'Leaves'
        };
        return typeNames[this.type] || 'Unknown';
    }
    
    // Check if block is solid (not air)
    isSolid() {
        return this.type !== BlockType.AIR;
    }
    
    // Clone the block
    clone() {
        const cloned = new Block(this.type, this.position);
        cloned.metadata = this.metadata ? { ...this.metadata } : null;
        return cloned;
    }
}

// Block renderer for creating and managing block meshes
class BlockRenderer {
    constructor() {
        this.geometry = new THREE.BoxGeometry(1, 1, 1);
        this.materials = this.createBlockMaterials();
    }
    
    createBlockMaterials() {
        const materials = {};
        
        // Create color-coded materials for different block types
        materials[BlockType.GRASS] = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // Forest Green
        materials[BlockType.DIRT] = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Saddle Brown
        materials[BlockType.STONE] = new THREE.MeshLambertMaterial({ color: 0x696969 }); // Dim Gray
        materials[BlockType.WOOD] = new THREE.MeshLambertMaterial({ color: 0xDEB887 }); // Burlywood
        materials[BlockType.LEAVES] = new THREE.MeshLambertMaterial({ color: 0x32CD32 }); // Lime Green
        
        return materials;
    }
    
    // Create a mesh for a block
    createBlockMesh(block) {
        if (block.type === BlockType.AIR) {
            return null; // Don't render air blocks
        }
        
        const material = this.materials[block.type];
        if (!material) {
            console.warn(`No material found for block type: ${block.type}`);
            return null;
        }
        
        const mesh = new THREE.Mesh(this.geometry, material);
        mesh.position.set(block.position.x, block.position.y, block.position.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Store block reference for later use
        mesh.userData.block = block;
        
        return mesh;
    }
    
    // Update block mesh position
    updateBlockMesh(mesh, block) {
        if (mesh && block) {
            mesh.position.set(block.position.x, block.position.y, block.position.z);
            mesh.userData.block = block;
        }
    }
    
    // Dispose of resources
    dispose() {
        this.geometry.dispose();
        Object.values(this.materials).forEach(material => material.dispose());
    }
}

// Basic world representation
class World {
    constructor() {
        this.blocks = new Map(); // Store blocks using position key
        this.blockRenderer = new BlockRenderer();
        this.scene = null; // Will be set by the game
    }
    
    // Generate position key for block storage
    getPositionKey(x, y, z) {
        return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    }
    
    // Set a block at the given position
    setBlock(x, y, z, blockType) {
        const position = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
        const key = this.getPositionKey(position.x, position.y, position.z);
        
        // Remove existing block if present
        this.removeBlock(position.x, position.y, position.z);
        
        // Don't store air blocks
        if (blockType === BlockType.AIR) {
            return;
        }
        
        // Create and store new block
        const block = new Block(blockType, position);
        this.blocks.set(key, block);
        
        // Create and add mesh to scene if scene is available
        if (this.scene) {
            const mesh = this.blockRenderer.createBlockMesh(block);
            if (mesh) {
                mesh.name = `block_${key}`;
                this.scene.add(mesh);
            }
        }
        
        return block;
    }
    
    // Get block at the given position
    getBlock(x, y, z) {
        const key = this.getPositionKey(x, y, z);
        return this.blocks.get(key) || new Block(BlockType.AIR, { x, y, z });
    }
    
    // Remove block at the given position
    removeBlock(x, y, z) {
        const key = this.getPositionKey(x, y, z);
        const block = this.blocks.get(key);
        
        if (block && this.scene) {
            // Remove mesh from scene
            const mesh = this.scene.getObjectByName(`block_${key}`);
            if (mesh) {
                this.scene.remove(mesh);
            }
        }
        
        this.blocks.delete(key);
        return block;
    }
    
    // Check if position has a solid block
    isSolid(x, y, z) {
        const block = this.getBlock(x, y, z);
        return block.isSolid();
    }
    
    // Generate a simple test world
    generateTestWorld() {
        // Create a simple platform
        for (let x = -5; x <= 5; x++) {
            for (let z = -5; z <= 5; z++) {
                // Grass layer
                this.setBlock(x, 0, z, BlockType.GRASS);
                // Dirt layers
                this.setBlock(x, -1, z, BlockType.DIRT);
                this.setBlock(x, -2, z, BlockType.DIRT);
                // Stone base
                this.setBlock(x, -3, z, BlockType.STONE);
            }
        }
        
        // Add some test blocks
        this.setBlock(0, 1, 0, BlockType.WOOD);
        this.setBlock(1, 1, 0, BlockType.STONE);
        this.setBlock(-1, 1, 0, BlockType.LEAVES);
        this.setBlock(0, 2, 0, BlockType.LEAVES);
        
        console.log('Test world generated with', this.blocks.size, 'blocks');
    }
    
    // Set the scene reference for rendering
    setScene(scene) {
        this.scene = scene;
        
        // Add existing blocks to scene
        this.blocks.forEach((block, key) => {
            const mesh = this.blockRenderer.createBlockMesh(block);
            if (mesh) {
                mesh.name = `block_${key}`;
                this.scene.add(mesh);
            }
        });
    }
    
    // Get all blocks (for testing/debugging)
    getAllBlocks() {
        return Array.from(this.blocks.values());
    }
    
    // Dispose of resources
    dispose() {
        if (this.blockRenderer) {
            this.blockRenderer.dispose();
        }
        this.blocks.clear();
    }
}

// Input handling system
class InputHandler {
    constructor() {
        this.keys = {};
        this.mouseMovement = { x: 0, y: 0 };
        this.isPointerLocked = false;
        
        this.initEventListeners();
    }
    
    initEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
        
        // Mouse events
        document.addEventListener('mousemove', (event) => this.onMouseMove(event));
        document.addEventListener('click', (event) => this.onMouseClick(event));
        
        // Pointer lock events
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        document.addEventListener('pointerlockerror', () => this.onPointerLockError());
    }
    
    onKeyDown(event) {
        this.keys[event.code] = true;
        
        // Prevent default behavior for game keys
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(event.code)) {
            event.preventDefault();
        }
    }
    
    onKeyUp(event) {
        this.keys[event.code] = false;
    }
    
    onMouseMove(event) {
        if (this.isPointerLocked) {
            this.mouseMovement.x = event.movementX || 0;
            this.mouseMovement.y = event.movementY || 0;
        }
    }
    
    onMouseClick(event) {
        // Request pointer lock on click if not already locked
        if (!this.isPointerLocked) {
            document.body.requestPointerLock();
        }
    }
    
    onPointerLockChange() {
        this.isPointerLocked = document.pointerLockElement === document.body;
        console.log('Pointer lock:', this.isPointerLocked ? 'enabled' : 'disabled');
    }
    
    onPointerLockError() {
        console.error('Pointer lock failed');
    }
    
    isKeyPressed(keyCode) {
        return !!this.keys[keyCode];
    }
    
    getMouseMovement() {
        const movement = { ...this.mouseMovement };
        this.mouseMovement.x = 0;
        this.mouseMovement.y = 0;
        return movement;
    }
    
    dispose() {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('click', this.onMouseClick);
        document.removeEventListener('pointerlockchange', this.onPointerLockChange);
        document.removeEventListener('pointerlockerror', this.onPointerLockError);
    }
}

// First-person camera controller
class FirstPersonCameraController {
    constructor(camera, inputHandler) {
        this.camera = camera;
        this.inputHandler = inputHandler;
        
        // Camera rotation
        this.yaw = 0;
        this.pitch = 0;
        this.mouseSensitivity = 0.002;
        
        // Movement
        this.position = new THREE.Vector3(0, 5, 10);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.moveSpeed = 5.0;
        this.jumpSpeed = 8.0;
        this.gravity = -20.0;
        this.isGrounded = false;
        
        // Movement directions
        this.forward = new THREE.Vector3();
        this.right = new THREE.Vector3();
        this.up = new THREE.Vector3(0, 1, 0);
        
        this.updateCamera();
    }
    
    update(deltaTime) {
        this.handleMouseLook();
        this.handleMovement(deltaTime);
        this.updateCamera();
    }
    
    handleMouseLook() {
        if (!this.inputHandler.isPointerLocked) return;
        
        const mouseMovement = this.inputHandler.getMouseMovement();
        
        this.yaw -= mouseMovement.x * this.mouseSensitivity;
        this.pitch -= mouseMovement.y * this.mouseSensitivity;
        
        // Clamp pitch to prevent camera flipping
        this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
    }
    
    handleMovement(deltaTime) {
        // Calculate movement directions based on camera rotation
        this.forward.set(
            -Math.sin(this.yaw),
            0,
            -Math.cos(this.yaw)
        ).normalize();
        
        this.right.set(
            Math.cos(this.yaw),
            0,
            -Math.sin(this.yaw)
        ).normalize();
        
        // Handle horizontal movement
        const moveVector = new THREE.Vector3();
        
        if (this.inputHandler.isKeyPressed('KeyW')) {
            moveVector.add(this.forward);
        }
        if (this.inputHandler.isKeyPressed('KeyS')) {
            moveVector.sub(this.forward);
        }
        if (this.inputHandler.isKeyPressed('KeyA')) {
            moveVector.sub(this.right);
        }
        if (this.inputHandler.isKeyPressed('KeyD')) {
            moveVector.add(this.right);
        }
        
        // Normalize diagonal movement
        if (moveVector.length() > 0) {
            moveVector.normalize();
            moveVector.multiplyScalar(this.moveSpeed * deltaTime);
            this.position.add(moveVector);
        }
        
        // Handle jumping
        if (this.inputHandler.isKeyPressed('Space') && this.isGrounded) {
            this.velocity.y = this.jumpSpeed;
            this.isGrounded = false;
        }
        
        // Apply gravity
        this.velocity.y += this.gravity * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        
        // Simple ground collision (temporary - will be replaced with proper collision)
        if (this.position.y <= 2) {
            this.position.y = 2;
            this.velocity.y = 0;
            this.isGrounded = true;
        }
    }
    
    updateCamera() {
        // Set camera position
        this.camera.position.copy(this.position);
        
        // Calculate look direction
        const lookDirection = new THREE.Vector3(
            -Math.sin(this.yaw) * Math.cos(this.pitch),
            Math.sin(this.pitch),
            -Math.cos(this.yaw) * Math.cos(this.pitch)
        );
        
        // Set camera rotation
        const lookAt = new THREE.Vector3().addVectors(this.position, lookDirection);
        this.camera.lookAt(lookAt);
    }
    
    getPosition() {
        return this.position.clone();
    }
    
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.updateCamera();
    }
}

class MinecraftClone {
    constructor() {
        this.canvas = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = null;
        
        // Game state
        this.isRunning = false;
        this.lastTime = 0;
        
        // First-person camera controls
        this.cameraController = null;
        this.inputHandler = null;
        
        // World system
        this.world = null;
        
        this.init();
    }
    
    init() {
        console.log('Initializing Minecraft Clone...');
        
        // Get canvas element
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }
        
        // Initialize Three.js components
        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initClock();
        
        // Initialize input and camera controls
        this.initControls();
        
        // Add some basic content for testing
        this.addTestContent();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Hide loading screen
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // Start the game loop
        this.start();
        
        console.log('Minecraft Clone initialized successfully!');
    }
    
    initScene() {
        this.scene = new THREE.Scene();
        
        // Set background color (sky blue)
        this.scene.background = new THREE.Color(0x87CEEB);
        
        // Add fog for depth perception
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
    }
    
    initCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        
        // Set initial camera position
        this.camera.position.set(0, 10, 10);
        this.camera.lookAt(0, 0, 0);
    }
    
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        
        // Set renderer properties
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Enable gamma correction for better colors
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    
    initClock() {
        this.clock = new THREE.Clock();
    }
    
    initControls() {
        // Initialize input handler
        this.inputHandler = new InputHandler();
        
        // Initialize first-person camera controller
        this.cameraController = new FirstPersonCameraController(this.camera, this.inputHandler);
        
        console.log('Input and camera controls initialized');
    }
    
    addTestContent() {
        // Add basic lighting
        const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 25);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        this.scene.add(directionalLight);
        
        // Initialize world system
        this.world = new World();
        this.world.setScene(this.scene);
        
        // Generate test world with blocks
        this.world.generateTestWorld();
        
        console.log('World system initialized and test world generated');
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
        
        console.log('Game loop started');
    }
    
    stop() {
        this.isRunning = false;
        console.log('Game loop stopped');
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        // Request next frame
        requestAnimationFrame(() => this.gameLoop());
        
        // Calculate delta time
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Update game systems
        this.update(deltaTime);
        
        // Render the scene
        this.render();
    }
    
    update(deltaTime) {
        // Update camera controls
        this.updateCamera(deltaTime);
    }
    
    updateCamera(deltaTime) {
        // Update first-person camera controller
        if (this.cameraController) {
            this.cameraController.update(deltaTime);
        }
    }
    
    render() {
        if (!this.renderer || !this.scene || !this.camera) return;
        
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        // Update camera aspect ratio
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        console.log('Window resized, camera and renderer updated');
    }
    
    // Cleanup method for proper disposal
    dispose() {
        this.stop();
        
        // Dispose world system
        if (this.world) {
            this.world.dispose();
        }
        
        // Dispose input handler
        if (this.inputHandler) {
            this.inputHandler.dispose();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Dispose of geometries and materials
        this.scene.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        
        console.log('Game resources disposed');
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new MinecraftClone();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.game) {
        window.game.dispose();
    }
});