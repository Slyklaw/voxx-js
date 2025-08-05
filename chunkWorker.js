import { createNoise2D } from 'https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js';
import { ChunkCore, CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './chunkCore.js';
import { BIOME_CONFIG } from './biomes.js';
import { getBlockColor } from './blocks.js';

self.onmessage = function (e) {
  const { chunkX, chunkZ, noiseSeed, callbackId } = e.data;

  try {
    // Create separate noise functions for height and biome generation
    const heightNoise = createNoise2D(() => noiseSeed);
    const biomeNoise = createNoise2D(() => noiseSeed * BIOME_CONFIG.BIOME_SEED_MULTIPLIER);

    const chunk = new ChunkCore(chunkX, chunkZ);
    chunk.generate(heightNoise, biomeNoise);

    // Generate mesh data using greedy meshing
    const meshData = generateMeshData(chunk, chunkX, chunkZ);

    // Serialize chunk data with mesh
    const chunkData = {
      chunkX,
      chunkZ,
      voxels: chunk.voxels,
      meshData: meshData
    };

    self.postMessage({
      type: 'chunkGenerated',
      chunkData,
      callbackId
    });
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message,
      callbackId
    });
  }
};

/**
 * Generate mesh data using greedy meshing algorithm
 * This is moved from the main thread to improve performance
 */
function generateMeshData(chunk, chunkX, chunkZ) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  const colors = [];
  
  // World-space offsets for this chunk
  const worldOffsetX = chunkX * CHUNK_WIDTH;
  const worldOffsetZ = chunkZ * CHUNK_DEPTH;

  const dims = [CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH];

  // Sweep over the 3 dimensions
  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3;
    const v = (d + 2) % 3;

    const x = [0, 0, 0];
    const q = [0, 0, 0];
    q[d] = 1;

    const mask = new Int32Array(dims[u] * dims[v]);

    // Sweep over the slices of the dimension
    for (x[d] = -1; x[d] < dims[d];) {
      let n = 0;
      for (x[v] = 0; x[v] < dims[v]; x[v]++) {
        for (x[u] = 0; x[u] < dims[u]; x[u]++) {
          const val1 = x[d] >= 0 ? chunk.getVoxel(x[0], x[1], x[2]) : 0;
          const val2 = x[d] < dims[d] - 1 ? chunk.getVoxel(x[0] + q[0], x[1] + q[1], x[2] + q[2]) : 0;
          mask[n++] = (val1 && !val2) ? val1 : (!val1 && val2) ? -val2 : 0;
        }
      }

      x[d]++;
      n = 0;

      // Generate mesh for this slice
      for (let j = 0; j < dims[v]; j++) {
        for (let i = 0; i < dims[u];) {
          if (mask[n]) {
            const val = mask[n];
            // Find width
            let w = 1;
            while (i + w < dims[u] && mask[n + w] === val) {
              w++;
            }

            // Find height
            let h = 1;
            while (j + h < dims[v]) {
              let k = 0;
              while (k < w && mask[n + k + h * dims[u]] === val) {
                k++;
              }
              if (k < w) break;
              h++;
            }

            x[u] = i;
            x[v] = j;

            const du = [0, 0, 0]; du[u] = w;
            const dv = [0, 0, 0]; dv[v] = h;

            const vertexCount = positions.length / 3;
            // Push positions in WORLD coordinates by adding chunk offsets
            positions.push(x[0] + worldOffsetX, x[1], x[2] + worldOffsetZ);
            positions.push(x[0] + du[0] + worldOffsetX, x[1] + du[1], x[2] + du[2] + worldOffsetZ);
            positions.push(x[0] + dv[0] + worldOffsetX, x[1] + dv[1], x[2] + dv[2] + worldOffsetZ);
            positions.push(x[0] + du[0] + dv[0] + worldOffsetX, x[1] + du[1] + dv[1], x[2] + du[2] + dv[2] + worldOffsetZ);

            const normal = [0, 0, 0];
            if (val > 0) { normal[d] = 1; } else { normal[d] = -1; }
            normals.push(...normal, ...normal, ...normal, ...normal);

            uvs.push(0, 0, w, 0, 0, h, w, h);

            // Get the block color
            const blockIndex = Math.abs(val);
            const blockColor = getBlockColor(blockIndex);
            // Push color for each vertex (4 times)
            for (let i = 0; i < 4; i++) {
              colors.push(blockColor.r, blockColor.g, blockColor.b);
            }

            if (val > 0) {
              // Front face
              indices.push(vertexCount, vertexCount + 1, vertexCount + 2);
              indices.push(vertexCount + 1, vertexCount + 3, vertexCount + 2);
            } else {
              // Back face (reverse winding)
              indices.push(vertexCount, vertexCount + 2, vertexCount + 1);
              indices.push(vertexCount + 1, vertexCount + 2, vertexCount + 3);
            }

            // Zero out the mask
            for (let l = 0; l < h; ++l) {
              for (let k = 0; k < w; ++k) {
                mask[n + k + l * dims[u]] = 0;
              }
            }
            i += w;
            n += w;
          } else {
            i++;
            n++;
          }
        }
      }
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
    colors: new Float32Array(colors)
  };
}
