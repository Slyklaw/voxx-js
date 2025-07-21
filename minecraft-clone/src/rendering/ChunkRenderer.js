import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { BlockType } from '../world/BlockType.js';
import { BlockRenderer } from './BlockRenderer.js';

export class ChunkRenderer {
    constructor() {
        this.blockRenderer = new BlockRenderer();
        this.chunkMeshes = new Map(); // Map of chunk keys to Three.js meshes
    }

    /**
     * Render a chunk by creating its mesh
     * @param {Chunk} chunk - The chunk to render
     * @returns {THREE.Mesh|null} The created mesh, or null if chunk is empty
     */
    renderChunk(chunk) {
        if (chunk.isEmpty) {
            return null;
        }

        const key = chunk.getKey();
        
        // Remove existing mesh if it exists
        this.removeChunkMesh(key);
        
        const blocks = chunk.getNonAirBlocks();
        if (blocks.length === 0) {
            return null;
        }

        // Create geometry for all blocks in the chunk
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const normals = [];
        const colors = [];
        const indices = [];

        let vertexOffset = 0;

        for (const block of blocks) {
            const localCoords = chunk.getLocalCoordinates(block.position.x, block.position.z);
            const meshData = this.createBlockMeshData(
                block.type,
                localCoords.localX,
                block.position.y,
                localCoords.localZ
            );

            if (meshData) {
                // Add positions
                positions.push(...meshData.positions);
                
                // Add normals
                normals.push(...meshData.normals);
                
                // Add colors
                colors.push(...meshData.colors);
                
                // Add indices with offset
                for (const index of meshData.indices) {
                    indices.push(index + vertexOffset);
                }
                
                vertexOffset += meshData.positions.length / 3;
            }
        }

        if (positions.length === 0) {
            return null;
        }

        // Set geometry attributes
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setIndex(indices);

        // Create material
        const material = new THREE.MeshLambertMaterial({
            vertexColors: true,
            transparent: false
        });

        // Create mesh
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(chunk.x * 16, 0, chunk.z * 16);
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        // Store mesh reference
        this.chunkMeshes.set(key, mesh);
        chunk.needsUpdate = false;

        return mesh;
    }

    /**
     * Create mesh data for a single block
     * @param {BlockType} blockType - The type of block
     * @param {number} x - Local X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Local Z coordinate
     * @returns {Object|null} Mesh data or null if block type is invalid
     */
    createBlockMeshData(blockType, x, y, z) {
        const color = this.blockRenderer.getBlockColor(blockType);
        if (!color) return null;

        // Define cube vertices (8 vertices)
        const vertices = [
            // Front face
            [x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1],
            // Back face
            [x, y, z], [x, y + 1, z], [x + 1, y + 1, z], [x + 1, y, z],
            // Top face
            [x, y + 1, z], [x, y + 1, z + 1], [x + 1, y + 1, z + 1], [x + 1, y + 1, z],
            // Bottom face
            [x, y, z], [x + 1, y, z], [x + 1, y, z + 1], [x, y, z + 1],
            // Right face
            [x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x + 1, y, z + 1],
            // Left face
            [x, y, z + 1], [x, y + 1, z + 1], [x, y + 1, z], [x, y, z]
        ];

        // Define normals for each face
        const normals = [
            // Front face
            [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1],
            // Back face
            [0, 0, -1], [0, 0, -1], [0, 0, -1], [0, 0, -1],
            // Top face
            [0, 1, 0], [0, 1, 0], [0, 1, 0], [0, 1, 0],
            // Bottom face
            [0, -1, 0], [0, -1, 0], [0, -1, 0], [0, -1, 0],
            // Right face
            [1, 0, 0], [1, 0, 0], [1, 0, 0], [1, 0, 0],
            // Left face
            [-1, 0, 0], [-1, 0, 0], [-1, 0, 0], [-1, 0, 0]
        ];

        // Define indices for 12 triangles (6 faces * 2 triangles)
        const indices = [];
        for (let i = 0; i < 6; i++) {
            const offset = i * 4;
            indices.push(offset, offset + 1, offset + 2);
            indices.push(offset, offset + 2, offset + 3);
        }

        // Flatten vertices and normals
        const positions = vertices.flat();
        const normalsFlat = normals.flat();
        
        // Create color array (same color for all vertices of this block)
        const colors = [];
        for (let i = 0; i < 24; i++) {
            colors.push(color.r, color.g, color.b);
        }

        return {
            positions,
            normals: normalsFlat,
            colors,
            indices
        };
    }

    /**
     * Remove a chunk's mesh from the scene
     * @param {string} chunkKey - The chunk key
     */
    removeChunkMesh(chunkKey) {
        const existingMesh = this.chunkMeshes.get(chunkKey);
        if (existingMesh) {
            existingMesh.geometry.dispose();
            existingMesh.material.dispose();
            this.chunkMeshes.delete(chunkKey);
        }
    }

    /**
     * Update a chunk's mesh if it needs updating
     * @param {Chunk} chunk - The chunk to update
     * @returns {THREE.Mesh|null} The updated mesh, or null if no update needed
     */
    updateChunk(chunk) {
        if (!chunk.needsUpdate) {
            return null;
        }

        return this.renderChunk(chunk);
    }

    /**
     * Remove all chunk meshes
     */
    clear() {
        for (const [key, mesh] of this.chunkMeshes) {
            mesh.geometry.dispose();
            mesh.material.dispose();
        }
        this.chunkMeshes.clear();
    }

    /**
     * Get all rendered meshes
     * @returns {THREE.Mesh[]} Array of all chunk meshes
     */
    getAllMeshes() {
        return Array.from(this.chunkMeshes.values());
    }

    /**
     * Check if a chunk has a rendered mesh
     * @param {string} chunkKey - The chunk key
     * @returns {boolean} True if mesh exists
     */
    hasMesh(chunkKey) {
        return this.chunkMeshes.has(chunkKey);
    }

    /**
     * Dispose of all resources
     */
    dispose() {
        this.clear();
    }
}
