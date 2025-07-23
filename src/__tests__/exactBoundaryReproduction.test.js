import { describe, it, expect, beforeEach } from 'vitest';
import { Chunk } from '../chunk.js';
import { AmbientOcclusionCalculator } from '../ambientOcclusionCalculator.js';

describe('Exact Boundary Issue Reproduction', () => {
  let world;
  let chunks;
  let aoCalculator;

  beforeEach(() => {
    // Recreate the exact same setup as the failing test
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

    // Create a 3x3 grid of chunks exactly like the failing test
    chunks = {};
    for (let cx = -1; cx <= 1; cx++) {
      for (let cz = -1; cz <= 1; cz++) {
        const chunk = new Chunk(cx, cz, world);
        chunks[`${cx},${cz}`] = chunk;
        world.setChunk(cx, cz, chunk);
        
        // Fill with the exact same terrain pattern
        for (let x = 0; x < 32; x++) {
          for (let z = 0; z < 32; z++) {
            for (let y = 0; y <= 100; y++) {
              chunk.setVoxel(x, y, z, 1); // Solid terrain
            }
          }
        }
      }
    }
    
    // Apply the exact same modifications as the failing test
    chunks['0,0'].setVoxel(31, 51, 15, 0); // World (31, 51, 15) = AIR
    chunks['1,0'].setVoxel(0, 51, 15, 0);  // World (32, 51, 15) = AIR
    chunks['-1,0'].setVoxel(31, 51, 15, 0); // World (-1, 51, 15) = AIR
    chunks['0,0'].setVoxel(0, 51, 15, 0);   // World (0, 51, 15) = AIR
    chunks['0,-1'].setVoxel(15, 51, 31, 0); // World (15, 51, -1) = AIR
    chunks['0,0'].setVoxel(15, 51, 0, 0);   // World (15, 51, 0) = AIR
    chunks['0,1'].setVoxel(15, 51, 0, 0);   // World (15, 51, 32) = AIR
    chunks['0,0'].setVoxel(15, 51, 31, 0);  // World (15, 51, 31) = AIR
    
    aoCalculator = new AmbientOcclusionCalculator();
  });

  it('should reproduce the exact AO differences from the failing test', () => {
    console.log('\n=== Reproducing Exact Boundary Issue ===');
    
    // Test the exact same voxel pairs that showed differences
    const testPairs = [
      {
        name: 'East Boundary Adjacent',
        voxel1: { chunk: chunks['0,0'], local: [31, 50, 15] },
        voxel2: { chunk: chunks['1,0'], local: [0, 50, 15] }
      }
    ];
    
    for (const pair of testPairs) {
      console.log(`\nTesting ${pair.name}:`);
      
      // Test all face/corner combinations that showed differences
      const testCases = [
        { face: 'top', corner: 0 },
        { face: 'top', corner: 1 },
        { face: 'top', corner: 2 },
        { face: 'top', corner: 3 }
      ];
      
      for (const testCase of testCases) {
        const ao1 = aoCalculator.calculateVertexAO(
          pair.voxel1.chunk, pair.voxel1.local[0], pair.voxel1.local[1], pair.voxel1.local[2], 
          testCase.face, testCase.corner
        );
        
        const ao2 = aoCalculator.calculateVertexAO(
          pair.voxel2.chunk, pair.voxel2.local[0], pair.voxel2.local[1], pair.voxel2.local[2], 
          testCase.face, testCase.corner
        );
        
        const difference = Math.abs(ao1 - ao2);
        
        console.log(`  ${testCase.face} face, corner ${testCase.corner}: AO1=${ao1.toFixed(3)}, AO2=${ao2.toFixed(3)}, diff=${difference.toFixed(6)}`);
        
        if (difference > 0.1) {
          console.log(`    ⚠️ SIGNIFICANT DIFFERENCE DETECTED!`);
          
          // Debug the neighbors for this case
          const neighbors1 = aoCalculator.getVertexNeighbors(
            pair.voxel1.local[0], pair.voxel1.local[1], pair.voxel1.local[2], 
            testCase.face, testCase.corner
          );
          const neighbors2 = aoCalculator.getVertexNeighbors(
            pair.voxel2.local[0], pair.voxel2.local[1], pair.voxel2.local[2], 
            testCase.face, testCase.corner
          );
          
          console.log(`    Voxel1 neighbors:`);
          let solidCount1 = 0;
          for (let i = 0; i < neighbors1.length; i++) {
            const n = neighbors1[i];
            const isSolid = aoCalculator.isVoxelSolid(pair.voxel1.chunk, n.x, n.y, n.z);
            const worldCoord = [
              pair.voxel1.chunk.chunkX * 32 + n.x,
              n.y,
              pair.voxel1.chunk.chunkZ * 32 + n.z
            ];
            console.log(`      ${i}: local(${n.x}, ${n.y}, ${n.z}) = world(${worldCoord.join(', ')}) = ${isSolid ? 'SOLID' : 'AIR'}`);
            if (isSolid) solidCount1++;
          }
          
          console.log(`    Voxel2 neighbors:`);
          let solidCount2 = 0;
          for (let i = 0; i < neighbors2.length; i++) {
            const n = neighbors2[i];
            const isSolid = aoCalculator.isVoxelSolid(pair.voxel2.chunk, n.x, n.y, n.z);
            const worldCoord = [
              pair.voxel2.chunk.chunkX * 32 + n.x,
              n.y,
              pair.voxel2.chunk.chunkZ * 32 + n.z
            ];
            console.log(`      ${i}: local(${n.x}, ${n.y}, ${n.z}) = world(${worldCoord.join(', ')}) = ${isSolid ? 'SOLID' : 'AIR'}`);
            if (isSolid) solidCount2++;
          }
          
          console.log(`    Solid counts: Voxel1=${solidCount1}, Voxel2=${solidCount2}`);
        }
      }
    }
  });
});