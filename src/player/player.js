/**
 * Player controller and physics system for Voxx-JS voxel engine
 */
import { logger } from '../core/logger.js';
import { WALK_SPEED, JUMP_STRENGTH, GRAVITY, MOUSE_SENSITIVITY, CHUNK_SIZE } from '../core/constants.js';

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
        
        // Player collision box (half-extents)
        this.collisionWidth = 0.3;  // Half of player width (0.6 total)
        this.collisionHeight = 0.9; // Half of player height (1.8 total)

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
     * Check if a position collides with solid voxels
     * Tests all 8 corners of the player bounding box
     * @param {number} newX - X position to check
     * @param {number} newY - Y position to check (feet)
     * @param {number} newZ - Z position to check
     * @param {Object} chunkManager - Chunk manager for voxel queries
     * @returns {boolean} True if collision detected
     */
    checkCollision(newX, newY, newZ, chunkManager) {
        // Check all 8 corners of player bounding box
        const corners = [
            [newX - this.collisionWidth, newY, newZ - this.collisionWidth],
            [newX + this.collisionWidth, newY, newZ - this.collisionWidth],
            [newX - this.collisionWidth, newY, newZ + this.collisionWidth],
            [newX + this.collisionWidth, newY, newZ + this.collisionWidth],
            [newX - this.collisionWidth, newY + this.collisionHeight * 2, newZ - this.collisionWidth],
            [newX + this.collisionWidth, newY + this.collisionHeight * 2, newZ - this.collisionWidth],
            [newX - this.collisionWidth, newY + this.collisionHeight * 2, newZ + this.collisionWidth],
            [newX + this.collisionWidth, newY + this.collisionHeight * 2, newZ + this.collisionWidth],
        ];

        for (const [cx, cy, cz] of corners) {
            if (this.isPositionSolid(cx, cy, cz, chunkManager)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Update player state
     * @param {number} deltaTime - Time elapsed since last update in seconds
     * @param {Object} chunkManager - Optional chunk manager for collision detection
     */
    update(deltaTime, chunkManager) {
        // Handle jumping
        if (this.movement.jump && this.onGround) {
            this.jump();
        }

        // Apply gravity when not on ground
        if (!this.onGround) {
            this.velocity.y -= this.gravity * deltaTime;
        }

        // Handle movement input (sets horizontal velocity)
        this.handleMovement(deltaTime);

        // Calculate new position
        let newX = this.position.x + this.velocity.x * deltaTime;
        let newY = this.position.y + this.velocity.y * deltaTime;
        let newZ = this.position.z + this.velocity.z * deltaTime;

        // Collision detection and response
        if (chunkManager) {
            // Try X movement
            if (!this.checkCollision(newX, this.position.y, this.position.z, chunkManager)) {
                this.position.x = newX;
            } else {
                this.velocity.x = 0;
            }

            // Try Y movement (vertical)
            if (!this.checkCollision(this.position.x, newY, this.position.z, chunkManager)) {
                this.position.y = newY;
                this.onGround = false;
            } else {
                // If moving down, we hit ground
                if (this.velocity.y < 0) {
                    this.onGround = true;
                    // Snap to top of block
                    this.position.y = Math.floor(this.position.y) + 1;
                }
                this.velocity.y = 0;
            }

            // Try Z movement
            if (!this.checkCollision(this.position.x, this.position.y, newZ, chunkManager)) {
                this.position.z = newZ;
            } else {
                this.velocity.z = 0;
            }
        } else {
            // No chunk manager - just update position (for testing)
            this.position.x = newX;
            this.position.y = newY;
            this.position.z = newZ;
        }

        // Check if standing on ground
        if (this.velocity.y === 0 && this.onGround) {
            // Verify still on ground
            if (chunkManager && !this.checkCollision(this.position.x, this.position.y - 0.1, this.position.z, chunkManager)) {
                this.onGround = false;
            }
        }

        // Reset jump flag after processing
        this.movement.jump = false;
    }
    
    /**
     * Handle player movement based on input
     */
    handleMovement(deltaTime) {
        // Calculate movement direction based on rotation
        const moveSpeed = this.movement.sneak ? this.walkSpeed / 2 : this.walkSpeed;
        
        // Calculate raw movement direction (player-local coordinates)
        let moveX = 0;
        let moveZ = 0;
        
        // Forward/backward (along -z/+z axis)
        if (this.movement.forward && !this.movement.backward) {
            moveZ = -1;
        } else if (this.movement.backward && !this.movement.forward) {
            moveZ = 1;
        }
        
        // Strafing left/right (along -x/+x axis)
        if (this.movement.left && !this.movement.right) {
            moveX = -1;
        } else if (this.movement.right && !this.movement.left) {
            moveX = 1;
        }
        
        // Normalize diagonal movement
        const magnitude = Math.sqrt(moveX * moveX + moveZ * moveZ);
        if (magnitude > 0) {
            // Normalize and scale by moveSpeed
            this.velocity.x = (moveX / magnitude) * moveSpeed;
            this.velocity.z = (moveZ / magnitude) * moveSpeed;
        } else {
            this.velocity.x = 0;
            this.velocity.z = 0;
        }
        
        // Apply rotation to movement direction
        const cos = Math.cos(this.rotation.yaw);
        const sin = Math.sin(this.rotation.yaw);
        const finalX = this.velocity.x * cos - this.velocity.z * sin;
        const finalZ = this.velocity.x * sin + this.velocity.z * cos;
        this.velocity.x = finalX;
        this.velocity.z = finalZ;
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
     * Check if a world position is inside a solid voxel
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} z - World Z coordinate
     * @param {Object} chunkManager - Chunk manager for voxel queries
     * @returns {boolean} True if position is inside a solid block
     */
    isPositionSolid(x, y, z, chunkManager) {
        // Get chunk coordinates
        const chunkX = Math.floor(x / CHUNK_SIZE);
        const chunkZ = Math.floor(z / CHUNK_SIZE);
        
        // Get local coordinates within chunk
        const localX = ((x % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const localZ = ((z % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
        const localY = Math.floor(y);
        
        const chunk = chunkManager.getChunk(chunkX, 0, chunkZ);
        if (!chunk) return false;
        
        const voxel = chunk.getVoxel(localX, localY, localZ);
        return voxel !== null; // Non-null is solid
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
