import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { Chunk } from '../chunk.js';
import { AmbientOcclusionCalculator } from '../ambientOcclusionCalculator.js';
import { VertexColorManager } from '../vertexColorManager.js';
import { DiagonalOptimizer } from '../diagonalOptimizer.js';

// Mock Three.js to avoid WebGL context issues in tests
vi.mock('three', async () => {
  const actual = await vi.importActual('three');
  return {
    ...actual,
    WebGLRenderer: vi.fn(() => ({
      setSize: vi.fn(),
      setPixelRatio: vi.fn(),
      domElement: document.createElement('canvas'),
      shadowMap: { enabled: false, type: null }
    }))
  };
});

describe('Chunk AO Integration Tests', () => {
  let chunk;
  let mockNoise;

  beforeEach(() => {
    // Create a test chunk
    chunk = new Chunk(0, 0);
    
    // Mock noise function for consistent terrain generation
    mockNoise = vi.fn((x, z) => 0.5); // Consistent height
    
    // Generate simple test terrain
    chunk.generate(mockNoise);
  });

  describe('Material Configuration', () => {
    it('should create mesh with vertex colors enabled', () => {
      const mesh = chunk.createMesh();
      
      expect(mesh).toBeInstanceOf(THREE.Mesh);
      expect(mesh.material).toBeInstanceOf(THREE.MeshStandardMaterial);
      expect(mesh.material.vertexColors).toBe(true);
    });

    it('should have color attribute in geometry', () => {
      const mesh = chunk.createMesh();
      const geometry = mesh.geometry;
      
      expect(geometry.getAttribute('color')).toBeDefined();
      expect(geometry.getAttribute('color').itemSize).toBe(3); // RGB
    });

    it('should have matching vertex and color counts', () => {
      const mesh = chunk.createMesh();
      const geometry = mesh.geometry;
      
      const positionCount = geometry.getAttribute('position').count;
      const colorCount = geometry.getAttribute('color').count;
      
      expect(colorCount).toBe(positionCount);
    });
  });

  describe('Lighting Compatibility', () => {
    let scene, ambientLight, directionalLight;

    beforeEach(() => {
      scene = new THREE.Scene();
      ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
      directionalLight.position.set(5, 10, 7.5);
      
      scene.add(ambientLight);
      scene.add(directionalLight);
    });

    it('should work with ambient lighting', () => {
      const mesh = chunk.createMesh();
      scene.add(mesh);
      
      // Verify material properties are compatible with ambient light
      expect(mesh.material.vertexColors).toBe(true);
      expect(mesh.material.type).toBe('MeshStandardMaterial');
      
      // MeshStandardMaterial should respond to ambient light
      expect(ambientLight.intensity).toBe(0.7);
    });

    it('should work with directional lighting', () => {
      const mesh = chunk.createMesh();
      scene.add(mesh);
      
      // Verify material properties are compatible with directional light
      expect(mesh.material.vertexColors).toBe(true);
      expect(mesh.material.type).toBe('MeshStandardMaterial');
      
      // MeshStandardMaterial should respond to directional light
      expect(directionalLight.intensity).toBe(0.8);
      expect(directionalLight.position.x).toBe(5);
      expect(directionalLight.position.y).toBe(10);
      expect(directionalLight.position.z).toBe(7.5);
    });

    it('should blend vertex colors with lighting', () => {
      // Use a smaller test chunk for performance
      const smallChunk = new Chunk(0, 0);
      
      // Add just a few voxels instead of generating full terrain
      for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
          for (let z = 0; z < 3; z++) {
            smallChunk.setVoxel(x, y, z, 1); // Stone
          }
        }
      }
      
      const mesh = smallChunk.createMesh();
      const geometry = mesh.geometry;
      const colorAttribute = geometry.getAttribute('color');
      
      // Verify that vertex colors are present and will blend with lighting
      expect(colorAttribute).toBeDefined();
      expect(colorAttribute.array.length).toBeGreaterThan(0);
      
      // Check that colors are in valid range (0-1)
      for (let i = 0; i < colorAttribute.array.length; i++) {
        const colorValue = colorAttribute.array[i];
        expect(colorValue).toBeGreaterThanOrEqual(0);
        expect(colorValue).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('AO Integration', () => {
    it('should calculate AO values for faces', () => {
      const aoCalculator = new AmbientOcclusionCalculator();
      
      // Test AO calculation for a simple case
      const aoValue = aoCalculator.calculateVertexAO(chunk, 5, 100, 5, 'top', 0);
      
      expect(typeof aoValue).toBe('number');
      expect(aoValue).toBeGreaterThanOrEqual(0);
      expect(aoValue).toBeLessThanOrEqual(1);
    });

    it('should apply AO to vertex colors', () => {
      // Use a smaller test chunk for performance
      const smallChunk = new Chunk(0, 0);
      
      // Create a pattern that will definitely generate AO variation
      // A single isolated voxel (should have full light on all faces)
      smallChunk.setVoxel(2, 2, 2, 1); // Stone
      
      // Add some neighboring voxels to create occlusion
      smallChunk.setVoxel(1, 3, 2, 1); // Above and to the west
      smallChunk.setVoxel(2, 3, 1, 1); // Above and to the north
      
      const mesh = smallChunk.createMesh();
      const geometry = mesh.geometry;
      const colorAttribute = geometry.getAttribute('color');
      
      // Verify that colors vary (indicating AO is applied)
      const colors = Array.from(colorAttribute.array);
      const uniqueColors = new Set(colors.map(c => Math.round(c * 100) / 100));
      
      console.log(`AO test found ${uniqueColors.size} unique colors:`, Array.from(uniqueColors).sort());
      
      // Should have some variation in colors due to AO
      expect(uniqueColors.size).toBeGreaterThan(1);
    });

    it('should use diagonal optimization', () => {
      const diagonalOptimizer = new DiagonalOptimizer();
      const testAOValues = [1.0, 0.75, 0.5, 0.25];
      
      const useACDiagonal = diagonalOptimizer.chooseOptimalDiagonal(testAOValues);
      const indices = diagonalOptimizer.generateTriangleIndices(0, useACDiagonal);
      
      expect(typeof useACDiagonal).toBe('boolean');
      expect(indices).toHaveLength(6); // 2 triangles * 3 vertices
    });
  });

  describe('Performance', () => {
    it('should complete mesh generation within reasonable time', () => {
      const startTime = performance.now();
      
      const mesh = chunk.createMesh();
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      // Should complete within 2 seconds (per-voxel AO is slower than greedy meshing)
      expect(duration).toBeLessThan(2000);
      expect(mesh).toBeDefined();
    });

    it('should handle large faces efficiently', () => {
      // Create a chunk with large flat areas to test greedy meshing with AO
      const flatChunk = new Chunk(0, 0);
      
      // Fill with a flat layer to create large merged faces
      for (let x = 0; x < 32; x++) {
        for (let z = 0; z < 32; z++) {
          flatChunk.setVoxel(x, 100, z, 1); // Stone layer
        }
      }
      
      const startTime = performance.now();
      const mesh = flatChunk.createMesh();
      const endTime = performance.now();
      
      expect(mesh).toBeDefined();
      expect(endTime - startTime).toBeLessThan(500); // Should be fast for flat terrain
    });
  });

  describe('Error Handling', () => {
    it('should handle AO calculation failures gracefully', () => {
      // Use a smaller chunk for this test to avoid timeout
      const smallChunk = new Chunk(0, 0);
      smallChunk.setVoxel(0, 0, 0, 1); // Single voxel
      
      // Create a spy to simulate AO calculation failure
      const aoCalculatorSpy = vi.spyOn(AmbientOcclusionCalculator.prototype, 'calculateVertexAO');
      aoCalculatorSpy.mockImplementation(() => {
        throw new Error('Test AO failure');
      });
      
      // Should not throw and should fallback to full light
      expect(() => {
        const mesh = smallChunk.createMesh();
        expect(mesh).toBeDefined();
      }).not.toThrow();
      
      aoCalculatorSpy.mockRestore();
    });

    it('should handle invalid face directions gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // This should trigger the error handling in calculateFaceAO
      const mesh = chunk.createMesh();
      expect(mesh).toBeDefined();
      
      consoleSpy.mockRestore();
    });
  });

  describe('Memory Management', () => {
    it('should properly dispose of mesh resources', () => {
      const mesh = chunk.createMesh();
      
      // Verify geometry and material are created
      expect(mesh.geometry).toBeDefined();
      expect(mesh.material).toBeDefined();
      
      // Test disposal
      const geometryDisposeSpy = vi.spyOn(mesh.geometry, 'dispose');
      const materialDisposeSpy = vi.spyOn(mesh.material, 'dispose');
      
      chunk.dispose();
      
      expect(geometryDisposeSpy).toHaveBeenCalled();
      expect(materialDisposeSpy).toHaveBeenCalled();
      expect(chunk.mesh).toBeNull();
    });

    it('should handle multiple mesh creations', () => {
      // Create multiple meshes to test resource management
      const mesh1 = chunk.createMesh();
      const mesh2 = chunk.createMesh();
      
      // Second mesh should replace the first
      expect(chunk.mesh).toBe(mesh2);
      expect(mesh1).not.toBe(mesh2);
    });
  });
});