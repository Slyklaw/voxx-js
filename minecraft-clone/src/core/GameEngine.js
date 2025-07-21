import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { BlockRenderer } from '../rendering/BlockRenderer.js';
import { BlockType } from '../world/BlockType.js';
import { Block } from '../world/Block.js';

export class GameEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        
        this.isPaused = false;
        this.deltaTime = 0;
        
        this.cameraRotation = { x: 0, y: 0 };
        this.mouseSensitivity = 0.002;
        this.blockRenderer = null;
        
        this.init();
    }

    init() {
        // Initialize Three.js scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        
        // Initialize camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 10, 0);
        
        // Initialize renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Initialize block renderer
        this.blockRenderer = new BlockRenderer();
        
        // Add basic lighting
        this.setupLighting();
        
        // Create test world with blocks
        this.createTestWorld();
        
        console.log('GameEngine initialized');
    }

    setupLighting() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);
        
        // Directional light for shadows
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 50, 50);
        directionalLight.castShadow = true;
        
        // Configure shadow properties
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 500;
        directionalLight.shadow.camera.left = -100;
        directionalLight.shadow.camera.right = 100;
        directionalLight.shadow.camera.top = 100;
        directionalLight.shadow.camera.bottom = -100;
        
        this.scene.add(directionalLight);
    }

    createTestWorld() {
        // Create a simple flat world with grass blocks
        const worldSize = 16;
        const groundHeight = 0;
        
        // Create grass layer
        for (let x = -worldSize/2; x < worldSize/2; x++) {
            for (let z = -worldSize/2; z < worldSize/2; z++) {
                const grassBlock = new Block(BlockType.GRASS, x, groundHeight, z);
                const grassMesh = this.blockRenderer.createBlockMesh(grassBlock);
                if (grassMesh) {
                    this.scene.add(grassMesh);
                }
                
                // Add dirt blocks below grass
                for (let y = groundHeight - 3; y < groundHeight; y++) {
                    const dirtBlock = new Block(BlockType.DIRT, x, y, z);
                    const dirtMesh = this.blockRenderer.createBlockMesh(dirtBlock);
                    if (dirtMesh) {
                        this.scene.add(dirtMesh);
                    }
                }
                
                // Add stone blocks below dirt
                for (let y = groundHeight - 6; y < groundHeight - 3; y++) {
                    const stoneBlock = new Block(BlockType.STONE, x, y, z);
                    const stoneMesh = this.blockRenderer.createBlockMesh(stoneBlock);
                    if (stoneMesh) {
                        this.scene.add(stoneMesh);
                    }
                }
            }
        }
        
        // Add some trees
        this.createTree(-5, groundHeight + 1, -5);
        this.createTree(5, groundHeight + 1, 5);
        this.createTree(-3, groundHeight + 1, 7);
        this.createTree(7, groundHeight + 1, -2);
        
        console.log('Test world created with blocks');
    }

    createTree(x, y, z) {
        // Tree trunk
        for (let i = 0; i < 4; i++) {
            const woodBlock = new Block(BlockType.WOOD, x, y + i, z);
            const woodMesh = this.blockRenderer.createBlockMesh(woodBlock);
            if (woodMesh) {
                this.scene.add(woodMesh);
            }
        }
        
        // Tree leaves
        for (let dx = -1; dx <= 1; dx++) {
            for (let dy = 3; dy <= 5; dy++) {
                for (let dz = -1; dz <= 1; dz++) {
                    if (Math.random() > 0.3) { // Random leaf placement
                        const leafBlock = new Block(BlockType.LEAVES, x + dx, y + dy, z + dz);
                        const leafMesh = this.blockRenderer.createBlockMesh(leafBlock);
                        if (leafMesh) {
                            this.scene.add(leafMesh);
                        }
                    }
                }
            }
        }
    }

    update(inputState) {
        if (this.isPaused) return;
        
        this.deltaTime = this.clock.getDelta();
        
        if (inputState) {
            this.handleMouseLook(inputState);
            this.handleBasicMovement(inputState);
        }
    }

    handleMouseLook(inputState) {
        if (inputState.mouse.deltaX !== 0 || inputState.mouse.deltaY !== 0) {
            this.cameraRotation.y -= inputState.mouse.deltaX * this.mouseSensitivity;
            this.cameraRotation.x -= inputState.mouse.deltaY * this.mouseSensitivity;
            
            // Clamp vertical rotation to prevent over-rotation
            this.cameraRotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.cameraRotation.x));
            
            // Apply rotation to camera
            this.camera.rotation.order = 'YXZ';
            this.camera.rotation.x = this.cameraRotation.x;
            this.camera.rotation.y = this.cameraRotation.y;
            
            // Reset delta after processing
            inputState.mouse.deltaX = 0;
            inputState.mouse.deltaY = 0;
        }
    }

    handleBasicMovement(inputState) {
        const moveSpeed = 10 * this.deltaTime;
        
        if (inputState.keys.KeyW) this.camera.translateZ(-moveSpeed);
        if (inputState.keys.KeyS) this.camera.translateZ(moveSpeed);
        if (inputState.keys.KeyA) this.camera.translateX(-moveSpeed);
        if (inputState.keys.KeyD) this.camera.translateX(moveSpeed);
        
        if (inputState.keys.Space) this.camera.position.y += moveSpeed;
        if (inputState.keys.ShiftLeft || inputState.keys.ShiftRight) this.camera.position.y -= moveSpeed;
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    pause() {
        this.isPaused = true;
        this.clock.stop();
    }

    resume() {
        this.isPaused = false;
        this.clock.start();
    }

    onContextRestored() {
        // Re-initialize any resources that were lost
        console.log('Context restored - reinitializing resources');
    }

    dispose() {
        // Clean up resources
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.blockRenderer) {
            this.blockRenderer.dispose();
        }
    }
}
