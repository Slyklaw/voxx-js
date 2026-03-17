/**
 * Rendering system for Voxx-JS voxel engine
 * Handles WebGL rendering of the voxel world
 */
import { logger } from './logger.js';
import { VertexPool } from '../graphics/vertex-pool.js';
import { CHUNK_SIZE } from './constants.js';

export class Renderer {
    constructor(gl, canvas) {
        this.gl = gl;
        this.canvas = canvas;
        this.program = null;
        this.vertexPool = null;
        
        // Detect WebGL version
        const versionString = gl.getParameter(gl.VERSION);
        const match = versionString.match(/WebGL (\d+\.\d+)/);
        this.glVersion = match ? parseFloat(match[1]) : 1;
        this.shaderVersionPrefix = this.glVersion >= 2 ? '#version 300 es\n' : '';
        
        // Frustum culling state
        this.frustumPlanes = null;
        
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
        
        // Create vertex pool for batched geometry
        this.vertexPool = new VertexPool(this.gl);
        
        // Set up WebGL state
        this.setupWebGLState();
    }
    
    /**
     * Create and compile vertex and fragment shaders
     */
    createShaders() {
        // Determine shader syntax based on WebGL version
        const isWebGL2 = this.glVersion >= 2;
        const inKeyword = isWebGL2 ? 'in' : 'attribute';
        const outKeyword = isWebGL2 ? 'out' : 'varying';
        const textureFunc = isWebGL2 ? 'texture' : 'texture2D';
        const fragColor = isWebGL2 ? 'fragColor' : 'gl_FragColor';
        const versionPrefix = isWebGL2 ? '#version 300 es\n' : '';
        
        // Vertex shader source - uses vertex colors, not textures
        const vsSource = `${versionPrefix}
            ${inKeyword} vec3 aPosition;
            ${inKeyword} vec3 aColor;
            ${inKeyword} vec3 aNormal;
            
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            
            ${outKeyword} vec3 vColor;
            ${outKeyword} vec3 vNormal;
            ${outKeyword} vec3 vPosition;
            
            void main() {
                gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
                vColor = aColor;
                vNormal = aNormal;
                vPosition = aPosition;
            }
        `;
        
        // Fragment shader source - uses vertex colors with lighting
        const fsSource = `${versionPrefix}
            precision mediump float;
            
            ${isWebGL2 ? 'in' : 'varying'} vec3 vColor;
            ${isWebGL2 ? 'in' : 'varying'} vec3 vNormal;
            ${isWebGL2 ? 'in' : 'varying'} vec3 vPosition;
            
            ${isWebGL2 ? 'out vec4 fragColor;' : ''}
            
            void main() {
                // Simple directional lighting
                vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
                vec3 normal = normalize(vNormal);
                float diff = max(dot(normal, lightDir), 0.0);
                
                // Ambient + diffuse lighting
                float ambient = 0.3;
                float lighting = ambient + diff * 0.7;
                
                // Apply lighting to vertex color
                vec3 finalColor = vColor * lighting;
                
                ${fragColor} = vec4(finalColor, 1.0);
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
            color: this.gl.getAttribLocation(this.program, 'aColor'),
            normal: this.gl.getAttribLocation(this.program, 'aNormal')
        };
        
        this.uniformLocations = {
            projectionMatrix: this.gl.getUniformLocation(this.program, 'uProjectionMatrix'),
            modelViewMatrix: this.gl.getUniformLocation(this.program, 'uModelViewMatrix')
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
     * Render the scene using vertex pooling for batched geometry
     * @param {Array} chunks - Array of chunk objects to render
     * @param {Float32Array} viewMatrix - Camera view matrix (4x4)
     */
    render(chunks = [], viewMatrix = null) {
        // Clear the canvas
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
        
        // Use our shader program
        this.gl.useProgram(this.program);
        
        // Set up projection matrix
        const projectionMatrix = this.createProjectionMatrix();
        
        // Use provided view matrix or default
        const modelViewMatrix = viewMatrix || this.createModelViewMatrix();
        
        // Calculate combined projection-view matrix for frustum culling
        const pvMatrix = multiply(projectionMatrix, modelViewMatrix);
        
        // Extract frustum planes from combined matrix
        this.frustumPlanes = createFrustumFromMatrix(pvMatrix);
        
        // Filter chunks through frustum test
        const visibleChunks = chunks.filter(chunk => this.isChunkInFrustum(chunk, this.frustumPlanes));
        
        // Render in batches when pool fills up
        let chunkIndex = 0;
        let totalDrawn = 0;
        
        while (chunkIndex < visibleChunks.length) {
            // Reset vertex pool for new batch
            this.vertexPool.reset();
            
            // Add chunks until pool is full or no more chunks
            while (chunkIndex < visibleChunks.length) {
                const chunk = visibleChunks[chunkIndex];
                if (chunk.data) {
                    const result = this.vertexPool.addChunkGeometry(chunk.x, chunk.y, chunk.z, chunk.data, CHUNK_SIZE);
                    if (result === null) {
                        // Pool full, break to draw this batch
                        break;
                    }
                }
                chunkIndex++;
            }
            
            // Upload geometry data to GPU
            this.vertexPool.upload();
            
            // Set uniforms
            this.gl.uniformMatrix4fv(this.uniformLocations.projectionMatrix, false, projectionMatrix);
            this.gl.uniformMatrix4fv(this.uniformLocations.modelViewMatrix, false, modelViewMatrix);
            
            // Bind vertex pool attributes
            this.vertexPool.bind(this.attribLocations);
            
            // Draw this batch
            this.vertexPool.draw();
            totalDrawn++;
        }
        
        return visibleChunks.length;
    }
    
    /**
     * Create a model matrix for a chunk position
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkY - Chunk Y coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     */
    createChunkModelMatrix(chunkX, chunkY, chunkZ) {
        // Translation matrix for chunk position
        const x = chunkX * CHUNK_SIZE;
        const y = chunkY * CHUNK_SIZE;
        const z = chunkZ * CHUNK_SIZE;
        
        return new Float32Array([
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            x, y, z, 1
        ]);
    }
    
    /**
     * Test if a chunk is inside the frustum
     * @param {Object} chunk - Chunk with x, y, z coordinates
     * @param {Array} frustumPlanes - Array of 6 frustum planes
     * @returns {boolean} True if chunk is visible
     */
    isChunkInFrustum(chunk, frustumPlanes) {
        if (!frustumPlanes || frustumPlanes.length !== 6) {
            return true; // No frustum, assume visible
        }
        
        // Calculate chunk world bounds
        const minX = chunk.x * CHUNK_SIZE;
        const minY = chunk.y * CHUNK_SIZE;
        const minZ = chunk.z * CHUNK_SIZE;
        const maxX = minX + CHUNK_SIZE;
        const maxY = minY + CHUNK_SIZE;
        const maxZ = minZ + CHUNK_SIZE;
        
        // Test against each frustum plane
        for (const plane of frustumPlanes) {
            // Find the p-vertex (point most negative relative to plane normal)
            const pVertexX = plane.a >= 0 ? maxX : minX;
            const pVertexY = plane.b >= 0 ? maxY : minY;
            const pVertexZ = plane.c >= 0 ? maxZ : minZ;
            
            // If p-vertex is outside this plane, chunk is completely outside frustum
            const distance = plane.a * pVertexX + plane.b * pVertexY + plane.c * pVertexZ + plane.d;
            if (distance < 0) {
                return false;
            }
        }
        
        return true; // Chunk passes all plane tests
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

// Matrix multiplication for 4x4 matrices (column-major)
export function multiply(a, b) {
    const result = new Float32Array(16);
    for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 4; row++) {
            let sum = 0;
            for (let k = 0; k < 4; k++) {
                sum += a[k * 4 + row] * b[col * 4 + k];
            }
            result[col * 4 + row] = sum;
        }
    }
    return result;
}

// Extract frustum planes from view-projection matrix (column-major)
export function createFrustumFromMatrix(matrix) {
    // Planes: left, right, bottom, top, near, far
    const planes = [];
    // Left plane: row3 + row0
    planes.push(extractPlane(matrix, 3, 0));
    // Right plane: row3 - row0
    planes.push(extractPlane(matrix, 3, 0, true));
    // Bottom plane: row3 + row1
    planes.push(extractPlane(matrix, 3, 1));
    // Top plane: row3 - row1
    planes.push(extractPlane(matrix, 3, 1, true));
    // Near plane: row3 + row2
    planes.push(extractPlane(matrix, 3, 2));
    // Far plane: row3 - row2
    planes.push(extractPlane(matrix, 3, 2, true));
    
    // Normalize planes
    for (const plane of planes) {
        const len = Math.sqrt(plane.a * plane.a + plane.b * plane.b + plane.c * plane.c);
        if (len > 0) {
            plane.a /= len;
            plane.b /= len;
            plane.c /= len;
            plane.d /= len;
        }
    }
    return planes;
}

function extractPlane(m, row1, row2, negate = false) {
    const scale = negate ? -1 : 1;
    const a = m[row1 + 0 * 4] + scale * m[row2 + 0 * 4];
    const b = m[row1 + 1 * 4] + scale * m[row2 + 1 * 4];
    const c = m[row1 + 2 * 4] - scale * m[row2 + 2 * 4];
    const d = m[row1 + 3 * 4] + scale * m[row2 + 3 * 4];
    return { a, b, c, d };
}
