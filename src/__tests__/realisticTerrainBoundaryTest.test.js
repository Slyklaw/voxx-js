import { describe, it, expect, beforeEach } from 'vitest';
import { Chunk } from '../chunk.js';
import { AmbientOcclusionCalculator } from '../ambientOcclusionCalculator.js';

describe('Realistic Terrain Boundary Test', () => {
  let world;
  let chunks;
  let aoCalculator;

  beforeEach(() => {
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
        const chunkX = Math.floor(worldX / 32);
        const chunkZ = Math.floor(worldZ / 32);
        const localX = worldX - (chunkX * 32);
        const localZ = worldZ - (chunkZ * 32);
        const chunk = this.getChunk(chunkX, chunkZ);
        if (!chunk) return 0;
        return chunk.getVoxelSafe(localX, worldY, localZ);
      }
    };

    chunks = {};
    aoCalculator = new AmbientOcclusionCalculator();
  });

  it('should test AO consistency with realistic terrain patterns', () => {
    console.log('\n=== Testing Realistic Terrain Boundary AO ===');
    
    // Create chunks with realistic terrain patterns
    for (let cx = -1; cx <= 1; cx++) {
      for (let cz = -1; cz <= 1; cz++) {
        const chunk = new Chunk(cx, cz, world);
        chunks[`${cx},${cz}`] = chunk;
        world.setChunk(cx, cz, chunk);
        
        // Generate realistic terrain with height variation
        for (let x = 0; x < 32; x++) {
          for (let z = 0; z < 32; z++) {
            const worldX = cx * 32 + x;
            const worldZ = cz * 32 + z;
            
            // Simple height function that varies across chunk boundaries
            const height = Math.floor(50 + 10 * Math.sin(worldX * 0.1) * Math.cos(worldZ * 0.1));
            
            for (let y = 0; y <= height; y++) {
              chunk.setVoxel(x, y, z, 1);
            }
          }
        }
      }
    }
    
    console.log('Generated realistic terrain with height variation');
    
    // Test AO consistency at various boundary points
    const boundaryTests = [
      {
        name: 'East-West Boundary (varied height)',
        voxel1: { chunk: chunks['0,0'], local: [31, 55, 15] },
        voxel2: { chunk: chunks['1,0'], local: [0, 55, 15] }
      },
      {
        name: 'North-South Boundary (varied height)', 
        voxel1: { chunk: chunks['0,0'], local: [15, 55, 31] },
        voxel2: { chunk: chunks['0,1'], local: [15, 55, 0] }
      }
    ];
    
    for (const test of boundaryTests) {
      console.log(`\nTesting ${test.name}:`);
      
      // Check if both voxels exist (not air)
      const voxel1Value = test.voxel1.chunk.getVoxelSafe(test.voxel1.local[0], test.voxel1.local[1], test.voxel1.local[2]);
      const voxel2Value = test.voxel2.chunk.getVoxelSafe(test.voxel2.local[0], test.voxel2.local[1], test.voxel2.local[2]);
      
      if (voxel1Value === 0 || voxel2Value === 0) {
        console.log(`  Skipping - one or both voxels are air (${voxel1Value}, ${voxel2Value})`);
        continue;
      }
      
      // Test top face AO (most visible)
      console.log('  Top face AO comparison:');
      let maxDifference = 0;
      
      for (let corner = 0; corner < 4; corner++) {
        const ao1 = aoCalculator.calculateVertexAO(
          test.voxel1.chunk, test.voxel1.local[0], test.voxel1.local[1], test.voxel1.local[2], 
          'top', corner
        );
        
        const ao2 = aoCalculator.calculateVertexAO(
          test.voxel2.chunk, test.voxel2.local[0], test.voxel2.local[1], test.voxel2.local[2], 
          'top', corner
        );
        
        const difference = Math.abs(ao1 - ao2);
        maxDifference = Math.max(maxDifference, difference);
        
        console.log(`    Corner ${corner}: AO1=${ao1.toFixed(3)}, AO2=${ao2.toFixed(3)}, diff=${difference.toFixed(6)}`);
      }
      
      console.log(`  Maximum difference: ${maxDifference.toFixed(6)}`);
      
      // In realistic terrain, some difference is expected, but it shouldn't be extreme
      if (maxDifference > 0.5) {
        console.log(`  ⚠️ Large AO difference detected - this could cause visible seams`);
      }
    }
  });

  it('should test the specific case that might cause visible seams', () => {
    console.log('\n=== Testing Specific Seam-Causing Pattern ===');
    
    // Create a specific pattern that might cause visible seams
    // This simulates a common case: flat terrain with some elevated blocks
    
    for (let cx = -1; cx <= 1; cx++) {
      for (let cz = -1; cz <= 1; cz++) {
        const chunk = new Chunk(cx, cz, world);
        chunks[`${cx},${cz}`] = chunk;
        world.setChunk(cx, cz, chunk);
        
        // Create mostly flat terrain at y=50
        for (let x = 0; x < 32; x++) {
          for (let z = 0; z < 32; z++) {
            for (let y = 0; y <= 50; y++) {
              chunk.setVoxel(x, y, z, 1);
            }
          }
        }
      }
    }
    
    // Add some elevated blocks that cross chunk boundaries
    // This creates occlusion patterns that might be inconsistent
    chunks['0,0'].setVoxel(30, 51, 15, 1); // World (30, 51, 15)
    chunks['0,0'].setVoxel(31, 51, 15, 1); // World (31, 51, 15)
    chunks['1,0'].setVoxel(0, 51, 15, 1);  // World (32, 51, 15)
    chunks['1,0'].setVoxel(1, 51, 15, 1);  // World (33, 51, 15)
    
    console.log('Created elevated blocks crossing chunk boundary:');
    console.log('  World (30, 51, 15) = SOLID');
    console.log('  World (31, 51, 15) = SOLID');
    console.log('  World (32, 51, 15) = SOLID');
    console.log('  World (33, 51, 15) = SOLID');
    
    // Test the boundary voxels below these elevated blocks
    const voxel1 = { chunk: chunks['0,0'], local: [31, 50, 15] }; // World (31, 50, 15)
    const voxel2 = { chunk: chunks['1,0'], local: [0, 50, 15] };  // World (32, 50, 15)
    
    console.log('\nTesting AO for voxels below elevated blocks:');
    console.log('Voxel1: chunk(0,0) local(31,50,15) = world(31,50,15)');
    console.log('Voxel2: chunk(1,0) local(0,50,15) = world(32,50,15)');
    
    // Test top face (should be affected by elevated blocks above)
    console.log('\nTop face AO (affected by elevated blocks):');
    for (let corner = 0; corner < 4; corner++) {
      const ao1 = aoCalculator.calculateVertexAO(
        voxel1.chunk, voxel1.local[0], voxel1.local[1], voxel1.local[2], 
        'top', corner
      );
      
      const ao2 = aoCalculator.calculateVertexAO(
        voxel2.chunk, voxel2.local[0], voxel2.local[1], voxel2.local[2], 
        'top', corner
      );
      
      const difference = Math.abs(ao1 - ao2);
      
      console.log(`  Corner ${corner}: AO1=${ao1.toFixed(3)}, AO2=${ao2.toFixed(3)}, diff=${difference.toFixed(6)}`);
      
      if (difference > 0.1) {
        console.log(`    ⚠️ Significant difference - analyzing neighbors...`);
        
        const neighbors1 = aoCalculator.getVertexNeighbors(
          voxel1.local[0], voxel1.local[1], voxel1.local[2], 'top', corner
        );
        const neighbors2 = aoCalculator.getVertexNeighbors(
          voxel2.local[0], voxel2.local[1], voxel2.local[2], 'top', corner
        );
        
        console.log(`    Voxel1 neighbors (world coords):`);
        let solidCount1 = 0;
        for (let i = 0; i < neighbors1.length; i++) {
          const n = neighbors1[i];
          const worldCoord = [voxel1.chunk.chunkX * 32 + n.x, n.y, voxel1.chunk.chunkZ * 32 + n.z];
          const isSolid = aoCalculator.isVoxelSolid(voxel1.chunk, n.x, n.y, n.z);
          console.log(`      ${i}: world(${worldCoord.join(', ')}) = ${isSolid ? 'SOLID' : 'AIR'}`);
          if (isSolid) solidCount1++;
        }
        
        console.log(`    Voxel2 neighbors (world coords):`);
        let solidCount2 = 0;
        for (let i = 0; i < neighbors2.length; i++) {
          const n = neighbors2[i];
          const worldCoord = [voxel2.chunk.chunkX * 32 + n.x, n.y, voxel2.chunk.chunkZ * 32 + n.z];
          const isSolid = aoCalculator.isVoxelSolid(voxel2.chunk, n.x, n.y, n.z);
          console.log(`      ${i}: world(${worldCoord.join(', ')}) = ${isSolid ? 'SOLID' : 'AIR'}`);
          if (isSolid) solidCount2++;
        }
        
        console.log(`    Solid counts: Voxel1=${solidCount1}, Voxel2=${solidCount2}`);
        
        // The issue might be that the neighbor patterns are legitimately different
        // but this creates a visible seam. The solution might be to use a different
        // AO algorithm or to smooth AO values across boundaries.
      }
    }
  });
});