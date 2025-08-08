/**
 * Chunk implementation
 */

import { getBlockColor, BLOCK_TYPES } from './blocks.js';
import { BIOMES, BIOME_CONFIG, generateBiomeHeight, getBiomeBlockType, SEA_LEVEL } from './biomes.js';
import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// Chunk constants
export const CHUNK_WIDTH = 32;
export const CHUNK_HEIGHT = 256;
export const CHUNK_DEPTH = 32;

export class Chunk {
  constructor(chunkX, chunkZ) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;

    // Voxel data
    this.voxels = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH);

    // Three.js objects
    this.mesh = null;
    this.geometry = null;
    this.material = null;

    // Mesh generation state
    this.needsUpdate = true;
    this.hasVoxelData = false;
    this.neighborChunks = {
      north: null,  // z - 1
      south: null,  // z + 1
      east: null,   // x + 1
      west: null    // x - 1
    };
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

  // Get voxel with neighbor chunk support
  getVoxelWithNeighbors(x, y, z) {
    // If within this chunk, return directly
    if (x >= 0 && x < CHUNK_WIDTH && y >= 0 && y < CHUNK_HEIGHT && z >= 0 && z < CHUNK_DEPTH) {
      return this.getVoxel(x, y, z);
    }

    // Check neighboring chunks
    if (x < 0 && this.neighborChunks.west) {
      return this.neighborChunks.west.getVoxel(CHUNK_WIDTH + x, y, z);
    }
    if (x >= CHUNK_WIDTH && this.neighborChunks.east) {
      return this.neighborChunks.east.getVoxel(x - CHUNK_WIDTH, y, z);
    }
    if (z < 0 && this.neighborChunks.north) {
      return this.neighborChunks.north.getVoxel(x, y, CHUNK_DEPTH + z);
    }
    if (z >= CHUNK_DEPTH && this.neighborChunks.south) {
      return this.neighborChunks.south.getVoxel(x, y, z - CHUNK_DEPTH);
    }

    // Default to air if neighbor not available
    return 0;
  }

  // Check if all required neighbors are available for mesh generation
  canGenerateMesh() {
    return this.hasVoxelData &&
      this.neighborChunks.north && this.neighborChunks.north.hasVoxelData &&
      this.neighborChunks.south && this.neighborChunks.south.hasVoxelData &&
      this.neighborChunks.east && this.neighborChunks.east.hasVoxelData &&
      this.neighborChunks.west && this.neighborChunks.west.hasVoxelData;
  }

  // Set neighbor chunk references
  setNeighbors(north, south, east, west) {
    this.neighborChunks.north = north;
    this.neighborChunks.south = south;
    this.neighborChunks.east = east;
    this.neighborChunks.west = west;
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

    // Mark that this chunk has voxel data
    this.hasVoxelData = true;
  }

  generateMeshData() {
    const positions = [];
    const normals = [];
    const colors = [];
    const indices = [];

    const dims = [CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH];

    // Greedy meshing algorithm
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
            const val1 = this.getVoxelWithNeighbors(x[0], x[1], x[2]);
            const val2 = this.getVoxelWithNeighbors(x[0] + q[0], x[1] + q[1], x[2] + q[2]);
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

  updateMesh(forceUpdate = false) {
    if (!this.needsUpdate && !forceUpdate) return;
    
    // Only generate mesh if we have all required neighbors, unless forced
    if (!forceUpdate && !this.canGenerateMesh()) {
      return;
    }

    const meshData = this.generateMeshData();
    this._createMeshFromData(meshData);
  }

  /**
   * Build Three.js mesh from worker-provided mesh payload
   * meshData: { positions: Float32Array, normals: Float32Array, colors: Float32Array, indices: Uint32Array }
   */
  fromWorkerMesh(meshData) {
    this.hasVoxelData = true;
    this._createMeshFromData(meshData);
  }

  _createMeshFromData(meshData) {
    console.log(`[Chunk ${this.chunkX},${this.chunkZ}] _createMeshFromData called`);

    if (!meshData || meshData.positions.length === 0) {
      // Empty chunk
      console.log(`[Chunk ${this.chunkX},${this.chunkZ}] Empty chunk - removing mesh`);
      if (this.mesh) {
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.mesh = null;
      }
      this.needsUpdate = false;
      return;
    }

    console.log(`[Chunk ${this.chunkX},${this.chunkZ}] Creating new mesh with ${meshData.positions.length / 3} vertices`);

    // Create geometry
    const geometry = new THREE.BufferGeometry();

    // Set attributes
    geometry.setAttribute('position', new THREE.BufferAttribute(meshData.positions, 3));
    geometry.setAttribute('normal', new THREE.BufferAttribute(meshData.normals, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(meshData.colors, 3));
    geometry.setIndex(new THREE.BufferAttribute(meshData.indices, 1));

    // Create material
    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      transparent: false,
      side: THREE.FrontSide
    });

    // Create mesh
    if (this.mesh) {
      console.log(`[Chunk ${this.chunkX},${this.chunkZ}] Disposing old mesh`);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }

    this.mesh = new THREE.Mesh(geometry, material);
    this.needsUpdate = false;
    console.log(`[Chunk ${this.chunkX},${this.chunkZ}] New mesh created successfully`);
  }

  dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
  }
}
