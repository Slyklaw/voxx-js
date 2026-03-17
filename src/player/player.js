/**
 * Player controller and physics system for Voxx-JS voxel engine
 */
import { logger } from '../core/logger.js';
import { WALK_SPEED, JUMP_STRENGTH, GRAVITY, MOUSE_SENSITIVITY } from '../core/constants.js';

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
        this.walkSpeed = WALK_SPEED;
        this.jumpStrength = JUMP_STRENGTH;
        this.gravity = GRAVITY;
        this.mouseSensitivity = MOUSE_SENSITIVITY;
        
        logger.info('Player system initialized');
        
        // Setup input controls
        this.setupInput();
    }
    
    /**
     * Set up keyboard and mouse input handling
     */
    setupInput() {
        // Create bound handlers for proper cleanup
        this._handleKeyDown = this.handleKeyDown.bind(this);
        this._handleKeyUp = this.handleKeyUp.bind(this);
        this._handleMouseMove = this.handleMouseMove.bind(this);
        this._handleContextMenu = (event) => event.preventDefault();

        document.addEventListener('keydown', this._handleKeyDown);
        document.addEventListener('keyup', this._handleKeyUp);
        document.addEventListener('mousemove', this._handleMouseMove);
        document.addEventListener('contextmenu', this._handleContextMenu);

        logger.debug('Player input handlers registered');
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

    /**
     * Clean up event listeners and resources
     */
    destroy() {
        // Remove all event listeners
        document.removeEventListener('keydown', this._handleKeyDown);
        document.removeEventListener('keyup', this._handleKeyUp);
        document.removeEventListener('mousemove', this._handleMouseMove);
        document.removeEventListener('contextmenu', this._handleContextMenu);

        // Clear references
        this._handleKeyDown = null;
        this._handleKeyUp = null;
        this._handleMouseMove = null;
        this._handleContextMenu = null;

        logger.info('Player destroyed, listeners removed');
    }

    /**
     * Check if player has been destroyed
     */
    isDestroyed() {
        return this._handleKeyDown === null;
    }
}
