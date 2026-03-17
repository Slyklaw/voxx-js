/**
 * Rendering system for Voxx-JS voxel engine
 * Handles WebGL rendering of the voxel world
 */
import { logger } from './logger.js';
export class Renderer {
    constructor(gl, canvas) {
        this.gl = gl;
        this.canvas = canvas;
        this.program = null;
        this.vertexBuffer = null;
        this.indexBuffer = null;
        
        // Initialize shaders and buffers
        this.initRenderer();
        
        logger.info('Renderer initialized');
    }
    
    /**
     * Initialize the renderer components
     */
    initRenderer() {
        // Create and compile shaders
        this.createShaders();
        
        // Create vertex buffer for rendering
        this.createBuffers();
        
        // Set up WebGL state
        this.setupWebGLState();
    }
    
    /**
     * Create and compile vertex and fragment shaders
     */
    createShaders() {
        // Vertex shader source
        const vsSource = `
            attribute vec3 aPosition;
            attribute vec2 aTexCoord;
            attribute vec3 aNormal;
            
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            
            varying vec2 vTexCoord;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            void main() {
                gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
                vTexCoord = aTexCoord;
                vNormal = aNormal;
                vPosition = aPosition;
            }
        `;
        
        // Fragment shader source
        const fsSource = `
            precision mediump float;
            
            varying vec2 vTexCoord;
            varying vec3 vNormal;
            varying vec3 vPosition;
            
            uniform sampler2D uSampler;
            
            void main() {
                // Simple lighting calculation
                vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
                float diff = max(dot(normalize(vNormal), lightDir), 0.0);
                vec3 lightColor = vec3(1.0, 1.0, 1.0);
                
                // Sample texture
                vec4 texelColor = texture2D(uSampler, vTexCoord);
                
                // Apply lighting
                vec3 finalColor = texelColor.rgb * diff * lightColor;
                
                gl_FragColor = vec4(finalColor, texelColor.a);
            }
        `;
        
        // Compile shaders
        const vertexShader = this.loadShader(this.gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.loadShader(this.gl.FRAGMENT_SHADER, fsSource);
        
        // Create shader program
        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);
        
        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('Unable to initialize shader program: ' + this.gl.getProgramInfoLog(this.program));
            return null;
        }
        
        // Get attribute and uniform locations
        this.attribLocations = {
            position: this.gl.getAttribLocation(this.program, 'aPosition'),
            texCoord: this.gl.getAttribLocation(this.program, 'aTexCoord'),
            normal: this.gl.getAttribLocation(this.program, 'aNormal')
        };
        
