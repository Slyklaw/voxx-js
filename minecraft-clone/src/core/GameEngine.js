import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { InputHandler } from './InputHandler.js';
import { ChunkManager } from '../world/ChunkManager.js';
import { ChunkRenderer } from '../rendering/ChunkRenderer.js';

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
        
        // New chunk-based systems
        this.chunkManager = null;
        this.chunkRenderer = null;
        
        this.init();
    }

    init() {
        // Initialize Three.js scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue
        this.scene.fog = new THREE.Fog(0x87CEEB, 100, 500);

        // Initialize camera
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 70, 0);

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

        // Initialize chunk-based systems
        this.chunkManager = new ChunkManager();
        this.chunkRenderer = new ChunkRenderer();

        // Add basic lighting
        this.setupLighting();

        // Generate initial world
        this.generateWorld();

        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());

        console.log('GameEngine initialized with chunk-based system');
    }

    setupLighting() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
        this.scene.add(ambientLight);

        // Directional light for shadows
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(50, 100, 50);
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

    generateWorld() {
        // Load chunks around spawn point
        this.chunkManager.loadChunksAround(0, 0);
        
        // Render all loaded chunks
        this.renderChunks();
        
        console.log(`Generated world with ${this.chunkManager.getChunkCount()} chunks`);
    }

    renderChunks() {
        // Clear existing meshes
        const existingMeshes = this.chunkRenderer.getAllMeshes();
        for (const mesh of existingMeshes) {
            this.scene.remove(mesh);
        }

        // Render all loaded chunks
        const chunks = this.chunkManager.getLoadedChunks();
        for (const chunk of chunks) {
            const mesh = this.chunkRenderer.renderChunk(chunk);
            if (mesh) {
                this.scene.add(mesh);
            }
        }
    }

    updateChunks() {
        // Update chunks that need mesh updates
        const chunksNeedingUpdates = this.chunkManager.getChunksNeedingUpdates();
        for (const chunk of chunksNeedingUpdates) {
            const mesh = this.chunkRenderer.updateChunk(chunk);
            if (mesh) {
                // Remove old mesh if it exists
                const oldMesh = this.chunkRenderer.getAllMeshes().find(
                    m => m.position.x === chunk.x * 16 && m.position.z === chunk.z * 16
                );
                if (oldMesh) {
                    this.scene.remove(oldMesh);
                }
                this.scene.add(mesh);
            }
        }
    }

    update(inputState) {
        if (this.isPaused) return;
        
        this.deltaTime = this.clock.getDelta();
        
        if (inputState) {
            this.handleMouseLook(inputState);
            this.handleBasicMovement(inputState);
            
            // Update chunks based on player position
            this.updateChunkLoading();
        }
        
        // Update chunk meshes
        this.updateChunks();
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

    updateChunkLoading() {
        // Load chunks around player position
        this.chunkManager.loadChunksAround(this.camera.position.x, this.camera.position.z);
        
        // Unload distant chunks
        this.chunkManager.unloadDistantChunks(this.camera.position.x, this.camera.position.z);
        
        // Re-render chunks if any were loaded/unloaded
        this.renderChunks();
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
        this.renderChunks();
    }

    dispose() {
        // Clean up resources
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.chunkRenderer) {
            this.chunkRenderer.dispose();
        }
        if (this.chunkManager) {
            this.chunkManager.clear();
        }
    }
}
