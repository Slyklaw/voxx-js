import { describe, it, expect, beforeEach } from 'vitest';
import { Chunk } from '../chunk.js';
import { AmbientOcclusionCalculator } from '../ambientOcclusionCalculator.js';

describe('Symmetric Terrain AO Test', () => {
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
    for (let cx = -1; cx <= 1; cx++) {
      for (let cz = -1; cz <= 1; cz++) {
        const chunk = new Chunk(cx, cz, world);
        chunks[`${cx},${cz}`] = chunk;
        world.setChunk(cx, cz, chunk);
        
        // Fill with solid terrain
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

  it('should have similar AO values for adjacent voxels in perfectly uniform terrain', () => {
    console.log('\n=== Testing Uniform Terrain AO ===');
    
    // Test adjacent voxels in perfectly uniform terrain (no modifications)
    const voxel1 = { chunk: chunks['0,0'], local: [31, 50, 15], world: [31, 50, 15] };
    const voxel2 = { chunk: chunks['1,0'], local: [0, 50, 15], world: [32, 50, 15] };
    
    console.log('Testing adjacent voxels in uniform terrain:');
    console.log(`Voxel1: chunk(0,0) local(31,50,15) = world(31,50,15)`);
    console.log(`Voxel2: chunk(1,0) local(0,50,15) = world(32,50,15)`);
    
    const faces = ['top', 'north', 'south', 'east', 'west'];
    let maxDifference = 0;
    
    for (const face of faces) {
      console.log(`\n${face.toUpperCase()} face:`);
      for (let corner = 0; corner < 4; corner++) {
        const ao1 = aoCalculator.calculateVertexAO(
          voxel1.chunk, voxel1.local[0], voxel1.local[1], voxel1.local[2], 
          face, corner
        );
        
        const ao2 = aoCalculator.calculateVertexAO(
          voxel2.chunk, voxel2.local[0], voxel2.local[1], voxel2.local[2], 
          face, corner
        );
        
        const difference = Math.abs(ao1 - ao2);
        maxDifference = Math.max(maxDifference, difference);
        
        console.log(`  Corner ${corner}: AO1=${ao1.toFixed(3)}, AO2=${ao2.toFixed(3)}, diff=${difference.toFixed(6)}`);
      }
    }
    
    console.log(`\nMaximum AO difference: ${maxDifference.toFixed(6)}`);
    
    // In perfectly uniform terrain, adjacent voxels should have identical AO
    // because they're surrounded by the same pattern of solid voxels
    expect(maxDifference).toBeLessThan(0.01);
  });

  it('should create a symmetric pattern and test AO consistency', () => {
    console.log('\n=== Testing Symmetric Pattern AO ===');
    
    // Create a symmetric pattern around the boundary
    // Remove voxels symmetrically on both sides of the boundary
    
    // Clear some voxels above the boundary voxels
    chunks['0,0'].setVoxel(31, 51, 15, 0); // World (31, 51, 15) = AIR
    chunks['1,0'].setVoxel(0, 51, 15, 0);  // World (32, 51, 15) = AIR
    
    // Clear some voxels to create symmetric occlusion patterns
    chunks['0,0'].setVoxel(30, 51, 15, 0); // World (30, 51, 15) = AIR
    chunks['1,0'].setVoxel(1, 51, 15, 0);  // World (33, 51, 15) = AIR
    
    // Clear north neighbors symmetrically
    chunks['0,0'].setVoxel(31, 51, 14, 0); // World (31, 51, 14) = AIR
    chunks['1,0'].setVoxel(0, 51, 14, 0);  // World (32, 51, 14) = AIR
    
    console.log('Created symmetric pattern:');
    console.log('  World (30, 51, 15) = AIR');
    console.log('  World (31, 51, 15) = AIR');
    console.log('  World (32, 51, 15) = AIR');
    console.log('  World (33, 51, 15) = AIR');
    console.log('  World (31, 51, 14) = AIR');
    console.log('  World (32, 51, 14) = AIR');
    
    // Test the boundary voxels
    const voxel1 = { chunk: chunks['0,0'], local: [31, 50, 15], world: [31, 50, 15] };
    const voxel2 = { chunk: chunks['1,0'], local: [0, 50, 15], world: [32, 50, 15] };
    
    console.log('\nTesting AO with symmetric pattern:');
    
    // Test top face which showed the biggest differences before
    console.log('\nTOP face analysis:');
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
        console.log(`    ⚠️ Large difference detected, analyzing neighbors...`);
        
        const neighbors1 = aoCalculator.getVertexNeighbors(
          voxel1.local[0], voxel1.local[1], voxel1.local[2], 'top', corner
        );
        const neighbors2 = aoCalculator.getVertexNeighbors(
          voxel2.local[0], voxel2.local[1], voxel2.local[2], 'top', corner
        );
        
        console.log(`    Voxel1 neighbors (world coords):`);
        for (let i = 0; i < neighbors1.length; i++) {
          const n = neighbors1[i];
          const worldCoord = [voxel1.chunk.chunkX * 32 + n.x, n.y, voxel1.chunk.chunkZ * 32 + n.z];
          const isSolid = aoCalculator.isVoxelSolid(voxel1.chunk, n.x, n.y, n.z);
          console.log(`      ${i}: world(${worldCoord.join(', ')}) = ${isSolid ? 'SOLID' : 'AIR'}`);
        }
        
        console.log(`    Voxel2 neighbors (world coords):`);
        for (let i = 0; i < neighbors2.length; i++) {
          const n = neighbors2[i];
          const worldCoord = [voxel2.chunk.chunkX * 32 + n.x, n.y, voxel2.chunk.chunkZ * 32 + n.z];
          const isSolid = aoCalculator.isVoxelSolid(voxel2.chunk, n.x, n.y, n.z);
          console.log(`      ${i}: world(${worldCoord.join(', ')}) = ${isSolid ? 'SOLID' : 'AIR'}`);
        }
      }
    }
  });
});