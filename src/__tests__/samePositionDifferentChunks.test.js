import { describe, it, expect, beforeEach } from 'vitest';
import { Chunk } from '../chunk.js';
import { AmbientOcclusionCalculator } from '../ambientOcclusionCalculator.js';

describe('Same Position Different Chunks Test', () => {
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

  it('should test if the real issue is shared vertices between chunks', () => {
    console.log('\n=== Testing Shared Vertex Issue ===');
    
    // The real issue might be that vertices at chunk boundaries are shared
    // but calculated independently by each chunk, leading to inconsistent AO
    
    // Consider a voxel at the boundary of chunk(0,0) at local position (31, 50, 15)
    // This voxel's east face will be at world position (32, 50, 15) 
    // But chunk(1,0) also has a voxel at local position (0, 50, 15) = world (32, 50, 15)
    // The west face of chunk(1,0)'s voxel is at the same world position!
    
    // Wait, that's not right. Let me think about this more carefully.
    // 
    // Chunk(0,0) voxel at local(31, 50, 15) = world(31, 50, 15)
    // Its east face is at world position (31.5, 50, 15) - between world X 31 and 32
    //
    // Chunk(1,0) voxel at local(0, 50, 15) = world(32, 50, 15)  
    // Its west face is at world position (31.5, 50, 15) - same position!
    //
    // These two faces are at the SAME world position but calculated by different chunks
    // This is the source of the inconsistency!
    
    console.log('The issue: Two faces at the same world position calculated by different chunks');
    console.log('Chunk(0,0) voxel(31,50,15) east face = world face at (31.5, 50, 15)');
    console.log('Chunk(1,0) voxel(0,50,15) west face = world face at (31.5, 50, 15)');
    console.log('These should have identical AO values but are calculated independently!');
    
    // Test this hypothesis
    const chunk00Voxel = { chunk: chunks['0,0'], local: [31, 50, 15] };
    const chunk10Voxel = { chunk: chunks['1,0'], local: [0, 50, 15] };
    
    console.log('\nTesting east face of chunk(0,0) vs west face of chunk(1,0):');
    
    for (let corner = 0; corner < 4; corner++) {
      const aoEast = aoCalculator.calculateVertexAO(
        chunk00Voxel.chunk, chunk00Voxel.local[0], chunk00Voxel.local[1], chunk00Voxel.local[2], 
        'east', corner
      );
      
      const aoWest = aoCalculator.calculateVertexAO(
        chunk10Voxel.chunk, chunk10Voxel.local[0], chunk10Voxel.local[1], chunk10Voxel.local[2], 
        'west', corner
      );
      
      const difference = Math.abs(aoEast - aoWest);
      
      console.log(`  Corner ${corner}: East=${aoEast.toFixed(3)}, West=${aoWest.toFixed(3)}, diff=${difference.toFixed(6)}`);
      
      if (difference > 0.01) {
        console.log(`    ⚠️ INCONSISTENCY! Same world face has different AO values!`);
        
        // Debug the neighbors
        const neighborsEast = aoCalculator.getVertexNeighbors(
          chunk00Voxel.local[0], chunk00Voxel.local[1], chunk00Voxel.local[2], 'east', corner
        );
        const neighborsWest = aoCalculator.getVertexNeighbors(
          chunk10Voxel.local[0], chunk10Voxel.local[1], chunk10Voxel.local[2], 'west', corner
        );
        
        console.log(`    East face neighbors (world coords):`);
        for (let i = 0; i < neighborsEast.length; i++) {
          const n = neighborsEast[i];
          const worldCoord = [chunk00Voxel.chunk.chunkX * 32 + n.x, n.y, chunk00Voxel.chunk.chunkZ * 32 + n.z];
          const isSolid = aoCalculator.isVoxelSolid(chunk00Voxel.chunk, n.x, n.y, n.z);
          console.log(`      ${i}: world(${worldCoord.join(', ')}) = ${isSolid ? 'SOLID' : 'AIR'}`);
        }
        
        console.log(`    West face neighbors (world coords):`);
        for (let i = 0; i < neighborsWest.length; i++) {
          const n = neighborsWest[i];
          const worldCoord = [chunk10Voxel.chunk.chunkX * 32 + n.x, n.y, chunk10Voxel.chunk.chunkZ * 32 + n.z];
          const isSolid = aoCalculator.isVoxelSolid(chunk10Voxel.chunk, n.x, n.y, n.z);
          console.log(`      ${i}: world(${worldCoord.join(', ')}) = ${isSolid ? 'SOLID' : 'AIR'}`);
        }
      }
    }
  });
});