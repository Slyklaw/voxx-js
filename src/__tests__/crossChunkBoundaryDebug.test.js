import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Chunk } from '../chunk.js';
import { AmbientOcclusionCalculator } from '../ambientOcclusionCalculator.js';

describe('Cross-Chunk Boundary AO Debug Tests', () => {
  let mockWorld;
  let chunk1, chunk2;
  let aoCalculator;

  beforeEach(() => {
    // Create a mock world that provides detailed logging of cross-chunk lookups
    mockWorld = {
      getVoxel: vi.fn((worldX, worldY, worldZ) => {
        console.log(`World lookup: (${worldX}, ${worldY}, ${worldZ})`);
        
        // Create a specific pattern for testing
        // Chunk 0: x=0-31, Chunk 1: x=32-63
        if (worldY <= 100) {
          return 1; // Solid terrain below y=100
        }
        return 0; // Air above y=100
      })
    };

    // Create two adjacent chunks
    chunk1 = new Chunk(0, 0, mockWorld);
    chunk2 = new Chunk(1, 0, mockWorld);
    
    // Fill both chunks with terrain up to y=100
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

  it('should show detailed cross-chunk boundary AO calculations', () => {
    console.log('\n=== Testing Cross-Chunk Boundary AO ===');
    
    // Test voxel at the right edge of chunk1 (x=31)
    console.log('\nTesting chunk1 edge voxel (31, 100, 15) - top face, corner 1 (top-right):');
    const aoChunk1Edge = aoCalculator.calculateVertexAO(chunk1, 31, 100, 15, 'top', 1);
    console.log(`AO value for chunk1 edge: ${aoChunk1Edge}`);
    
    // Test voxel at the left edge of chunk2 (x=0)
    console.log('\nTesting chunk2 edge voxel (0, 100, 15) - top face, corner 0 (top-left):');
    const aoChunk2Edge = aoCalculator.calculateVertexAO(chunk2, 0, 100, 15, 'top', 0);
    console.log(`AO value for chunk2 edge: ${aoChunk2Edge}`);
    
    console.log(`\nAO difference: ${Math.abs(aoChunk1Edge - aoChunk2Edge)}`);
    
    // Test the specific neighbors that are being checked
    console.log('\n=== Neighbor Analysis ===');
    
    // For chunk1 (31, 100, 15) top face corner 1, the neighbors should be:
    // - east-above: (32, 101, 15) - this is in chunk2!
    // - north-above: (31, 101, 14)
    // - northeast-above: (32, 101, 14) - this is also in chunk2!
    const neighbors1 = aoCalculator.getVertexNeighbors(31, 100, 15, 'top', 1);
    console.log('Chunk1 neighbors:', neighbors1);
    
    for (let i = 0; i < neighbors1.length; i++) {
      const neighbor = neighbors1[i];
      const isSolid = aoCalculator.isVoxelSolid(chunk1, neighbor.x, neighbor.y, neighbor.z);
      console.log(`  Neighbor ${i}: (${neighbor.x}, ${neighbor.y}, ${neighbor.z}) = ${isSolid ? 'SOLID' : 'AIR'}`);
    }
    
    // For chunk2 (0, 100, 15) top face corner 0, the neighbors should be:
    // - west-above: (-1, 101, 15) - this is in chunk1!
    // - north-above: (0, 101, 14)
    // - northwest-above: (-1, 101, 14) - this is also in chunk1!
    const neighbors2 = aoCalculator.getVertexNeighbors(0, 100, 15, 'top', 0);
    console.log('\nChunk2 neighbors:', neighbors2);
    
    for (let i = 0; i < neighbors2.length; i++) {
      const neighbor = neighbors2[i];
      const isSolid = aoCalculator.isVoxelSolid(chunk2, neighbor.x, neighbor.y, neighbor.z);
      console.log(`  Neighbor ${i}: (${neighbor.x}, ${neighbor.y}, ${neighbor.z}) = ${isSolid ? 'SOLID' : 'AIR'}`);
    }
    
    // Verify that cross-chunk lookups were made
    expect(mockWorld.getVoxel).toHaveBeenCalled();
    
    // The AO values should be identical since the terrain is continuous
    expect(Math.abs(aoChunk1Edge - aoChunk2Edge)).toBeLessThan(0.01);
  });

  it('should test specific problematic boundary case', () => {
    console.log('\n=== Testing Specific Boundary Case ===');
    
    // Create a more complex scenario where there might be inconsistency
    // Clear some voxels to create a specific pattern
    chunk1.setVoxel(31, 101, 15, 0); // Air above edge voxel in chunk1
    chunk2.setVoxel(0, 101, 15, 0);  // Air above edge voxel in chunk2
    
    // Add some specific neighbors to create occlusion
    chunk1.setVoxel(30, 101, 15, 1); // Solid neighbor in chunk1
    chunk2.setVoxel(1, 101, 15, 1);  // Solid neighbor in chunk2
    
    // Update the mock world to reflect these changes
    mockWorld.getVoxel.mockImplementation((worldX, worldY, worldZ) => {
      console.log(`World lookup: (${worldX}, ${worldY}, ${worldZ})`);
      
      // Handle specific coordinates
      if (worldX === 31 && worldY === 101 && worldZ === 15) return 0; // Air
      if (worldX === 32 && worldY === 101 && worldZ === 15) return 0; // Air
      if (worldX === 30 && worldY === 101 && worldZ === 15) return 1; // Solid
      if (worldX === 33 && worldY === 101 && worldZ === 15) return 1; // Solid
      
      // Default terrain pattern
      if (worldY <= 100) return 1;
      return 0;
    });
    
    // Test AO calculations
    const aoChunk1 = aoCalculator.calculateVertexAO(chunk1, 31, 100, 15, 'top', 1);
    const aoChunk2 = aoCalculator.calculateVertexAO(chunk2, 0, 100, 15, 'top', 0);
    
    console.log(`Chunk1 AO: ${aoChunk1}, Chunk2 AO: ${aoChunk2}`);
    console.log(`Difference: ${Math.abs(aoChunk1 - aoChunk2)}`);
    
    // They should still be consistent
    expect(Math.abs(aoChunk1 - aoChunk2)).toBeLessThan(0.1);
  });

  it('should verify world coordinate calculations', () => {
    console.log('\n=== Testing World Coordinate Calculations ===');
    
    // Test the coordinate conversion in isVoxelSolid
    const testCases = [
      { chunk: chunk1, localX: 31, localZ: 15, expectedWorldX: 31, expectedWorldZ: 15 },
      { chunk: chunk1, localX: 32, localZ: 15, expectedWorldX: 32, expectedWorldZ: 15 }, // Cross-chunk
      { chunk: chunk2, localX: 0, localZ: 15, expectedWorldX: 32, expectedWorldZ: 15 },
      { chunk: chunk2, localX: -1, localZ: 15, expectedWorldX: 31, expectedWorldZ: 15 }, // Cross-chunk
    ];
    
    for (const testCase of testCases) {
      console.log(`\nTesting coordinate conversion:`);
      console.log(`  Chunk: (${testCase.chunk.chunkX}, ${testCase.chunk.chunkZ})`);
      console.log(`  Local: (${testCase.localX}, ${testCase.localZ})`);
      console.log(`  Expected World: (${testCase.expectedWorldX}, ${testCase.expectedWorldZ})`);
      
      // Clear the mock calls to track this specific test
      mockWorld.getVoxel.mockClear();
      
      // Call isVoxelSolid which should trigger world coordinate calculation
      const isSolid = aoCalculator.isVoxelSolid(testCase.chunk, testCase.localX, 100, testCase.localZ);
      
      if (testCase.localX < 0 || testCase.localX >= 32 || testCase.localZ < 0 || testCase.localZ >= 32) {
        // Should have made a cross-chunk lookup
        expect(mockWorld.getVoxel).toHaveBeenCalled();
        const call = mockWorld.getVoxel.mock.calls[0];
        console.log(`  Actual World Call: (${call[0]}, ${call[1]}, ${call[2]})`);
        expect(call[0]).toBe(testCase.expectedWorldX);
        expect(call[2]).toBe(testCase.expectedWorldZ);
      } else {
        // Should not have made a cross-chunk lookup
        expect(mockWorld.getVoxel).not.toHaveBeenCalled();
      }
      
      console.log(`  Result: ${isSolid ? 'SOLID' : 'AIR'}`);
    }
  });
});