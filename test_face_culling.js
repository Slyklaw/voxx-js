/**
 * Test script to verify face culling optimization at chunk boundaries
 */

import { World } from './src/world.js';
import { Chunk, CHUNK_WIDTH, CHUNK_DEPTH } from './src/chunk.js';

// Mock THREE.js objects for testing
const mockScene = {
  add: () => {},
  remove: () => {}
};

// Simple noise function for testing
function simpleNoise(x, z) {
  return Math.sin(x * 0.1) * Math.cos(z * 0.1) * 0.5;
}

// Test face culling optimization
async function testFaceCulling() {
  console.log('Testing face culling optimization...');
  
  const world = new World(12345, mockScene);
  
  // Create a 3x3 grid of chunks centered at origin
  const chunks = [];
  for (let x = -1; x <= 1; x++) {
    for (let z = -1; z <= 1; z++) {
      const chunk = world.getChunk(x, z);
      chunks.push(chunk);
    }
  }
  
  // Wait for chunks to generate
  await new Promise(resolve => {
    let generatedCount = 0;
    const checkGenerated = () => {
      generatedCount = chunks.filter(chunk => chunk.isGenerated).length;
      if (generatedCount === chunks.length) {
        resolve();
      } else {
        setTimeout(checkGenerated, 100);
      }
    };
    checkGenerated();
  });
  
  console.log('All chunks generated, testing face culling...');
  
  // Test the center chunk (0,0) - it should have all neighbors
  const centerChunk = world.chunks['0,0'];
  
  // Count faces before and after neighbor loading
  const meshBefore = centerChunk.createMesh();
  const facesBefore = meshBefore.geometry.index.count / 3;
  
  // Force regeneration with neighbors available
  centerChunk.hasMesh = false;
  const meshAfter = centerChunk.createMesh();
  const facesAfter = meshAfter.geometry.index.count / 3;
  
  console.log(`Center chunk faces - Before: ${facesBefore}, After: ${facesAfter}`);
  console.log(`Face reduction: ${facesBefore - facesAfter} faces (${((facesBefore - facesAfter) / facesBefore * 100).toFixed(1)}%)`);
  
  // Test edge chunk (1,0) - should have fewer neighbors
  const edgeChunk = world.chunks['1,0'];
  const edgeMesh = edgeChunk.createMesh();
  const edgeFaces = edgeMesh.geometry.index.count / 3;
  
  console.log(`Edge chunk faces: ${edgeFaces}`);
  
  // Cleanup
  world.dispose();
  
  console.log('Face culling test completed!');
}

// Run the test
testFaceCulling().catch(console.error);