import { describe, it, expect, beforeEach } from 'vitest';
import { Chunk } from '../chunk.js';
import { AmbientOcclusionCalculator } from '../ambientOcclusionCalculator.js';

describe('Boundary Validation Tests', () => {
  let aoCalculator;

  beforeEach(() => {
    aoCalculator = new AmbientOcclusionCalculator();
  });

  it('should handle chunks without world reference gracefully', () => {
    console.log('\n=== Testing Chunks Without World Reference ===');
    
    // Create chunks without world reference (common mistake)
    const chunk1 = new Chunk(0, 0); // No world reference
    const chunk2 = new Chunk(1, 0); // No world reference
    
    // Fill with terrain
    for (let x = 0; x < 32; x++) {
      for (let z = 0; z < 32; z++) {
        for (let y = 0; y <= 50; y++) {
          chunk1.setVoxel(x, y, z, 1);
          chunk2.setVoxel(x, y, z, 1);
        }
      }
    }
    
    // Test AO calculation at boundary - should fallback gracefully
    const ao1 = aoCalculator.calculateVertexAO(chunk1, 31, 50, 15, 'top', 1);
    const ao2 = aoCalculator.calculateVertexAO(chunk2, 0, 50, 15, 'top', 0);
    
    console.log(`Chunk1 AO (no world): ${ao1}`);
    console.log(`Chunk2 AO (no world): ${ao2}`);
    
    // Should not crash and should return reasonable values
    expect(ao1).toBeGreaterThanOrEqual(0);
    expect(ao1).toBeLessThanOrEqual(1);
    expect(ao2).toBeGreaterThanOrEqual(0);
    expect(ao2).toBeLessThanOrEqual(1);
  });

  it('should handle world without getVoxel method', () => {
    console.log('\n=== Testing World Without getVoxel Method ===');
    
    // Create a world object that doesn't have getVoxel method
    const invalidWorld = {
      chunks: new Map(),
      // Missing getVoxel method
    };
    
    const chunk = new Chunk(0, 0, invalidWorld);
    
    // Fill with terrain
    for (let x = 0; x < 32; x++) {
      for (let z = 0; z < 32; z++) {
        for (let y = 0; y <= 50; y++) {
          chunk.setVoxel(x, y, z, 1);
        }
      }
    }
    
    // Test AO calculation that would require cross-chunk lookup
    const ao = aoCalculator.calculateVertexAO(chunk, 31, 50, 15, 'east', 0);
    
    console.log(`AO with invalid world: ${ao}`);
    
    // Should not crash and should fallback to treating out-of-bounds as air
    expect(ao).toBeGreaterThanOrEqual(0);
    expect(ao).toBeLessThanOrEqual(1);
  });

  it('should validate coordinate conversion edge cases', () => {
    console.log('\n=== Testing Coordinate Conversion Edge Cases ===');
    
    const world = {
      getVoxel: (worldX, worldY, worldZ) => {
        console.log(`World getVoxel called: (${worldX}, ${worldY}, ${worldZ})`);
        // Return solid for specific coordinates to test conversion
        if (worldX === -1 && worldY === 50 && worldZ === 15) return 1;
        if (worldX === 32 && worldY === 50 && worldZ === 15) return 1;
        if (worldX === 15 && worldY === 50 && worldZ === -1) return 1;
        if (worldX === 15 && worldY === 50 && worldZ === 32) return 1;
        return 0;
      }
    };
    
    // Test various chunk positions and coordinate conversions
    const testCases = [
      { chunkX: 0, chunkZ: 0, localX: -1, localZ: 15, desc: 'Negative X boundary' },
      { chunkX: 0, chunkZ: 0, localX: 32, localZ: 15, desc: 'Positive X boundary' },
      { chunkX: 0, chunkZ: 0, localX: 15, localZ: -1, desc: 'Negative Z boundary' },
      { chunkX: 0, chunkZ: 0, localX: 15, localZ: 32, desc: 'Positive Z boundary' },
      { chunkX: -1, chunkZ: 0, localX: 32, localZ: 15, desc: 'Negative chunk X' },
      { chunkX: 0, chunkZ: -1, localX: 15, localZ: 32, desc: 'Negative chunk Z' },
    ];
    
    for (const testCase of testCases) {
      console.log(`\nTesting ${testCase.desc}:`);
      const chunk = new Chunk(testCase.chunkX, testCase.chunkZ, world);
      
      // Fill chunk with terrain
      for (let x = 0; x < 32; x++) {
        for (let z = 0; z < 32; z++) {
          chunk.setVoxel(x, 50, z, 1);
        }
      }
      
      const isSolid = aoCalculator.isVoxelSolid(chunk, testCase.localX, 50, testCase.localZ);
      console.log(`  Chunk(${testCase.chunkX}, ${testCase.chunkZ}) local(${testCase.localX}, 50, ${testCase.localZ}) = ${isSolid ? 'SOLID' : 'AIR'}`);
      
      // Should handle the coordinate conversion correctly
      expect(typeof isSolid).toBe('boolean');
    }
  });

  it('should detect potential floating point precision issues', () => {
    console.log('\n=== Testing Floating Point Precision ===');
    
    const world = {
      getVoxel: (worldX, worldY, worldZ) => {
        // Create a pattern that might expose floating point issues
        return (worldX + worldY + worldZ) % 2;
      }
    };
    
    const chunk = new Chunk(0, 0, world);
    
    // Test many boundary calculations to see if there are precision issues
    const aoValues = [];
    for (let i = 0; i < 100; i++) {
      const x = 31;
      const y = 50 + i;
      const z = 15;
      
      try {
        const ao = aoCalculator.calculateVertexAO(chunk, x, y, z, 'east', 0);
        aoValues.push(ao);
      } catch (error) {
        console.log(`Error at iteration ${i}: ${error.message}`);
        throw error;
      }
    }
    
    // Check for any NaN or invalid values
    const invalidValues = aoValues.filter(ao => isNaN(ao) || ao < 0 || ao > 1);
    console.log(`Found ${invalidValues.length} invalid AO values out of ${aoValues.length}`);
    
    expect(invalidValues.length).toBe(0);
  });

  it('should verify AO consistency with different chunk sizes', () => {
    console.log('\n=== Testing Different Chunk Configurations ===');
    
    // Test with chunks that have different internal patterns
    const world = {
      getVoxel: (worldX, worldY, worldZ) => {
        // Create a checkerboard pattern across chunk boundaries
        return (Math.floor(worldX / 4) + Math.floor(worldZ / 4)) % 2;
      }
    };
    
    const chunks = [];
    for (let cx = -1; cx <= 1; cx++) {
      for (let cz = -1; cz <= 1; cz++) {
        const chunk = new Chunk(cx, cz, world);
        chunks.push(chunk);
        
        // Fill with a pattern
        for (let x = 0; x < 32; x++) {
          for (let z = 0; z < 32; z++) {
            for (let y = 0; y <= 50; y++) {
              const worldX = cx * 32 + x;
              const worldZ = cz * 32 + z;
              const value = world.getVoxel(worldX, y, worldZ);
              chunk.setVoxel(x, y, z, value);
            }
          }
        }
      }
    }
    
    // Test AO calculations at various boundary points
    const centerChunk = chunks.find(c => c.chunkX === 0 && c.chunkZ === 0);
    const boundaryTests = [
      { x: 0, z: 15, desc: 'West boundary' },
      { x: 31, z: 15, desc: 'East boundary' },
      { x: 15, z: 0, desc: 'North boundary' },
      { x: 15, z: 31, desc: 'South boundary' },
      { x: 0, z: 0, desc: 'Northwest corner' },
      { x: 31, z: 31, desc: 'Southeast corner' },
    ];
    
    for (const test of boundaryTests) {
      const ao = aoCalculator.calculateVertexAO(centerChunk, test.x, 25, test.z, 'top', 0);
      console.log(`${test.desc}: AO = ${ao.toFixed(3)}`);
      
      expect(ao).toBeGreaterThanOrEqual(0);
      expect(ao).toBeLessThanOrEqual(1);
    }
  });
});