/**
 * Main engine class for Voxx-JS voxel engine
 * Initializes the game and manages the main loop
 */
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
            
            console.log('WebGL initialized successfully');
        } catch (error) {
            console.error('Failed to initialize WebGL:', error);
            throw error;
        }
    }
    
    /**
     * Initialize all game systems
     */
    initSystems() {
        // Import and initialize core systems
        import('./world.js').then((module) => {
            this.world = new module.World();
        });
        
        import('./renderer.js').then((module) => {
            this.renderer = new module.Renderer(this.gl, this.canvas);
        });
        
        import('../player/player.js').then((module) => {
            this.player = new module.Player();
        });
    }
    
    /**
     * Start the main game loop
     */
    start() {
        if (this.running) return;
        
        this.running = true;
        console.log('Game engine started');
        
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
        console.log('Engine initialized');
        
        // Handle window resize
        window.addEventListener('resize', () => {
            engine.onResize();
        });
    } catch (error) {
        console.error('Failed to initialize engine:', error);
    }
});
