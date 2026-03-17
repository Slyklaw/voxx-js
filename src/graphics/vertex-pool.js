/**
 * VertexPool - Batched geometry management for voxel rendering
 * Combines multiple chunk geometries into shared vertex/index buffers
 * to reduce draw call overhead
 */
import { CHUNK_SIZE } from '../core/constants.js';

// Vertex format: x, y, z, nx, ny, nz, u, v (8 floats = 32 bytes)
const FLOATS_PER_VERTEX = 8;
const BYTES_PER_FLOAT = 4;
const VERTEX_STRIDE = FLOATS_PER_VERTEX * BYTES_PER_FLOAT;

// Face definitions: directions, normals, vertex offsets
const FACES = [
    // +X (right)
    { dir: [1, 0, 0], normal: [1, 0, 0], corners: [[1,0,0],[1,1,0],[1,1,1],[1,0,1]] },
    // -X (left)
    { dir: [-1, 0, 0], normal: [-1, 0, 0], corners: [[0,0,1],[0,1,1],[0,1,0],[0,0,0]] },
    // +Y (top)
    { dir: [0, 1, 0], normal: [0, 1, 0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]] },
    // -Y (bottom)
    { dir: [0, -1, 0], normal: [0, -1, 0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]] },
    // +Z (front)
    { dir: [0, 0, 1], normal: [0, 0, 1], corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]] },
    // -Z (back)
    { dir: [0, 0, -1], normal: [0, 0, -1], corners: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]] }
];

export class VertexPool {
    /**
     * Create a new VertexPool
     * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - WebGL context
     * @param {number} maxVertices - Maximum vertices in pool
     * @param {number} maxIndices - Maximum indices in pool
     */
    constructor(gl, maxVertices = 65535, maxIndices = 98300) {
        this.gl = gl;
        this.maxVertices = maxVertices;
        this.maxIndices = maxIndices;
        
        // Allocate CPU-side buffers
        this.vertexData = new Float32Array(maxVertices * FLOATS_PER_VERTEX);
        this.indexData = new Uint16Array(maxIndices);
        
        // Current counts
        this.vertexCount = 0;
        this.indexCount = 0;
        
        // Create GPU buffers
        this.vertexBuffer = gl.createBuffer();
        this.indexBuffer = gl.createBuffer();
    }
    
    /**
     * Reset pool for new frame - clears counts but doesn't deallocate
     */
    reset() {
        this.vertexCount = 0;
        this.indexCount = 0;
    }
    
