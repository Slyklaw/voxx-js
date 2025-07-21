import { GameEngine } from './core/GameEngine.js';
import { InputHandler } from './core/InputHandler.js';

class MinecraftClone {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.gameEngine = null;
        this.inputHandler = null;
        
        this.init();
    }

    async init() {
        try {
            // Initialize core systems
            this.gameEngine = new GameEngine(this.canvas);
            this.inputHandler = new InputHandler(this.canvas);
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Start the game loop
            this.gameLoop();
            
            console.log('Minecraft Clone initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Minecraft Clone:', error);
            this.showError('Failed to initialize game. Please refresh the page.');
        }
    }

    setupEventListeners() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.gameEngine.onWindowResize();
        });

        // Handle visibility change (pause when tab is not active)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.gameEngine.pause();
            } else {
                this.gameEngine.resume();
            }
        });

        // Handle context loss
        this.canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            console.warn('WebGL context lost');
            this.showError('WebGL context lost. Attempting to restore...');
        });

        this.canvas.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored');
            this.gameEngine.onContextRestored();
            this.hideError();
        });
    }

    gameLoop() {
        const animate = () => {
            requestAnimationFrame(animate);
            
            try {
                // Update game state
                this.gameEngine.update(this.inputHandler.getState());
                
                // Render the scene
                this.gameEngine.render();
                
                // Update FPS counter
                this.updateFPS();
            } catch (error) {
                console.error('Error in game loop:', error);
                this.showError('An error occurred during gameplay');
            }
        };
        
        animate();
    }

    updateFPS() {
        if (!this.lastTime) {
            this.lastTime = performance.now();
            this.frameCount = 0;
            return;
        }
        
        this.frameCount++;
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        
        if (deltaTime >= 1000) {
            const fps = Math.round((this.frameCount * 1000) / deltaTime);
            document.getElementById('fpsCounter').textContent = `FPS: ${fps}`;
            
            this.lastTime = currentTime;
            this.frameCount = 0;
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.id = 'errorMessage';
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 20px;
            border-radius: 5px;
            z-index: 1000;
            text-align: center;
            font-family: Arial, sans-serif;
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
    }

    hideError() {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.remove();
        }
    }
}

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    new MinecraftClone();
});
