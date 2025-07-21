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
        
        // Add basic lighting
        this.setupLighting();
        
        // Add a simple ground plane for testing
        this.createTestEnvironment();
        
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

    createTestEnvironment() {
        // Create a simple ground plane
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x90EE90 });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = 0;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Add some test cubes
        const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
        const cubeMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 });
        
        for (let i = 0; i < 10; i++) {
            const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
            cube.position.set(
                (Math.random() - 0.5) * 20,
                0.5,
                (Math.random() - 0.5) * 20
            );
            cube.castShadow = true;
            cube.receiveShadow = true;
            this.scene.add(cube);
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
    }
}