        this.uniformLocations = {
            projectionMatrix: this.gl.getUniformLocation(this.program, 'uProjectionMatrix'),
            modelViewMatrix: this.gl.getUniformLocation(this.program, 'uModelViewMatrix'),
            sampler: this.gl.getUniformLocation(this.program, 'uSampler')
        };
    }
    
    /**
     * Load and compile a shader
     * @param {number} type - Shader type (VERTEX_SHADER or FRAGMENT_SHADER)
     * @param {string} source - Shader source code
     */
    loadShader(type, source) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);
        
        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('An error occurred compiling the shaders: ' + this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    /**
     * Create vertex and index buffers
     */
    createBuffers() {
        // Create a simple cube vertex buffer
        const vertices = [
            // Front face
            -0.5, -0.5,  0.5,
             0.5, -0.5,  0.5,
             0.5,  0.5,  0.5,
            -0.5,  0.5,  0.5,
            
            // Back face
            -0.5, -0.5, -0.5,
            -0.5,  0.5, -0.5,
             0.5,  0.5, -0.5,
             0.5, -0.5, -0.5,
            
            // Top face
            -0.5,  0.5, -0.5,
            -0.5,  0.5,  0.5,
             0.5,  0.5,  0.5,
             0.5,  0.5, -0.5,
            
            // Bottom face
            -0.5, -0.5, -0.5,
             0.5, -0.5, -0.5,
             0.5, -0.5,  0.5,
            -0.5, -0.5,  0.5,
            
            // Right face
             0.5, -0.5, -0.5,
             0.5,  0.5, -0.5,
             0.5,  0.5,  0.5,
             0.5, -0.5,  0.5,
            
            // Left face
            -0.5, -0.5, -0.5,
            -0.5, -0.5,  0.5,
            -0.5,  0.5,  0.5,
            -0.5,  0.5, -0.5
        ];
        
        // Create texture coordinates
        const textureCoords = [
            // Front face
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            
            // Back face
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            
            // Top face
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            
            // Bottom face
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            
            // Right face
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0,
            
            // Left face
            0.0, 0.0,
            1.0, 0.0,
            1.0, 1.0,
            0.0, 1.0
        ];
        
        // Create normals (simplified)
        const normals = [
            // Front face
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            0.0, 0.0, 1.0,
            
            // Back face
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            0.0, 0.0, -1.0,
            
            // Top face
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            0.0, 1.0, 0.0,
            
            // Bottom face
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            0.0, -1.0, 0.0,
            
            // Right face
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            1.0, 0.0, 0.0,
            
            // Left face
            -1.0, 0.0, 0.0,
            -1.0, 0.0, 0.0,
            -1.0, 0.0, 0.0,
            -1.0, 0.0, 0.0
        ];
        
        // Create index buffer for cube faces
        const indices = [
            0,  1,  2,   0,  2,  3,    // front
            4,  5,  6,   4,  6,  7,    // back
            8,  9,  10,  8,  10, 11,   // top
            12, 13, 14,  12, 14, 15,   // bottom
            16, 17, 18,  16, 18, 19,   // right
            20, 21, 22,  20, 22, 23    // left
        ];
        
        // Create and bind vertex buffer
        this.vertexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertices), this.gl.STATIC_DRAW);
        
        // Create and bind texture coordinate buffer
        this.texCoordBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textureCoords), this.gl.STATIC_DRAW);
        
        // Create and bind normal buffer
        this.normalBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(normals), this.gl.STATIC_DRAW);
        
        // Create and bind index buffer
        this.indexBuffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), this.gl.STATIC_DRAW);
    }
    
    /**
     * Set up WebGL state
     */
    setupWebGLState() {
        // Set viewport
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        
        // Enable blending for transparency (if needed)
        this.gl.enable(this.gl.BLEND);
        this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    }
    
    /**
     * Render the scene
     */
    render() {
        // Clear the canvas
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        // Use our shader program
        this.gl.useProgram(this.program);
        
        // Set up matrices (simplified - in a real engine these would be more complex)
        const projectionMatrix = this.createProjectionMatrix();
        const modelViewMatrix = this.createModelViewMatrix();
        
        // Set uniforms
        this.gl.uniformMatrix4fv(this.uniformLocations.projectionMatrix, false, projectionMatrix);
        this.gl.uniformMatrix4fv(this.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        
        // Bind vertex buffer and set attribute pointers
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.vertexBuffer);
        this.gl.enableVertexAttribArray(this.attribLocations.position);
        this.gl.vertexAttribPointer(this.attribLocations.position, 3, this.gl.FLOAT, false, 0, 0);
        
        // Bind texture coordinate buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
        this.gl.enableVertexAttribArray(this.attribLocations.texCoord);
        this.gl.vertexAttribPointer(this.attribLocations.texCoord, 2, this.gl.FLOAT, false, 0, 0);
        
        // Bind normal buffer
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.normalBuffer);
        this.gl.enableVertexAttribArray(this.attribLocations.normal);
        this.gl.vertexAttribPointer(this.attribLocations.normal, 3, this.gl.FLOAT, false, 0, 0);
        
        // Bind index buffer and draw
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        this.gl.drawElements(this.gl.TRIANGLES, 36, this.gl.UNSIGNED_SHORT, 0);
    }
    
    /**
     * Create a simple projection matrix (perspective)
     */
    createProjectionMatrix() {
        const fov = Math.PI / 4; // 45 degrees
        const aspect = this.canvas.width / this.canvas.height;
        const near = 0.1;
        const far = 100.0;
        
        const f = 1.0 / Math.tan(fov / 2);
        
        return new Float32Array([
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) / (near - far), -1,
            0, 0, (2 * far * near) / (near - far), 0
        ]);
    }
    
    /**
     * Create a simple model-view matrix (camera)
     */
    createModelViewMatrix() {
        // Simple identity matrix for now
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            0, 0, -5, 1
        ]);
    }
    
    /**
     * Update renderer when window resizes
     */
    onResize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
    }
}
