import { describe, it, expect, beforeEach } from 'vitest';
import { Chunk } from '../chunk.js';
import { AmbientOcclusionCalculator } from '../ambientOcclusionCalculator.js';

describe('Coordinate Transform Debug', () => {
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
        console.log(`    world.getVoxel(${worldX}, ${worldY}, ${worldZ})`);
        const chunkX = Math.floor(worldX / 32);
        const chunkZ = Math.floor(worldZ / 32);
        const localX = worldX - (chunkX * 32);
        const localZ = worldZ - (chunkZ * 32);
        console.log(`      -> chunk(${chunkX}, ${chunkZ}) local(${localX}, ${worldY}, ${localZ})`);
        const chunk = this.getChunk(chunkX, chunkZ);
        if (!chunk) {
          console.log(`      -> chunk not found, returning 0`);
          return 0;
        }
        const value = chunk.getVoxelSafe(localX, worldY, localZ);
        console.log(`      -> value = ${value}`);
        return value;
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
    
    // Set the specific voxel that's causing issues
    console.log('Setting world(31, 51, 15) to AIR via chunk(0,0).setVoxel(31, 51, 15, 0)');
    chunks['0,0'].setVoxel(31, 51, 15, 0); // World (31, 51, 15) = AIR
    
    aoCalculator = new AmbientOcclusionCalculator();
  });

  it('should debug the coordinate transformation issue', () => {
    console.log('\n=== Coordinate Transformation Debug ===');
    
    // Test direct access to the problematic coordinate
    console.log('\n1. Direct world access to (31, 51, 15):');
    const worldValue = world.getVoxel(31, 51, 15);
    console.log(`   Result: ${worldValue}`);
    
    // Test access via chunk(0,0) - should be local (31, 51, 15)
    console.log('\n2. Access via chunk(0,0) local(31, 51, 15):');
    const chunk00Value = chunks['0,0'].getVoxelSafe(31, 51, 15);
    console.log(`   Result: ${chunk00Value}`);
    
    // Test access via chunk(1,0) using isVoxelSolid - should be local (-1, 51, 15)
    console.log('\n3. Access via chunk(1,0) isVoxelSolid(-1, 51, 15):');
    const chunk10Value = aoCalculator.isVoxelSolid(chunks['1,0'], -1, 51, 15);
    console.log(`   Result: ${chunk10Value ? 1 : 0}`);
    
    // Test the coordinate calculation manually
    console.log('\n4. Manual coordinate calculation for chunk(1,0) local(-1, 51, 15):');
    const chunkX = chunks['1,0'].chunkX; // Should be 1
    const chunkZ = chunks['1,0'].chunkZ; // Should be 0
    const localX = -1;
    const localZ = 15;
    const expectedWorldX = chunkX * 32 + localX; // 1 * 32 + (-1) = 31
    const expectedWorldZ = chunkZ * 32 + localZ; // 0 * 32 + 15 = 15
    console.log(`   Chunk: (${chunkX}, ${chunkZ})`);
    console.log(`   Local: (${localX}, 51, ${localZ})`);
    console.log(`   Expected World: (${expectedWorldX}, 51, ${expectedWorldZ})`);
    
    // Verify all three methods give the same result
    console.log('\n5. Verification:');
    console.log(`   world.getVoxel(31, 51, 15) = ${worldValue}`);
    console.log(`   chunk(0,0).getVoxelSafe(31, 51, 15) = ${chunk00Value}`);
    console.log(`   chunk(1,0).isVoxelSolid(-1, 51, 15) = ${chunk10Value ? 1 : 0}`);
    
    // They should all be the same
    expect(worldValue).toBe(chunk00Value);
    expect(worldValue).toBe(chunk10Value ? 1 : 0);
  });
});