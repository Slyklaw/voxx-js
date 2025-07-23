import { describe, it, expect, beforeEach } from 'vitest';
import { Chunk } from '../chunk.js';
import { AmbientOcclusionCalculator } from '../ambientOcclusionCalculator.js';

describe('AO Symmetry Test - Boundary Issue Debug', () => {
  let world;
  let chunk1, chunk2;
  let aoCalculator;

  beforeEach(() => {
    // Create a simple world
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

    // Create two adjacent chunks
    chunk1 = new Chunk(0, 0, world);  // World X: 0-31
    chunk2 = new Chunk(1, 0, world);  // World X: 32-63
    
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
    
    aoCalculator = new AmbientOcclusionCalculator();
  });

  it('should debug the exact neighbor patterns causing AO differences', () => {
    console.log('\n=== AO Symmetry Debug Test ===');
    
    // Test the exact case from the failing test: top face AO differences
    // Voxel 1: Chunk(0,0) at local (31, 50, 15) = world (31, 50, 15)
    // Voxel 2: Chunk(1,0) at local (0, 50, 15) = world (32, 50, 15)
    // These are adjacent voxels, so their AO should be similar
    
    const voxel1 = { chunk: chunk1, local: [31, 50, 15], world: [31, 50, 15] };
    const voxel2 = { chunk: chunk2, local: [0, 50, 15], world: [32, 50, 15] };
    
    // Test the corner that showed differences in the previous test
    console.log('Testing top face, corner 1 (top-right when viewed from above):');
    
    // Get neighbors for both voxels
    const neighbors1 = aoCalculator.getVertexNeighbors(voxel1.local[0], voxel1.local[1], voxel1.local[2], 'top', 1);
    const neighbors2 = aoCalculator.getVertexNeighbors(voxel2.local[0], voxel2.local[1], voxel2.local[2], 'top', 1);
    
    console.log('\nVoxel 1 (chunk1, local 31,50,15) neighbors for top face corner 1:');
    let solidCount1 = 0;
    for (let i = 0; i < neighbors1.length; i++) {
      const n = neighbors1[i];
      const isSolid = aoCalculator.isVoxelSolid(voxel1.chunk, n.x, n.y, n.z);
      const worldCoord = [
        voxel1.chunk.chunkX * 32 + n.x,
        n.y,
        voxel1.chunk.chunkZ * 32 + n.z
      ];
      console.log(`  Neighbor ${i}: local(${n.x}, ${n.y}, ${n.z}) = world(${worldCoord.join(', ')}) = ${isSolid ? 'SOLID' : 'AIR'}`);
      if (isSolid) solidCount1++;
    }
    
    console.log('\nVoxel 2 (chunk2, local 0,50,15) neighbors for top face corner 1:');
    let solidCount2 = 0;
    for (let i = 0; i < neighbors2.length; i++) {
      const n = neighbors2[i];
      const isSolid = aoCalculator.isVoxelSolid(voxel2.chunk, n.x, n.y, n.z);
      const worldCoord = [
        voxel2.chunk.chunkX * 32 + n.x,
        n.y,
        voxel2.chunk.chunkZ * 32 + n.z
      ];
      console.log(`  Neighbor ${i}: local(${n.x}, ${n.y}, ${n.z}) = world(${worldCoord.join(', ')}) = ${isSolid ? 'SOLID' : 'AIR'}`);
      if (isSolid) solidCount2++;
    }
    
    console.log(`\nSolid neighbor counts: Voxel1=${solidCount1}, Voxel2=${solidCount2}`);
    
    const ao1 = aoCalculator.calculateVertexAO(voxel1.chunk, voxel1.local[0], voxel1.local[1], voxel1.local[2], 'top', 1);
    const ao2 = aoCalculator.calculateVertexAO(voxel2.chunk, voxel2.local[0], voxel2.local[1], voxel2.local[2], 'top', 1);
    
    console.log(`AO values: Voxel1=${ao1}, Voxel2=${ao2}, Difference=${Math.abs(ao1 - ao2)}`);
    
    // The issue is likely that the neighbors are not symmetric in world coordinates
    // Let's check if the world coordinates of the neighbors are actually equivalent
    console.log('\n=== World Coordinate Analysis ===');
    
    const worldNeighbors1 = neighbors1.map(n => [
      voxel1.chunk.chunkX * 32 + n.x,
      n.y,
      voxel1.chunk.chunkZ * 32 + n.z
    ]);
    
    const worldNeighbors2 = neighbors2.map(n => [
      voxel2.chunk.chunkX * 32 + n.x,
      n.y,
      voxel2.chunk.chunkZ * 32 + n.z
    ]);
    
    console.log('Voxel1 neighbors in world coordinates:', worldNeighbors1);
    console.log('Voxel2 neighbors in world coordinates:', worldNeighbors2);
    
    // For adjacent voxels, some neighbors should be the same in world coordinates
    // but they're being accessed from different chunks, which might cause issues
  });

  it('should test the specific neighbor pattern that causes inconsistency', () => {
    console.log('\n=== Testing Specific Neighbor Pattern ===');
    
    // Based on the AO algorithm, for top face corner 0, the neighbors are:
    // - west-above: (-1, +1, 0) relative to voxel
    // - north-above: (0, +1, -1) relative to voxel  
    // - northwest-above: (-1, +1, -1) relative to voxel
    
    // For voxel at chunk1(31, 50, 15) = world(31, 50, 15):
    // - west-above: world(30, 51, 15) - in chunk1
    // - north-above: world(31, 51, 14) - in chunk1
    // - northwest-above: world(30, 51, 14) - in chunk1
    
    // For voxel at chunk2(0, 50, 15) = world(32, 50, 15):
    // - west-above: world(31, 51, 15) - in chunk1! (cross-chunk)
    // - north-above: world(32, 51, 14) - in chunk2
    // - northwest-above: world(31, 51, 14) - in chunk1! (cross-chunk)
    
    console.log('Testing cross-chunk neighbor access...');
    
    // Test if cross-chunk access is working correctly
    const testCoords = [
      { world: [31, 51, 15], desc: 'Cross-chunk access from chunk2' },
      { world: [31, 51, 14], desc: 'Cross-chunk access from chunk2' },
      { world: [32, 51, 14], desc: 'Same-chunk access in chunk2' }
    ];
    
    for (const test of testCoords) {
      const [worldX, worldY, worldZ] = test.world;
      
      // Access via world.getVoxel (should be correct)
      const worldValue = world.getVoxel(worldX, worldY, worldZ);
      
      // Access via chunk2's isVoxelSolid (might have issues)
      const localX = worldX - (chunk2.chunkX * 32);
      const localZ = worldZ - (chunk2.chunkZ * 32);
      const chunkValue = aoCalculator.isVoxelSolid(chunk2, localX, worldY, localZ);
      
      console.log(`${test.desc}:`);
      console.log(`  World(${worldX}, ${worldY}, ${worldZ}): world.getVoxel=${worldValue}, chunk.isVoxelSolid=${chunkValue ? 1 : 0}`);
      
      if ((worldValue > 0) !== chunkValue) {
        console.log(`  ⚠️ MISMATCH! World access and chunk access give different results`);
      }
    }
  });
});