import { createNoise2D } from 'simplex-noise';
import { BLOCK_TYPES } from './blocks.js';
import { SUN_CYCLE_CONFIG } from './config.js';

// World configuration constants
export const SEA_LEVEL = 64; // Adjusted for taller world

// Centralized biome definitions - single source of truth
export const BIOMES = {
  LOWLAND: {
    id: 0,
    name: 'Lowland',
    baseHeight: SEA_LEVEL - 10, // Near sea level
    heightVariation: 20, // Low variation for flat terrain
    octaves: 3,
    persistence: 0.3,
    lacunarity: 2.0,
    scale: 2000 // Large scale for gentle rolling hills
  },
  MOUNTAINS: {
    id: 1,
    name: 'Mountains',
    baseHeight: SEA_LEVEL + 60, // Well above sea level
    heightVariation: 120, // High variation for tall peaks
    octaves: 6,
    persistence: 0.6,
    lacunarity: 2.0,
    scale: 800 // Smaller scale for more dramatic terrain
  }
};

// Biome configuration constants
export const BIOME_CONFIG = {
  BIOME_SCALE: 1500, // Scale for biome noise sampling
  BIOME_SEED_MULTIPLIER: 1.337 // Multiplier for biome noise seed
};

/**
 * Generate height for a specific biome using noise
 * @param {number} worldX - World X coordinate
 * @param {number} worldZ - World Z coordinate
 * @param {Object} biome - Biome definition object
 * @param {Function} noise - Noise function
 * @returns {number} Generated height
 */
export function generateBiomeHeight(worldX, worldZ, biome, noise) {
  let amplitude = 1;
  let frequency = 1;
  let height = 0;

  for (let i = 0; i < biome.octaves; i++) {
    const sampleX = (worldX / biome.scale) * frequency;
    const sampleZ = (worldZ / biome.scale) * frequency;
    const noiseValue = noise(sampleX, sampleZ);

    height += noiseValue * amplitude;
    amplitude *= biome.persistence;
    frequency *= biome.lacunarity;
  }

  // Scale height based on biome characteristics
  return biome.baseHeight + (height * biome.heightVariation);
}

/**
 * Get appropriate block type based on biome and height
 * @param {number} y - Current Y coordinate
 * @param {number} surfaceHeight - Surface height at this position
 * @param {Object} biome - Biome definition object
 * @returns {number} Block type ID
 */
export function getBiomeBlockType(y, surfaceHeight, biome) {
  const depthFromSurface = surfaceHeight - y;

  if (biome.id === 0) { // LOWLAND
    if (depthFromSurface === 1) {
      return BLOCK_TYPES.GRASS; // GRASS on surface
    } else if (depthFromSurface <= 4) {
      return BLOCK_TYPES.DIRT; // DIRT layer
    } else {
      return BLOCK_TYPES.STONE; // STONE below
    }
  } else if (biome.id === 1) { // MOUNTAINS
    if (surfaceHeight > SUN_CYCLE_CONFIG.SNOW_LINE_HEIGHT) { // Snow line for high peaks
      if (depthFromSurface <= 3) {
        return BLOCK_TYPES.SNOW; // SNOW on high peaks
      } else if (depthFromSurface <= 6) {
        return BLOCK_TYPES.DIRT; // DIRT below snow
      } else {
        return BLOCK_TYPES.STONE; // STONE
      }
    } else {
      if (depthFromSurface === 1) {
        return BLOCK_TYPES.GRASS; // GRASS
      } else if (depthFromSurface <= 3) {
        return BLOCK_TYPES.DIRT; // DIRT (thinner on mountains)
      } else {
        return BLOCK_TYPES.STONE; // STONE
      }
    }
  }

  return BLOCK_TYPES.STONE; // Default to stone
}

export class BiomeCalculator {
  constructor(noiseSeed) {
    this.biomeNoise = createNoise2D(() => noiseSeed * BIOME_CONFIG.BIOME_SEED_MULTIPLIER);
    this.biomeList = Object.values(BIOMES);
  }

  /**
   * Calculate biome contributions at a specific world position
   * @param {number} worldX - World X coordinate
   * @param {number} worldZ - World Z coordinate
   * @returns {Array} Array of {biome, contribution} objects
   */
  getBiomeContributions(worldX, worldZ) {
    // Sample biome noise to determine biome blend
    const biomeValue = this.biomeNoise(worldX / BIOME_CONFIG.BIOME_SCALE, worldZ / BIOME_CONFIG.BIOME_SCALE);
    const normalizedBiome = (biomeValue + 1) * 0.5; // Convert from [-1,1] to [0,1]

    // Determine primary and secondary biomes for blending
    const biomeIndex = normalizedBiome * (this.biomeList.length - 0.001);
    const primaryBiomeIdx = Math.floor(biomeIndex);
    const secondaryBiomeIdx = Math.min(primaryBiomeIdx + 1, this.biomeList.length - 1);
    const blendFactor = biomeIndex - primaryBiomeIdx;

    const contributions = [];

    // Calculate contributions for all biomes
    for (let i = 0; i < this.biomeList.length; i++) {
      let contribution = 0;

      if (i === primaryBiomeIdx) {
        contribution = (1 - blendFactor) * 100;
      } else if (i === secondaryBiomeIdx && primaryBiomeIdx !== secondaryBiomeIdx) {
        contribution = blendFactor * 100;
      }

      contributions.push({
        biome: this.biomeList[i],
        contribution: Math.round(contribution)
      });
    }

    return contributions;
  }
}