// Unit tests for input handling logic
// This file contains tests for InputHandler and FirstPersonCameraController

// Setup global environment for Node.js
if (typeof global === 'undefined') {
    global = {};
}

// Include the classes to test (copied from game.js for testing)
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

// Mock DOM elements and APIs for testing
class MockDocument {
    constructor() {
        this.eventListeners = {};
        this.pointerLockElement = null;
        this.body = { requestPointerLock: () => {} };
    }
    
    addEventListener(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }
    
    removeEventListener(event, callback) {
        if (this.eventListeners[event]) {
            const index = this.eventListeners[event].indexOf(callback);
            if (index > -1) {
                this.eventListeners[event].splice(index, 1);
            }
        }
    }
    
    dispatchEvent(event) {
        if (this.eventListeners[event.type]) {
            this.eventListeners[event.type].forEach(callback => callback(event));
        }
    }
}

// Mock THREE.js Vector3 for testing
class MockVector3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    set(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }
    
    copy(v) {
        this.x = v.x;
        this.y = v.y;
        this.z = v.z;
        return this;
    }
    
    clone() {
        return new MockVector3(this.x, this.y, this.z);
    }
    
    add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }
    
    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        this.z -= v.z;
        return this;
    }
    
    normalize() {
        const length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        if (length > 0) {
            this.x /= length;
            this.y /= length;
            this.z /= length;
        }
        return this;
    }
    
    multiplyScalar(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        this.z *= scalar;
        return this;
    }
    
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    
    addVectors(a, b) {
        this.x = a.x + b.x;
        this.y = a.y + b.y;
        this.z = a.z + b.z;
        return this;
    }
}

// Mock camera for testing
class MockCamera {
    constructor() {
        this.position = new MockVector3();
        this.lookAt = () => {};
    }
}

// Test suite for InputHandler
function testInputHandler() {
    console.log('Testing InputHandler...');
    
    // Setup mock document
    const originalDocument = global.document;
    global.document = new MockDocument();
    
    try {
        // Test 1: InputHandler initialization
        console.log('Test 1: InputHandler initialization');
        const inputHandler = new InputHandler();
        
        if (Object.keys(inputHandler.keys).length === 0 && 
            inputHandler.mouseMovement.x === 0 && 
            inputHandler.mouseMovement.y === 0 && 
            inputHandler.isPointerLocked === false) {
            console.log('✓ InputHandler initializes correctly');
        } else {
            console.log('✗ InputHandler initialization failed');
        }
        
        // Test 2: Key press detection
        console.log('Test 2: Key press detection');
        const keyDownEvent = { code: 'KeyW', preventDefault: () => {} };
        inputHandler.onKeyDown(keyDownEvent);
        
        if (inputHandler.isKeyPressed('KeyW')) {
            console.log('✓ Key press detection works');
        } else {
            console.log('✗ Key press detection failed');
        }
        
        // Test 3: Key release detection
        console.log('Test 3: Key release detection');
        const keyUpEvent = { code: 'KeyW' };
        inputHandler.onKeyUp(keyUpEvent);
        
        if (!inputHandler.isKeyPressed('KeyW')) {
            console.log('✓ Key release detection works');
        } else {
            console.log('✗ Key release detection failed');
        }
        
        // Test 4: Mouse movement tracking
        console.log('Test 4: Mouse movement tracking');
        inputHandler.isPointerLocked = true;
        const mouseMoveEvent = { movementX: 10, movementY: -5 };
        inputHandler.onMouseMove(mouseMoveEvent);
        
        const movement = inputHandler.getMouseMovement();
        if (movement.x === 10 && movement.y === -5) {
            console.log('✓ Mouse movement tracking works');
        } else {
            console.log('✗ Mouse movement tracking failed');
        }
        
        // Test 5: Mouse movement reset after getting
        console.log('Test 5: Mouse movement reset');
        const secondMovement = inputHandler.getMouseMovement();
        if (secondMovement.x === 0 && secondMovement.y === 0) {
            console.log('✓ Mouse movement resets after getting');
        } else {
            console.log('✗ Mouse movement reset failed');
        }
        
        // Test 6: Multiple key presses
        console.log('Test 6: Multiple key presses');
        inputHandler.onKeyDown({ code: 'KeyW', preventDefault: () => {} });
        inputHandler.onKeyDown({ code: 'KeyA', preventDefault: () => {} });
        inputHandler.onKeyDown({ code: 'Space', preventDefault: () => {} });
        
        if (inputHandler.isKeyPressed('KeyW') && 
            inputHandler.isKeyPressed('KeyA') && 
            inputHandler.isKeyPressed('Space')) {
            console.log('✓ Multiple key presses work');
        } else {
            console.log('✗ Multiple key presses failed');
        }
        
        console.log('InputHandler tests completed\n');
        
    } finally {
        global.document = originalDocument;
    }
}

