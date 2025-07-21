export class InputHandler {
    constructor(canvas) {
        this.canvas = canvas;
        this.keys = {};
        this.mouse = {
            x: 0,
            y: 0,
            deltaX: 0,
            deltaY: 0,
            leftButton: false,
            rightButton: false,
            middleButton: false
        };
        
        this.isPointerLocked = false;
        this.pointerLockChangeCallbacks = [];
        
        this.init();
    }

    init() {
        this.setupKeyboardEvents();
        this.setupMouseEvents();
        this.setupPointerLock();
    }

    setupKeyboardEvents() {
        // Key press handlers
        document.addEventListener('keydown', (event) => {
            this.keys[event.code] = true;
            this.handleKeyDown(event);
        });

        document.addEventListener('keyup', (event) => {
            this.keys[event.code] = false;
            this.handleKeyUp(event);
        });

        // Prevent context menu on right click
        document.addEventListener('contextmenu', (event) => {
            event.preventDefault();
        });
    }

    setupMouseEvents() {
        // Mouse movement
        document.addEventListener('mousemove', (event) => {
            if (this.isPointerLocked) {
                this.mouse.deltaX = event.movementX || 0;
                this.mouse.deltaY = event.movementY || 0;
            } else {
                this.mouse.x = event.clientX;
                this.mouse.y = event.clientY;
                this.mouse.deltaX = 0;
                this.mouse.deltaY = 0;
            }
        });

        // Mouse button handlers
        document.addEventListener('mousedown', (event) => {
            switch (event.button) {
                case 0: // Left button
                    this.mouse.leftButton = true;
                    break;
                case 1: // Middle button
                    this.mouse.middleButton = true;
                    break;
                case 2: // Right button
                    this.mouse.rightButton = true;
                    break;
            }
        });

        document.addEventListener('mouseup', (event) => {
            switch (event.button) {
                case 0: // Left button
                    this.mouse.leftButton = false;
                    break;
                case 1: // Middle button
                    this.mouse.middleButton = false;
                    break;
                case 2: // Right button
                    this.mouse.rightButton = false;
                    break;
            }
        });

        // Click to lock pointer
        this.canvas.addEventListener('click', () => {
            if (!this.isPointerLocked) {
                this.requestPointerLock();
            }
        });
    }

    setupPointerLock() {
        // Pointer lock change events
        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement === this.canvas;
            this.pointerLockChangeCallbacks.forEach(callback => callback(this.isPointerLocked));
        });

        document.addEventListener('mozpointerlockchange', () => {
            this.isPointerLocked = document.mozPointerLockElement === this.canvas;
            this.pointerLockChangeCallbacks.forEach(callback => callback(this.isPointerLocked));
        });

        document.addEventListener('webkitpointerlockchange', () => {
            this.isPointerLocked = document.webkitPointerLockElement === this.canvas;
            this.pointerLockChangeCallbacks.forEach(callback => callback(this.isPointerLocked));
        });
    }

    requestPointerLock() {
        this.canvas.requestPointerLock = 
            this.canvas.requestPointerLock ||
            this.canvas.mozRequestPointerLock ||
            this.canvas.webkitRequestPointerLock;
        
        if (this.canvas.requestPointerLock) {
            this.canvas.requestPointerLock();
        }
    }

    exitPointerLock() {
        document.exitPointerLock = 
            document.exitPointerLock ||
            document.mozExitPointerLock ||
            document.webkitExitPointerLock;
        
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }
    }

    handleKeyDown(event) {
        // Handle special keys
        switch (event.code) {
            case 'Escape':
                if (this.isPointerLocked) {
                    this.exitPointerLock();
                }
                break;
                
            case 'KeyE':
                // Inventory toggle - will be implemented later
                break;
                
            case 'Tab':
                event.preventDefault(); // Prevent tab switching
                break;
        }
    }

    handleKeyUp(event) {
        // Handle key release events
        switch (event.code) {
            // Add any key-specific release handling here
        }
    }

    getState() {
        const state = {
            keys: { ...this.keys },
            mouse: {
                x: this.mouse.x,
                y: this.mouse.y,
                deltaX: this.mouse.deltaX,
                deltaY: this.mouse.deltaY,
                leftButton: this.mouse.leftButton,
                rightButton: this.mouse.rightButton,
                middleButton: this.mouse.middleButton
            },
            isPointerLocked: this.isPointerLocked
        };
        
        // Reset delta values after reading
        this.mouse.deltaX = 0;
        this.mouse.deltaY = 0;
        
        return state;
    }

    isKeyPressed(keyCode) {
        return !!this.keys[keyCode];
    }

    onPointerLockChange(callback) {
        this.pointerLockChangeCallbacks.push(callback);
    }

    removePointerLockChangeCallback(callback) {
        const index = this.pointerLockChangeCallbacks.indexOf(callback);
        if (index > -1) {
            this.pointerLockChangeCallbacks.splice(index, 1);
        }
    }

    dispose() {
        // Clean up event listeners
        // Note: In a real implementation, you'd want to store references to bound handlers
        // and remove them properly. For now, we'll rely on garbage collection.
    }
}
