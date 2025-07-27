import { createNoise2D } from 'simplex-noise';
import { Chunk, CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from '../chunk.js';

self.onmessage = function(e) {
  const { chunkX, chunkZ, noiseSeed } = e.data;
  
  try {
    const noise = createNoise2D(() => noiseSeed);
    const chunk = new Chunk(chunkX, chunkZ);
    chunk.generate(noise);
    
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
