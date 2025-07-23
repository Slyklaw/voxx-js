import { describe, it, expect, beforeEach } from 'vitest';
import { Chunk } from '../chunk.js';
import { AmbientOcclusionCalculator } from '../ambientOcclusionCalculator.js';

describe('Coordinate Transform Debug', () => {
  let world;
  let chunks;
  let aoCalculator;

  beforeEach(() => {
    // Create a world with detailed logging
    world = {
      chunks: new Map(),
      lookupLog: [],
      
      getChunk(chunkX, chunkZ) {
        const key = `${chunkX},${chunkZ}`;
        return this.chunks.get(key);
      },
      
      setChunk(chunkX, chunkZ, chunk) {
        const key = `${chunkX},${chunkZ}`;
        this.chunks.set(key, chunk);
      },
      
      getVoxel(worldX, worldY, worldZ) {
        // Log every lookup for debugging
        this.lookupLog.push({ worldX, worldY, worldZ });
        
        // Calculate which chunk this world coordinate belongs to
        const chunkX = Math.floor(worldX / 32);
        const chunkZ = Math.floor(worldZ / 32);
        
        // Get local coordinates within the chunk
        const localX = worldX - (chunkX * 32);
        const localZ = worldZ - (chunkZ * 32);
        
        console.log(`World lookup: (${worldX}, ${worldY}, ${worldZ}) -> Chunk(${chunkX}, ${chunkZ}) Local(${localX}, ${worldY}, ${localZ})`);
        
        // Get the chunk
        const chunk = this.getChunk(chunkX, chunkZ);
        if (!chunk) {
          console.log(`  -> Chunk not found, returning AIR`);
          return 0; // Air if chunk doesn't exist
        }
        
        // Return the voxel value
        const value = chunk.getVoxelSafe(localX, worldY, localZ);
        console.log(`  -> Value: ${value}`);
        return value;
      }
    };

    // Create chunks
    chunks = {};
    for (let cx = -1; cx <= 1; cx++) {
      for (let cz = -1; cz <= 1; cz++) {
        const chunk = new Chunk(cx, cz, world);
        chunks[`${cx},${cz}`] = chunk;
        world.setChunk(cx, cz, chunk);
        
        // Fill with solid terrain up to y=100
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

  it('should verify coordinate transformation for boundary lookups', () => {
    console.log('\n=== Testing Coordinate Transformation ===');
    
    const centerChunk = chunks['0,0'];
    const northChunk = chunks['0,-1'];
    
    // Clear the lookup log
    world.lookupLog = [];
    
    // Test a simple case: looking north from center chunk at boundary
    console.log('\n--- Testing North Boundary Lookup ---');
    console.log('Center chunk: (0, 0), looking at local coordinate (15, 50, -1)');
    console.log('This should map to world coordinate (15, 50, -1)');
    console.log('Which should be found in north chunk (0, -1) at local coordinate (15, 50, 31)');
    
    // Manually test the coordinate transformation
    const localX = 15;
    const localY = 50;
    const localZ = -1; // This is outside the center chunk, should go to north chunk
    
    // What the AO calculator should do:
    const CHUNK_WIDTH = 32;
    const CHUNK_DEPTH = 32;
    
    const worldX = centerChunk.chunkX * CHUNK_WIDTH + localX;
    const worldZ = centerChunk.chunkZ * CHUNK_DEPTH + localZ;
    
    console.log(`Calculated world coordinates: (${worldX}, ${localY}, ${worldZ})`);
    
    // Now test what the world.getVoxel does with these coordinates
    const result = world.getVoxel(worldX, localY, worldZ);
    console.log(`Result: ${result}`);
    
    // Check what chunk it should have gone to
    const expectedChunkX = Math.floor(worldX / 32);
    const expectedChunkZ = Math.floor(worldZ / 32);
    const expectedLocalX = worldX - (expectedChunkX * 32);
    const expectedLocalZ = worldZ - (expectedChunkZ * 32);
    
    console.log(`Expected: Chunk(${expectedChunkX}, ${expectedChunkZ}) Local(${expectedLocalX}, ${localY}, ${expectedLocalZ})`);
    
    // Verify the north chunk has the expected value at the expected local coordinates
    const northChunkValue = northChunk.getVoxelSafe(expectedLocalX, localY, expectedLocalZ);
    console.log(`North chunk value at (${expectedLocalX}, ${localY}, ${expectedLocalZ}): ${northChunkValue}`);
    
    expect(result).toBe(northChunkValue);
  });

  it('should test all boundary directions with coordinate transformation', () => {
    console.log('\n=== Testing All Boundary Directions ===');
    
    const centerChunk = chunks['0,0'];
    
    const tests = [
      { name: 'East', localX: 32, localY: 50, localZ: 15, expectedChunk: '1,0' },
      { name: 'West', localX: -1, localY: 50, localZ: 15, expectedChunk: '-1,0' },
      { name: 'North', localX: 15, localY: 50, localZ: -1, expectedChunk: '0,-1' },
      { name: 'South', localX: 15, localY: 50, localZ: 32, expectedChunk: '0,1' },
    ];
    
    for (const test of tests) {
      console.log(`\n--- Testing ${test.name} Boundary ---`);
      console.log(`Local coordinates: (${test.localX}, ${test.localY}, ${test.localZ})`);
      
      // Clear lookup log
      world.lookupLog = [];
      
      // Calculate world coordinates
      const CHUNK_WIDTH = 32;
      const CHUNK_DEPTH = 32;
      
      const worldX = centerChunk.chunkX * CHUNK_WIDTH + test.localX;
      const worldZ = centerChunk.chunkZ * CHUNK_DEPTH + test.localZ;
      
      console.log(`World coordinates: (${worldX}, ${test.localY}, ${worldZ})`);
      
      // Test the lookup
      const result = world.getVoxel(worldX, test.localY, worldZ);
      
      // Verify which chunk it went to
      const actualChunkX = Math.floor(worldX / 32);
      const actualChunkZ = Math.floor(worldZ / 32);
      const actualChunkKey = `${actualChunkX},${actualChunkZ}`;
      
      console.log(`Actual chunk: ${actualChunkKey}, Expected chunk: ${test.expectedChunk}`);
      
      expect(actualChunkKey).toBe(test.expectedChunk);
      
      // Verify the result matches what we'd get from direct chunk access
      const expectedChunk = chunks[test.expectedChunk];
      const expectedLocalX = worldX - (actualChunkX * 32);
      const expectedLocalZ = worldZ - (actualChunkZ * 32);
      const expectedValue = expectedChunk.getVoxelSafe(expectedLocalX, test.localY, expectedLocalZ);
      
      console.log(`Expected local coordinates in target chunk: (${expectedLocalX}, ${test.localY}, ${expectedLocalZ})`);
      console.log(`Expected value: ${expectedValue}, Actual value: ${result}`);
      
      expect(result).toBe(expectedValue);
    }
  });

  it('should test AO calculation with detailed neighbor tracking', () => {
    console.log('\n=== Testing AO Calculation with Neighbor Tracking ===');
    
    const centerChunk = chunks['0,0'];
    const northChunk = chunks['0,-1'];
    
    // Create a specific pattern
    centerChunk.setVoxel(15, 51, 0, 0);  // Air at north boundary of center chunk
    northChunk.setVoxel(15, 51, 31, 0);  // Air at south boundary of north chunk (should be same voxel!)
    
    // Test AO calculation for a vertex that should see this air
    console.log('\n--- Testing Center Chunk AO ---');
    world.lookupLog = [];
    
    const centerAO = aoCalculator.calculateVertexAO(centerChunk, 15, 50, 0, 'top', 0);
    console.log(`Center chunk AO: ${centerAO}`);
    console.log('Lookups made:', world.lookupLog);
    
    console.log('\n--- Testing North Chunk AO ---');
    world.lookupLog = [];
    
    const northAO = aoCalculator.calculateVertexAO(northChunk, 15, 50, 31, 'top', 0);
    console.log(`North chunk AO: ${northAO}`);
    console.log('Lookups made:', world.lookupLog);
    
    console.log(`\nAO Difference: ${Math.abs(centerAO - northAO)}`);
    
    // These should be the same since they're looking at the same world position from different chunks
    expect(Math.abs(centerAO - northAO)).toBeLessThan(0.001);
  });
});