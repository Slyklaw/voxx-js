import { BLOCKS, BLOCK_TYPES, getBlockColor } from './blocks.js';
import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './src/constants.js';
import { DEBUG, ATLAS_CONFIG } from './config.js';

/**
 * Generate mesh data using greedy meshing algorithm
 * @param {Object} chunk - Chunk object with voxel data
 * @param {Function} getVoxelFn - Function to get voxel value at (x, y, z)
 * @param {number} chunkX - Chunk X coordinate (for world-space positioning)
 * @param {number} chunkZ - Chunk Z coordinate (for world-space positioning)
 * @returns {Object} Mesh data with positions, normals, colors, uvs, tileBase, indices, blockTypes, triangleVariant
 */
export function generateMeshData(chunk, getVoxelFn, chunkX, chunkZ) {
  const positions = [];
  const normals = [];
  const uvs = [];
  const tileBase = [];
  const indices = [];
  const colors = [];
  const blockTypes = [];
  const triangleVariant = [];

  const worldOffsetX = chunkX * CHUNK_WIDTH;
  const worldOffsetZ = chunkZ * CHUNK_DEPTH;

  const dims = [CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH];

  for (let d = 0; d < 3; d++) {
    const u = (d + 1) % 3;
    const v = (d + 2) % 3;

    const x = [0, 0, 0];
    const q = [0, 0, 0];
    q[d] = 1;

    const mask = new Int32Array(dims[u] * dims[v]);

    for (x[d] = -1; x[d] < dims[d];) {
      let n = 0;
      for (x[v] = 0; x[v] < dims[v]; x[v]++) {
        for (x[u] = 0; x[u] < dims[u]; x[u]++) {
          const val1 = x[d] >= 0 ? getVoxelFn(x[0], x[1], x[2]) : 0;
          const val2 = x[d] < dims[d] - 1 ? getVoxelFn(x[0] + q[0], x[1] + q[1], x[2] + q[2]) : 0;
          mask[n++] = (val1 && !val2) ? val1 : (!val1 && val2) ? -val2 : 0;
        }
      }

      x[d]++;
      n = 0;

      for (let j = 0; j < dims[v]; j++) {
        for (let i = 0; i < dims[u];) {
          if (mask[n]) {
            const val = mask[n];
            let w = 1;
            while (i + w < dims[u] && mask[n + w] === val) {
              w++;
            }

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
            positions.push(x[0] + worldOffsetX, x[1], x[2] + worldOffsetZ);
            positions.push(x[0] + du[0] + worldOffsetX, x[1] + du[1], x[2] + du[2] + worldOffsetZ);
            positions.push(x[0] + dv[0] + worldOffsetX, x[1] + dv[1], x[2] + dv[2] + worldOffsetZ);
            positions.push(x[0] + du[0] + dv[0] + worldOffsetX, x[1] + du[1] + dv[1], x[2] + du[2] + dv[2] + worldOffsetZ);

            const normal = [0, 0, 0];
            if (val > 0) { normal[d] = 1; } else { normal[d] = -1; }
            normals.push(...normal, ...normal, ...normal, ...normal);

            const blockIndex = Math.abs(val);
            const block = BLOCKS[blockIndex];
            let atlasX, atlasY;
            let tileU0, tileV0, tileU1, tileV1;

            if (blockIndex !== BLOCK_TYPES.AIR) {
              if (normal[1] > 0) {
                atlasX = block.atlasPos.top[0];
                atlasY = block.atlasPos.top[1];
              } else if (normal[1] < 0) {
                atlasX = block.atlasPos.bottom[0];
                atlasY = block.atlasPos.bottom[1];
              } else {
                atlasX = block.atlasPos.sides[0];
                atlasY = block.atlasPos.sides[1];
              }

              tileU0 = atlasX / ATLAS_CONFIG.ATLAS_WIDTH;
              tileV0 = atlasY / ATLAS_CONFIG.ATLAS_HEIGHT;
              tileU1 = (atlasX + ATLAS_CONFIG.TILE_SIZE) / ATLAS_CONFIG.ATLAS_WIDTH;
              tileV1 = (atlasY + ATLAS_CONFIG.TILE_SIZE) / ATLAS_CONFIG.ATLAS_HEIGHT;

              const tileSpanU = tileU1 - tileU0;
              const tileSpanV = tileV1 - tileV0;

              const scaledU0 = tileU0;
              const scaledV0 = tileV0;
              const scaledU1 = tileU0 + w * tileSpanU;
              const scaledV1 = tileV0 + h * tileSpanV;

              uvs.push(scaledU0, scaledV0, scaledU1, scaledV0, scaledU0, scaledV1, scaledU1, scaledV1);

              tileBase.push(tileU0, tileV0, tileU0, tileV0, tileU0, tileV0, tileU0, tileV0);

              const blockColor = getBlockColor(blockIndex);
              for (let vi = 0; vi < 4; vi++) {
                colors.push(blockColor.r, blockColor.g, blockColor.b);
                blockTypes.push(blockIndex);
              }
            } else {
              uvs.push(0, 0, 1, 0, 0, 1, 1, 1);
              tileBase.push(0, 0, 0, 0, 0, 0, 0, 0);
              const blockColor = getBlockColor(blockIndex);
              for (let vi = 0; vi < 4; vi++) {
                colors.push(blockColor.r, blockColor.g, blockColor.b);
                blockTypes.push(blockIndex);
              }
            }

            if (val > 0) {
              triangleVariant.push(0.0, 0.0, 0.0, 1.0);
            } else {
              triangleVariant.push(1.0, 1.0, 1.0, 0.0);
            }

            if (val > 0) {
              indices.push(vertexCount, vertexCount + 1, vertexCount + 2);
              indices.push(vertexCount + 1, vertexCount + 3, vertexCount + 2);
            } else {
              indices.push(vertexCount, vertexCount + 2, vertexCount + 1);
              indices.push(vertexCount + 1, vertexCount + 2, vertexCount + 3);
            }

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
