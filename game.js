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
        
        // Add a simple test cube to verify rendering
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
        const testCube = new THREE.Mesh(geometry, material);
        testCube.position.set(0, 1, 0);
        testCube.castShadow = true;
        testCube.receiveShadow = true;
        this.scene.add(testCube);
        
        // Add a ground plane
        const groundGeometry = new THREE.PlaneGeometry(50, 50);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228B22 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        console.log('Test content added to scene');
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
        // Basic rotation animation for the test cube
        const testCube = this.scene.children.find(child => 
            child instanceof THREE.Mesh && child.geometry instanceof THREE.BoxGeometry
        );
        
        if (testCube) {
            testCube.rotation.x += deltaTime * 0.5;
            testCube.rotation.y += deltaTime * 0.3;
        }
        
        // Update camera controls (placeholder for future implementation)
        this.updateCamera(deltaTime);
    }
    
    updateCamera(deltaTime) {
        // Placeholder for camera movement - will be implemented in task 2
        // For now, just a simple orbit around the test cube
        const time = this.clock.getElapsedTime();
        this.camera.position.x = Math.cos(time * 0.2) * 15;
        this.camera.position.z = Math.sin(time * 0.2) * 15;
        this.camera.lookAt(0, 1, 0);
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