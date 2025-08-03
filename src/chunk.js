import * as THREE from 'three';
import { BIOMES, BIOME_CONFIG, generateBiomeHeight, getBiomeBlockType, SEA_LEVEL } from './biomes.js';

export const CHUNK_WIDTH = 32;
export const CHUNK_HEIGHT = 256; // 8 layers * 32 = 256 blocks tall
export const CHUNK_DEPTH = 32;

const blocks = [
  { type: 'AIR', color: [0, 0, 0, 0] },
  { type: 'STONE', color: [128, 128, 128, 255] },
  { type: 'DIRT', color: [139, 69, 19, 255] },
  { type: 'GRASS', color: [95, 159, 53, 255] },
  { type: 'WATER', color: [30, 144, 255, 200] },
  { type: 'SNOW', color: [255, 255, 255, 255] },
];

export class Chunk {
  constructor(chunkX, chunkZ) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;

    // Voxel data: 1 for solid, 0 for air
    this.voxels = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH);
    this.mesh = null;
  }

  /** Helper to get/set voxel data using 3D coordinates */
  getVoxel(x, y, z) {
    const index = y * CHUNK_WIDTH * CHUNK_DEPTH + z * CHUNK_WIDTH + x;
    return this.voxels[index];
  }

  setVoxel(x, y, z, value) {
    const index = y * CHUNK_WIDTH * CHUNK_DEPTH + z * CHUNK_WIDTH + x;
    this.voxels[index] = value;
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
          if (this.getVoxel(x, y, z) === 0) { // AIR
            this.setVoxel(x, y, z, 4); // WATER
          }
        }
      }
    }
  }



  dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
  }

  /** Create a mesh from the voxel data using Greedy Meshing */
  createMesh() {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const colors = [];   // for vertex colors

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
            const val1 = x[d] >= 0 ? this.getVoxel(x[0], x[1], x[2]) : 0;
            const val2 = x[d] < dims[d] - 1 ? this.getVoxel(x[0] + q[0], x[1] + q[1], x[2] + q[2]) : 0;
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
              positions.push(x[0], x[1], x[2]);
              positions.push(x[0] + du[0], x[1] + du[1], x[2] + du[2]);
              positions.push(x[0] + dv[0], x[1] + dv[1], x[2] + dv[2]);
              positions.push(x[0] + du[0] + dv[0], x[1] + du[1] + dv[1], x[2] + du[2] + dv[2]);

              const normal = [0, 0, 0];
              if (val > 0) { normal[d] = 1; } else { normal[d] = -1; }
              normals.push(...normal, ...normal, ...normal, ...normal);

              uvs.push(0, 0, w, 0, 0, h, w, h);

              // Get the block color
              const blockIndex = Math.abs(val);
              const blockColor = blocks[blockIndex].color;
              const r = blockColor[0] / 255;
              const g = blockColor[1] / 255;
              const b = blockColor[2] / 255;
              // Push color for each vertex (4 times)
              for (let i = 0; i < 4; i++) {
                colors.push(r, g, b);
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

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.9,
      metalness: 0.0,
      shadowSide: THREE.DoubleSide // Ensure shadows work on both sides
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = true; // Enable frustum culling for performance
    return this.mesh;
  }
}