    /**
     * Check if a voxel is solid (non-null)
     * @param {Array} chunkData - Chunk voxel data
     * @param {number} x - Local x coordinate
     * @param {number} y - Local y coordinate
     * @param {number} z - Local z coordinate
     * @returns {boolean} True if voxel is solid
     */
    isVoxelSolid(chunkData, x, y, z) {
        // Out of bounds is considered solid (don't render face at chunk edge)
        if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) {
            return true;
        }
        const idx = x + y * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_SIZE;
        return chunkData[idx] !== null;
    }
    
    /**
     * Add chunk geometry to the pool
     * Generates mesh for all visible faces in the chunk
     * @param {number} chunkX - Chunk world X position
     * @param {number} chunkY - Chunk world Y position
     * @param {number} chunkZ - Chunk world Z position
     * @param {Array} chunkData - Chunk voxel data array
     * @param {number} chunkSize - Chunk size (typically 32)
     * @returns {Object|null} Draw info {vertexOffset, indexOffset, indexCount} or null if full
     */
    addChunkGeometry(chunkX, chunkY, chunkZ, chunkData, chunkSize = CHUNK_SIZE) {
        const vertexOffset = this.vertexCount;
        const indexOffset = this.indexCount;
        let indicesAdded = 0;
        
        // Scale factor for chunk position
        const offsetX = chunkX * chunkSize;
        const offsetY = chunkY * chunkSize;
        const offsetZ = chunkZ * chunkSize;
        
        // Iterate all voxels in chunk
        for (let y = 0; y < chunkSize; y++) {
            for (let z = 0; z < chunkSize; z++) {
                for (let x = 0; x < chunkSize; x++) {
                    const voxelIdx = x + y * chunkSize + z * chunkSize * chunkSize;
                    const voxel = chunkData[voxelIdx];
                    
                    // Skip air voxels
                    if (voxel === null) continue;
                    
                    // Check each face direction
                    for (const face of FACES) {
                        const nx = x + face.dir[0];
                        const ny = y + face.dir[1];
                        const nz = z + face.dir[2];
                        
                        // Only add face if neighbor is air (visible face)
                        if (!this.isVoxelSolid(chunkData, nx, ny, nz)) {
                            // Check if we have space
                            if (this.vertexCount + 4 > this.maxVertices || 
                                this.indexCount + 6 > this.maxIndices) {
                                return null; // Pool full
                            }
                            
                            // Add 4 vertices for this face
                            const baseVertex = this.vertexCount;
                            
                            for (let i = 0; i < 4; i++) {
                                const corner = face.corners[i];
                                const vertIdx = (this.vertexCount++) * FLOATS_PER_VERTEX;
                                
                                // Position (world space)
                                this.vertexData[vertIdx + 0] = offsetX + x + corner[0];
                                this.vertexData[vertIdx + 1] = offsetY + y + corner[1];
                                this.vertexData[vertIdx + 2] = offsetZ + z + corner[2];
                                
                                // Normal
                                this.vertexData[vertIdx + 3] = face.normal[0];
                                this.vertexData[vertIdx + 4] = face.normal[1];
                                this.vertexData[vertIdx + 5] = face.normal[2];
                                
                                // UV (simple 0-1 mapping per face)
                                this.vertexData[vertIdx + 6] = i === 0 || i === 3 ? 0 : 1;
                                this.vertexData[vertIdx + 7] = i < 2 ? 0 : 1;
                            }
                            
                            // Add 6 indices (2 triangles) for this face
                            this.indexData[this.indexCount++] = baseVertex + 0;
                            this.indexData[this.indexCount++] = baseVertex + 1;
                            this.indexData[this.indexCount++] = baseVertex + 2;
                            this.indexData[this.indexCount++] = baseVertex + 0;
                            this.indexData[this.indexCount++] = baseVertex + 2;
                            this.indexData[this.indexCount++] = baseVertex + 3;
                            
                            indicesAdded += 6;
                        }
                    }
                }
            }
        }
        
        return {
            vertexOffset,
            indexOffset,
            indexCount: indicesAdded
        };
    }
    
    /**
     * Upload vertex and index data to GPU
     */
    upload() {
        const gl = this.gl;
        
        // Upload vertex data
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.vertexData.subarray(0, this.vertexCount * FLOATS_PER_VERTEX), gl.DYNAMIC_DRAW);
        
        // Upload index data
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indexData.subarray(0, this.indexCount), gl.DYNAMIC_DRAW);
    }
    
    /**
     * Bind vertex attributes for rendering
     * @param {Object} attribLocations - Attribute locations from shader
     */
    bind(attribLocations) {
        const gl = this.gl;
        
        // Bind vertex buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
        
        // Position attribute
        if (attribLocations.position !== undefined && attribLocations.position >= 0) {
            gl.enableVertexAttribArray(attribLocations.position);
            gl.vertexAttribPointer(attribLocations.position, 3, gl.FLOAT, false, VERTEX_STRIDE, 0);
        }
        
        // Normal attribute
        if (attribLocations.normal !== undefined && attribLocations.normal >= 0) {
            gl.enableVertexAttribArray(attribLocations.normal);
            gl.vertexAttribPointer(attribLocations.normal, 3, gl.FLOAT, false, VERTEX_STRIDE, 3 * BYTES_PER_FLOAT);
        }
        
        // Texture coordinate attribute
        if (attribLocations.texCoord !== undefined && attribLocations.texCoord >= 0) {
            gl.enableVertexAttribArray(attribLocations.texCoord);
            gl.vertexAttribPointer(attribLocations.texCoord, 2, gl.FLOAT, false, VERTEX_STRIDE, 6 * BYTES_PER_FLOAT);
        }
        
        // Bind index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    }
    
    /**
     * Draw all geometry in the pool with a single draw call
     */
    draw() {
        if (this.indexCount > 0) {
            this.gl.drawElements(this.gl.TRIANGLES, this.indexCount, this.gl.UNSIGNED_SHORT, 0);
        }
    }
    
    /**
     * Get current vertex count
     * @returns {number}
     */
    getVertexCount() {
        return this.vertexCount;
    }
    
    /**
     * Get current index count
     * @returns {number}
     */
    getIndexCount() {
        return this.indexCount;
    }
    
    /**
     * Dispose GPU resources
     */
    dispose() {
        const gl = this.gl;
        gl.deleteBuffer(this.vertexBuffer);
        gl.deleteBuffer(this.indexBuffer);
    }
}
