import { describe, it, expect, beforeEach } from 'vitest';
import { generateBiomeHeight, getBiomeBlockType, BiomeCalculator, BIOMES, BIOME_CONFIG } from '../../biomes.js';
import { BLOCK_TYPES } from '../../blocks.js';

describe('biomes.js', () => {
  describe('generateBiomeHeight', () => {
    it('returns exact baseHeight for LOWLAND biome', () => {
      const mockNoise = () => 0;
      const height = generateBiomeHeight(0, 0, BIOMES.LOWLAND, mockNoise);
      expect(height).toBe(BIOMES.LOWLAND.baseHeight);
    });

    it('MOUNTAINS biome uses noise for height variation', () => {
      const flatNoise = () => 0;
      const height = generateBiomeHeight(0, 0, BIOMES.MOUNTAINS, flatNoise);
      expect(height).toBe(BIOMES.MOUNTAINS.baseHeight);
    });

    it('returns height above baseHeight with positive noise for MOUNTAINS', () => {
      const positiveNoise = () => 0.5;
      const height = generateBiomeHeight(0, 0, BIOMES.MOUNTAINS, positiveNoise);
      expect(height).toBeGreaterThan(BIOMES.MOUNTAINS.baseHeight);
    });

    it('returns height below baseHeight with negative noise for MOUNTAINS', () => {
      const negativeNoise = () => -0.5;
      const height = generateBiomeHeight(0, 0, BIOMES.MOUNTAINS, negativeNoise);
      expect(height).toBeLessThan(BIOMES.MOUNTAINS.baseHeight);
    });
  });

  describe('getBiomeBlockType', () => {
    it('returns GRASS at surface for LOWLAND', () => {
      const surfaceHeight = BIOMES.LOWLAND.baseHeight;
      const blockType = getBiomeBlockType(surfaceHeight - 1, surfaceHeight, BIOMES.LOWLAND);
      expect(blockType).toBe(BLOCK_TYPES.GRASS);
    });

    it('returns DIRT below grass layer for LOWLAND', () => {
      const surfaceHeight = BIOMES.LOWLAND.baseHeight;
      const depthFromSurface = 2;
      const blockType = getBiomeBlockType(surfaceHeight - depthFromSurface, surfaceHeight, BIOMES.LOWLAND);
      expect(blockType).toBe(BLOCK_TYPES.DIRT);
    });

    it('returns STONE deep below surface for LOWLAND', () => {
      const surfaceHeight = BIOMES.LOWLAND.baseHeight;
      const depthFromSurface = 10;
      const blockType = getBiomeBlockType(surfaceHeight - depthFromSurface, surfaceHeight, BIOMES.LOWLAND);
      expect(blockType).toBe(BLOCK_TYPES.STONE);
    });

    it('returns GRASS at surface for MOUNTAINS below snow line', () => {
      const surfaceHeight = 100; // Below SNOW_LINE_HEIGHT (180)
      const blockType = getBiomeBlockType(surfaceHeight - 1, surfaceHeight, BIOMES.MOUNTAINS);
      expect(blockType).toBe(BLOCK_TYPES.GRASS);
    });

    it('returns SNOW at high mountains above snow line', () => {
      const surfaceHeight = 190; // Above SNOW_LINE_HEIGHT (180)
      const depthFromSurface = 1;
      const blockType = getBiomeBlockType(surfaceHeight - depthFromSurface, surfaceHeight, BIOMES.MOUNTAINS);
      expect(blockType).toBe(BLOCK_TYPES.SNOW);
    });

    it('returns STONE as default for unknown biome', () => {
      const unknownBiome = { id: 999 };
      const blockType = getBiomeBlockType(50, 64, unknownBiome);
      expect(blockType).toBe(BLOCK_TYPES.STONE);
    });
  });

  describe('BiomeCalculator', () => {
    let calculator;

    beforeEach(() => {
      calculator = new BiomeCalculator(12345);
    });

    describe('constructor', () => {
      it('initializes with biomeList from BIOMES', () => {
        expect(calculator.biomeList).toBeDefined();
        expect(calculator.biomeList.length).toBe(Object.values(BIOMES).length);
      });
    });

    describe('getBiomeContributions', () => {
      it('returns array of biome contributions', () => {
        const contributions = calculator.getBiomeContributions(0, 0);
        expect(Array.isArray(contributions)).toBe(true);
        expect(contributions.length).toBe(calculator.biomeList.length);
      });

      it('each contribution has biome and contribution properties', () => {
        const contributions = calculator.getBiomeContributions(0, 0);
        contributions.forEach(c => {
          expect(c).toHaveProperty('biome');
          expect(c).toHaveProperty('contribution');
          expect(typeof c.contribution).toBe('number');
        });
      });

      it('contributions sum to 100', () => {
        const contributions = calculator.getBiomeContributions(0, 0);
        const sum = contributions.reduce((acc, c) => acc + c.contribution, 0);
        expect(sum).toBe(100);
      });

      it('contributions are non-negative', () => {
        const contributions = calculator.getBiomeContributions(0, 0);
        contributions.forEach(c => {
          expect(c.contribution).toBeGreaterThanOrEqual(0);
        });
      });

      it('returns valid contributions for different world positions', () => {
        const positions = [[0, 0], [1000, 1000], [-500, 500]];
        positions.forEach(([wx, wz]) => {
          const contributions = calculator.getBiomeContributions(wx, wz);
          expect(Array.isArray(contributions)).toBe(true);
          const sum = contributions.reduce((acc, c) => acc + c.contribution, 0);
          expect(sum).toBe(100);
        });
      });
    });
  });
});
