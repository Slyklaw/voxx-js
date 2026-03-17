/**
 * Chunk mesh generator for Voxx-JS voxel engine
 * Converts voxel data to triangle meshes for rendering
 */
import { CHUNK_SIZE } from '../core/constants.js';

// Face definitions: direction to check neighbor, corner vertices, normal
const FACES = [
    { dir: [0, 1, 0], corners: [[0,1,1],[1,1,1],[1,1,0],[0,1,0]], normal: [0,1,0] },   // top
    { dir: [0, -1, 0], corners: [[0,0,0],[1,0,0],[1,0,1],[0,0,1]], normal: [0,-1,0] }, // bottom
    { dir: [0, 0, 1], corners: [[0,0,1],[1,0,1],[1,1,1],[0,1,1]], normal: [0,0,1] },   // front
    { dir: [0, 0, -1], corners: [[1,0,0],[0,0,0],[0,1,0],[1,1,0]], normal: [0,0,-1] }, // back
    { dir: [1, 0, 0], corners: [[1,0,1],[1,0,0],[1,1,0],[1,1,1]], normal: [1,0,0] },   // right
    { dir: [-1, 0, 0], corners: [[0,0,0],[0,0,1],[0,1,1],[0,1,0]], normal: [-1,0,0] }, // left
];

// Voxel colors by type (R, G, B)
const VOXEL_COLORS = {
    1: [0.2, 0.8, 0.2],  // grass (green)
    2: [0.6, 0.4, 0.2],  // dirt (brown)
    3: [0.5, 0.5, 0.5],  // stone (gray)
};

const DEFAULT_COLOR = [0.8, 0.8, 0.8];

/**
 * Get voxel ID at local chunk coordinates
 */
function getVoxelId(chunkData, x, y, z) {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_SIZE || z < 0 || z >= CHUNK_SIZE) {
        return 0; // Out of bounds = air
    }
    const index = x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
    const voxel = chunkData[index];
    if (!voxel) return 0;
    return typeof voxel === 'object' ? (voxel.id || 0) : voxel;
}

/**
 * Generate triangle mesh from chunk voxel data
 * @param {Chunk} chunk - Chunk with voxel data
 * @param {ChunkManager} chunkManager - For checking neighboring chunks
 * @returns {Object} Mesh data with positions, normals, colors, indices
 */
export function generateChunkMesh(chunk, chunkManager) {
    const positions = [];
    const normals = [];
    const colors = [];
    const indices = [];
    
    const chunkX = chunk.x * CHUNK_SIZE;
    const chunkY = chunk.y * CHUNK_SIZE;
    const chunkZ = chunk.z * CHUNK_SIZE;
    
    let vertexCount = 0;
    
    // Iterate through all voxels in chunk
    for (let y = 0; y < CHUNK_SIZE; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
            for (let x = 0; x < CHUNK_SIZE; x++) {
                const voxelId = getVoxelId(chunk.data, x, y, z);
                if (voxelId === 0) continue; // Skip air
                
                const color = VOXEL_COLORS[voxelId] || DEFAULT_COLOR;
                
                // Check each face
                for (const face of FACES) {
                    const nx = x + face.dir[0];
                    const ny = y + face.dir[1];
                    const nz = z + face.dir[2];
                    
                    // Check if neighbor is air (face is visible)
                    let neighborId = getVoxelId(chunk.data, nx, ny, nz);
                    
                    // For faces at chunk boundary, could check neighbor chunk
                    // For simplicity, assume boundary faces are visible
                    if (nx >= 0 && nx < CHUNK_SIZE && ny >= 0 && ny < CHUNK_SIZE && 
                        nz >= 0 && nz < CHUNK_SIZE) {
                        if (neighborId !== 0) continue; // Neighbor is solid, face hidden
                    }
                    
                    // Add face vertices
                    for (const corner of face.corners) {
                        positions.push(
                            chunkX + x + corner[0],
                            chunkY + y + corner[1],
                            chunkZ + z + corner[2]
                        );
                        normals.push(face.normal[0], face.normal[1], face.normal[2]);
                        colors.push(color[0], color[1], color[2]);
                    }
                    
                    // Add face indices (two triangles per quad)
                    indices.push(
                        vertexCount, vertexCount + 1, vertexCount + 2,
                        vertexCount, vertexCount + 2, vertexCount + 3
                    );
                    vertexCount += 4;
                }
            }
        }
    }
    
    return {
        positions: new Float32Array(positions),
        normals: new Float32Array(normals),
        colors: new Float32Array(colors),
        indices: new Uint16Array(indices),
        vertexCount,
        indexCount: indices.length
    };
}
