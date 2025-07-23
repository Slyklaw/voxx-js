import { describe, it, expect, beforeEach } from 'vitest';
import { Chunk } from '../chunk.js';
import { AmbientOcclusionCalculator } from '../ambientOcclusionCalculator.js';

describe('Neighbor Debug Test', () => {
  let world;
  let chunks;
  let aoCalculator;

  beforeEach(() => {
    // Create a world with detailed logging
    world = {
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
        // Calculate which chunk this world coordinate belongs to
        const chunkX = Math.floor(worldX / 32);
        const chunkZ = Math.floor(worldZ / 32);
        
        // Get local coordinates within the chunk
        const localX = worldX - (chunkX * 32);
        const localZ = worldZ - (chunkZ * 32);
        
        console.log(`World lookup: (${worldX}, ${worldY}, ${worldZ}) -> Chunk(${chunkX}, ${chunkZ}) Local(${localX}, ${worldY}, ${localZ})`);
        
        // Get the chunk
        const chunk = this.getChunk(chunkX, chunkZ);
        if (!chunk) {
          console.log(`  -> Chunk not found, returning AIR`);
          return 0; // Air if chunk doesn't exist
        }
        
        // Return the voxel value
        const value = chunk.getVoxelSafe(localX, worldY, localZ);
        console.log(`  -> Value: ${value}`);
        return value;
      }
    };

    // Create chunks
    chunks = {};
    for (let cx = -1; cx <= 1; cx++) {
      for (let cz = -1; cz <= 1; cz++) {
        const chunk = new Chunk(cx, cz, world);
        chunks[`${cx},${cz}`] = chunk;
        world.setChunk(cx, cz, chunk);
        
        // Fill with solid terrain up to y=100
        for (let x = 0; x < 32; x++) {
          for (let z = 0; z < 32; z++) {
            for (let y = 0; y <= 100; y++) {
              chunk.setVoxel(x, y, z, 1);
            }
          }
        }
      }
    }
    
    aoCalculator = new AmbientOcclusionCalculator();
  });

  it('should debug neighbor calculations for boundary voxels', () => {
    console.log('\n=== Debugging Neighbor Calculations ===');
    
    const centerChunk = chunks['0,0'];
    const northChunk = chunks['0,-1'];
    
    // Create a specific pattern
    centerChunk.setVoxel(15, 51, 0, 0);  // Air at north boundary of center chunk
    northChunk.setVoxel(15, 51, 31, 0);  // Air at south boundary of north chunk
    
    console.log('\n--- Center Chunk Analysis ---');
    console.log('Position: (15, 50, 0) in chunk (0, 0)');
    console.log('Face: top, Corner: 0');
    
    // Get neighbors for center chunk
    const centerNeighbors = aoCalculator.getVertexNeighbors(15, 50, 0, 'top', 0);
    console.log('Neighbors (local coordinates):');
    centerNeighbors.forEach((neighbor, i) => {
      console.log(`  ${i}: (${neighbor.x}, ${neighbor.y}, ${neighbor.z})`);
    });
    
    console.log('Checking each neighbor:');
    centerNeighbors.forEach((neighbor, i) => {
      const isSolid = aoCalculator.isVoxelSolid(centerChunk, neighbor.x, neighbor.y, neighbor.z);
      console.log(`  ${i}: (${neighbor.x}, ${neighbor.y}, ${neighbor.z}) = ${isSolid ? 'SOLID' : 'AIR'}`);
    });
    
    console.log('\n--- North Chunk Analysis ---');
    console.log('Position: (15, 50, 31) in chunk (0, -1)');
    console.log('Face: top, Corner: 0');
    
    // Get neighbors for north chunk
    const northNeighbors = aoCalculator.getVertexNeighbors(15, 50, 31, 'top', 0);
    console.log('Neighbors (local coordinates):');
    northNeighbors.forEach((neighbor, i) => {
      console.log(`  ${i}: (${neighbor.x}, ${neighbor.y}, ${neighbor.z})`);
    });
    
    console.log('Checking each neighbor:');
    northNeighbors.forEach((neighbor, i) => {
      const isSolid = aoCalculator.isVoxelSolid(northChunk, neighbor.x, neighbor.y, neighbor.z);
      console.log(`  ${i}: (${neighbor.x}, ${neighbor.y}, ${neighbor.z}) = ${isSolid ? 'SOLID' : 'AIR'}`);
    });
    
    console.log('\n--- World Coordinate Analysis ---');
    console.log('These two positions should be looking at the same world space:');
    
    // Convert center chunk neighbors to world coordinates
    console.log('Center chunk neighbors in world coordinates:');
    centerNeighbors.forEach((neighbor, i) => {
      const worldX = centerChunk.chunkX * 32 + neighbor.x;
      const worldZ = centerChunk.chunkZ * 32 + neighbor.z;
      console.log(`  ${i}: World(${worldX}, ${neighbor.y}, ${worldZ})`);
    });
    
    // Convert north chunk neighbors to world coordinates
    console.log('North chunk neighbors in world coordinates:');
    northNeighbors.forEach((neighbor, i) => {
      const worldX = northChunk.chunkX * 32 + neighbor.x;
      const worldZ = northChunk.chunkZ * 32 + neighbor.z;
      console.log(`  ${i}: World(${worldX}, ${neighbor.y}, ${worldZ})`);
    });
    
    // Calculate AO values
    const centerAO = aoCalculator.calculateVertexAO(centerChunk, 15, 50, 0, 'top', 0);
    const northAO = aoCalculator.calculateVertexAO(northChunk, 15, 50, 31, 'top', 0);
    
    console.log(`\nAO Values:`);
    console.log(`Center: ${centerAO}`);
    console.log(`North: ${northAO}`);
    console.log(`Difference: ${Math.abs(centerAO - northAO)}`);
  });

  it('should test the specific neighbor pattern that causes issues', () => {
    console.log('\n=== Testing Specific Problematic Pattern ===');
    
    const centerChunk = chunks['0,0'];
    const northChunk = chunks['0,-1'];
    
    // Let's test the exact pattern from our earlier failing test
    // From the earlier test, we saw:
    // Center chunk neighbors for top face corner 0 at (15, 50, 0):
    //   0: (14, 51, 0) = SOLID
    //   1: (15, 51, -1) = AIR  <- This goes to north chunk
    //   2: (14, 51, -1) = AIR  <- This goes to north chunk
    
    // North chunk neighbors for top face corner 0 at (15, 50, 31):
    //   0: (14, 51, 31) = AIR
    //   1: (15, 51, 30) = SOLID  <- This stays in north chunk
    //   2: (14, 51, 30) = SOLID  <- This stays in north chunk
    
    // Set up the exact pattern
    centerChunk.setVoxel(15, 51, 0, 0);  // Air at boundary
    northChunk.setVoxel(15, 51, 31, 0);  // Air at boundary (same world position)
    northChunk.setVoxel(14, 51, 31, 0);  // Air at boundary
    
    console.log('\n--- Detailed Analysis ---');
    
    // Test center chunk
    console.log('Center chunk (0,0) at local (15, 50, 0):');
    const centerNeighbors = aoCalculator.getVertexNeighbors(15, 50, 0, 'top', 0);
    let centerSolidCount = 0;
    centerNeighbors.forEach((neighbor, i) => {
      const isSolid = aoCalculator.isVoxelSolid(centerChunk, neighbor.x, neighbor.y, neighbor.z);
      const worldX = centerChunk.chunkX * 32 + neighbor.x;
      const worldZ = centerChunk.chunkZ * 32 + neighbor.z;
      console.log(`  ${i}: Local(${neighbor.x}, ${neighbor.y}, ${neighbor.z}) World(${worldX}, ${neighbor.y}, ${worldZ}) = ${isSolid ? 'SOLID' : 'AIR'}`);
      if (isSolid) centerSolidCount++;
    });
    console.log(`  Solid count: ${centerSolidCount}, AO: ${[1.0, 0.75, 0.5, 0.25][centerSolidCount]}`);
    
    // Test north chunk
    console.log('\nNorth chunk (0,-1) at local (15, 50, 31):');
    const northNeighbors = aoCalculator.getVertexNeighbors(15, 50, 31, 'top', 0);
    let northSolidCount = 0;
    northNeighbors.forEach((neighbor, i) => {
      const isSolid = aoCalculator.isVoxelSolid(northChunk, neighbor.x, neighbor.y, neighbor.z);
      const worldX = northChunk.chunkX * 32 + neighbor.x;
      const worldZ = northChunk.chunkZ * 32 + neighbor.z;
      console.log(`  ${i}: Local(${neighbor.x}, ${neighbor.y}, ${neighbor.z}) World(${worldX}, ${neighbor.y}, ${worldZ}) = ${isSolid ? 'SOLID' : 'AIR'}`);
      if (isSolid) northSolidCount++;
    });
    console.log(`  Solid count: ${northSolidCount}, AO: ${[1.0, 0.75, 0.5, 0.25][northSolidCount]}`);
    
    console.log('\n--- Problem Analysis ---');
    console.log('The issue is that these two positions are looking at different world coordinates!');
    console.log('They should be looking at the SAME world space but from different chunk perspectives.');
    
    // The real issue: these are NOT the same world position!
    // Center chunk (0,0) at local (15, 50, 0) = World (15, 50, 0)
    // North chunk (0,-1) at local (15, 50, 31) = World (15, 50, -1)
    // These are different world positions!
    
    console.log('\nActual world positions:');
    console.log(`Center chunk position: World(${0 * 32 + 15}, 50, ${0 * 32 + 0}) = World(15, 50, 0)`);
    console.log(`North chunk position: World(${0 * 32 + 15}, 50, ${-1 * 32 + 31}) = World(15, 50, -1)`);
    console.log('These are DIFFERENT world positions! That\'s why AO is different.');
  });
});