import { BIOMES, BIOME_CONFIG, generateBiomeHeight, getBiomeBlockType, SEA_LEVEL } from './biomes.js';
import { BLOCK_TYPES } from './blocks.js';

export const CHUNK_WIDTH = 32;
export const CHUNK_HEIGHT = 256; // 8 layers * 32 = 256 blocks tall
export const CHUNK_DEPTH = 32;

export class ChunkCore {
  constructor(chunkX, chunkZ) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;

    // Voxel data: byte per voxel indicating block type
    this.voxels = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH);
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

        // Restore normal biome selection and blending (match chunk.js)
        const biomeValue = biomeNoise(worldX / BIOME_CONFIG.BIOME_SCALE, worldZ / BIOME_CONFIG.BIOME_SCALE);
        const normalizedBiome = (biomeValue + 1) * 0.5; // [-1,1] -> [0,1]
        const biomeIndex = normalizedBiome * (biomeList.length - 0.001);
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
}
