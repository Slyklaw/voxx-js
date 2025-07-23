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
    console.log(`World.getVoxel called with (${worldX}, ${worldY}, ${worldZ})`);
    const chunkX = Math.floor(worldX / 32);
    const chunkZ = Math.floor(worldZ / 32);
    const localX = worldX - (chunkX * 32);
    const localZ = worldZ - (chunkZ * 32);
    
    console.log(`  Calculated chunk: (${chunkX}, ${chunkZ}), local: (${localX}, ${worldY}, ${localZ})`);
    
    const chunk = this.getChunk(chunkX, chunkZ);
    if (!chunk) {
      console.log(`  Chunk not found, returning 0`);
      return 0;
    }
    
    const result = chunk.getVoxelSafe(localX, worldY, localZ);
    console.log(`  Chunk result: ${result}`);
    return result;
  }
};

// Create two adjacent chunks
const chunk1 = new Chunk(0, 0, world);
const chunk2 = new Chunk(1, 0, world);
world.setChunk(0, 0, chunk1);
world.setChunk(1, 0, chunk2);

// Fill with solid terrain up to y=100
for (let x = 0; x < 32; x++) {
  for (let z = 0; z < 32; z++) {
    for (let y = 0; y <= 100; y++) {
      chunk1.setVoxel(x, y, z, 1);
      chunk2.setVoxel(x, y, z, 1);
    }
  }
}

// Add a specific pattern for testing
chunk1.setVoxel(31, 101, 15, 1); // Solid at boundary
chunk2.setVoxel(0, 101, 15, 1);  // Solid at boundary

const aoCalculator = new AmbientOcclusionCalculator();

console.log('=== Testing Coordinate Transformation ===\n');

// Test cross-chunk lookups from chunk1
console.log('Testing cross-chunk lookup from chunk1:');
console.log('Chunk1 looking at local (32, 101, 15) should map to world (32, 101, 15)');
const result1 = aoCalculator.isVoxelSolid(chunk1, 32, 101, 15);
console.log(`Result: ${result1 ? 'SOLID' : 'AIR'}\n`);

// Test cross-chunk lookups from chunk2
console.log('Testing cross-chunk lookup from chunk2:');
console.log('Chunk2 looking at local (-1, 101, 15) should map to world (31, 101, 15)');
const result2 = aoCalculator.isVoxelSolid(chunk2, -1, 101, 15);
console.log(`Result: ${result2 ? 'SOLID' : 'AIR'}\n`);

// Test direct world access
console.log('Testing direct world access:');
console.log('Direct world access to (31, 101, 15):');
const worldResult1 = world.getVoxel(31, 101, 15);
console.log(`Result: ${worldResult1 ? 'SOLID' : 'AIR'}\n`);

console.log('Direct world access to (32, 101, 15):');
const worldResult2 = world.getVoxel(32, 101, 15);
console.log(`Result: ${worldResult2 ? 'SOLID' : 'AIR'}\n`);

// Verify consistency
console.log('=== Consistency Check ===');
console.log(`Chunk1 cross-chunk lookup (32,101,15): ${result1 ? 'SOLID' : 'AIR'}`);
console.log(`Direct world access (32,101,15): ${worldResult2 ? 'SOLID' : 'AIR'}`);
console.log(`Match: ${result1 === (worldResult2 > 0)}`);
console.log();
console.log(`Chunk2 cross-chunk lookup (31,101,15): ${result2 ? 'SOLID' : 'AIR'}`);
console.log(`Direct world access (31,101,15): ${worldResult1 ? 'SOLID' : 'AIR'}`);
console.log(`Match: ${result2 === (worldResult1 > 0)}`);