import { describe, it, expect, beforeEach } from 'vitest';
import { AmbientOcclusionCalculator } from '../ambientOcclusionCalculator.js';

// Mock chunk class for testing
class MockChunk {
  constructor(width = 32, height = 256, depth = 32) {
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.voxels = new Uint8Array(width * height * depth);
  }

  getVoxel(x, y, z) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) {
      return 0;
    }
    const index = y * this.width * this.depth + z * this.width + x;
    return this.voxels[index];
  }

  setVoxel(x, y, z, value) {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height || z < 0 || z >= this.depth) {
      return;
    }
    const index = y * this.width * this.depth + z * this.width + x;
    this.voxels[index] = value;
  }
}

describe('AmbientOcclusionCalculator', () => {
  let calculator;
  let chunk;

  beforeEach(() => {
    calculator = new AmbientOcclusionCalculator();
    chunk = new MockChunk();
  });

  describe('constructor', () => {
    it('should initialize with correct face directions', () => {
      expect(calculator.faceDirections).toBeDefined();
      expect(calculator.faceDirections.top).toBeDefined();
      expect(calculator.faceDirections.bottom).toBeDefined();
      expect(calculator.faceDirections.north).toBeDefined();
      expect(calculator.faceDirections.south).toBeDefined();
      expect(calculator.faceDirections.east).toBeDefined();
      expect(calculator.faceDirections.west).toBeDefined();
    });

    it('should initialize with correct corner offsets for all faces', () => {
      expect(calculator.cornerOffsets).toBeDefined();
      
      // Each face should have 4 corners
      Object.keys(calculator.faceDirections).forEach(face => {
        expect(calculator.cornerOffsets[face]).toBeDefined();
        expect(calculator.cornerOffsets[face]).toHaveLength(4);
        
        // Each corner should have 3D coordinates
        calculator.cornerOffsets[face].forEach(corner => {
          expect(corner).toHaveLength(3);
          expect(typeof corner[0]).toBe('number');
          expect(typeof corner[1]).toBe('number');
          expect(typeof corner[2]).toBe('number');
        });
      });
    });
  });

  describe('isVoxelSolid', () => {
    it('should return false for air voxels (value 0)', () => {
      chunk.setVoxel(5, 5, 5, 0);
      expect(calculator.isVoxelSolid(chunk, 5, 5, 5)).toBe(false);
    });

    it('should return true for solid voxels (value > 0)', () => {
      chunk.setVoxel(5, 5, 5, 1);
      expect(calculator.isVoxelSolid(chunk, 5, 5, 5)).toBe(true);
      
      chunk.setVoxel(5, 5, 5, 3);
      expect(calculator.isVoxelSolid(chunk, 5, 5, 5)).toBe(true);
    });

    it('should return false for out-of-bounds coordinates', () => {
      expect(calculator.isVoxelSolid(chunk, -1, 5, 5)).toBe(false);
      expect(calculator.isVoxelSolid(chunk, 5, -1, 5)).toBe(false);
      expect(calculator.isVoxelSolid(chunk, 5, 5, -1)).toBe(false);
      expect(calculator.isVoxelSolid(chunk, 32, 5, 5)).toBe(false);
      expect(calculator.isVoxelSolid(chunk, 5, 256, 5)).toBe(false);
      expect(calculator.isVoxelSolid(chunk, 5, 5, 32)).toBe(false);
    });
  });

  describe('getVertexNeighbors', () => {
    it('should throw error for invalid face direction', () => {
      expect(() => {
        calculator.getVertexNeighbors(5, 5, 5, 'invalid', 0);
      }).toThrow('Invalid face direction: invalid');
    });

    it('should throw error for invalid corner index', () => {
      expect(() => {
        calculator.getVertexNeighbors(5, 5, 5, 'top', -1);
      }).toThrow('Invalid corner index: -1. Must be 0-3.');
      
      expect(() => {
        calculator.getVertexNeighbors(5, 5, 5, 'top', 4);
      }).toThrow('Invalid corner index: 4. Must be 0-3.');
    });

    it('should return exactly 3 neighbors for each valid face and corner', () => {
      const faces = ['top', 'bottom', 'north', 'south', 'east', 'west'];
      
      faces.forEach(face => {
        for (let corner = 0; corner < 4; corner++) {
          const neighbors = calculator.getVertexNeighbors(10, 10, 10, face, corner);
          expect(neighbors).toHaveLength(3);
          
          // Each neighbor should have x, y, z coordinates
          neighbors.forEach(neighbor => {
            expect(neighbor).toHaveProperty('x');
            expect(neighbor).toHaveProperty('y');
            expect(neighbor).toHaveProperty('z');
            expect(typeof neighbor.x).toBe('number');
            expect(typeof neighbor.y).toBe('number');
            expect(typeof neighbor.z).toBe('number');
          });
        }
      });
    });

    it('should return different neighbors for different corners of the same face', () => {
      const face = 'top';
      const neighbors0 = calculator.getVertexNeighbors(10, 10, 10, face, 0);
      const neighbors1 = calculator.getVertexNeighbors(10, 10, 10, face, 1);
      const neighbors2 = calculator.getVertexNeighbors(10, 10, 10, face, 2);
      const neighbors3 = calculator.getVertexNeighbors(10, 10, 10, face, 3);

      // Convert to strings for easy comparison
      const stringify = (neighbors) => neighbors.map(n => `${n.x},${n.y},${n.z}`).sort().join('|');
      
      expect(stringify(neighbors0)).not.toBe(stringify(neighbors1));
      expect(stringify(neighbors0)).not.toBe(stringify(neighbors2));
      expect(stringify(neighbors0)).not.toBe(stringify(neighbors3));
      expect(stringify(neighbors1)).not.toBe(stringify(neighbors2));
      expect(stringify(neighbors1)).not.toBe(stringify(neighbors3));
      expect(stringify(neighbors2)).not.toBe(stringify(neighbors3));
    });

    it('should return neighbors relative to the base voxel position', () => {
      const baseX = 10, baseY = 10, baseZ = 10;
      const neighbors = calculator.getVertexNeighbors(baseX, baseY, baseZ, 'top', 0);
      
      // All neighbors should be within reasonable distance of base position
      neighbors.forEach(neighbor => {
        expect(Math.abs(neighbor.x - baseX)).toBeLessThanOrEqual(1);
        expect(Math.abs(neighbor.y - baseY)).toBeLessThanOrEqual(1);
        expect(Math.abs(neighbor.z - baseZ)).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('calculateVertexAO', () => {
    it('should throw error for invalid face direction', () => {
      expect(() => {
        calculator.calculateVertexAO(chunk, 5, 5, 5, 'invalid', 0);
      }).toThrow('Invalid face direction: invalid');
    });

    it('should throw error for invalid corner index', () => {
      expect(() => {
        calculator.calculateVertexAO(chunk, 5, 5, 5, 'top', -1);
      }).toThrow('Invalid corner index: -1. Must be 0-3.');
      
      expect(() => {
        calculator.calculateVertexAO(chunk, 5, 5, 5, 'top', 4);
      }).toThrow('Invalid corner index: 4. Must be 0-3.');
    });

    it('should return 1.0 (full light) when no neighbors are solid', () => {
      // Clear area around test voxel
      for (let x = 8; x < 13; x++) {
        for (let y = 8; y < 13; y++) {
          for (let z = 8; z < 13; z++) {
            chunk.setVoxel(x, y, z, 0);
          }
        }
      }
      
      const aoValue = calculator.calculateVertexAO(chunk, 10, 10, 10, 'top', 0);
      expect(aoValue).toBe(1.0);
    });

    it('should return 0.75 when 1 neighbor is solid', () => {
      // Clear area around test voxel
      for (let x = 8; x < 13; x++) {
        for (let y = 8; y < 13; y++) {
          for (let z = 8; z < 13; z++) {
            chunk.setVoxel(x, y, z, 0);
          }
        }
      }
      
      // Get neighbors for top face, corner 0
      const neighbors = calculator.getVertexNeighbors(10, 10, 10, 'top', 0);
      
      // Set one neighbor as solid
      chunk.setVoxel(neighbors[0].x, neighbors[0].y, neighbors[0].z, 1);
      
      const aoValue = calculator.calculateVertexAO(chunk, 10, 10, 10, 'top', 0);
      expect(aoValue).toBe(0.75);
    });

    it('should return 0.5 when 2 neighbors are solid', () => {
      // Clear area around test voxel
      for (let x = 8; x < 13; x++) {
        for (let y = 8; y < 13; y++) {
          for (let z = 8; z < 13; z++) {
            chunk.setVoxel(x, y, z, 0);
          }
        }
      }
      
      // Get neighbors for top face, corner 0
      const neighbors = calculator.getVertexNeighbors(10, 10, 10, 'top', 0);
      
      // Set two neighbors as solid
      chunk.setVoxel(neighbors[0].x, neighbors[0].y, neighbors[0].z, 1);
      chunk.setVoxel(neighbors[1].x, neighbors[1].y, neighbors[1].z, 1);
      
      const aoValue = calculator.calculateVertexAO(chunk, 10, 10, 10, 'top', 0);
      expect(aoValue).toBe(0.5);
    });

    it('should return 0.25 (full shadow) when all 3 neighbors are solid', () => {
      // Clear area around test voxel
      for (let x = 8; x < 13; x++) {
        for (let y = 8; y < 13; y++) {
          for (let z = 8; z < 13; z++) {
            chunk.setVoxel(x, y, z, 0);
          }
        }
      }
      
      // Get neighbors for top face, corner 0
      const neighbors = calculator.getVertexNeighbors(10, 10, 10, 'top', 0);
      
      // Set all three neighbors as solid
      chunk.setVoxel(neighbors[0].x, neighbors[0].y, neighbors[0].z, 1);
      chunk.setVoxel(neighbors[1].x, neighbors[1].y, neighbors[1].z, 1);
      chunk.setVoxel(neighbors[2].x, neighbors[2].y, neighbors[2].z, 1);
      
      const aoValue = calculator.calculateVertexAO(chunk, 10, 10, 10, 'top', 0);
      expect(aoValue).toBe(0.25);
    });

    it('should work consistently across all faces and corners', () => {
      const faces = ['top', 'bottom', 'north', 'south', 'east', 'west'];
      
      // Clear area around test voxel
      for (let x = 8; x < 13; x++) {
        for (let y = 8; y < 13; y++) {
          for (let z = 8; z < 13; z++) {
            chunk.setVoxel(x, y, z, 0);
          }
        }
      }
      
      faces.forEach(face => {
        for (let corner = 0; corner < 4; corner++) {
          const aoValue = calculator.calculateVertexAO(chunk, 10, 10, 10, face, corner);
          expect(aoValue).toBe(1.0); // No solid neighbors = full light
          expect(typeof aoValue).toBe('number');
          expect(aoValue).toBeGreaterThanOrEqual(0);
          expect(aoValue).toBeLessThanOrEqual(1);
        }
      });
    });

    it('should handle boundary conditions gracefully', () => {
      // Test near chunk boundaries
      const aoValue1 = calculator.calculateVertexAO(chunk, 0, 0, 0, 'top', 0);
      const aoValue2 = calculator.calculateVertexAO(chunk, 31, 255, 31, 'bottom', 3);
      
      expect(typeof aoValue1).toBe('number');
      expect(typeof aoValue2).toBe('number');
      expect(aoValue1).toBeGreaterThanOrEqual(0);
      expect(aoValue1).toBeLessThanOrEqual(1);
      expect(aoValue2).toBeGreaterThanOrEqual(0);
      expect(aoValue2).toBeLessThanOrEqual(1);
    });
  });

  describe('integration tests', () => {
    it('should produce different AO values for different neighbor configurations', () => {
      const testConfigs = [];
      
      // Test with 0, 1, 2, and 3 solid neighbors
      for (let solidCount = 0; solidCount <= 3; solidCount++) {
        // Clear area
        for (let x = 8; x < 13; x++) {
          for (let y = 8; y < 13; y++) {
            for (let z = 8; z < 13; z++) {
              chunk.setVoxel(x, y, z, 0);
            }
          }
        }
        
        // Get neighbors and set the required number as solid
        const neighbors = calculator.getVertexNeighbors(10, 10, 10, 'top', 0);
        for (let i = 0; i < solidCount; i++) {
          chunk.setVoxel(neighbors[i].x, neighbors[i].y, neighbors[i].z, 1);
        }
        
        const aoValue = calculator.calculateVertexAO(chunk, 10, 10, 10, 'top', 0);
        testConfigs.push({ solidCount, aoValue });
      }
      
      // Verify that AO values decrease as solid neighbor count increases
      expect(testConfigs[0].aoValue).toBeGreaterThan(testConfigs[1].aoValue);
      expect(testConfigs[1].aoValue).toBeGreaterThan(testConfigs[2].aoValue);
      expect(testConfigs[2].aoValue).toBeGreaterThan(testConfigs[3].aoValue);
      
      // Verify expected values
      expect(testConfigs[0].aoValue).toBe(1.0);   // 0 solid = full light
      expect(testConfigs[1].aoValue).toBe(0.75);  // 1 solid = slight shadow
      expect(testConfigs[2].aoValue).toBe(0.5);   // 2 solid = medium shadow
      expect(testConfigs[3].aoValue).toBe(0.25);  // 3 solid = full shadow
    });
  });
});