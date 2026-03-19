import { createNoise2D } from 'https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js';
import { ChunkCore, CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './chunkCore.js';
import { BIOME_CONFIG } from './biomes.js';
import { getBlockColor, BLOCK_TYPES, BLOCKS } from './blocks.js';
import { DEBUG } from './config.js';

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
    const meshData = generateMeshData(chunk, chunkX, chunkZ);

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

/**
 * Generate mesh data using greedy meshing algorithm
 * This is moved from the main thread to improve performance
 */
function generateMeshData(chunk, chunkX, chunkZ) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const tileBase = [];  // Tile base UV coordinates for atlas wrapping
  const indices = [];
  const colors = [];
  const blockTypes = [];
  const triangleVariant = [];  // Per-vertex triangle identifier for debug mode
  let uvDebugCount = 0;
  
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

              // Get the block color and type
            const blockIndex = Math.abs(val);

            // Add UV coordinates for texture mapping
            const block = BLOCKS[blockIndex];
            let atlasX, atlasY;
            let tileU0, tileV0, tileU1, tileV1;
            
            if (blockIndex !== BLOCK_TYPES.AIR) {
              // Get atlas position based on face direction (normal)
              // Determine face type from normal direction
              if (normal[1] > 0) {
                // Top face
                atlasX = block.atlasPos.top[0];
                atlasY = block.atlasPos.top[1];
              } else if (normal[1] < 0) {
                // Bottom face
                atlasX = block.atlasPos.bottom[0];
                atlasY = block.atlasPos.bottom[1];
              } else {
                // Side face
                atlasX = block.atlasPos.sides[0];
                atlasY = block.atlasPos.sides[1];
              }
              
              // Convert pixel position to normalized UV coordinates
              // Atlas is 1024x512, each tile is 16x16 pixels
              const ATLAS_WIDTH = 1024;
              const ATLAS_HEIGHT = 512;
              const TILE_SIZE = 16;
              
              // Calculate UV bounds for a SINGLE tile
              tileU0 = atlasX / ATLAS_WIDTH;
              tileV0 = atlasY / ATLAS_HEIGHT;
              tileU1 = (atlasX + TILE_SIZE) / ATLAS_WIDTH;
              tileV1 = (atlasY + TILE_SIZE) / ATLAS_HEIGHT;
              
              // Tile span in UV space
              const tileSpanU = tileU1 - tileU0;
              const tileSpanV = tileV1 - tileV0;
              
              // Scale UVs by face dimensions for tiling
              // Left edge: UV = tileU0, Right edge: UV = tileU0 + w * tileSpanU
              // Bottom edge: UV = tileV0, Top edge: UV = tileV0 + h * tileSpanV
              const scaledU0 = tileU0;
              const scaledV0 = tileV0;
              const scaledU1 = tileU0 + w * tileSpanU;
              const scaledV1 = tileV0 + h * tileSpanV;
              
              // Push scaled UVs (will be wrapped in shader)
              uvs.push(
                scaledU0, scaledV0,  // v1 - bottom-left
                scaledU1, scaledV0,  // v2 - bottom-right
                scaledU0, scaledV1,  // v3 - top-left
                scaledU1, scaledV1   // v4 - top-right
              );
              
              // Push tile base coordinates (same for all 4 vertices)
              tileBase.push(
                tileU0, tileV0,
                tileU0, tileV0,
                tileU0, tileV0,
                tileU0, tileV0
              );
              
              const blockColor = getBlockColor(blockIndex);
              for (let i = 0; i < 4; i++) {
                colors.push(blockColor.r, blockColor.g, blockColor.b);
                blockTypes.push(blockIndex);
              }
            } else {
              // Default values for AIR blocks
              uvs.push(0, 0, 1, 0, 0, 1, 1, 1);
              tileBase.push(0, 0, 0, 0, 0, 0, 0, 0);
              const blockColor = getBlockColor(blockIndex);
              for (let i = 0; i < 4; i++) {
                colors.push(blockColor.r, blockColor.g, blockColor.b);
                blockTypes.push(blockIndex);
              }
            }

            // Add triangle variant for debug mode (triangle 1 = 0.0, triangle 2 = 1.0)
            // Each quad creates two triangles: (v1,v2,v3) and (v2,v4,v3)
            // v1=0.0, v2=0.0, v3=0.0 for triangle 1 → all interpolate to 0.0
            // v2=1.0, v4=1.0, v3=1.0 for triangle 2 → all interpolate to 1.0
            if (val > 0) {
              triangleVariant.push(0.0, 0.0, 0.0, 1.0);  // v1,v2,v3 get 0.0; v4 gets 1.0
            } else {
              triangleVariant.push(1.0, 1.0, 1.0, 0.0);  // v1,v2,v3 get 1.0; v4 gets 0.0
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
    tileBase: new Float32Array(tileBase),
    indices: new Uint32Array(indices),
    colors: new Float32Array(colors),
    blockTypes: new Float32Array(blockTypes),
    triangleVariant: new Float32Array(triangleVariant)
  };
}
