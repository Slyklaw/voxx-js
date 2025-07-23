import { describe, it, expect, beforeEach } from 'vitest';
import { Chunk } from '../chunk.js';
import { AmbientOcclusionCalculator } from '../ambientOcclusionCalculator.js';

describe('Specific Boundary Issue Detection', () => {
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

    // Create a 3x3 grid of chunks
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

  it('should detect inconsistent AO across specific boundaries with asymmetric patterns', () => {
    console.log('\n=== Testing Asymmetric Boundary Patterns ===');
    
    const centerChunk = chunks['0,0'];
    const eastChunk = chunks['1,0'];
    const westChunk = chunks['-1,0'];
    const northChunk = chunks['0,-1'];
    const southChunk = chunks['0,1'];
    
    // Create asymmetric patterns that might expose boundary issues
    // Pattern 1: Different air pocket patterns on each side of boundaries
    
    // East boundary - create air pocket on center side only
    centerChunk.setVoxel(30, 51, 15, 0); // Air near east boundary
    centerChunk.setVoxel(31, 51, 15, 0); // Air at east boundary
    // eastChunk keeps solid at (0, 51, 15)
    
    // West boundary - create air pocket on neighbor side only  
    // centerChunk keeps solid at (0, 51, 15)
    westChunk.setVoxel(31, 51, 15, 0); // Air at west boundary
    westChunk.setVoxel(30, 51, 15, 0); // Air near west boundary
    
    // North boundary - create air pocket on both sides but different patterns
    centerChunk.setVoxel(15, 51, 0, 0);  // Air at north boundary
    centerChunk.setVoxel(15, 51, 1, 0);  // Air near north boundary
    northChunk.setVoxel(15, 51, 31, 0);  // Air at north boundary (from north chunk perspective)
    northChunk.setVoxel(14, 51, 31, 0);  // Different pattern on north side
    
    // South boundary - create diagonal air pattern
    centerChunk.setVoxel(15, 51, 31, 0); // Air at south boundary
    centerChunk.setVoxel(14, 51, 30, 0); // Diagonal air pattern
    southChunk.setVoxel(15, 51, 0, 0);   // Air at south boundary (from south chunk perspective)
    southChunk.setVoxel(16, 51, 1, 0);   // Different diagonal pattern on south side
    
    // Test each boundary with multiple face orientations and corners
    const boundaryTests = [
      {
        name: 'East Boundary (asymmetric air)',
        centerPos: [31, 50, 15],
        neighborPos: [0, 50, 15],
        centerChunk: centerChunk,
        neighborChunk: eastChunk,
        expectedDifference: true // We expect this to be different due to asymmetric air pattern
      },
      {
        name: 'West Boundary (asymmetric air)',
        centerPos: [0, 50, 15],
        neighborPos: [31, 50, 15],
        centerChunk: centerChunk,
        neighborChunk: westChunk,
        expectedDifference: true // We expect this to be different due to asymmetric air pattern
      },
      {
        name: 'North Boundary (different patterns)',
        centerPos: [15, 50, 0],
        neighborPos: [15, 50, 31],
        centerChunk: centerChunk,
        neighborChunk: northChunk,
        expectedDifference: true // We expect this to be different due to different patterns
      },
      {
        name: 'South Boundary (diagonal patterns)',
        centerPos: [15, 50, 31],
        neighborPos: [15, 50, 0],
        centerChunk: centerChunk,
        neighborChunk: southChunk,
        expectedDifference: true // We expect this to be different due to diagonal patterns
      }
    ];
    
    const faces = ['top', 'north', 'south', 'east', 'west'];
    let inconsistenciesFound = [];
    
    for (const test of boundaryTests) {
      console.log(`\nTesting ${test.name}:`);
      
      for (const face of faces) {
        for (let corner = 0; corner < 4; corner++) {
          try {
            const centerAO = aoCalculator.calculateVertexAO(
              test.centerChunk, test.centerPos[0], test.centerPos[1], test.centerPos[2], 
              face, corner
            );
            
            const neighborAO = aoCalculator.calculateVertexAO(
              test.neighborChunk, test.neighborPos[0], test.neighborPos[1], test.neighborPos[2], 
              face, corner
            );
            
            const difference = Math.abs(centerAO - neighborAO);
            
            console.log(`  ${face} face, corner ${corner}: Center=${centerAO.toFixed(3)}, Neighbor=${neighborAO.toFixed(3)}, diff=${difference.toFixed(6)}`);
            
            // For asymmetric patterns, we expect some difference, but let's see what we actually get
            if (difference > 0.001) { // Very small threshold to catch any differences
              inconsistenciesFound.push({
                boundary: test.name,
                face: face,
                corner: corner,
                centerAO: centerAO,
                neighborAO: neighborAO,
                difference: difference
              });
              
              console.log(`    ⚠️ DIFFERENCE DETECTED: ${difference.toFixed(6)}`);
              
              // Debug the neighbors to understand why they're different
              const centerNeighbors = aoCalculator.getVertexNeighbors(
                test.centerPos[0], test.centerPos[1], test.centerPos[2], face, corner
              );
              
              const neighborNeighbors = aoCalculator.getVertexNeighbors(
                test.neighborPos[0], test.neighborPos[1], test.neighborPos[2], face, corner
              );
              
              console.log('    Center chunk neighbors:');
              for (let i = 0; i < centerNeighbors.length; i++) {
                const n = centerNeighbors[i];
                const solid = aoCalculator.isVoxelSolid(test.centerChunk, n.x, n.y, n.z);
                console.log(`      ${i}: (${n.x}, ${n.y}, ${n.z}) = ${solid ? 'SOLID' : 'AIR'}`);
              }
              
              console.log('    Neighbor chunk neighbors:');
              for (let i = 0; i < neighborNeighbors.length; i++) {
                const n = neighborNeighbors[i];
                const solid = aoCalculator.isVoxelSolid(test.neighborChunk, n.x, n.y, n.z);
                console.log(`      ${i}: (${n.x}, ${n.y}, ${n.z}) = ${solid ? 'SOLID' : 'AIR'}`);
              }
            }
            
          } catch (error) {
            console.log(`  ${face} face, corner ${corner}: ERROR - ${error.message}`);
            inconsistenciesFound.push({
              boundary: test.name,
              face: face,
              corner: corner,
              error: error.message
            });
          }
        }
      }
    }
    
    console.log(`\n=== Summary ===`);
    console.log(`Total inconsistencies found: ${inconsistenciesFound.length}`);
    
    if (inconsistenciesFound.length > 0) {
      console.log('\nInconsistencies by boundary:');
      const byBoundary = {};
      inconsistenciesFound.forEach(inc => {
        if (!byBoundary[inc.boundary]) byBoundary[inc.boundary] = [];
        byBoundary[inc.boundary].push(inc);
      });
      
      Object.keys(byBoundary).forEach(boundary => {
        console.log(`  ${boundary}: ${byBoundary[boundary].length} inconsistencies`);
      });
    }
    
    // For this test, we actually expect some differences due to asymmetric patterns
    // But we want to see if the differences make sense or if there are unexpected patterns
    expect(inconsistenciesFound.length).toBeGreaterThan(0); // We expect to find differences with asymmetric patterns
  });

  it('should test symmetric patterns for true boundary consistency', () => {
    console.log('\n=== Testing Symmetric Boundary Patterns ===');
    
    const centerChunk = chunks['0,0'];
    const eastChunk = chunks['1,0'];
    const westChunk = chunks['-1,0'];
    const northChunk = chunks['0,-1'];
    const southChunk = chunks['0,1'];
    
    // Create perfectly symmetric patterns across boundaries
    // These should have identical AO values on both sides
    
    // East-West symmetric pattern
    centerChunk.setVoxel(30, 51, 15, 0); // Air 2 blocks from east boundary
    centerChunk.setVoxel(31, 51, 15, 0); // Air 1 block from east boundary
    eastChunk.setVoxel(0, 51, 15, 0);    // Air at boundary from east side
    eastChunk.setVoxel(1, 51, 15, 0);    // Air 1 block from boundary on east side
    
    centerChunk.setVoxel(1, 51, 15, 0);  // Air 2 blocks from west boundary  
    centerChunk.setVoxel(0, 51, 15, 0);  // Air 1 block from west boundary
    westChunk.setVoxel(31, 51, 15, 0);   // Air at boundary from west side
    westChunk.setVoxel(30, 51, 15, 0);   // Air 1 block from boundary on west side
    
    // North-South symmetric pattern
    centerChunk.setVoxel(15, 51, 1, 0);  // Air 2 blocks from north boundary
    centerChunk.setVoxel(15, 51, 0, 0);  // Air 1 block from north boundary
    northChunk.setVoxel(15, 51, 31, 0);  // Air at boundary from north side
    northChunk.setVoxel(15, 51, 30, 0);  // Air 1 block from boundary on north side
    
    centerChunk.setVoxel(15, 51, 30, 0); // Air 2 blocks from south boundary
    centerChunk.setVoxel(15, 51, 31, 0); // Air 1 block from south boundary
    southChunk.setVoxel(15, 51, 0, 0);   // Air at boundary from south side
    southChunk.setVoxel(15, 51, 1, 0);   // Air 1 block from boundary on south side
    
    // Test symmetric boundaries - these should have identical AO
    const symmetricTests = [
      {
        name: 'East Boundary (symmetric)',
        centerPos: [31, 50, 15],
        neighborPos: [0, 50, 15],
        centerChunk: centerChunk,
        neighborChunk: eastChunk
      },
      {
        name: 'West Boundary (symmetric)',
        centerPos: [0, 50, 15],
        neighborPos: [31, 50, 15],
        centerChunk: centerChunk,
        neighborChunk: westChunk
      },
      {
        name: 'North Boundary (symmetric)',
        centerPos: [15, 50, 0],
        neighborPos: [15, 50, 31],
        centerChunk: centerChunk,
        neighborChunk: northChunk
      },
      {
        name: 'South Boundary (symmetric)',
        centerPos: [15, 50, 31],
        neighborPos: [15, 50, 0],
        centerChunk: centerChunk,
        neighborChunk: southChunk
      }
    ];
    
    const faces = ['top', 'north', 'south', 'east', 'west'];
    let symmetricInconsistencies = [];
    
    for (const test of symmetricTests) {
      console.log(`\nTesting ${test.name}:`);
      
      for (const face of faces) {
        for (let corner = 0; corner < 4; corner++) {
          try {
            const centerAO = aoCalculator.calculateVertexAO(
              test.centerChunk, test.centerPos[0], test.centerPos[1], test.centerPos[2], 
              face, corner
            );
            
            const neighborAO = aoCalculator.calculateVertexAO(
              test.neighborChunk, test.neighborPos[0], test.neighborPos[1], test.neighborPos[2], 
              face, corner
            );
            
            const difference = Math.abs(centerAO - neighborAO);
            
            console.log(`  ${face} face, corner ${corner}: Center=${centerAO.toFixed(3)}, Neighbor=${neighborAO.toFixed(3)}, diff=${difference.toFixed(6)}`);
            
            // For symmetric patterns, we expect NO difference
            if (difference > 0.001) {
              symmetricInconsistencies.push({
                boundary: test.name,
                face: face,
                corner: corner,
                centerAO: centerAO,
                neighborAO: neighborAO,
                difference: difference
              });
              
              console.log(`    ❌ UNEXPECTED DIFFERENCE: ${difference.toFixed(6)}`);
            } else {
              console.log(`    ✅ CONSISTENT`);
            }
            
          } catch (error) {
            console.log(`  ${face} face, corner ${corner}: ERROR - ${error.message}`);
            symmetricInconsistencies.push({
              boundary: test.name,
              face: face,
              corner: corner,
              error: error.message
            });
          }
        }
      }
    }
    
    console.log(`\n=== Symmetric Pattern Summary ===`);
    console.log(`Unexpected inconsistencies in symmetric patterns: ${symmetricInconsistencies.length}`);
    
    if (symmetricInconsistencies.length > 0) {
      console.log('\nProblematic boundaries:');
      const byBoundary = {};
      symmetricInconsistencies.forEach(inc => {
        if (!byBoundary[inc.boundary]) byBoundary[inc.boundary] = [];
        byBoundary[inc.boundary].push(inc);
      });
      
      Object.keys(byBoundary).forEach(boundary => {
        console.log(`  ${boundary}: ${byBoundary[boundary].length} issues`);
      });
    }
    
    // For symmetric patterns, we should have NO inconsistencies
    expect(symmetricInconsistencies.length).toBe(0);
  });
});