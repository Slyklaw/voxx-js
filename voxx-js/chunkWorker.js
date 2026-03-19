import { createNoise2D } from 'https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js';
import { ChunkCore, CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './chunkCore.js';
import { BIOME_CONFIG } from './biomes.js';
import { BLOCK_TYPES, BLOCKS, getBlockColor } from './blocks.js';
import { DEBUG } from './config.js';
import { generateMeshData } from './greedyMesh.js';

self.onmessage = function (e) {
  const { chunkX, chunkZ, noiseSeed, callbackId } = e.data;
  // console.log(`[ChunkWorker] Starting generation for chunk ${chunkX},${chunkZ}`);

  try {
    // Create separate noise functions for height and biome generation
    const heightNoise = createNoise2D(() => noiseSeed);
    const biomeNoise = createNoise2D(() => noiseSeed * BIOME_CONFIG.BIOME_SEED_MULTIPLIER);

    const chunk = new ChunkCore(chunkX, chunkZ);
    chunk.generate(heightNoise, biomeNoise);

    // Generate mesh data using greedy meshing
    const meshData = generateMeshData(chunk, chunk.getVoxel.bind(chunk), chunkX, chunkZ);

    // Serialize chunk data with mesh
    const chunkData = {
      chunkX,
      chunkZ,
      voxels: chunk.voxels,
      meshData: meshData
    };

    // Debug: Log UV data for first few chunks with water
      if (DEBUG && meshData.uvs && meshData.uvs.length >= 8) {
      const uMin = Math.min(...meshData.uvs.slice(0,8).filter((_,i)=>i%2===0));
      const uMax = Math.max(...meshData.uvs.slice(0,8).filter((_,i)=>i%2===0));
      const vMin = Math.min(...meshData.uvs.slice(0,8).filter((_,i)=>i%2===1));
      const vMax = Math.max(...meshData.uvs.slice(0,8).filter((_,i)=>i%2===1));
      if (uMax > 0.1 || vMax > 0.1) {  // Only log if UVs seem large
        console.log(`[ChunkWorker] Chunk ${chunkX},${chunkZ} UV range: u=[${uMin.toFixed(4)}, ${uMax.toFixed(4)}], v=[${vMin.toFixed(4)}, ${vMax.toFixed(4)}]`);
      }
    }

    // console.log(`[ChunkWorker] Completed generation for chunk ${chunkX},${chunkZ}, vertices: ${meshData.positions.length / 3}`);
    
    self.postMessage({
      type: 'chunkGenerated',
      chunkData,
      callbackId
    });
  } catch (error) {
    // console.error(`[ChunkWorker] Error generating chunk ${chunkX},${chunkZ}:`, error);
    self.postMessage({
      type: 'error',
      error: error.message,
      callbackId
    });
  }
};
