import { Chunk } from './src/chunk.js';
import { AmbientOcclusionCalculator } from './src/ambientOcclusionCalculator.js';

// Create a simple world for testing
const world = {
  chunks: new Map(),
  
  getChunk(chunkX, chunkZ) {
    const key = `${chunkX},${chunkZ}`;
    return this.chunks.get(key);
  },
  
  setChunk(chunkX, chunkZ, chunk) {
    const key = `${chunkX},${chunkZ}`;
    this.chunks.set(key, chunk);
  },
  
  getVoxel(worldX, worldY, worldZ) {
    const chunkX = Math.floor(worldX / 32);
    const chunkZ = Math.floor(worldZ / 32);
    const localX = worldX - (chunkX * 32);
    const localZ = worldZ - (chunkZ * 32);
    
    const chunk = this.getChunk(chunkX, chunkZ);
    if (!chunk) return 0;
    
    return chunk.getVoxelSafe(localX, worldY, localZ);
  }
};

// Create two adjacent chunks
const chunk1 = new Chunk(0, 0, world);
const chunk2 = new Chunk(1, 0, world);
world.setChunk(0, 0, chunk1);
world.setChunk(1, 0, chunk2);

// Create a specific scenario that reproduces the boundary AO issue
// Fill chunk1 with terrain up to y=100
for (let x = 0; x < 32; x++) {
  for (let z = 0; z < 32; z++) {
    for (let y = 0; y <= 100; y++) {
      chunk1.setVoxel(x, y, z, 1);
    }
  }
}

// Fill chunk2 with terrain up to y=100, but create a specific pattern
for (let x = 0; x < 32; x++) {
  for (let z = 0; z < 32; z++) {
    for (let y = 0; y <= 100; y++) {
      chunk2.setVoxel(x, y, z, 1);
    }
  }
}

// Now create a specific AO-affecting pattern at the boundary
// Remove some voxels to create occlusion differences
chunk1.setVoxel(31, 101, 15, 0); // Air above boundary voxel in chunk1
chunk2.setVoxel(0, 101, 15, 0);  // Air above boundary voxel in chunk2

// Add occluding voxels that will affect AO differently on each side
chunk1.setVoxel(30, 101, 15, 1); // Solid to the west in chunk1
chunk1.setVoxel(31, 101, 14, 1); // Solid to the north in chunk1
chunk2.setVoxel(1, 101, 15, 1);  // Solid to the east in chunk2
chunk2.setVoxel(0, 101, 16, 1);  // Solid to the south in chunk2

const aoCalculator = new AmbientOcclusionCalculator();

console.log('=== Debugging Boundary AO Issue ===\n');

// Test the exact boundary case: adjacent voxels at chunk boundary
const voxel1 = { chunk: chunk1, x: 31, y: 100, z: 15 }; // Right edge of chunk1
const voxel2 = { chunk: chunk2, x: 0, y: 100, z: 15 };  // Left edge of chunk2

console.log('Testing adjacent boundary voxels with occlusion pattern:');
console.log(`Voxel 1: Chunk(0,0) at local (31,100,15) = world (31,100,15)`);
console.log(`Voxel 2: Chunk(1,0) at local (0,100,15) = world (32,100,15)`);
console.log();

// Show the occlusion pattern around the boundary
console.log('Occlusion pattern around boundary:');
for (let x = 29; x <= 34; x++) {
  for (let y = 100; y <= 102; y++) {
    for (let z = 14; z <= 16; z++) {
      const worldX = x;
      const voxel = world.getVoxel(worldX, y, z);
      console.log(`World (${worldX}, ${y}, ${z}): ${voxel > 0 ? 'SOLID' : 'AIR'}`);
    }
  }
}
console.log();

// Test top face AO - this is where we see the biggest differences
console.log('TOP FACE AO Analysis:');
for (let corner = 0; corner < 4; corner++) {
  const ao1 = aoCalculator.calculateVertexAO(voxel1.chunk, voxel1.x, voxel1.y, voxel1.z, 'top', corner);
  const ao2 = aoCalculator.calculateVertexAO(voxel2.chunk, voxel2.x, voxel2.y, voxel2.z, 'top', corner);
  
  console.log(`Corner ${corner}: Voxel1=${ao1.toFixed(3)}, Voxel2=${ao2.toFixed(3)}, diff=${Math.abs(ao1-ao2).toFixed(3)}`);
  
  // Analyze the neighbors for each corner
  const neighbors1 = aoCalculator.getVertexNeighbors(voxel1.x, voxel1.y, voxel1.z, 'top', corner);
  const neighbors2 = aoCalculator.getVertexNeighbors(voxel2.x, voxel2.y, voxel2.z, 'top', corner);
  
  console.log(`  Voxel1 neighbors for corner ${corner}:`);
  let solidCount1 = 0;
  for (let i = 0; i < neighbors1.length; i++) {
    const n = neighbors1[i];
    const solid = aoCalculator.isVoxelSolid(voxel1.chunk, n.x, n.y, n.z);
    if (solid) solidCount1++;
    
    // Show world coordinates for cross-chunk lookups
    const worldX = voxel1.x + n.x - voxel1.x;
    const worldY = n.y;
    const worldZ = voxel1.z + n.z - voxel1.z;
    const actualWorldX = 31 + (n.x - 31);
    const actualWorldZ = 15 + (n.z - 15);
    
    console.log(`    ${i}: local(${n.x}, ${n.y}, ${n.z}) = world(${actualWorldX}, ${worldY}, ${actualWorldZ}) = ${solid ? 'SOLID' : 'AIR'}`);
  }
  
  console.log(`  Voxel2 neighbors for corner ${corner}:`);
  let solidCount2 = 0;
  for (let i = 0; i < neighbors2.length; i++) {
    const n = neighbors2[i];
    const solid = aoCalculator.isVoxelSolid(voxel2.chunk, n.x, n.y, n.z);
    if (solid) solidCount2++;
    
    // Show world coordinates for cross-chunk lookups
    const actualWorldX = 32 + (n.x - 0);
    const actualWorldZ = 15 + (n.z - 15);
    
    console.log(`    ${i}: local(${n.x}, ${n.y}, ${n.z}) = world(${actualWorldX}, ${n.y}, ${actualWorldZ}) = ${solid ? 'SOLID' : 'AIR'}`);
  }
  
  console.log(`  Solid counts: Voxel1=${solidCount1}, Voxel2=${solidCount2}`);
  console.log();
}