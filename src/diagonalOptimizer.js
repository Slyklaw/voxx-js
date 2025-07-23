/**
 * DiagonalOptimizer - Optimizes quad triangulation to minimize ambient occlusion artifacts
 * 
 * This class determines the optimal diagonal for triangulating quad faces based on
 * ambient occlusion values at each corner. The goal is to minimize lighting artifacts
 * by choosing the diagonal that produces the most natural-looking lighting transitions.
 */
export class DiagonalOptimizer {
  constructor() {
    // No initialization needed for this utility class
  }

  /**
   * Determine optimal diagonal for quad triangulation based on AO values
   * 
   * The algorithm compares the sum of AO values along each possible diagonal:
   * - Diagonal A-C: connects corners 0 and 2
   * - Diagonal B-D: connects corners 1 and 3
   * 
   * The diagonal with the smaller difference in AO values is chosen to minimize
   * lighting artifacts and create smoother transitions.
   * 
   * @param {Array<number>} aoValues - AO values for 4 corners [a, b, c, d] where:
   *   - a = top-left corner (index 0)
   *   - b = top-right corner (index 1) 
   *   - c = bottom-right corner (index 2)
   *   - d = bottom-left corner (index 3)
   * @returns {boolean} True for diagonal a-c (0-2), false for diagonal b-d (1-3)
   */
  chooseOptimalDiagonal(aoValues) {
    // Validate input
    if (!Array.isArray(aoValues) || aoValues.length !== 4) {
      throw new Error('aoValues must be an array of exactly 4 numbers');
    }

    // Validate that all AO values are valid numbers between 0 and 1
    for (let i = 0; i < 4; i++) {
      if (typeof aoValues[i] !== 'number' || aoValues[i] < 0 || aoValues[i] > 1) {
        throw new Error(`aoValues[${i}] must be a number between 0 and 1`);
      }
    }

    const [a, b, c, d] = aoValues;

    // Calculate the difference in AO values for each diagonal
    // Diagonal A-C: difference between opposite corners a and c
    const diagonalAC_diff = Math.abs(a - c);
    
    // Diagonal B-D: difference between opposite corners b and d
    const diagonalBD_diff = Math.abs(b - d);

    // Choose the diagonal with the smaller difference to minimize artifacts
    // If differences are equal, default to A-C diagonal for consistency
    return diagonalAC_diff <= diagonalBD_diff;
  }

  /**
   * Generate triangle indices based on diagonal choice for a quad
   * 
   * Quad vertices are ordered as:
   * [0] --- [1]
   *  |       |
   * [3] --- [2]
   * 
   * @param {number} vertexOffset - Starting vertex index in the geometry buffer
   * @param {boolean} useACDiagonal - True to use A-C diagonal (0-2), false for B-D diagonal (1-3)
   * @returns {Array<number>} Array of 6 triangle indices (2 triangles * 3 vertices each)
   */
  generateTriangleIndices(vertexOffset, useACDiagonal) {
    // Validate inputs
    if (typeof vertexOffset !== 'number' || vertexOffset < 0) {
      throw new Error('vertexOffset must be a non-negative number');
    }

    if (typeof useACDiagonal !== 'boolean') {
      throw new Error('useACDiagonal must be a boolean');
    }

    // Calculate vertex indices
    const v0 = vertexOffset;     // top-left
    const v1 = vertexOffset + 1; // top-right
    const v2 = vertexOffset + 2; // bottom-right
    const v3 = vertexOffset + 3; // bottom-left

    if (useACDiagonal) {
      // Use A-C diagonal (connects vertices 0 and 2)
      // Triangle 1: [0, 1, 2] (top-left, top-right, bottom-right)
      // Triangle 2: [0, 2, 3] (top-left, bottom-right, bottom-left)
      return [
        v0, v1, v2,  // First triangle
        v0, v2, v3   // Second triangle
      ];
    } else {
      // Use B-D diagonal (connects vertices 1 and 3)
      // Triangle 1: [0, 1, 3] (top-left, top-right, bottom-left)
      // Triangle 2: [1, 2, 3] (top-right, bottom-right, bottom-left)
      return [
        v0, v1, v3,  // First triangle
        v1, v2, v3   // Second triangle
      ];
    }
  }

  /**
   * Generate optimized triangle indices for a quad based on AO values
   * 
   * This is a convenience method that combines diagonal selection and index generation.
   * 
   * @param {number} vertexOffset - Starting vertex index in the geometry buffer
   * @param {Array<number>} aoValues - AO values for 4 corners [a, b, c, d]
   * @returns {Array<number>} Array of 6 triangle indices optimized for the given AO values
   */
  generateOptimizedIndices(vertexOffset, aoValues) {
    const useACDiagonal = this.chooseOptimalDiagonal(aoValues);
    return this.generateTriangleIndices(vertexOffset, useACDiagonal);
  }

  /**
   * Batch process multiple quads for optimal triangulation
   * 
   * @param {Array<{vertexOffset: number, aoValues: Array<number>}>} quads - Array of quad data
   * @returns {Array<number>} Flattened array of all triangle indices
   */
  batchGenerateIndices(quads) {
    // Validate input
    if (!Array.isArray(quads)) {
      throw new Error('quads must be an array');
    }

    const allIndices = [];

    for (let i = 0; i < quads.length; i++) {
      const quad = quads[i];
      
      // Validate quad structure
      if (!quad || typeof quad !== 'object') {
        throw new Error(`quads[${i}] must be an object with vertexOffset and aoValues properties`);
      }

      if (typeof quad.vertexOffset !== 'number') {
        throw new Error(`quads[${i}].vertexOffset must be a number`);
      }

      if (!Array.isArray(quad.aoValues)) {
        throw new Error(`quads[${i}].aoValues must be an array`);
      }

      // Generate indices for this quad
      const indices = this.generateOptimizedIndices(quad.vertexOffset, quad.aoValues);
      allIndices.push(...indices);
    }

    return allIndices;
  }

  /**
   * Analyze diagonal choice statistics for debugging
   * 
   * @param {Array<Array<number>>} aoValueSets - Array of AO value arrays to analyze
   * @returns {Object} Statistics about diagonal choices
   */
  analyzeDiagonalChoices(aoValueSets) {
    if (!Array.isArray(aoValueSets)) {
      throw new Error('aoValueSets must be an array');
    }

    let acDiagonalCount = 0;
    let bdDiagonalCount = 0;
    const choices = [];

    for (const aoValues of aoValueSets) {
      const useAC = this.chooseOptimalDiagonal(aoValues);
      choices.push(useAC);
      
      if (useAC) {
        acDiagonalCount++;
      } else {
        bdDiagonalCount++;
      }
    }

    return {
      total: aoValueSets.length,
      acDiagonalCount,
      bdDiagonalCount,
      acPercentage: aoValueSets.length > 0 ? (acDiagonalCount / aoValueSets.length) * 100 : 0,
      bdPercentage: aoValueSets.length > 0 ? (bdDiagonalCount / aoValueSets.length) * 100 : 0,
      choices
    };
  }
}