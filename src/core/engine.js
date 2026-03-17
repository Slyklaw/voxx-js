/**
 * Main engine class for Voxx-JS voxel engine
 * Initializes the game and manages the main loop
 */
import { logger } from './logger.js';
import { EngineError } from './errors.js';

export class Engine {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.gl = null;
        this.running = false;

        // Set canvas size to window size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Initialize WebGL context
        this.initWebGL();

        // Initialize systems
        this.initSystems();

        // Start the game loop
        this.start();
    }
    
    /**
     * Initialize WebGL context
     */
    initWebGL() {
        try {
            this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
            
            if (!this.gl) {
                throw new Error('Could not initialize WebGL');
            }
            
            // Set clear color to black, fully opaque
            this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
            
            // Enable depth testing
            this.gl.enable(this.gl.DEPTH_TEST);
            
            // Enable backface culling
            this.gl.enable(this.gl.CULL_FACE);
            
            logger.info('WebGL initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize WebGL:', error);
            throw error;
        }
    }
    
    /**
     * Initialize all game systems
     */
    async initSystems() {
        try {
            const [worldModule, rendererModule, playerModule] = await Promise.allSettled([
                import('./world.js'),
                import('./renderer.js'),
                import('../player/player.js')
            ]);

            if (worldModule.status === 'fulfilled') {
                this.world = new worldModule.value.World();
                logger.info('World system initialized');
            } else {
                logger.error('Failed to load world module:', worldModule.reason);
                throw new EngineError('World module failed to load', 'world');
            }

            if (rendererModule.status === 'fulfilled') {
                this.renderer = new rendererModule.value.Renderer(this.gl, this.canvas);
                logger.info('Renderer initialized');
            } else {
                logger.error('Failed to load renderer module:', rendererModule.reason);
                throw new EngineError('Renderer module failed to load', 'renderer');
            }

            if (playerModule.status === 'fulfilled') {
                this.player = new playerModule.value.Player();
                logger.info('Player system initialized');
            } else {
                logger.error('Failed to load player module:', playerModule.reason);
                throw new EngineError('Player module failed to load', 'player');
            }
        } catch (error) {
            logger.error('System initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Start the main game loop
     */
    start() {
        if (this.running) return;
        
        this.running = true;
        logger.info('Game engine started');
        
        // Start the render loop
        this.renderLoop();
    }
    
    /**
     * Main render loop
     */
    renderLoop() {
        if (!this.running) return;
        
        // Clear the canvas
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        // Update and render systems
        if (this.world) {
            this.world.update();
        }
        
        if (this.renderer) {
            this.renderer.render();
        }
        
        // Continue the loop
        requestAnimationFrame(() => this.renderLoop());
    }
    
    /**
     * Handle window resize
     */
    onResize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        
        if (this.gl) {
            this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        }
    }
}

// Initialize the engine when the page loads
window.addEventListener('load', () => {
    try {
        const engine = new Engine();
        logger.info('Engine initialized');

        // Handle window resize
        window.addEventListener('resize', () => {
            engine.onResize();
        });
    } catch (error) {
        logger.error('Failed to initialize engine:', error);
    }
});
