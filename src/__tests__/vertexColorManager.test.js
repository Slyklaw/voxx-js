import { describe, it, expect, beforeEach } from 'vitest';
import * as THREE from 'three';
import { VertexColorManager } from '../vertexColorManager.js';

describe('VertexColorManager', () => {
  let manager;

  beforeEach(() => {
    manager = new VertexColorManager();
  });

  describe('constructor', () => {
    it('should initialize with base color and empty cache', () => {
      expect(manager.baseColor).toBeInstanceOf(THREE.Color);
      expect(manager.baseColor.r).toBe(1);
      expect(manager.baseColor.g).toBe(1);
      expect(manager.baseColor.b).toBe(1);
      expect(manager.colorCache).toBeInstanceOf(Map);
      expect(manager.colorCache.size).toBe(0);
    });
  });

  describe('aoToColor', () => {
    it('should convert AO value 0 to black color', () => {
      const color = manager.aoToColor(0);
      expect(color).toBeInstanceOf(THREE.Color);
      expect(color.r).toBe(0);
      expect(color.g).toBe(0);
      expect(color.b).toBe(0);
    });

    it('should convert AO value 1 to white color', () => {
      const color = manager.aoToColor(1);
      expect(color).toBeInstanceOf(THREE.Color);
      expect(color.r).toBe(1);
      expect(color.g).toBe(1);
      expect(color.b).toBe(1);
    });

    it('should convert AO value 0.5 to gray color', () => {
      const color = manager.aoToColor(0.5);
      expect(color).toBeInstanceOf(THREE.Color);
      expect(color.r).toBe(0.5);
      expect(color.g).toBe(0.5);
      expect(color.b).toBe(0.5);
    });

    it('should handle standard AO values correctly', () => {
      const testValues = [0.25, 0.5, 0.75, 1.0];
      
      testValues.forEach(aoValue => {
        const color = manager.aoToColor(aoValue);
        expect(color.r).toBe(aoValue);
        expect(color.g).toBe(aoValue);
        expect(color.b).toBe(aoValue);
      });
    });

    it('should throw error for invalid AO values', () => {
      expect(() => manager.aoToColor(-0.1)).toThrow('Invalid AO value: -0.1. Must be a number between 0 and 1.');
      expect(() => manager.aoToColor(1.1)).toThrow('Invalid AO value: 1.1. Must be a number between 0 and 1.');
      expect(() => manager.aoToColor('0.5')).toThrow('Invalid AO value: 0.5. Must be a number between 0 and 1.');
      expect(() => manager.aoToColor(null)).toThrow('Invalid AO value: null. Must be a number between 0 and 1.');
      expect(() => manager.aoToColor(undefined)).toThrow('Invalid AO value: undefined. Must be a number between 0 and 1.');
    });

    it('should cache colors for performance', () => {
      const aoValue = 0.75;
      
      // First call should create cache entry
      const color1 = manager.aoToColor(aoValue);
      expect(manager.colorCache.size).toBe(1);
      
      // Second call should use cached value
      const color2 = manager.aoToColor(aoValue);
      expect(manager.colorCache.size).toBe(1);
      
      // Colors should be equal but different instances (cloned)
      expect(color1.equals(color2)).toBe(true);
      expect(color1).not.toBe(color2);
    });

    it('should return cloned colors from cache', () => {
      const aoValue = 0.5;
      const color1 = manager.aoToColor(aoValue);
      const color2 = manager.aoToColor(aoValue);
      
      // Modify one color
      color1.r = 0.8;
      
      // Other color should remain unchanged
      expect(color2.r).toBe(0.5);
    });
  });

  describe('interpolateColors', () => {
    let cornerColors;

    beforeEach(() => {
      cornerColors = [
        new THREE.Color(1, 1, 1),    // topLeft - white
        new THREE.Color(0.5, 0.5, 0.5), // topRight - gray
        new THREE.Color(0, 0, 0),    // bottomRight - black
        new THREE.Color(0.75, 0.75, 0.75) // bottomLeft - light gray
      ];
    });

    it('should interpolate colors for a 1x1 face (4 vertices)', () => {
      const interpolated = manager.interpolateColors(cornerColors, 1, 1);
      
      expect(interpolated).toHaveLength(4); // (1+1) * (1+1) = 4 vertices
      expect(interpolated[0]).toBeInstanceOf(THREE.Color);
      
      // Corner vertices should match input colors
      // Grid layout for 1x1: 
      // [0] [1]  <- row 0 (top)
      // [2] [3]  <- row 1 (bottom)
      expect(interpolated[0].equals(cornerColors[0])).toBe(true); // topLeft
      expect(interpolated[1].equals(cornerColors[1])).toBe(true); // topRight
      expect(interpolated[2].equals(cornerColors[3])).toBe(true); // bottomLeft
      expect(interpolated[3].equals(cornerColors[2])).toBe(true); // bottomRight
    });

    it('should interpolate colors for a 2x2 face (9 vertices)', () => {
      const interpolated = manager.interpolateColors(cornerColors, 2, 2);
      
      expect(interpolated).toHaveLength(9); // (2+1) * (2+1) = 9 vertices
      
      // Corner vertices should match input colors
      expect(interpolated[0].equals(cornerColors[0])).toBe(true); // topLeft
      expect(interpolated[2].equals(cornerColors[1])).toBe(true); // topRight
      expect(interpolated[8].equals(cornerColors[2])).toBe(true); // bottomRight
      expect(interpolated[6].equals(cornerColors[3])).toBe(true); // bottomLeft
      
      // Center vertex should be interpolated
      const centerColor = interpolated[4];
      // Center should be average of all 4 corners: (1 + 0.5 + 0 + 0.75) / 4 = 0.5625
      expect(centerColor.r).toBeCloseTo(0.5625, 3);
      expect(centerColor.g).toBeCloseTo(0.5625, 3);
      expect(centerColor.b).toBeCloseTo(0.5625, 3);
    });

    it('should handle edge interpolation correctly', () => {
      const interpolated = manager.interpolateColors(cornerColors, 2, 1);
      
      expect(interpolated).toHaveLength(6); // (2+1) * (1+1) = 6 vertices
      
      // Top edge middle vertex should be interpolated between topLeft and topRight
      const topMiddle = interpolated[1];
      expect(topMiddle.r).toBeCloseTo(0.75, 3); // (1 + 0.5) / 2
      
      // Bottom edge middle vertex should be interpolated between bottomLeft and bottomRight
      const bottomMiddle = interpolated[4];
      expect(bottomMiddle.r).toBeCloseTo(0.375, 3); // (0.75 + 0) / 2
    });

    it('should throw error for invalid corner colors array', () => {
      expect(() => manager.interpolateColors([], 1, 1)).toThrow('cornerColors must be an array of exactly 4 THREE.Color objects');
      expect(() => manager.interpolateColors([cornerColors[0]], 1, 1)).toThrow('cornerColors must be an array of exactly 4 THREE.Color objects');
      expect(() => manager.interpolateColors([...cornerColors, cornerColors[0]], 1, 1)).toThrow('cornerColors must be an array of exactly 4 THREE.Color objects');
      expect(() => manager.interpolateColors(null, 1, 1)).toThrow('cornerColors must be an array of exactly 4 THREE.Color objects');
    });

    it('should throw error for invalid dimensions', () => {
      expect(() => manager.interpolateColors(cornerColors, 0, 1)).toThrow('width and height must be positive numbers');
      expect(() => manager.interpolateColors(cornerColors, 1, 0)).toThrow('width and height must be positive numbers');
      expect(() => manager.interpolateColors(cornerColors, -1, 1)).toThrow('width and height must be positive numbers');
      expect(() => manager.interpolateColors(cornerColors, 1, -1)).toThrow('width and height must be positive numbers');
      expect(() => manager.interpolateColors(cornerColors, '1', 1)).toThrow('width and height must be positive numbers');
      expect(() => manager.interpolateColors(cornerColors, 1, '1')).toThrow('width and height must be positive numbers');
    });

    it('should throw error for non-Color objects in corner colors', () => {
      const invalidCorners = [
        cornerColors[0],
        cornerColors[1],
        cornerColors[2],
        { r: 0.5, g: 0.5, b: 0.5 } // Not a THREE.Color instance
      ];
      
      expect(() => manager.interpolateColors(invalidCorners, 1, 1)).toThrow('cornerColors[3] must be a THREE.Color instance');
    });

    it('should produce smooth gradients', () => {
      // Test with black to white gradient
      const gradientColors = [
        new THREE.Color(0, 0, 0),    // topLeft - black
        new THREE.Color(1, 1, 1),    // topRight - white
        new THREE.Color(1, 1, 1),    // bottomRight - white
        new THREE.Color(0, 0, 0)     // bottomLeft - black
      ];
      
      const interpolated = manager.interpolateColors(gradientColors, 4, 1);
      
      // Check that colors transition smoothly from black to white
      expect(interpolated[0].r).toBe(0); // leftmost should be black
      expect(interpolated[4].r).toBe(1); // rightmost should be white
      expect(interpolated[2].r).toBeCloseTo(0.5, 3); // middle should be gray
    });
  });

  describe('applyVertexColors', () => {
    let geometry;
    let colors;

    beforeEach(() => {
      // Create a simple triangle geometry
      geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0.5, 1, 0
      ]);
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      
      colors = [
        new THREE.Color(1, 0, 0), // red
        new THREE.Color(0, 1, 0), // green
        new THREE.Color(0, 0, 1)  // blue
      ];
    });

    it('should apply vertex colors to geometry', () => {
      manager.applyVertexColors(geometry, colors);
      
      const colorAttribute = geometry.getAttribute('color');
      expect(colorAttribute).toBeDefined();
      expect(colorAttribute.count).toBe(3);
      expect(colorAttribute.itemSize).toBe(3);
      
      // Check color values
      expect(colorAttribute.array[0]).toBe(1); // red.r
      expect(colorAttribute.array[1]).toBe(0); // red.g
      expect(colorAttribute.array[2]).toBe(0); // red.b
      expect(colorAttribute.array[3]).toBe(0); // green.r
      expect(colorAttribute.array[4]).toBe(1); // green.g
      expect(colorAttribute.array[5]).toBe(0); // green.b
      expect(colorAttribute.array[6]).toBe(0); // blue.r
      expect(colorAttribute.array[7]).toBe(0); // blue.g
      expect(colorAttribute.array[8]).toBe(1); // blue.b
    });

    it('should throw error for invalid geometry', () => {
      expect(() => manager.applyVertexColors(null, colors)).toThrow('geometry must be a THREE.BufferGeometry instance');
      expect(() => manager.applyVertexColors({}, colors)).toThrow('geometry must be a THREE.BufferGeometry instance');
      expect(() => manager.applyVertexColors('geometry', colors)).toThrow('geometry must be a THREE.BufferGeometry instance');
    });

    it('should throw error for geometry without position attribute', () => {
      const emptyGeometry = new THREE.BufferGeometry();
      expect(() => manager.applyVertexColors(emptyGeometry, colors)).toThrow('geometry must have a position attribute');
    });

    it('should throw error for invalid colors array', () => {
      expect(() => manager.applyVertexColors(geometry, null)).toThrow('colors must be an array of THREE.Color objects');
      expect(() => manager.applyVertexColors(geometry, 'colors')).toThrow('colors must be an array of THREE.Color objects');
      expect(() => manager.applyVertexColors(geometry, {})).toThrow('colors must be an array of THREE.Color objects');
    });

    it('should throw error for mismatched color count', () => {
      const tooFewColors = [colors[0], colors[1]]; // Only 2 colors for 3 vertices
      const tooManyColors = [...colors, colors[0]]; // 4 colors for 3 vertices
      
      expect(() => manager.applyVertexColors(geometry, tooFewColors)).toThrow('Color count (2) must match vertex count (3)');
      expect(() => manager.applyVertexColors(geometry, tooManyColors)).toThrow('Color count (4) must match vertex count (3)');
    });

    it('should throw error for non-Color objects in colors array', () => {
      const invalidColors = [
        colors[0],
        colors[1],
        { r: 0.5, g: 0.5, b: 0.5 } // Not a THREE.Color instance
      ];
      
      expect(() => manager.applyVertexColors(geometry, invalidColors)).toThrow('colors[2] must be a THREE.Color instance');
    });

    it('should handle complex geometries', () => {
      // Create a quad geometry (4 vertices)
      const quadGeometry = new THREE.BufferGeometry();
      const quadVertices = new Float32Array([
        -1, -1, 0,
        1, -1, 0,
        1, 1, 0,
        -1, 1, 0
      ]);
      quadGeometry.setAttribute('position', new THREE.BufferAttribute(quadVertices, 3));
      
      const quadColors = [
        new THREE.Color(1, 0, 0),
        new THREE.Color(0, 1, 0),
        new THREE.Color(0, 0, 1),
        new THREE.Color(1, 1, 0)
      ];
      
      manager.applyVertexColors(quadGeometry, quadColors);
      
      const colorAttribute = quadGeometry.getAttribute('color');
      expect(colorAttribute.count).toBe(4);
      expect(colorAttribute.array).toHaveLength(12); // 4 vertices * 3 components
    });
  });

  describe('createQuadColors', () => {
    it('should create colors for quad vertices', () => {
      const aoValues = [1.0, 0.75, 0.5, 0.25];
      const colors = manager.createQuadColors(aoValues);
      
      expect(colors).toHaveLength(4);
      expect(colors[0]).toBeInstanceOf(THREE.Color);
      expect(colors[0].r).toBe(1.0);
      expect(colors[1].r).toBe(0.75);
      expect(colors[2].r).toBe(0.5);
      expect(colors[3].r).toBe(0.25);
    });

    it('should throw error for invalid aoValues array', () => {
      expect(() => manager.createQuadColors([])).toThrow('aoValues must be an array of exactly 4 numbers');
      expect(() => manager.createQuadColors([0.5])).toThrow('aoValues must be an array of exactly 4 numbers');
      expect(() => manager.createQuadColors([0.5, 0.5, 0.5, 0.5, 0.5])).toThrow('aoValues must be an array of exactly 4 numbers');
      expect(() => manager.createQuadColors(null)).toThrow('aoValues must be an array of exactly 4 numbers');
    });

    it('should throw error for invalid AO values in array', () => {
      expect(() => manager.createQuadColors([1.0, 0.75, -0.1, 0.25])).toThrow('aoValues[2] must be a number between 0 and 1');
      expect(() => manager.createQuadColors([1.0, 0.75, 1.1, 0.25])).toThrow('aoValues[2] must be a number between 0 and 1');
      expect(() => manager.createQuadColors([1.0, 0.75, '0.5', 0.25])).toThrow('aoValues[2] must be a number between 0 and 1');
    });
  });

  describe('batchAoToColors', () => {
    it('should convert multiple AO values to colors', () => {
      const aoValues = [0, 0.25, 0.5, 0.75, 1.0];
      const colors = manager.batchAoToColors(aoValues);
      
      expect(colors).toHaveLength(5);
      colors.forEach((color, index) => {
        expect(color).toBeInstanceOf(THREE.Color);
        expect(color.r).toBe(aoValues[index]);
        expect(color.g).toBe(aoValues[index]);
        expect(color.b).toBe(aoValues[index]);
      });
    });

    it('should handle empty array', () => {
      const colors = manager.batchAoToColors([]);
      expect(colors).toHaveLength(0);
    });

    it('should throw error for invalid input', () => {
      expect(() => manager.batchAoToColors(null)).toThrow('aoValues must be an array');
      expect(() => manager.batchAoToColors('values')).toThrow('aoValues must be an array');
      expect(() => manager.batchAoToColors({})).toThrow('aoValues must be an array');
    });

    it('should validate individual AO values', () => {
      expect(() => manager.batchAoToColors([0.5, -0.1])).toThrow('Invalid AO value: -0.1. Must be a number between 0 and 1.');
      expect(() => manager.batchAoToColors([0.5, 1.1])).toThrow('Invalid AO value: 1.1. Must be a number between 0 and 1.');
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      // Add some entries to cache
      manager.aoToColor(0.5);
      manager.aoToColor(0.75);
      expect(manager.colorCache.size).toBe(2);
      
      // Clear cache
      manager.clearCache();
      expect(manager.colorCache.size).toBe(0);
    });

    it('should provide cache statistics', () => {
      manager.aoToColor(0.5);
      manager.aoToColor(0.75);
      
      const stats = manager.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.keys).toContain(0.5);
      expect(stats.keys).toContain(0.75);
    });

    it('should round cache keys to avoid floating point precision issues', () => {
      manager.aoToColor(0.333333333);
      manager.aoToColor(0.333333334);
      
      // Should be treated as the same value due to rounding
      expect(manager.colorCache.size).toBe(1);
    });
  });

  describe('integration tests', () => {
    it('should work with typical ambient occlusion workflow', () => {
      // Simulate typical AO values from AmbientOcclusionCalculator
      const aoValues = [1.0, 0.75, 0.5, 0.25]; // Standard AO values
      
      // Convert to colors
      const colors = manager.createQuadColors(aoValues);
      
      // Create geometry
      const geometry = new THREE.BufferGeometry();
      const vertices = new Float32Array([
        -1, -1, 0,
        1, -1, 0,
        1, 1, 0,
        -1, 1, 0
      ]);
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      
      // Apply colors
      manager.applyVertexColors(geometry, colors);
      
      // Verify result
      const colorAttribute = geometry.getAttribute('color');
      expect(colorAttribute).toBeDefined();
      expect(colorAttribute.count).toBe(4);
      
      // Check that colors were applied correctly
      expect(colorAttribute.array[0]).toBe(1.0);  // First vertex - full light
      expect(colorAttribute.array[3]).toBe(0.75); // Second vertex - slight shadow
      expect(colorAttribute.array[6]).toBe(0.5);  // Third vertex - medium shadow
      expect(colorAttribute.array[9]).toBe(0.25); // Fourth vertex - full shadow
    });

    it('should handle interpolation for merged faces', () => {
      // Create corner colors with different AO values
      const cornerColors = [
        manager.aoToColor(1.0),   // Full light
        manager.aoToColor(0.75),  // Slight shadow
        manager.aoToColor(0.25),  // Full shadow
        manager.aoToColor(0.5)    // Medium shadow
      ];
      
      // Interpolate for a 2x2 merged face
      const interpolated = manager.interpolateColors(cornerColors, 2, 2);
      
      expect(interpolated).toHaveLength(9);
      
      // Corners should match original values
      expect(interpolated[0].r).toBe(1.0);
      expect(interpolated[2].r).toBe(0.75);
      expect(interpolated[8].r).toBe(0.25);
      expect(interpolated[6].r).toBe(0.5);
      
      // Center should be interpolated - average of corners: (1.0 + 0.75 + 0.25 + 0.5) / 4 = 0.625
      expect(interpolated[4].r).toBeCloseTo(0.625, 3);
    });
  });
});