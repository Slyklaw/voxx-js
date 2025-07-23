import * as THREE from 'three';

/**
 * VertexColorManager - Manages vertex color conversion and interpolation for ambient occlusion
 * 
 * This class handles the conversion of ambient occlusion values to Three.js colors,
 * provides bilinear interpolation for merged faces in greedy meshing, and manages
 * vertex color arrays for geometry application.
 */
export class VertexColorManager {
  constructor() {
    // Base color for ambient occlusion (white for full light, darker for shadows)
    this.baseColor = new THREE.Color(1, 1, 1);
    
    // Color cache for performance optimization
    this.colorCache = new Map();
  }

  /**
   * Convert ambient occlusion value to vertex color
   * @param {number} aoValue - AO value (0 = full shadow, 1 = full light)
   * @returns {THREE.Color} Vertex color
   */
  aoToColor(aoValue) {
    // Validate input
    if (typeof aoValue !== 'number' || aoValue < 0 || aoValue > 1) {
      throw new Error(`Invalid AO value: ${aoValue}. Must be a number between 0 and 1.`);
    }

    // Check cache first for performance
    const cacheKey = Math.round(aoValue * 1000) / 1000; // Round to 3 decimal places
    if (this.colorCache.has(cacheKey)) {
      return this.colorCache.get(cacheKey).clone();
    }

    // Create color based on AO value
    // AO value directly controls the brightness (0 = black, 1 = white)
    const color = new THREE.Color(aoValue, aoValue, aoValue);
    
    // Cache the color for future use
    this.colorCache.set(cacheKey, color.clone());
    
    return color;
  }

  /**
   * Interpolate vertex colors for merged faces using bilinear interpolation
   * @param {Array<THREE.Color>} cornerColors - Array of 4 corner colors [topLeft, topRight, bottomRight, bottomLeft]
   * @param {number} width - Face width in voxels
   * @param {number} height - Face height in voxels
   * @returns {Array<THREE.Color>} Interpolated colors for all vertices
   */
  interpolateColors(cornerColors, width, height) {
    // Validate inputs
    if (!Array.isArray(cornerColors) || cornerColors.length !== 4) {
      throw new Error('cornerColors must be an array of exactly 4 THREE.Color objects');
    }

    if (typeof width !== 'number' || width < 1 || typeof height !== 'number' || height < 1) {
      throw new Error('width and height must be positive numbers');
    }

    // Validate that all corner colors are THREE.Color instances
    for (let i = 0; i < 4; i++) {
      if (!(cornerColors[i] instanceof THREE.Color)) {
        throw new Error(`cornerColors[${i}] must be a THREE.Color instance`);
      }
    }

    const [topLeft, topRight, bottomRight, bottomLeft] = cornerColors;
    const interpolatedColors = [];

    // For each vertex position in the merged face
    // Grid layout: (width+1) x (height+1) vertices
    for (let row = 0; row <= height; row++) {
      for (let col = 0; col <= width; col++) {
        // Calculate normalized coordinates (0 to 1)
        const u = width > 0 ? col / width : 0;
        const v = height > 0 ? row / height : 0;

        // Bilinear interpolation
        // First interpolate along the top edge (row 0)
        const topColor = new THREE.Color().lerpColors(topLeft, topRight, u);
        
        // Then interpolate along the bottom edge (row height)
        const bottomColor = new THREE.Color().lerpColors(bottomLeft, bottomRight, u);
        
        // Finally interpolate between top and bottom
        const finalColor = new THREE.Color().lerpColors(topColor, bottomColor, v);
        
        interpolatedColors.push(finalColor);
      }
    }

    return interpolatedColors;
  }

  /**
   * Apply vertex colors to Three.js BufferGeometry
   * @param {THREE.BufferGeometry} geometry - Target geometry
   * @param {Array<THREE.Color>} colors - Vertex colors array
   */
  applyVertexColors(geometry, colors) {
    // Validate inputs
    if (!(geometry instanceof THREE.BufferGeometry)) {
      throw new Error('geometry must be a THREE.BufferGeometry instance');
    }

    if (!Array.isArray(colors)) {
      throw new Error('colors must be an array of THREE.Color objects');
    }

    // Get the position attribute to determine vertex count
    const positionAttribute = geometry.getAttribute('position');
    if (!positionAttribute) {
      throw new Error('geometry must have a position attribute');
    }

    const vertexCount = positionAttribute.count;
    
    // Validate that we have the correct number of colors
    if (colors.length !== vertexCount) {
      throw new Error(`Color count (${colors.length}) must match vertex count (${vertexCount})`);
    }

    // Validate that all colors are THREE.Color instances
    for (let i = 0; i < colors.length; i++) {
      if (!(colors[i] instanceof THREE.Color)) {
        throw new Error(`colors[${i}] must be a THREE.Color instance`);
      }
    }

    // Create color attribute array
    const colorArray = new Float32Array(vertexCount * 3);
    
    // Fill the color array
    for (let i = 0; i < colors.length; i++) {
      const color = colors[i];
      const index = i * 3;
      colorArray[index] = color.r;
      colorArray[index + 1] = color.g;
      colorArray[index + 2] = color.b;
    }

    // Set the color attribute on the geometry
    geometry.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));
  }

  /**
   * Create vertex colors for a simple quad face (4 vertices)
   * @param {Array<number>} aoValues - Array of 4 AO values for the quad corners
   * @returns {Array<THREE.Color>} Array of 4 vertex colors
   */
  createQuadColors(aoValues) {
    // Validate input
    if (!Array.isArray(aoValues) || aoValues.length !== 4) {
      throw new Error('aoValues must be an array of exactly 4 numbers');
    }

    // Validate that all AO values are valid numbers
    for (let i = 0; i < 4; i++) {
      if (typeof aoValues[i] !== 'number' || aoValues[i] < 0 || aoValues[i] > 1) {
        throw new Error(`aoValues[${i}] must be a number between 0 and 1`);
      }
    }

    // Convert each AO value to a color
    return aoValues.map(aoValue => this.aoToColor(aoValue));
  }

  /**
   * Batch convert multiple AO values to colors for performance
   * @param {Array<number>} aoValues - Array of AO values
   * @returns {Array<THREE.Color>} Array of vertex colors
   */
  batchAoToColors(aoValues) {
    // Validate input
    if (!Array.isArray(aoValues)) {
      throw new Error('aoValues must be an array');
    }

    // Convert all AO values to colors
    return aoValues.map(aoValue => this.aoToColor(aoValue));
  }

  /**
   * Clear the color cache to free memory
   */
  clearCache() {
    this.colorCache.clear();
  }

  /**
   * Get cache statistics for debugging
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      size: this.colorCache.size,
      keys: Array.from(this.colorCache.keys())
    };
  }
}