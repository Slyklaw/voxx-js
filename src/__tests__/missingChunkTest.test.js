import { describe, it, expect, beforeEach } from 'vitest';
import { Chunk } from '../chunk.js';
import { AmbientOcclusionCalculator } from '../ambientOcclusionCalculator.js';

describe('Missing Chunk AO Test', () => {
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
        if (!chunk) {
          console.log(`    ⚠️ Missing chunk (${chunkX}, ${chunkZ}) for world(${worldX}, ${worldY}, ${worldZ})`);
          return 0; // Air if chunk doesn't exist
        }
        return chunk.getVoxelSafe(localX, worldY, localZ);
      }
    };

    chunks = {};
    aoCalculator = new AmbientOcclusionCalculator();
  });

  it('should test AO calculation when adjacent chunks are missing', () => {
    console.log('\n=== Testing Missing Chunk Scenario ===');
    
    // Create only chunk(0,0), but not chunk(1,0)
    const chunk00 = new Chunk(0, 0, world);
    chunks['0,0'] = chunk00;
    world.setChunk(0, 0, chunk00);
    
    // Fill chunk(0,0) with solid terrain
    for (let x = 0; x < 32; x++) {
      for (let z = 0; z < 32; z++) {
        for (let y = 0; y <= 100; y++) {
          chunk00.setVoxel(x, y, z, 1);
        }
      }
    }
    
    console.log('Created only chunk(0,0), chunk(1,0) is missing');
    
    // Test AO calculation for a voxel at the boundary
    // This voxel will need to look into the missing chunk(1,0)
    const boundaryVoxel = { chunk: chunk00, local: [31, 50, 15] };
    
    console.log('\nTesting AO for boundary voxel when adjacent chunk is missing:');
    console.log('Voxel: chunk(0,0) local(31,50,15) = world(31,50,15)');
    
    // Test east face - this will need to look into missing chunk(1,0)
    console.log('\nEast face AO (looks into missing chunk):');
    for (let corner = 0; corner < 4; corner++) {
      const ao = aoCalculator.calculateVertexAO(
        boundaryVoxel.chunk, boundaryVoxel.local[0], boundaryVoxel.local[1], boundaryVoxel.local[2], 
        'east', corner
      );
      
      console.log(`  Corner ${corner}: AO=${ao.toFixed(3)}`);
      
      // Debug the neighbors to see what happens with missing chunk lookups
      const neighbors = aoCalculator.getVertexNeighbors(
        boundaryVoxel.local[0], boundaryVoxel.local[1], boundaryVoxel.local[2], 'east', corner
      );
      
      console.log(`    Neighbors:`);
      for (let i = 0; i < neighbors.length; i++) {
        const n = neighbors[i];
        const worldCoord = [boundaryVoxel.chunk.chunkX * 32 + n.x, n.y, boundaryVoxel.chunk.chunkZ * 32 + n.z];
        const isSolid = aoCalculator.isVoxelSolid(boundaryVoxel.chunk, n.x, n.y, n.z);
        console.log(`      ${i}: local(${n.x}, ${n.y}, ${n.z}) = world(${worldCoord.join(', ')}) = ${isSolid ? 'SOLID' : 'AIR'}`);
      }
    }
    
    console.log('\n--- Now adding the missing chunk ---');
    
    // Add chunk(1,0) with the same terrain
    const chunk10 = new Chunk(1, 0, world);
    chunks['1,0'] = chunk10;
    world.setChunk(1, 0, chunk10);
    
    for (let x = 0; x < 32; x++) {
      for (let z = 0; z < 32; z++) {
        for (let y = 0; y <= 100; y++) {
          chunk10.setVoxel(x, y, z, 1);
        }
      }
    }
    
    console.log('Added chunk(1,0) with same terrain');
    
    // Test the same voxel again
    console.log('\nEast face AO (now with adjacent chunk present):');
    for (let corner = 0; corner < 4; corner++) {
      const ao = aoCalculator.calculateVertexAO(
        boundaryVoxel.chunk, boundaryVoxel.local[0], boundaryVoxel.local[1], boundaryVoxel.local[2], 
        'east', corner
      );
      
      console.log(`  Corner ${corner}: AO=${ao.toFixed(3)}`);
    }
    
    console.log('\n🔍 This test shows what happens when chunks are loaded at different times!');
    console.log('If a chunk is generated before its neighbors, it will have different AO values');
    console.log('than if it were generated after its neighbors are loaded.');
    console.log('This could be the source of the boundary seams in your image!');
  });

  it('should demonstrate the chunk loading order issue', () => {
    console.log('\n=== Demonstrating Chunk Loading Order Issue ===');
    
    // Scenario 1: Generate chunk(0,0) first, then chunk(1,0)
    console.log('\nScenario 1: Generate chunk(0,0) first (missing neighbors)');
    
    const chunk00_early = new Chunk(0, 0, world);
    world.setChunk(0, 0, chunk00_early);
    
    for (let x = 0; x < 32; x++) {
      for (let z = 0; z < 32; z++) {
        for (let y = 0; y <= 50; y++) {
          chunk00_early.setVoxel(x, y, z, 1);
        }
      }
    }
    
    // Calculate AO for boundary voxel when neighbor is missing
    const ao_early = aoCalculator.calculateVertexAO(chunk00_early, 31, 50, 15, 'east', 0);
    console.log(`AO value when neighbor chunk missing: ${ao_early.toFixed(3)}`);
    
    // Now add the neighbor chunk
    const chunk10_late = new Chunk(1, 0, world);
    world.setChunk(1, 0, chunk10_late);
    
    for (let x = 0; x < 32; x++) {
      for (let z = 0; z < 32; z++) {
        for (let y = 0; y <= 50; y++) {
          chunk10_late.setVoxel(x, y, z, 1);
        }
      }
    }
    
    // Calculate AO again - should be different now
    const ao_late = aoCalculator.calculateVertexAO(chunk00_early, 31, 50, 15, 'east', 0);
    console.log(`AO value after neighbor chunk loaded: ${ao_late.toFixed(3)}`);
    
    const difference = Math.abs(ao_early - ao_late);
    console.log(`Difference: ${difference.toFixed(6)}`);
    
    if (difference > 0.01) {
      console.log('⚠️ CHUNK LOADING ORDER AFFECTS AO VALUES!');
      console.log('This is likely the cause of boundary seams in your voxel world.');
      console.log('Solution: Regenerate chunk meshes after all neighbors are loaded.');
    }
  });
});