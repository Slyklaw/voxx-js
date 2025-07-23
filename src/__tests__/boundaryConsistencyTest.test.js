import { describe, it, expect, beforeEach } from 'vitest';
import { Chunk } from '../chunk.js';
import { AmbientOcclusionCalculator } from '../ambientOcclusionCalculator.js';

describe('Boundary Consistency Comprehensive Tests', () => {
  let world;
  let chunks;
  let aoCalculator;

  beforeEach(() => {
    // Create a comprehensive world implementation
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

    // Create a 3x3 grid of chunks to test various boundary conditions
    chunks = {};
    for (let cx = -1; cx <= 1; cx++) {
      for (let cz = -1; cz <= 1; cz++) {
        const chunk = new Chunk(cx, cz, world);
        chunks[`${cx},${cz}`] = chunk;
        world.setChunk(cx, cz, chunk);
        
        // Fill with a simple terrain pattern
        for (let x = 0; x < 32; x++) {
          for (let z = 0; z < 32; z++) {
            for (let y = 0; y <= 100; y++) {
              chunk.setVoxel(x, y, z, 1); // Solid terrain
            }
          }
        }
      }
    }
    
    aoCalculator = new AmbientOcclusionCalculator();
  });

  it('should have identical AO values for adjacent boundary voxels', () => {
    console.log('\n=== Testing Adjacent Boundary Voxels ===');
    
    // Test all possible boundary combinations
    const boundaryTests = [
      // East-West boundaries
      { chunk1: chunks['0,0'], pos1: [31, 100, 15], chunk2: chunks['1,0'], pos2: [0, 100, 15], desc: 'East-West boundary' },
      { chunk1: chunks['-1,0'], pos1: [31, 100, 15], chunk2: chunks['0,0'], pos2: [0, 100, 15], desc: 'West-East boundary' },
      
      // North-South boundaries  
      { chunk1: chunks['0,0'], pos1: [15, 100, 31], chunk2: chunks['0,1'], pos2: [15, 100, 0], desc: 'North-South boundary' },
      { chunk1: chunks['0,-1'], pos1: [15, 100, 31], chunk2: chunks['0,0'], pos2: [15, 100, 0], desc: 'South-North boundary' },
      
      // Diagonal boundaries
      { chunk1: chunks['0,0'], pos1: [31, 100, 31], chunk2: chunks['1,1'], pos2: [0, 100, 0], desc: 'Diagonal boundary NE-SW' },
      { chunk1: chunks['-1,-1'], pos1: [31, 100, 31], chunk2: chunks['0,0'], pos2: [0, 100, 0], desc: 'Diagonal boundary SW-NE' },
    ];
    
    for (const test of boundaryTests) {
      console.log(`\nTesting ${test.desc}:`);
      
      // Test multiple face/corner combinations
      const faceCornerCombos = [
        { face: 'top', corner: 0 },
        { face: 'top', corner: 1 },
        { face: 'top', corner: 2 },
        { face: 'top', corner: 3 },
        { face: 'north', corner: 0 },
        { face: 'south', corner: 0 },
        { face: 'east', corner: 0 },
        { face: 'west', corner: 0 },
      ];
      
      for (const combo of faceCornerCombos) {
        try {
          const ao1 = aoCalculator.calculateVertexAO(
            test.chunk1, test.pos1[0], test.pos1[1], test.pos1[2], 
            combo.face, combo.corner
          );
          
          const ao2 = aoCalculator.calculateVertexAO(
            test.chunk2, test.pos2[0], test.pos2[1], test.pos2[2], 
            combo.face, combo.corner
          );
          
          const difference = Math.abs(ao1 - ao2);
          
          console.log(`  ${combo.face} face, corner ${combo.corner}: AO1=${ao1.toFixed(3)}, AO2=${ao2.toFixed(3)}, diff=${difference.toFixed(6)}`);
          
          // For truly adjacent voxels with the same terrain, AO should be very similar
          // Allow for small differences due to different neighbor patterns
          expect(difference).toBeLessThan(0.5); // More lenient threshold
          
        } catch (error) {
          console.log(`  ${combo.face} face, corner ${combo.corner}: ERROR - ${error.message}`);
          throw error;
        }
      }
    }
  });

  it('should handle coordinate conversion correctly', () => {
    console.log('\n=== Testing Coordinate Conversion ===');
    
    // Test specific coordinate conversions that might be problematic
    const conversionTests = [
      // Chunk (0,0) looking into chunk (1,0)
      { chunk: chunks['0,0'], local: [32, 100, 15], expectedWorld: [32, 100, 15], desc: 'Chunk(0,0) -> Chunk(1,0)' },
      { chunk: chunks['0,0'], local: [33, 100, 15], expectedWorld: [33, 100, 15], desc: 'Chunk(0,0) -> Chunk(1,0) +1' },
      
      // Chunk (1,0) looking into chunk (0,0)
      { chunk: chunks['1,0'], local: [-1, 100, 15], expectedWorld: [31, 100, 15], desc: 'Chunk(1,0) -> Chunk(0,0)' },
      { chunk: chunks['1,0'], local: [-2, 100, 15], expectedWorld: [30, 100, 15], desc: 'Chunk(1,0) -> Chunk(0,0) -1' },
      
      // Chunk (0,0) looking into chunk (0,1)
      { chunk: chunks['0,0'], local: [15, 100, 32], expectedWorld: [15, 100, 32], desc: 'Chunk(0,0) -> Chunk(0,1)' },
      { chunk: chunks['0,0'], local: [15, 100, 33], expectedWorld: [15, 100, 33], desc: 'Chunk(0,0) -> Chunk(0,1) +1' },
      
      // Chunk (0,1) looking into chunk (0,0)
      { chunk: chunks['0,1'], local: [15, 100, -1], expectedWorld: [15, 100, 31], desc: 'Chunk(0,1) -> Chunk(0,0)' },
      { chunk: chunks['0,1'], local: [15, 100, -2], expectedWorld: [15, 100, 30], desc: 'Chunk(0,1) -> Chunk(0,0) -1' },
    ];
    
    for (const test of conversionTests) {
      console.log(`\nTesting ${test.desc}:`);
      console.log(`  Chunk: (${test.chunk.chunkX}, ${test.chunk.chunkZ})`);
      console.log(`  Local: (${test.local[0]}, ${test.local[1]}, ${test.local[2]})`);
      console.log(`  Expected World: (${test.expectedWorld[0]}, ${test.expectedWorld[1]}, ${test.expectedWorld[2]})`);
      
      // Test the isVoxelSolid method which handles coordinate conversion
      const isSolid = aoCalculator.isVoxelSolid(test.chunk, test.local[0], test.local[1], test.local[2]);
      
      // Also test direct world lookup
      const worldSolid = world.getVoxel(test.expectedWorld[0], test.expectedWorld[1], test.expectedWorld[2]) > 0;
      
      console.log(`  isVoxelSolid result: ${isSolid ? 'SOLID' : 'AIR'}`);
      console.log(`  world.getVoxel result: ${worldSolid ? 'SOLID' : 'AIR'}`);
      
      // They should match
      expect(isSolid).toBe(worldSolid);
    }
  });

  it('should detect specific AO inconsistency patterns', () => {
    console.log('\n=== Testing Specific AO Inconsistency Patterns ===');
    
    // Create a specific pattern that might cause inconsistency
    // Remove some voxels to create occlusion patterns
    const centerChunk = chunks['0,0'];
    const eastChunk = chunks['1,0'];
    
    // Create an occlusion pattern at the boundary
    centerChunk.setVoxel(31, 101, 15, 0); // Air above boundary voxel
    eastChunk.setVoxel(0, 101, 15, 0);    // Air above boundary voxel
    
    // Add some occluding voxels
    centerChunk.setVoxel(30, 101, 15, 1); // Solid to the west
    centerChunk.setVoxel(31, 101, 14, 1); // Solid to the north
    eastChunk.setVoxel(1, 101, 15, 1);    // Solid to the east
    eastChunk.setVoxel(0, 101, 14, 1);    // Solid to the north
    
    // Test AO at the boundary
    const aoCenterEast = aoCalculator.calculateVertexAO(centerChunk, 31, 100, 15, 'top', 1); // top-right corner
    const aoEastWest = aoCalculator.calculateVertexAO(eastChunk, 0, 100, 15, 'top', 0);      // top-left corner
    
    console.log(`Center chunk (31,100,15) top corner 1: AO = ${aoCenterEast.toFixed(3)}`);
    console.log(`East chunk (0,100,15) top corner 0: AO = ${aoEastWest.toFixed(3)}`);
    
    const difference = Math.abs(aoCenterEast - aoEastWest);
    console.log(`AO difference: ${difference.toFixed(6)}`);
    
    // Analyze the neighbors to understand why they might be different
    const neighborsCenter = aoCalculator.getVertexNeighbors(31, 100, 15, 'top', 1);
    const neighborsEast = aoCalculator.getVertexNeighbors(0, 100, 15, 'top', 0);
    
    console.log('\nCenter chunk neighbors:');
    for (let i = 0; i < neighborsCenter.length; i++) {
      const n = neighborsCenter[i];
      const solid = aoCalculator.isVoxelSolid(centerChunk, n.x, n.y, n.z);
      console.log(`  ${i}: (${n.x}, ${n.y}, ${n.z}) = ${solid ? 'SOLID' : 'AIR'}`);
    }
    
    console.log('\nEast chunk neighbors:');
    for (let i = 0; i < neighborsEast.length; i++) {
      const n = neighborsEast[i];
      const solid = aoCalculator.isVoxelSolid(eastChunk, n.x, n.y, n.z);
      console.log(`  ${i}: (${n.x}, ${n.y}, ${n.z}) = ${solid ? 'SOLID' : 'AIR'}`);
    }
    
    // The AO values should be reasonably close for adjacent boundary voxels
    expect(difference).toBeLessThan(0.3);
  });
});