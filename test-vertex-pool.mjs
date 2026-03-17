import { VertexPool } from './src/graphics/vertex-pool.js';
import { CHUNK_SIZE } from './src/core/constants.js';

// Mock WebGL context
const mockGl = {
    createBuffer: () => ({}),
    bindBuffer: () => {},
    bufferData: () => {},
    getExtension: () => null,
};

// Create vertex pool
const pool = new VertexPool(mockGl, 262144, 393216);

// Create chunk data with a single voxel at (0,0,0)
const chunkData = new Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_SIZE).fill(null);
// Set voxel at local (0,0,0) (index 0)
chunkData[0] = { type: 'grass', id: 1 };
// Set voxel at local (1,0,0) (index 1) to test neighbor culling
chunkData[1] = { type: 'dirt', id: 2 };

console.log('Chunk data length:', chunkData.length);
console.log('Non-null voxels:', chunkData.filter(v => v !== null).length);

// Add chunk geometry at chunk coordinates (0,0,0)
const result = pool.addChunkGeometry(0, 0, 0, chunkData, CHUNK_SIZE);
console.log('Add chunk result:', result);
console.log('Vertex count:', pool.getVertexCount());
console.log('Index count:', pool.getIndexCount());

// Expected: voxel at (0,0,0) should have 6 faces (since all neighbors are air)
// voxel at (1,0,0) should have 5 faces (neighbor at (0,0,0) is solid)
// Total vertices = 6*4 + 5*4 = 44 vertices? Actually each face adds 4 vertices, but vertices are shared? No, each face adds new vertices (not shared).
// Let's compute manually later.
if (result !== null) {
    console.log('SUCCESS: Geometry generated');
} else {
    console.log('FAILED: No geometry generated');
}