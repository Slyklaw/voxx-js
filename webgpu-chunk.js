/**
 * WebGPU Chunk implementation
 * Replaces Three.js mesh generation with WebGPU buffers
 */

import { getBlockColor, BLOCK_TYPES } from './blocks.js';
import { BIOMES, BIOME_CONFIG, generateBiomeHeight, getBiomeBlockType, SEA_LEVEL } from './biomes.js';

// Chunk constants (copied from chunk.js to avoid Three.js dependency)
export const CHUNK_WIDTH = 32;
export const CHUNK_HEIGHT = 256;
export const CHUNK_DEPTH = 32;

export class WebGPUChunk {
  constructor(chunkX, chunkZ, device) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.device = device;
    
    // Voxel data
    this.voxels = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH);
    
    // WebGPU buffers
    this.vertexBuffer = null;
    this.indexBuffer = null;
    this.indexCount = 0;
    this.voxelBuffer = null;
    
    // Mesh generation state
    this.needsUpdate = true;

    // Flag to indicate worker-driven mesh path
    this.workerBacked = false;
  }

  getVoxel(x, y, z) {
    if (x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_DEPTH) {
      return 0;
    }
    const index = y * CHUNK_WIDTH * CHUNK_DEPTH + z * CHUNK_WIDTH + x;
    return this.voxels[index];
  }

  setVoxel(x, y, z, value) {
    if (x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_DEPTH) {
      return;
    }
    const index = y * CHUNK_WIDTH * CHUNK_DEPTH + z * CHUNK_WIDTH + x;
    this.voxels[index] = value;
    this.needsUpdate = true;
  }

  /** Generate terrain data using biome-based noise functions */
  generate(heightNoise, biomeNoise) {
    const biomeList = Object.values(BIOMES);

    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let z = 0; z < CHUNK_DEPTH; z++) {
        const worldX = this.chunkX * CHUNK_WIDTH + x;
        const worldZ = this.chunkZ * CHUNK_DEPTH + z;

        // Sample biome noise to determine biome blend
        const biomeValue = biomeNoise(worldX / BIOME_CONFIG.BIOME_SCALE, worldZ / BIOME_CONFIG.BIOME_SCALE);
        const normalizedBiome = (biomeValue + 1) * 0.5; // Convert from [-1,1] to [0,1]

        // Determine primary and secondary biomes for blending
        const biomeIndex = normalizedBiome * (biomeList.length - 0.001); // Slight offset to avoid edge case
        const primaryBiomeIdx = Math.floor(biomeIndex);
        const secondaryBiomeIdx = Math.min(primaryBiomeIdx + 1, biomeList.length - 1);
        const blendFactor = biomeIndex - primaryBiomeIdx;

        const primaryBiome = biomeList[primaryBiomeIdx];
        const secondaryBiome = biomeList[secondaryBiomeIdx];

        // Generate height for each biome
        const primaryHeight = generateBiomeHeight(worldX, worldZ, primaryBiome, heightNoise);
        const secondaryHeight = generateBiomeHeight(worldX, worldZ, secondaryBiome, heightNoise);

        // Blend heights between biomes
        const finalHeight = Math.floor(primaryHeight * (1 - blendFactor) + secondaryHeight * blendFactor);
        const clampedHeight = Math.max(0, Math.min(CHUNK_HEIGHT - 1, finalHeight));

        // Determine which biome is dominant for block type selection
        const dominantBiome = blendFactor < 0.5 ? primaryBiome : secondaryBiome;

        // Generate terrain blocks
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          if (y < clampedHeight) {
            const blockType = getBiomeBlockType(y, clampedHeight, dominantBiome);
            this.setVoxel(x, y, z, blockType);
          }
        }
      }
    }

    // Add water below sea level
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let z = 0; z < CHUNK_DEPTH; z++) {
        for (let y = SEA_LEVEL; y >= 0; y--) {
          if (this.getVoxel(x, y, z) === BLOCK_TYPES.AIR) {
            this.setVoxel(x, y, z, BLOCK_TYPES.WATER);
          }
        }
      }
    }
  }

  createVoxelBuffer() {
    // Create storage buffer for voxel data (for compute shader)
    this.voxelBuffer = this.device.createBuffer({
      size: this.voxels.byteLength,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
    });
    
    this.device.queue.writeBuffer(this.voxelBuffer, 0, this.voxels);
  }

  generateMeshData() {
    const positions = [];
    const normals = [];
    const colors = [];
    const indices = [];

    const dims = [CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH];

    // Greedy meshing algorithm (same as original but optimized for WebGPU)
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
            const val1 = x[d] >= 0 ? this.getVoxel(x[0], x[1], x[2]) : 0;
            const val2 = x[d] < dims[d] - 1 ? this.getVoxel(x[0] + q[0], x[1] + q[1], x[2] + q[2]) : 0;
            mask[n++] = (val1 && !val2) ? val1 : (!val1 && val2) ? -val2 : 0;
          }
        }

        x[d]++;
        n = 0;

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

              // Create quad vertices with world positioning
              const worldOffsetX = this.chunkX * CHUNK_WIDTH;
              const worldOffsetZ = this.chunkZ * CHUNK_DEPTH;
              
              const v1 = [x[0] + worldOffsetX, x[1], x[2] + worldOffsetZ];
              const v2 = [x[0] + du[0] + worldOffsetX, x[1] + du[1], x[2] + du[2] + worldOffsetZ];
              const v3 = [x[0] + dv[0] + worldOffsetX, x[1] + dv[1], x[2] + dv[2] + worldOffsetZ];
              const v4 = [x[0] + du[0] + dv[0] + worldOffsetX, x[1] + du[1] + dv[1], x[2] + du[2] + dv[2] + worldOffsetZ];

              positions.push(...v1, ...v2, ...v3, ...v4);

              // Calculate normal
              const normal = [0, 0, 0];
              if (val > 0) { normal[d] = 1; } else { normal[d] = -1; }
              normals.push(...normal, ...normal, ...normal, ...normal);

              // Get block color
              const blockIndex = Math.abs(val);
              const blockColor = getBlockColor(blockIndex);
              for (let i = 0; i < 4; i++) {
                colors.push(blockColor.r, blockColor.g, blockColor.b);
              }

              // Create indices for two triangles
              if (val > 0) {
                indices.push(vertexCount, vertexCount + 1, vertexCount + 2);
                indices.push(vertexCount + 1, vertexCount + 3, vertexCount + 2);
              } else {
                indices.push(vertexCount, vertexCount + 2, vertexCount + 1);
                indices.push(vertexCount + 1, vertexCount + 2, vertexCount + 3);
              }

              // Clear mask
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
      colors: new Float32Array(colors),
      indices: new Uint32Array(indices)
    };
  }

  updateMesh() {
    if (!this.needsUpdate) return;

    const meshData = this.generateMeshData();
    this._uploadMesh(meshData);
  }

  /**
   * Build GPU buffers from worker-provided mesh payload
   * meshData: { positions: Float32Array, normals: Float32Array, colors: Float32Array, indices: Uint32Array }
   */
  fromWorkerMesh(meshData) {
    this.workerBacked = true;
    this._uploadMesh(meshData);
  }

  _uploadMesh(meshData) {
    if (!meshData || meshData.positions.length === 0) {
      // Empty chunk
      this.indexCount = 0;
      this.needsUpdate = false;
      return;
    }

    // Create interleaved vertex data (position + normal + color)
    const vertCount = meshData.positions.length / 3;
    const vertexData = new Float32Array(vertCount * 9);
    for (let i = 0; i < vertCount; i++) {
      const off = i * 9;
      const p = i * 3;
      // Position
      vertexData[off + 0] = meshData.positions[p + 0];
      vertexData[off + 1] = meshData.positions[p + 1];
      vertexData[off + 2] = meshData.positions[p + 2];
      // Normal
      vertexData[off + 3] = meshData.normals[p + 0];
      vertexData[off + 4] = meshData.normals[p + 1];
      vertexData[off + 5] = meshData.normals[p + 2];
      // Color
      vertexData[off + 6] = meshData.colors[p + 0];
      vertexData[off + 7] = meshData.colors[p + 1];
      vertexData[off + 8] = meshData.colors[p + 2];
    }

    // Create or update vertex buffer
    if (this.vertexBuffer) this.vertexBuffer.destroy();
    this.vertexBuffer = this.device.createBuffer({
      size: vertexData.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    this.device.queue.writeBuffer(this.vertexBuffer, 0, vertexData);

    // Create or update index buffer
    if (this.indexBuffer) this.indexBuffer.destroy();
    this.indexBuffer = this.device.createBuffer({
      size: meshData.indices.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });
    this.device.queue.writeBuffer(this.indexBuffer, 0, meshData.indices);

    this.indexCount = meshData.indices.length;
    this.needsUpdate = false;
  }

  dispose() {
    if (this.vertexBuffer) {
      this.vertexBuffer.destroy();
      this.vertexBuffer = null;
    }
    if (this.indexBuffer) {
      this.indexBuffer.destroy();
      this.indexBuffer = null;
    }
    if (this.voxelBuffer) {
      this.voxelBuffer.destroy();
      this.voxelBuffer = null;
    }
  }
}
