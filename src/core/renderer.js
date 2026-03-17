/**
 * Rendering system for Voxx-JS voxel engine
 * Handles WebGL rendering of the voxel world
 */
import { logger } from './logger.js';
import { CHUNK_SIZE } from './constants.js';

export class Renderer {
    constructor(gl, canvas) {
        this.gl = gl;
        this.canvas = canvas;
        this.program = null;
        this.vertexBuffer = null;
        this.indexBuffer = null;
        
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
        
        // Create vertex buffer for rendering
        this.createBuffers();
        
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
        
        // Vertex shader source
        const vsSource = `${versionPrefix}
            ${inKeyword} vec3 aPosition;
            ${inKeyword} vec2 aTexCoord;
            ${inKeyword} vec3 aNormal;
            
            uniform mat4 uModelViewMatrix;
            uniform mat4 uProjectionMatrix;
            
            ${outKeyword} vec2 vTexCoord;
            ${outKeyword} vec3 vNormal;
            ${outKeyword} vec3 vPosition;
            
            void main() {
                gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
                vTexCoord = aTexCoord;
                vNormal = aNormal;
                vPosition = aPosition;
            }
        `;
        
        // Fragment shader source
        const fsSource = `${versionPrefix}
            precision mediump float;
            
            ${isWebGL2 ? 'in' : 'varying'} vec2 vTexCoord;
            ${isWebGL2 ? 'in' : 'varying'} vec3 vNormal;
            ${isWebGL2 ? 'in' : 'varying'} vec3 vPosition;
            
            uniform sampler2D uSampler;
            
            ${isWebGL2 ? 'out vec4 fragColor;' : ''}
            
            void main() {
                // Simple lighting calculation
                vec3 lightDir = normalize(vec3(0.5, 1.0, 0.5));
                float diff = max(dot(normalize(vNormal), lightDir), 0.0);
                vec3 lightColor = vec3(1.0, 1.0, 1.0);
                
                // Sample texture
                vec4 texelColor = ${textureFunc}(uSampler, vTexCoord);
                
                // Apply lighting
                vec3 finalColor = texelColor.rgb * diff * lightColor;
                
                ${fragColor} = vec4(finalColor, texelColor.a);
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
     * Render the scene with frustum culling
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
        
        // Bind index buffer
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        
        // Draw only visible chunks
        const chunksDrawn = visibleChunks.length;
        if (chunksDrawn > 0) {
            // For each visible chunk, set model matrix and draw
            // Currently draws one cube per chunk at chunk position
            for (const chunk of visibleChunks) {
                // Set chunk position in model matrix
                const chunkModelMatrix = this.createChunkModelMatrix(chunk.x, chunk.y, chunk.z);
                this.gl.uniformMatrix4fv(this.uniformLocations.modelViewMatrix, false, chunkModelMatrix);
                this.gl.drawElements(this.gl.TRIANGLES, 36, this.gl.UNSIGNED_SHORT, 0);
            }
        }
        
        return chunksDrawn;
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
    const a = m[row1 * 4 + 0] + scale * m[row2 * 4 + 0];
    const b = m[row1 * 4 + 1] + scale * m[row2 * 4 + 1];
    const c = m[row1 * 4 + 2] + scale * m[row2 * 4 + 2];
    const d = m[row1 * 4 + 3] + scale * m[row2 * 4 + 3];
    return { a, b, c, d };
}
