import { createNoise2D } from 'simplex-noise';

// Biome definitions (matching chunk.js)
export const BIOMES = {
  LOWLAND: {
    id: 0,
    name: 'Lowland',
    baseHeight: 54, // SEA_LEVEL - 10
    heightVariation: 20,
    octaves: 3,
    persistence: 0.3,
    lacunarity: 2.0,
    scale: 2000
  },
  MOUNTAINS: {
    id: 1,
    name: 'Mountains',
    baseHeight: 124, // SEA_LEVEL + 60
    heightVariation: 120,
    octaves: 6,
    persistence: 0.6,
    lacunarity: 2.0,
    scale: 800
  }
};

export class BiomeCalculator {
  constructor(noiseSeed) {
    this.biomeNoise = createNoise2D(() => noiseSeed * 1.337);
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
    const biomeValue = this.biomeNoise(worldX / 1500, worldZ / 1500);
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