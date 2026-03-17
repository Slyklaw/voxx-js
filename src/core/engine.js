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
        this.lastTime = 0; // For deltaTime calculation

        // Set canvas size to window size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;

        // Initialize WebGL context
        this.initWebGL();

        // Initialize systems
        this.initSystems().catch(err => logger.error('Failed to initialize systems:', err));

        // Start the game loop
        this.start();
    }
    
    /**
     * Initialize WebGL context
     */
    initWebGL() {
        try {
            // Attempt WebGL 2.0 first
            this.gl = this.canvas.getContext('webgl2');
            if (this.gl) {
                this.glVersion = 2;
            } else {
                // Fallback to WebGL 1.0
                this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
                if (this.gl) {
                    this.glVersion = 1;
                }
            }
            
            if (!this.gl) {
                throw new Error('Could not initialize WebGL');
            }
            
            // Set clear color to black, fully opaque
            this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
            
            // Enable depth testing
            this.gl.enable(this.gl.DEPTH_TEST);
            
            // Enable backface culling
            this.gl.enable(this.gl.CULL_FACE);
            
            logger.info(`WebGL ${this.glVersion}.0 context obtained`);
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
        
        // Calculate deltaTime (in seconds)
        const currentTime = performance.now();
        const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Cap at 100ms
        this.lastTime = currentTime;
        
        // Update player (handles input and physics)
        if (this.player && deltaTime > 0) {
            this.player.update(deltaTime, this.world?.chunkManager);
        }
        
        // Get player position for chunk loading and camera
        const playerPos = this.player?.getPosition() || { x: 0, y: 50, z: 0 };
        
        // Update world with player position (triggers chunk loading)
        if (this.world) {
            this.world.update(playerPos);
        }
        
        if (this.renderer) {
            // Clear the canvas
            this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
            
            // Get loaded chunks from chunk manager for frustum culling
            const chunks = this.world?.chunkManager?.getLoadedChunks() || [];
            
            // Create view matrix based on player position
            const viewMatrix = this.createViewMatrix(playerPos);
            
            // Render with frustum culling - pass chunks and view matrix
            this.renderer.render(chunks, viewMatrix);
        }
        
        // Update debug overlay
        this.updateDebugInfo(playerPos, deltaTime);
        
        // Continue the loop
        requestAnimationFrame(() => this.renderLoop());
    }
    
    /**
     * Create view matrix for camera based on player position
     * @param {Object} playerPos - Player position {x, y, z}
     * @returns {Float32Array} 4x4 view matrix
     */
    createViewMatrix(playerPos = { x: 0, y: 50, z: 0 }) {
        // Camera at player position with eye height offset
        const eyeX = playerPos.x;
        const eyeY = playerPos.y + 1.7; // Eye height
        const eyeZ = playerPos.z + 3;   // Slightly behind player
        
        // Simple translation matrix
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            -eyeX, -eyeY, -eyeZ, 1
        ]);
    }
    
    /**
     * Update debug info overlay
     */
    updateDebugInfo(playerPos, deltaTime) {
        const debugEl = document.getElementById('debug');
        if (!debugEl) return;
        
        const chunkCount = this.world?.chunkManager?.getChunkCount() || 0;
        const vel = this.player?.velocity || { x: 0, y: 0, z: 0 };
        const onGround = this.player?.isOnGround() || false;
        const chunkX = Math.floor(playerPos.x / 32);
        const chunkY = Math.floor(playerPos.y / 32);
        const chunkZ = Math.floor(playerPos.z / 32);
        
        debugEl.innerHTML = `
            <div>Player: (${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)}, ${playerPos.z.toFixed(1)})</div>
            <div>Chunk: (${chunkX}, ${chunkY}, ${chunkZ})</div>
            <div>Velocity: (${vel.x.toFixed(1)}, ${vel.y.toFixed(1)}, ${vel.z.toFixed(1)})</div>
            <div>On Ground: ${onGround}</div>
            <div>Chunks Loaded: ${chunkCount}</div>
            <div>FPS: ${deltaTime > 0 ? Math.round(1/deltaTime) : 0}</div>
        `;
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
        
        // Enable pointer lock on canvas click for mouse look
        const canvas = document.getElementById('gameCanvas');
        canvas.addEventListener('click', () => {
            if (!document.pointerLockElement) {
                canvas.requestPointerLock();
            }
        });
    } catch (error) {
        logger.error('Failed to initialize engine:', error);
    }
});
