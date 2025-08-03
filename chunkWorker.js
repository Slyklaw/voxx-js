import { createNoise2D } from 'https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/cjs/simplex-noise.min.js';
import { Chunk, CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './chunk.js';
import { BIOME_CONFIG } from './biomes.js';

self.onmessage = function(e) {
  const { chunkX, chunkZ, noiseSeed } = e.data;
  
  try {
    // Create separate noise functions for height and biome generation
    const heightNoise = createNoise2D(() => noiseSeed);
    const biomeNoise = createNoise2D(() => noiseSeed * BIOME_CONFIG.BIOME_SEED_MULTIPLIER);
    
    const chunk = new Chunk(chunkX, chunkZ);
    chunk.generate(heightNoise, biomeNoise);
    
    // Serialize chunk data
    const chunkData = {
      chunkX,
      chunkZ,
      voxels: chunk.voxels
    };
    
    self.postMessage({
      type: 'chunkGenerated',
      chunkData,
      callbackId: e.data.callbackId
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message
    });
  }
};