// Test suite for FirstPersonCameraController
function testFirstPersonCameraController() {
    console.log('Testing FirstPersonCameraController...');
    
    // Setup mocks
    global.THREE = { Vector3: MockVector3 };
    const mockCamera = new MockCamera();
    const mockInputHandler = {
        isPointerLocked: false,
        getMouseMovement: () => ({ x: 0, y: 0 }),
        isKeyPressed: (key) => false
    };
    
    try {
        // Test 1: Controller initialization
        console.log('Test 1: Controller initialization');
        const controller = new FirstPersonCameraController(mockCamera, mockInputHandler);
        
        if (controller.yaw === 0 && 
            controller.pitch === 0 && 
            controller.position.x === 0 && 
            controller.position.y === 5 && 
            controller.position.z === 10) {
            console.log('✓ Controller initializes correctly');
        } else {
            console.log('✗ Controller initialization failed');
        }
        
        // Test 2: Mouse look functionality
        console.log('Test 2: Mouse look functionality');
        mockInputHandler.isPointerLocked = true;
        mockInputHandler.getMouseMovement = () => ({ x: 100, y: -50 });
        
        const initialYaw = controller.yaw;
        const initialPitch = controller.pitch;
        
        controller.handleMouseLook();
        
        if (controller.yaw !== initialYaw && controller.pitch !== initialPitch) {
            console.log('✓ Mouse look updates camera rotation');
        } else {
            console.log('✗ Mouse look failed');
        }
        
        // Test 3: Pitch clamping
        console.log('Test 3: Pitch clamping');
        mockInputHandler.getMouseMovement = () => ({ x: 0, y: -10000 });
        controller.handleMouseLook();
        
        if (controller.pitch >= -Math.PI / 2 && controller.pitch <= Math.PI / 2) {
            console.log('✓ Pitch clamping works');
        } else {
            console.log('✗ Pitch clamping failed');
        }
        
        // Test 4: Movement input handling
        console.log('Test 4: Movement input handling');
        mockInputHandler.isKeyPressed = (key) => key === 'KeyW';
        
        const initialPosition = controller.position.clone();
        controller.handleMovement(0.016); // 16ms delta time
        
        if (controller.position.x !== initialPosition.x || 
            controller.position.z !== initialPosition.z) {
            console.log('✓ Movement input handling works');
        } else {
            console.log('✗ Movement input handling failed');
        }
        
        // Test 5: Jump mechanics
        console.log('Test 5: Jump mechanics');
        controller.isGrounded = true;
        controller.velocity.y = 0;
        mockInputHandler.isKeyPressed = (key) => key === 'Space';
        
        controller.handleMovement(0.016);
        
        if (controller.velocity.y > 0 && !controller.isGrounded) {
            console.log('✓ Jump mechanics work');
        } else {
            console.log('✗ Jump mechanics failed');
        }
        
        // Test 6: Gravity application
        console.log('Test 6: Gravity application');
        const initialVelocityY = controller.velocity.y;
        controller.handleMovement(0.016);
        
        if (controller.velocity.y < initialVelocityY) {
            console.log('✓ Gravity is applied');
        } else {
            console.log('✗ Gravity application failed');
        }
        
        // Test 7: Ground collision
        console.log('Test 7: Ground collision');
        controller.position.y = 1; // Below ground level
        controller.velocity.y = -5;
        controller.handleMovement(0.016);
        
        if (controller.position.y === 2 && controller.velocity.y === 0 && controller.isGrounded) {
            console.log('✓ Ground collision works');
        } else {
            console.log('✗ Ground collision failed');
        }
        
        // Test 8: Position getter/setter
        console.log('Test 8: Position getter/setter');
        controller.setPosition(10, 20, 30);
        const position = controller.getPosition();
        
        if (position.x === 10 && position.y === 20 && position.z === 30) {
            console.log('✓ Position getter/setter works');
        } else {
            console.log('✗ Position getter/setter failed');
        }
        
        console.log('FirstPersonCameraController tests completed\n');
        
    } finally {
        delete global.THREE;
    }
}

// Run all tests
function runAllTests() {
    console.log('=== Input System Unit Tests ===\n');
    
    testInputHandler();
    testFirstPersonCameraController();
    
    console.log('=== All tests completed ===');
}

// Export for Node.js or run directly in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { runAllTests, testInputHandler, testFirstPersonCameraController };
    // Also run tests when required in Node.js
    runAllTests();
} else {
    // Run tests immediately if in browser
    runAllTests();
}