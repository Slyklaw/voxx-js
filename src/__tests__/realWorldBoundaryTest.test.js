import { describe, it, expect, beforeEach } from 'vitest';
import { Chunk } from '../chunk.js';
import { AmbientOcclusionCalculator } from '../ambientOcclusionCalculator.js';

describe('Real World Boundary AO Consistency Tests', () => {
  let world;
  let chunk1, chunk2;
  let aoCalculator;

  beforeEach(() => {
    // Create a simple world implementation
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
        
        // Get the chunk
        const chunk = this.getChunk(chunkX, chunkZ);
        if (!chunk) {
          return 0; // Air if chunk doesn't exist
        }
        
        // Return the voxel value
        return chunk.getVoxelSafe(localX, worldY, localZ);
      }
    };

    // Create two adjacent chunks with the world reference
    chunk1 = new Chunk(0, 0, world);
    chunk2 = new Chunk(1, 0, world);
    
    // Register chunks with the world
    world.setChunk(0, 0, chunk1);
    world.setChunk(1, 0, chunk2);
    
    // Create a realistic terrain pattern
    // Fill both chunks with solid terrain up to y=50
    for (let x = 0; x < 32; x++) {
      for (let z = 0; z < 32; z++) {
        for (let y = 0; y <= 50; y++) {
          chunk1.setVoxel(x, y, z, 1);
          chunk2.setVoxel(x, y, z, 1);
        }
      }
    }
    
    // Create some air pockets to make AO more interesting
    // Remove some voxels above the terrain
    for (let x = 30; x < 32; x++) {
      for (let z = 14; z < 18; z++) {
        chunk1.setVoxel(x, 51, z, 0); // Air pocket in chunk1
      }
    }
    
    for (let x = 0; x < 2; x++) {
      for (let z = 14; z < 18; z++) {
        chunk2.setVoxel(x, 51, z, 0); // Air pocket in chunk2
      }
    }
    
    aoCalculator = new AmbientOcclusionCalculator();
  });

  it('should have consistent AO values at chunk boundaries', () => {
    console.log('\n=== Real World Boundary Consistency Test ===');
    
    // Test multiple boundary positions
    const testCases = [
      // Test top face of terrain at chunk boundary
      { chunk: chunk1, x: 31, y: 50, z: 15, face: 'top', corner: 1, desc: 'Chunk1 right edge' },
      { chunk: chunk2, x: 0, y: 50, z: 15, face: 'top', corner: 0, desc: 'Chunk2 left edge' },
      
      // Test with different corners
      { chunk: chunk1, x: 31, y: 50, z: 16, face: 'top', corner: 2, desc: 'Chunk1 right edge, different corner' },
      { chunk: chunk2, x: 0, y: 50, z: 16, face: 'top', corner: 3, desc: 'Chunk2 left edge, different corner' },
      
      // Test side faces at boundary
      { chunk: chunk1, x: 31, y: 49, z: 15, face: 'east', corner: 0, desc: 'Chunk1 east face' },
      { chunk: chunk2, x: 0, y: 49, z: 15, face: 'west', corner: 0, desc: 'Chunk2 west face' },
    ];
    
    const results = [];
    
    for (const testCase of testCases) {
      try {
        const aoValue = aoCalculator.calculateVertexAO(
          testCase.chunk, testCase.x, testCase.y, testCase.z, 
          testCase.face, testCase.corner
        );
        
        results.push({
          ...testCase,
          aoValue,
          success: true
        });
        
        console.log(`${testCase.desc}: AO = ${aoValue.toFixed(3)}`);
      } catch (error) {
        results.push({
          ...testCase,
          aoValue: null,
          success: false,
          error: error.message
        });
        
        console.log(`${testCase.desc}: ERROR - ${error.message}`);
      }
    }
    
    // Check for consistency between adjacent boundary voxels
    const chunk1TopAO = results.find(r => r.desc === 'Chunk1 right edge')?.aoValue;
    const chunk2TopAO = results.find(r => r.desc === 'Chunk2 left edge')?.aoValue;
    
    if (chunk1TopAO !== null && chunk2TopAO !== null) {
      const difference = Math.abs(chunk1TopAO - chunk2TopAO);
      console.log(`\nBoundary AO difference: ${difference.toFixed(6)}`);
      
      // They should be very close (allowing for small floating point differences)
      expect(difference).toBeLessThan(0.001);
    }
    
    // All calculations should succeed
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      console.log('\nFailures:', failures);
    }
    expect(failures.length).toBe(0);
  });

  it('should handle edge cases at world boundaries', () => {
    console.log('\n=== World Boundary Edge Cases ===');
    
    // Test what happens when we look beyond the world
    const edgeCases = [
      // Voxel at the very edge of chunk1 looking into non-existent chunk
      { chunk: chunk1, x: 0, y: 50, z: 15, face: 'west', corner: 0, desc: 'Chunk1 west edge (no neighbor chunk)' },
      
      // Test with a chunk that has no world reference
      { chunk: new Chunk(5, 5), x: 15, y: 50, z: 15, face: 'top', corner: 0, desc: 'Chunk with no world reference' },
    ];
    
    for (const testCase of edgeCases) {
      try {
        const aoValue = aoCalculator.calculateVertexAO(
          testCase.chunk, testCase.x, testCase.y, testCase.z, 
          testCase.face, testCase.corner
        );
        
        console.log(`${testCase.desc}: AO = ${aoValue.toFixed(3)}`);
        
        // Should not crash and should return a reasonable value
        expect(aoValue).toBeGreaterThanOrEqual(0);
        expect(aoValue).toBeLessThanOrEqual(1);
      } catch (error) {
        console.log(`${testCase.desc}: ERROR - ${error.message}`);
        // Should not throw errors for edge cases
        expect(error).toBeNull();
      }
    }
  });

  it('should verify neighbor detection across chunks', () => {
    console.log('\n=== Cross-Chunk Neighbor Detection ===');
    
    // Test a specific case where neighbors span chunks
    const x = 31, y = 50, z = 15;
    const face = 'top';
    const corner = 1; // top-right corner
    
    console.log(`Testing voxel at chunk1(${x}, ${y}, ${z}) face=${face} corner=${corner}`);
    
    // Get the neighbors
    const neighbors = aoCalculator.getVertexNeighbors(x, y, z, face, corner);
    console.log('Neighbors:', neighbors);
    
    // Check each neighbor
    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i];
      const localSolid = aoCalculator.isVoxelSolid(chunk1, neighbor.x, neighbor.y, neighbor.z);
      
      // Also check what the world says about this position
      const worldX = chunk1.chunkX * 32 + neighbor.x;
      const worldZ = chunk1.chunkZ * 32 + neighbor.z;
      const worldSolid = world.getVoxel(worldX, neighbor.y, worldZ) > 0;
      
      console.log(`  Neighbor ${i}: local(${neighbor.x}, ${neighbor.y}, ${neighbor.z}) = ${localSolid ? 'SOLID' : 'AIR'}`);
      console.log(`              world(${worldX}, ${neighbor.y}, ${worldZ}) = ${worldSolid ? 'SOLID' : 'AIR'}`);
      
      // They should match
      expect(localSolid).toBe(worldSolid);
    }
  });
});