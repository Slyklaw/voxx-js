/**
 * Player controller and physics system for Voxx-JS voxel engine
 */
export class Player {
    constructor() {
        // Player position (world coordinates)
        this.position = { x: 0, y: 10, z: 0 };
        
        // Player rotation (in radians)
        this.rotation = { 
            yaw: 0,    // horizontal rotation
            pitch: 0   // vertical rotation
        };
        
        // Player velocity for physics
        this.velocity = { x: 0, y: 0, z: 0 };
        
        // Player state
        this.onGround = false;
        this.jumpVelocity = 0;
        
        // Movement controls
        this.movement = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            sneak: false
        };
        
        // Camera settings
        this.walkSpeed = 5.0;    // Units per second
        this.jumpStrength = 8.0;  // Vertical velocity when jumping
        this.gravity = 20.0;      // Gravity strength
        this.mouseSensitivity = 0.002; // Mouse sensitivity
        
        console.log('Player system initialized');
        
        // Setup input controls
        this.setupInput();
    }
    
    /**
     * Set up keyboard and mouse input handling
     */
    setupInput() {
        // Keyboard controls
        document.addEventListener('keydown', (event) => {
            this.handleKeyDown(event);
        });
        
        document.addEventListener('keyup', (event) => {
            this.handleKeyUp(event);
        });
        
        // Mouse controls
        document.addEventListener('mousemove', (event) => {
            this.handleMouseMove(event);
        });
        
        // Prevent context menu on right click
        document.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }
    
    /**
     * Handle key down events
     */
    handleKeyDown(event) {
        switch(event.key.toLowerCase()) {
            case 'w':
                this.movement.forward = true;
                break;
            case 's':
                this.movement.backward = true;
                break;
            case 'a':
                this.movement.left = true;
                break;
            case 'd':
                this.movement.right = true;
                break;
            case ' ':
                if (this.onGround) {
                    this.movement.jump = true;
                }
                break;
            case 'shift':
                this.movement.sneak = true;
                break;
        }
    }
    
    /**
     * Handle key up events
     */
    handleKeyUp(event) {
        switch(event.key.toLowerCase()) {
            case 'w':
                this.movement.forward = false;
                break;
            case 's':
                this.movement.backward = false;
                break;
            case 'a':
                this.movement.left = false;
                break;
            case 'd':
                this.movement.right = false;
                break;
            case ' ':
                this.movement.jump = false;
                break;
            case 'shift':
                this.movement.sneak = false;
                break;
        }
    }
    
    /**
     * Handle mouse movement for camera look
     */
    handleMouseMove(event) {
        // Only process if the game is focused and mouse is captured
        if (document.pointerLockElement === document.getElementById('gameCanvas')) {
            this.rotation.yaw -= event.movementX * this.mouseSensitivity;
            this.rotation.pitch -= event.movementY * this.mouseSensitivity;
            
            // Clamp pitch to avoid flipping
            this.rotation.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, this.rotation.pitch));
        }
    }
    
    /**
     * Update player state
     * @param {number} deltaTime - Time elapsed since last update in seconds
     */
    update(deltaTime) {
        // Handle jumping
        if (this.movement.jump && this.onGround) {
            this.jump();
        }
        
        // Apply gravity
        if (!this.onGround) {
            this.velocity.y -= this.gravity * deltaTime;
        }
        
        // Update position based on velocity
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
        
        // Handle movement input
        this.handleMovement(deltaTime);
        
        // Reset jump flag after processing
        this.movement.jump = false;
    }
    
    /**
     * Handle player movement based on input
     */
    handleMovement(deltaTime) {
        // Calculate movement direction based on rotation
        const moveSpeed = this.movement.sneak ? this.walkSpeed / 2 : this.walkSpeed;
        
        // Forward/backward movement
        if (this.movement.forward && !this.movement.backward) {
            this.velocity.z = -moveSpeed * Math.cos(this.rotation.yaw);
            this.velocity.x = moveSpeed * Math.sin(this.rotation.yaw);
        } else if (this.movement.backward && !this.movement.forward) {
            this.velocity.z = moveSpeed * Math.cos(this.rotation.yaw);
            this.velocity.x = -moveSpeed * Math.sin(this.rotation.yaw);
        } else {
            this.velocity.x = 0;
            this.velocity.z = 0;
        }
        
        // Strafing left/right
        if (this.movement.left && !this.movement.right) {
            this.velocity.x += moveSpeed * Math.cos(this.rotation.yaw);
            this.velocity.z += moveSpeed * Math.sin(this.rotation.yaw);
        } else if (this.movement.right && !this.movement.left) {
            this.velocity.x -= moveSpeed * Math.cos(this.rotation.yaw);
            this.velocity.z -= moveSpeed * Math.sin(this.rotation.yaw);
        }
    }
    
    /**
     * Make the player jump
     */
    jump() {
        this.velocity.y = this.jumpStrength;
        this.onGround = false;
    }
    
    /**
     * Set player position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     */
    setPosition(x, y, z) {
        this.position.x = x;
        this.position.y = y;
        this.position.z = z;
    }
    
    /**
     * Get player position
     */
    getPosition() {
        return { ...this.position };
    }
    
    /**
     * Get player rotation
     */
    getRotation() {
        return { ...this.rotation };
    }
    
    /**
     * Set player rotation
     * @param {number} yaw - Horizontal rotation in radians
     * @param {number} pitch - Vertical rotation in radians
     */
    setRotation(yaw, pitch) {
        this.rotation.yaw = yaw;
        this.rotation.pitch = pitch;
    }
    
    /**
     * Check if player is on ground
     */
    isOnGround() {
        return this.onGround;
    }
    
    /**
     * Set ground state
     * @param {boolean} grounded - Whether player is on ground
     */
    setOnGround(grounded) {
        this.onGround = grounded;
        if (grounded) {
            this.velocity.y = 0;
        }
    }
    
    /**
     * Request pointer lock for mouse look
     */
    requestPointerLock() {
        const canvas = document.getElementById('gameCanvas');
        canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
        if (canvas.requestPointerLock) {
            canvas.requestPointerLock();
        }
    }
    
    /**
     * Release pointer lock
     */
    exitPointerLock() {
        document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
    }
}
