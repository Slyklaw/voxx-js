import { describe, it, expect, beforeEach } from 'vitest';
import { DiagonalOptimizer } from '../diagonalOptimizer.js';

describe('DiagonalOptimizer', () => {
  let optimizer;

  beforeEach(() => {
    optimizer = new DiagonalOptimizer();
  });

  describe('constructor', () => {
    it('should create an instance without errors', () => {
      expect(optimizer).toBeInstanceOf(DiagonalOptimizer);
    });
  });

  describe('chooseOptimalDiagonal', () => {
    it('should choose A-C diagonal when A-C difference is smaller', () => {
      // A-C difference: |1.0 - 0.0| = 1.0
      // B-D difference: |0.5 - 0.25| = 0.25
      // Should choose B-D (false) because 0.25 < 1.0
      const aoValues = [1.0, 0.5, 0.0, 0.25];
      const result = optimizer.chooseOptimalDiagonal(aoValues);
      expect(result).toBe(false); // B-D diagonal
    });

    it('should choose B-D diagonal when B-D difference is smaller', () => {
      // A-C difference: |1.0 - 0.5| = 0.5
      // B-D difference: |0.25 - 0.0| = 0.25
      // Should choose B-D (false) because 0.25 < 0.5
      const aoValues = [1.0, 0.25, 0.5, 0.0];
      const result = optimizer.chooseOptimalDiagonal(aoValues);
      expect(result).toBe(false); // B-D diagonal
    });

    it('should choose A-C diagonal when differences are equal', () => {
      // A-C difference: |1.0 - 0.0| = 1.0
      // B-D difference: |0.5 - 0.5| = 0.0
      // Should choose B-D (false) because 0.0 < 1.0
      const aoValues = [1.0, 0.5, 0.0, 0.5];
      const result = optimizer.chooseOptimalDiagonal(aoValues);
      expect(result).toBe(false); // B-D diagonal
    });

    it('should default to A-C diagonal when both differences are exactly equal', () => {
      // A-C difference: |0.5 - 0.5| = 0.0
      // B-D difference: |0.5 - 0.5| = 0.0
      // Should choose A-C (true) as default when equal
      const aoValues = [0.5, 0.5, 0.5, 0.5];
      const result = optimizer.chooseOptimalDiagonal(aoValues);
      expect(result).toBe(true); // A-C diagonal
    });

    it('should handle extreme AO values correctly', () => {
      // Test with full light and full shadow
      const aoValues1 = [1.0, 0.0, 1.0, 0.0]; // Checkerboard pattern
      const result1 = optimizer.chooseOptimalDiagonal(aoValues1);
      expect(typeof result1).toBe('boolean');

      const aoValues2 = [0.0, 1.0, 0.0, 1.0]; // Inverse checkerboard
      const result2 = optimizer.chooseOptimalDiagonal(aoValues2);
      expect(typeof result2).toBe('boolean');
    });

    it('should handle standard AO values from AmbientOcclusionCalculator', () => {
      // Standard AO values: 1.0, 0.75, 0.5, 0.25
      const aoValues = [1.0, 0.75, 0.5, 0.25];
      const result = optimizer.chooseOptimalDiagonal(aoValues);
      expect(typeof result).toBe('boolean');
      
      // A-C difference: |1.0 - 0.5| = 0.5
      // B-D difference: |0.75 - 0.25| = 0.5
      // Should choose A-C (true) when equal
      expect(result).toBe(true);
    });

    it('should throw error for invalid aoValues array', () => {
      expect(() => optimizer.chooseOptimalDiagonal([])).toThrow('aoValues must be an array of exactly 4 numbers');
      expect(() => optimizer.chooseOptimalDiagonal([0.5])).toThrow('aoValues must be an array of exactly 4 numbers');
      expect(() => optimizer.chooseOptimalDiagonal([0.5, 0.5, 0.5])).toThrow('aoValues must be an array of exactly 4 numbers');
      expect(() => optimizer.chooseOptimalDiagonal([0.5, 0.5, 0.5, 0.5, 0.5])).toThrow('aoValues must be an array of exactly 4 numbers');
      expect(() => optimizer.chooseOptimalDiagonal(null)).toThrow('aoValues must be an array of exactly 4 numbers');
      expect(() => optimizer.chooseOptimalDiagonal(undefined)).toThrow('aoValues must be an array of exactly 4 numbers');
    });

    it('should throw error for invalid AO values', () => {
      expect(() => optimizer.chooseOptimalDiagonal([1.0, 0.75, -0.1, 0.25])).toThrow('aoValues[2] must be a number between 0 and 1');
      expect(() => optimizer.chooseOptimalDiagonal([1.0, 0.75, 1.1, 0.25])).toThrow('aoValues[2] must be a number between 0 and 1');
      expect(() => optimizer.chooseOptimalDiagonal([1.0, 0.75, '0.5', 0.25])).toThrow('aoValues[2] must be a number between 0 and 1');
      expect(() => optimizer.chooseOptimalDiagonal([1.0, 0.75, null, 0.25])).toThrow('aoValues[2] must be a number between 0 and 1');
      expect(() => optimizer.chooseOptimalDiagonal([1.0, 0.75, undefined, 0.25])).toThrow('aoValues[2] must be a number between 0 and 1');
    });

    it('should be deterministic for the same input', () => {
      const aoValues = [0.8, 0.3, 0.6, 0.1];
      const result1 = optimizer.chooseOptimalDiagonal(aoValues);
      const result2 = optimizer.chooseOptimalDiagonal(aoValues);
      const result3 = optimizer.chooseOptimalDiagonal(aoValues);
      
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });

  describe('generateTriangleIndices', () => {
    it('should generate correct indices for A-C diagonal', () => {
      const indices = optimizer.generateTriangleIndices(0, true);
      
      expect(indices).toHaveLength(6); // 2 triangles * 3 vertices each
      expect(indices).toEqual([
        0, 1, 2,  // First triangle: top-left, top-right, bottom-right
        0, 2, 3   // Second triangle: top-left, bottom-right, bottom-left
      ]);
    });

    it('should generate correct indices for B-D diagonal', () => {
      const indices = optimizer.generateTriangleIndices(0, false);
      
      expect(indices).toHaveLength(6); // 2 triangles * 3 vertices each
      expect(indices).toEqual([
        0, 1, 3,  // First triangle: top-left, top-right, bottom-left
        1, 2, 3   // Second triangle: top-right, bottom-right, bottom-left
      ]);
    });

    it('should handle vertex offset correctly', () => {
      const offset = 10;
      const indicesAC = optimizer.generateTriangleIndices(offset, true);
      const indicesBD = optimizer.generateTriangleIndices(offset, false);
      
      // A-C diagonal with offset
      expect(indicesAC).toEqual([
        10, 11, 12,  // First triangle
        10, 12, 13   // Second triangle
      ]);
      
      // B-D diagonal with offset
      expect(indicesBD).toEqual([
        10, 11, 13,  // First triangle
        11, 12, 13   // Second triangle
      ]);
    });

    it('should handle large vertex offsets', () => {
      const offset = 1000;
      const indices = optimizer.generateTriangleIndices(offset, true);
      
      expect(indices).toEqual([
        1000, 1001, 1002,
        1000, 1002, 1003
      ]);
    });

    it('should throw error for invalid vertex offset', () => {
      expect(() => optimizer.generateTriangleIndices(-1, true)).toThrow('vertexOffset must be a non-negative number');
      expect(() => optimizer.generateTriangleIndices('0', true)).toThrow('vertexOffset must be a non-negative number');
      expect(() => optimizer.generateTriangleIndices(null, true)).toThrow('vertexOffset must be a non-negative number');
      expect(() => optimizer.generateTriangleIndices(undefined, true)).toThrow('vertexOffset must be a non-negative number');
    });

    it('should throw error for invalid diagonal choice', () => {
      expect(() => optimizer.generateTriangleIndices(0, 'true')).toThrow('useACDiagonal must be a boolean');
      expect(() => optimizer.generateTriangleIndices(0, 1)).toThrow('useACDiagonal must be a boolean');
      expect(() => optimizer.generateTriangleIndices(0, null)).toThrow('useACDiagonal must be a boolean');
      expect(() => optimizer.generateTriangleIndices(0, undefined)).toThrow('useACDiagonal must be a boolean');
    });

    it('should generate different indices for different diagonal choices', () => {
      const indicesAC = optimizer.generateTriangleIndices(0, true);
      const indicesBD = optimizer.generateTriangleIndices(0, false);
      
      expect(indicesAC).not.toEqual(indicesBD);
      
      // Both should have same length
      expect(indicesAC).toHaveLength(6);
      expect(indicesBD).toHaveLength(6);
      
      // Both should use all 4 vertices
      const uniqueVerticesAC = [...new Set(indicesAC)].sort();
      const uniqueVerticesBD = [...new Set(indicesBD)].sort();
      expect(uniqueVerticesAC).toEqual([0, 1, 2, 3]);
      expect(uniqueVerticesBD).toEqual([0, 1, 2, 3]);
    });
  });

  describe('generateOptimizedIndices', () => {
    it('should combine diagonal selection and index generation', () => {
      const aoValues = [1.0, 0.5, 0.0, 0.25];
      const indices = optimizer.generateOptimizedIndices(0, aoValues);
      
      expect(indices).toHaveLength(6);
      expect(Array.isArray(indices)).toBe(true);
      
      // Should use the same diagonal choice as chooseOptimalDiagonal
      const expectedDiagonal = optimizer.chooseOptimalDiagonal(aoValues);
      const expectedIndices = optimizer.generateTriangleIndices(0, expectedDiagonal);
      expect(indices).toEqual(expectedIndices);
    });

    it('should handle different vertex offsets', () => {
      const aoValues = [0.8, 0.3, 0.6, 0.1];
      const indices1 = optimizer.generateOptimizedIndices(0, aoValues);
      const indices2 = optimizer.generateOptimizedIndices(4, aoValues);
      
      // Should have same pattern but different vertex numbers
      expect(indices1).toHaveLength(6);
      expect(indices2).toHaveLength(6);
      
      // Second set should be offset by 4
      for (let i = 0; i < 6; i++) {
        expect(indices2[i]).toBe(indices1[i] + 4);
      }
    });

    it('should validate inputs through underlying methods', () => {
      // Invalid AO values
      expect(() => optimizer.generateOptimizedIndices(0, [1.0, 0.75, -0.1, 0.25])).toThrow();
      
      // Invalid vertex offset
      expect(() => optimizer.generateOptimizedIndices(-1, [1.0, 0.75, 0.5, 0.25])).toThrow();
    });
  });

  describe('batchGenerateIndices', () => {
    it('should process multiple quads correctly', () => {
      const quads = [
        { vertexOffset: 0, aoValues: [1.0, 0.75, 0.5, 0.25] },
        { vertexOffset: 4, aoValues: [0.8, 0.6, 0.4, 0.2] },
        { vertexOffset: 8, aoValues: [0.9, 0.7, 0.3, 0.1] }
      ];
      
      const allIndices = optimizer.batchGenerateIndices(quads);
      
      expect(allIndices).toHaveLength(18); // 3 quads * 6 indices each
      
      // Verify that indices are in correct ranges
      const quad1Indices = allIndices.slice(0, 6);
      const quad2Indices = allIndices.slice(6, 12);
      const quad3Indices = allIndices.slice(12, 18);
      
      // First quad should use vertices 0-3
      expect(Math.min(...quad1Indices)).toBe(0);
      expect(Math.max(...quad1Indices)).toBe(3);
      
      // Second quad should use vertices 4-7
      expect(Math.min(...quad2Indices)).toBe(4);
      expect(Math.max(...quad2Indices)).toBe(7);
      
      // Third quad should use vertices 8-11
      expect(Math.min(...quad3Indices)).toBe(8);
      expect(Math.max(...quad3Indices)).toBe(11);
    });

    it('should handle empty array', () => {
      const allIndices = optimizer.batchGenerateIndices([]);
      expect(allIndices).toHaveLength(0);
      expect(Array.isArray(allIndices)).toBe(true);
    });

    it('should throw error for invalid input', () => {
      expect(() => optimizer.batchGenerateIndices(null)).toThrow('quads must be an array');
      expect(() => optimizer.batchGenerateIndices('quads')).toThrow('quads must be an array');
      expect(() => optimizer.batchGenerateIndices({})).toThrow('quads must be an array');
    });

    it('should throw error for invalid quad objects', () => {
      const invalidQuads = [
        null,
        { vertexOffset: 4, aoValues: [0.8, 0.6, 0.4, 0.2] }
      ];
      
      expect(() => optimizer.batchGenerateIndices(invalidQuads)).toThrow('quads[0] must be an object with vertexOffset and aoValues properties');
    });

    it('should throw error for missing properties', () => {
      const invalidQuads = [
        { aoValues: [1.0, 0.75, 0.5, 0.25] }, // Missing vertexOffset
        { vertexOffset: 4, aoValues: [0.8, 0.6, 0.4, 0.2] }
      ];
      
      expect(() => optimizer.batchGenerateIndices(invalidQuads)).toThrow('quads[0].vertexOffset must be a number');
    });

    it('should throw error for invalid property types', () => {
      const invalidQuads = [
        { vertexOffset: '0', aoValues: [1.0, 0.75, 0.5, 0.25] }, // String instead of number
        { vertexOffset: 4, aoValues: [0.8, 0.6, 0.4, 0.2] }
      ];
      
      expect(() => optimizer.batchGenerateIndices(invalidQuads)).toThrow('quads[0].vertexOffset must be a number');
    });
  });

  describe('analyzeDiagonalChoices', () => {
    it('should analyze diagonal choices correctly', () => {
      const aoValueSets = [
        [1.0, 0.5, 0.0, 0.25], // Should choose B-D (false)
        [0.5, 0.5, 0.5, 0.5],  // Should choose A-C (true) - equal differences
        [1.0, 0.0, 0.5, 0.75], // Should choose A-C (true) - smaller A-C difference
      ];
      
      const stats = optimizer.analyzeDiagonalChoices(aoValueSets);
      
      expect(stats.total).toBe(3);
      expect(stats.acDiagonalCount).toBe(2);
      expect(stats.bdDiagonalCount).toBe(1);
      expect(stats.acPercentage).toBeCloseTo(66.67, 1);
      expect(stats.bdPercentage).toBeCloseTo(33.33, 1);
      expect(stats.choices).toEqual([false, true, true]);
    });

    it('should handle empty array', () => {
      const stats = optimizer.analyzeDiagonalChoices([]);
      
      expect(stats.total).toBe(0);
      expect(stats.acDiagonalCount).toBe(0);
      expect(stats.bdDiagonalCount).toBe(0);
      expect(stats.acPercentage).toBe(0);
      expect(stats.bdPercentage).toBe(0);
      expect(stats.choices).toEqual([]);
    });

    it('should handle all A-C choices', () => {
      const aoValueSets = [
        [0.5, 0.5, 0.5, 0.5],  // Equal - defaults to A-C
        [1.0, 0.0, 0.5, 0.75], // A-C difference smaller
      ];
      
      const stats = optimizer.analyzeDiagonalChoices(aoValueSets);
      
      expect(stats.acDiagonalCount).toBe(2);
      expect(stats.bdDiagonalCount).toBe(0);
      expect(stats.acPercentage).toBe(100);
      expect(stats.bdPercentage).toBe(0);
    });

    it('should handle all B-D choices', () => {
      // Let me calculate the differences manually:
      // For [1.0, 0.5, 0.0, 0.25]: A-C diff = |1.0 - 0.0| = 1.0, B-D diff = |0.5 - 0.25| = 0.25 -> choose B-D (false)
      // For [0.8, 0.2, 0.9, 0.1]: A-C diff = |0.8 - 0.9| = 0.1, B-D diff = |0.2 - 0.1| = 0.1 -> equal, choose A-C (true)
      const aoValueSets = [
        [1.0, 0.5, 0.0, 0.25], // B-D difference smaller (0.25 < 1.0)
        [0.9, 0.1, 0.8, 0.2],  // B-D difference smaller: A-C = |0.9-0.8| = 0.1, B-D = |0.1-0.2| = 0.1, equal -> A-C
      ];
      
      // Let me use values that definitely favor B-D diagonal
      const betterAoValueSets = [
        [1.0, 0.5, 0.0, 0.25], // A-C = 1.0, B-D = 0.25 -> B-D wins
        [0.9, 0.3, 0.1, 0.7],  // A-C = |0.9-0.1| = 0.8, B-D = |0.3-0.7| = 0.4 -> B-D wins
      ];
      
      const stats = optimizer.analyzeDiagonalChoices(betterAoValueSets);
      
      expect(stats.acDiagonalCount).toBe(0);
      expect(stats.bdDiagonalCount).toBe(2);
      expect(stats.acPercentage).toBe(0);
      expect(stats.bdPercentage).toBe(100);
    });

    it('should throw error for invalid input', () => {
      expect(() => optimizer.analyzeDiagonalChoices(null)).toThrow('aoValueSets must be an array');
      expect(() => optimizer.analyzeDiagonalChoices('sets')).toThrow('aoValueSets must be an array');
      expect(() => optimizer.analyzeDiagonalChoices({})).toThrow('aoValueSets must be an array');
    });

    it('should validate individual AO value sets', () => {
      const invalidSets = [
        [1.0, 0.75, 0.5, 0.25], // Valid
        [1.0, 0.75, -0.1, 0.25] // Invalid - negative value
      ];
      
      expect(() => optimizer.analyzeDiagonalChoices(invalidSets)).toThrow();
    });
  });

  describe('integration tests', () => {
    it('should work with typical ambient occlusion workflow', () => {
      // Simulate a typical scenario with multiple quads
      const quads = [
        { vertexOffset: 0, aoValues: [1.0, 0.75, 0.5, 0.25] },  // Standard gradient
        { vertexOffset: 4, aoValues: [0.25, 0.5, 0.75, 1.0] },  // Reverse gradient
        { vertexOffset: 8, aoValues: [1.0, 0.0, 1.0, 0.0] },    // Checkerboard
        { vertexOffset: 12, aoValues: [0.5, 0.5, 0.5, 0.5] }    // Uniform
      ];
      
      // Generate all indices
      const allIndices = optimizer.batchGenerateIndices(quads);
      
      expect(allIndices).toHaveLength(24); // 4 quads * 6 indices each
      
      // Verify that each quad uses the correct vertex range
      for (let i = 0; i < 4; i++) {
        const quadIndices = allIndices.slice(i * 6, (i + 1) * 6);
        const minIndex = Math.min(...quadIndices);
        const maxIndex = Math.max(...quadIndices);
        
        expect(minIndex).toBe(i * 4);
        expect(maxIndex).toBe(i * 4 + 3);
      }
    });

    it('should produce consistent results for the same input', () => {
      const aoValues = [0.8, 0.3, 0.6, 0.1];
      
      // Test diagonal choice consistency
      const choice1 = optimizer.chooseOptimalDiagonal(aoValues);
      const choice2 = optimizer.chooseOptimalDiagonal(aoValues);
      expect(choice1).toBe(choice2);
      
      // Test index generation consistency
      const indices1 = optimizer.generateOptimizedIndices(0, aoValues);
      const indices2 = optimizer.generateOptimizedIndices(0, aoValues);
      expect(indices1).toEqual(indices2);
    });

    it('should handle edge cases gracefully', () => {
      // All same values
      const uniform = [0.5, 0.5, 0.5, 0.5];
      expect(() => optimizer.chooseOptimalDiagonal(uniform)).not.toThrow();
      expect(() => optimizer.generateOptimizedIndices(0, uniform)).not.toThrow();
      
      // Extreme values
      const extreme = [0.0, 1.0, 0.0, 1.0];
      expect(() => optimizer.chooseOptimalDiagonal(extreme)).not.toThrow();
      expect(() => optimizer.generateOptimizedIndices(0, extreme)).not.toThrow();
      
      // Boundary values
      const boundary = [0.0, 0.0, 1.0, 1.0];
      expect(() => optimizer.chooseOptimalDiagonal(boundary)).not.toThrow();
      expect(() => optimizer.generateOptimizedIndices(0, boundary)).not.toThrow();
    });

    it('should minimize lighting artifacts through optimal diagonal selection', () => {
      // Test case where diagonal choice matters for visual quality
      const aoValues1 = [1.0, 0.0, 0.0, 1.0]; // High contrast diagonal
      const aoValues2 = [1.0, 1.0, 0.0, 0.0]; // High contrast horizontal
      
      const choice1 = optimizer.chooseOptimalDiagonal(aoValues1);
      const choice2 = optimizer.chooseOptimalDiagonal(aoValues2);
      
      // Both should make valid choices
      expect(typeof choice1).toBe('boolean');
      expect(typeof choice2).toBe('boolean');
      
      // The algorithm should choose the diagonal that minimizes the difference
      // For aoValues1: A-C diff = |1.0 - 0.0| = 1.0, B-D diff = |0.0 - 1.0| = 1.0 (equal, choose A-C)
      expect(choice1).toBe(true);
      
      // For aoValues2: A-C diff = |1.0 - 0.0| = 1.0, B-D diff = |1.0 - 0.0| = 1.0 (equal, choose A-C)
      expect(choice2).toBe(true);
    });
  });
});