/**
 * Chunk implementation
 */

import { BIOMES, BIOME_CONFIG, generateBiomeHeight, getBiomeBlockType, SEA_LEVEL } from './biomes.js';
import { BLOCK_TYPES } from './blocks.js';
import { DEBUG } from './config.js';
import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './chunkCore.js';
import { generateMeshData } from './greedyMesh.js';
// generateMeshData() returns plain arrays compatible with src/gl/buffers.js

export class Chunk {
  constructor(chunkX, chunkZ) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;

    // Voxel data
    this.voxels = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH);

    // Mesh generation state
    this.needsUpdate = true;
    this.hasVoxelData = false;
    this.meshReady = false; // Track when mesh is ready for rendering
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
    return generateMeshData(this, this.getVoxelWithNeighbors.bind(this), this.chunkX, this.chunkZ);
  }

  updateMesh(forceUpdate = false) {
    if (!this.needsUpdate && !forceUpdate) return;

    // Only generate mesh if we have all required neighbors, unless forced
    if (!forceUpdate && !this.canGenerateMesh()) {
      return;
    }

    const meshData = this.generateMeshData();
    this.meshData = meshData;
    this.meshReady = true;
    this.needsUpdate = false;
  }

  // Store mesh data for WebGL rendering (src/gl/buffers.js handles actual GL buffers)
  _createMeshFromData(meshData) {
    this.meshData = meshData;
    this.needsUpdate = false;
  }

  _updateMeshInPlace(meshData) {
    this.meshData = meshData;
    this.needsUpdate = false;
  }

  /**
   * Build mesh from worker-provided mesh payload (WebGL2 compatible)
   * meshData: { positions: Float32Array, normals: Float32Array, colors: Float32Array, indices: Uint32Array }
   */
  fromWorkerMesh(meshData) {
    // console.log(`[Chunk] fromWorkerMesh for ${this.chunkX},${this.chunkZ}:`, {
    //   hasPositions: !!meshData?.positions,
    //   positionLength: meshData?.positions?.length,
    //   hasColors: !!meshData?.colors,
    //   hasNormals: !!meshData?.normals,
    //   hasIndices: !!meshData?.indices
    // });
    this.hasVoxelData = true;
    this.meshData = meshData;
    this._createMeshFromData(meshData);
    this.meshReady = true;
    this.needsUpdate = false;
  }

  dispose() {
    // Cleanup - mesh handled by src/gl/buffers.js
    this.meshData = null;
    this.meshReady = false;
  }
}
