/**
 * Demonstration of face culling optimization at chunk boundaries
 * 
 * This script shows how the face culling optimization works when chunks
 * and their neighbors are loaded, reducing unnecessary faces at boundaries.
 */

import { World } from './src/world.js';
import { Chunk, CHUNK_WIDTH, CHUNK_DEPTH } from './src/chunk.js';

// Mock scene for demonstration
const mockScene = {
  add: () => console.log('Added mesh to scene'),
  remove: () => console.log('Removed mesh from scene')
};

// Simple noise function for terrain generation
function simpleNoise(x, z) {
  return Math.sin(x * 0.05) * Math.cos(z * 0.05) * 0.3;
}

async function demonstrateFaceCulling() {
  console.log('=== Face Culling Optimization Demo ===\n');
  
  const world = new World(12345, mockScene);
  
  console.log('1. Creating a 3x3 grid of chunks...');
  
  // Create chunks in a 3x3 grid
  const chunks = [];
  for (let x = -1; x <= 1; x++) {
    for (let z = -1; z <= 1; z++) {
      console.log(`   Loading chunk (${x}, ${z})`);
      const chunk = world.getChunk(x, z);
      chunks.push({ chunk, x, z });
    }
  }
  
  // Wait for all chunks to generate
  console.log('\n2. Waiting for chunks to generate...');
  await new Promise(resolve => {
    const checkAllGenerated = () => {
      const generatedCount = chunks.filter(({ chunk }) => chunk.isGenerated).length;
      if (generatedCount === chunks.length) {
        console.log(`   All ${chunks.length} chunks generated!`);
        resolve();
      } else {
        console.log(`   ${generatedCount}/${chunks.length} chunks generated...`);
        setTimeout(checkAllGenerated, 200);
      }
    };
    checkAllGenerated();
  });
  
  console.log('\n3. Analyzing face culling optimization...');
  
  // Test the center chunk (0,0) which should have all neighbors
  const centerChunkInfo = chunks.find(({ x, z }) => x === 0 && z === 0);
  const centerChunk = centerChunkInfo.chunk;
  
  console.log('\n   Center chunk (0,0) analysis:');
  console.log(`   - Has all 4 neighbors ready: ${centerChunk.areNeighborsReady()}`);
  
  // Create mesh and count faces
  const mesh = centerChunk.createMesh();
  const faceCount = mesh.geometry.index.count / 3;
  console.log(`   - Generated mesh with ${faceCount} faces`);
  
  // Test an edge chunk that has fewer neighbors
  const edgeChunkInfo = chunks.find(({ x, z }) => x === 1 && z === 0);
  const edgeChunk = edgeChunkInfo.chunk;
  
  console.log('\n   Edge chunk (1,0) analysis:');
  console.log(`   - Has all 4 neighbors ready: ${edgeChunk.areNeighborsReady()}`);
  
  const edgeMesh = edgeChunk.createMesh();
  const edgeFaceCount = edgeMesh.geometry.index.count / 3;
  console.log(`   - Generated mesh with ${edgeFaceCount} faces`);
  
  // Test a corner chunk that has even fewer neighbors
  const cornerChunkInfo = chunks.find(({ x, z }) => x === 1 && z === 1);
  const cornerChunk = cornerChunkInfo.chunk;
  
  console.log('\n   Corner chunk (1,1) analysis:');
  console.log(`   - Has all 4 neighbors ready: ${cornerChunk.areNeighborsReady()}`);
  
  const cornerMesh = cornerChunk.createMesh();
  const cornerFaceCount = cornerMesh.geometry.index.count / 3;
  console.log(`   - Generated mesh with ${cornerFaceCount} faces`);
  
  // Show AO statistics
  console.log('\n4. AO Optimization Statistics:');
  const stats = world.getAOStats();
  console.log(`   - Chunks with AO: ${stats.chunksWithAO}`);
  console.log(`   - Chunks without AO: ${stats.chunksWithoutAO}`);
  console.log(`   - Chunks upgraded: ${stats.chunksUpgraded}`);
  console.log(`   - AO percentage: ${stats.aoPercentage}%`);
  
  console.log('\n5. Demonstrating neighbor loading effect...');
  
  // Create a new isolated chunk to show the difference
  const isolatedChunk = new Chunk(10, 10, world);
  
  // Fill with some terrain
  for (let x = 0; x < CHUNK_WIDTH; x++) {
    for (let z = 0; z < CHUNK_DEPTH; z++) {
      for (let y = 0; y <= 50; y++) {
        isolatedChunk.setVoxel(x, y, z, 1);
      }
    }
  }
  isolatedChunk.isGenerated = true;
  
  // Create mesh without neighbors
  const isolatedMesh = isolatedChunk.createMesh();
  const isolatedFaceCount = isolatedMesh.geometry.index.count / 3;
  console.log(`   - Isolated chunk faces: ${isolatedFaceCount}`);
  
  // Now add it to the world and create a neighbor
  world.chunks['10,10'] = isolatedChunk;
  const neighborChunk = new Chunk(11, 10, world);
  
  // Fill neighbor with same terrain
  for (let x = 0; x < CHUNK_WIDTH; x++) {
    for (let z = 0; z < CHUNK_DEPTH; z++) {
      for (let y = 0; y <= 50; y++) {
        neighborChunk.setVoxel(x, y, z, 1);
      }
    }
  }
  neighborChunk.isGenerated = true;
  world.chunks['11,10'] = neighborChunk;
  
  // Regenerate isolated chunk mesh with neighbor available
  isolatedChunk.hasMesh = false;
  const isolatedMeshWithNeighbor = isolatedChunk.createMesh();
  const isolatedFaceCountWithNeighbor = isolatedMeshWithNeighbor.geometry.index.count / 3;
  
  console.log(`   - Same chunk with 1 neighbor: ${isolatedFaceCountWithNeighbor}`);
  console.log(`   - Face reduction: ${isolatedFaceCount - isolatedFaceCountWithNeighbor} faces`);
  
  console.log('\n=== Demo Complete ===');
  console.log('\nKey Benefits:');
  console.log('• Faces at chunk boundaries are properly culled when neighbors are loaded');
  console.log('• Reduces overdraw and improves rendering performance');
  console.log('• Seamless integration with existing AO system');
  console.log('• Automatic mesh regeneration when neighbors become available');
  
  // Cleanup
  world.dispose();
}

// Run the demonstration
demonstrateFaceCulling().catch(console.error);