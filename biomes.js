import { createNoise2D } from 'https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js';
import { BLOCK_TYPES } from './blocks.js';
import { SUN_CYCLE_CONFIG } from './config.js';

// World configuration constants
export const SEA_LEVEL = 64; // Adjusted for taller world

// Centralized biome definitions - single source of truth
export const BIOMES = {
  LOWLAND: {
    id: 0,
    name: 'Lowland',
    baseHeight: SEA_LEVEL - 6, // Slightly closer to sea level
    heightVariation: 6, // Much lower variation for near-flat terrain
    octaves: 1, // Single octave to eliminate fractal roughness
    persistence: 0.2,
    lacunarity: 1.6,
    scale: 6000 // Very large scale so changes are extremely gradual
  },
  MOUNTAINS: {
    id: 1,
    name: 'Mountains',
    baseHeight: SEA_LEVEL + 60, // Well above sea level
    heightVariation: 80, // High variation for tall peaks
    octaves: 6,
    persistence: 0.6,
    lacunarity: 2.0,
    scale: 800 // Smaller scale for more dramatic terrain
  }
};

// Biome configuration constants
export const BIOME_CONFIG = {
  BIOME_SCALE: 2200, // Larger scale -> broader, fewer mountain regions
  BIOME_SEED_MULTIPLIER: 1.337, // Multiplier for biome noise seed
  MOUNTAIN_BIAS: 0.5 // Bias to favor lowlands over mountains
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
  // TEST: Force perfectly flat Lowland to isolate any other sources of elevation.
  if (biome.id === BIOMES.LOWLAND.id) {
    return biome.baseHeight; // exactly flat
  }

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
    let biomeValue = this.biomeNoise(worldX / BIOME_CONFIG.BIOME_SCALE, worldZ / BIOME_CONFIG.BIOME_SCALE);

    // Apply bias to reduce mountain frequency:
    biomeValue = Math.max(-1, Math.min(1, biomeValue - BIOME_CONFIG.MOUNTAIN_BIAS));

    const normalizedBiome = (biomeValue + 1) * 0.5; // Convert from [-1,1] to [0,1]

    // Determine primary and secondary biomes for blending
    const biomeIndex = normalizedBiome * (this.biomeList.length - 0.001);
    const primaryBiomeIdx = Math.floor(biomeIndex);
    const secondaryBiomeIdx = Math.min(primaryBiomeIdx + 1, this.biomeList.length - 1);
    const blendFactor = biomeIndex - primaryBiomeIdx;

    // Start with raw weights (sum to 1)
    const weights = new Array(this.biomeList.length).fill(0);
    weights[primaryBiomeIdx] += (1 - blendFactor);
    if (secondaryBiomeIdx !== primaryBiomeIdx) {
      weights[secondaryBiomeIdx] += blendFactor;
    }

    // Normalize and convert to integer percentages that sum to 100.
    const total = weights.reduce((a, b) => a + b, 0) || 1;
    const percentages = weights.map(w => (w / total) * 100);

    // Largest-remainder rounding to ensure exact 100% total
    const floored = percentages.map(p => Math.floor(p));
    let remainder = 100 - floored.reduce((a, b) => a + b, 0);
    const remainders = percentages.map((p, i) => ({ i, frac: p - Math.floor(p) })).sort((a, b) => b.frac - a.frac);
    for (let k = 0; k < remainder; k++) {
      floored[remainders[k].i] += 1;
    }

    const contributions = this.biomeList.map((biome, i) => ({
      biome,
      contribution: floored[i]
    }));

    return contributions;
  }
}
