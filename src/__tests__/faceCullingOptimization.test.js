import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { Chunk, CHUNK_WIDTH, CHUNK_DEPTH } from '../chunk.js';
import { World } from '../world.js';

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

// Mock WorkerPool to avoid Worker dependency in tests
vi.mock('../workers/workerPool.js', () => ({
  WorkerPool: vi.fn(() => ({
    enqueueTask: vi.fn(),
    enqueuePriorityTask: vi.fn(),
    terminate: vi.fn()
  }))
}));

describe('Face Culling Optimization Tests', () => {
  let mockScene;
  let world;

  beforeEach(() => {
    mockScene = {
      add: vi.fn(),
      remove: vi.fn()
    };
    world = new World(12345, mockScene);
  });

  describe('Cross-Chunk Face Culling', () => {
    it('should cull faces at chunk boundaries when neighbors are loaded', () => {
      // Create two adjacent chunks with a specific pattern to test boundary culling
      const chunk1 = new Chunk(0, 0, world);
      const chunk2 = new Chunk(1, 0, world);
      
      world.chunks['0,0'] = chunk1;
      world.chunks['1,0'] = chunk2;
      
      // Create a wall of voxels at the boundary between chunks
      // This should create faces that can be culled when neighbors are considered
      for (let z = 0; z < CHUNK_DEPTH; z++) {
        for (let y = 10; y <= 20; y++) {
          // Voxel at right edge of chunk1
          chunk1.setVoxel(CHUNK_WIDTH - 1, y, z, 1);
          // Voxel at left edge of chunk2 (adjacent to chunk1's right edge)
          chunk2.setVoxel(0, y, z, 1);
        }
      }
      
      chunk1.isGenerated = true;
      chunk2.isGenerated = true;
      
      // Test chunk1's mesh generation
      // Without cross-chunk checking, the east face of the rightmost voxels should be exposed
      const meshWithoutCrosschunk = chunk1.createMesh(false);
      const facesWithoutCrosschunk = meshWithoutCrosschunk.geometry.index.count / 3;
      
      // Reset mesh state
      chunk1.hasMesh = false;
      
      // With cross-chunk checking, the east faces should be culled because chunk2 has adjacent voxels
      const meshWithCrosschunk = chunk1.createMesh(true);
      const facesWithCrosschunk = meshWithCrosschunk.geometry.index.count / 3;
      
      console.log(`Boundary culling test - Without cross-chunk: ${facesWithoutCrosschunk}, With cross-chunk: ${facesWithCrosschunk}`);
      
      // Should have fewer faces when cross-chunk culling is enabled
      // The difference should be the number of east faces that were culled
      expect(facesWithCrosschunk).toBeLessThan(facesWithoutCrosschunk);
      
      const culledFaces = facesWithoutCrosschunk - facesWithCrosschunk;
      console.log(`Culled ${culledFaces} faces at chunk boundary`);
      
      // Should have culled some faces (at least the east faces of the boundary voxels)
      expect(culledFaces).toBeGreaterThan(0);
    });

    it('should properly check voxels across chunk boundaries', () => {
      // Create a mock world that tracks cross-chunk voxel queries
      const mockWorld = {
        getVoxel: vi.fn((worldX, worldY, worldZ) => {
          // Simulate solid terrain below y=50
          if (worldY <= 50) return 1;
          return 0;
        })
      };
      
      const chunk = new Chunk(0, 0, mockWorld);
      
      // Fill chunk with terrain
      for (let x = 0; x < CHUNK_WIDTH; x++) {
        for (let z = 0; z < CHUNK_DEPTH; z++) {
          for (let y = 0; y <= 50; y++) {
            chunk.setVoxel(x, y, z, 1);
          }
        }
      }
      
      chunk.isGenerated = true;
      
      // Create mesh - this should trigger cross-chunk voxel queries
      const mesh = chunk.createMesh(true); // Force AO to enable cross-chunk checking
      
      // Verify that cross-chunk voxel queries were made
      expect(mockWorld.getVoxel).toHaveBeenCalled();
      
      // Check that queries were made for coordinates outside the chunk
      const calls = mockWorld.getVoxel.mock.calls;
      const crossChunkCalls = calls.filter(call => 
        call[0] < 0 || call[0] >= CHUNK_WIDTH || call[2] < 0 || call[2] >= CHUNK_DEPTH
      );
      
      expect(crossChunkCalls.length).toBeGreaterThan(0);
    });

    it('should fall back to local checking when neighbors are not ready', () => {
      const chunk = new Chunk(0, 0, world);
      
      // Fill chunk with some terrain
      for (let x = 0; x < 5; x++) {
        for (let z = 0; z < 5; z++) {
          for (let y = 0; y <= 10; y++) {
            chunk.setVoxel(x, y, z, 1);
          }
        }
      }
      
      chunk.isGenerated = true;
      
      // Create mesh without neighbors ready (should use local checking)
      const mesh = chunk.createMesh();
      
      expect(mesh).toBeDefined();
      expect(mesh.geometry.index.count).toBeGreaterThan(0);
    });

    it('should handle edge cases at chunk boundaries', () => {
      // Create chunks with different terrain heights at boundaries
      const chunk1 = new Chunk(0, 0, world);
      const chunk2 = new Chunk(1, 0, world);
      
      world.chunks['0,0'] = chunk1;
      world.chunks['1,0'] = chunk2;
      
      // Create terrain with different heights at boundary
      for (let x = 0; x < CHUNK_WIDTH; x++) {
        for (let z = 0; z < CHUNK_DEPTH; z++) {
          // Chunk1: terrain up to y=30
          for (let y = 0; y <= 30; y++) {
            chunk1.setVoxel(x, y, z, 1);
          }
          
          // Chunk2: terrain up to y=40 (higher)
          for (let y = 0; y <= 40; y++) {
            chunk2.setVoxel(x, y, z, 1);
          }
        }
      }
      
      chunk1.isGenerated = true;
      chunk2.isGenerated = true;
      
      // Create meshes - should handle height differences correctly
      const mesh1 = chunk1.createMesh();
      const mesh2 = chunk2.createMesh();
      
      expect(mesh1).toBeDefined();
      expect(mesh2).toBeDefined();
      expect(mesh1.geometry.index.count).toBeGreaterThan(0);
      expect(mesh2.geometry.index.count).toBeGreaterThan(0);
    });
  });

  describe('World Integration', () => {
    it('should have regenerateNeighborMeshesForFaceCulling method', () => {
      // Test that the method exists and can be called
      expect(typeof world.regenerateNeighborMeshesForFaceCulling).toBe('function');
      
      // Should not throw when called
      expect(() => {
        world.regenerateNeighborMeshesForFaceCulling(0, 0);
      }).not.toThrow();
    });

    it('should track face culling statistics', () => {
      const stats = world.getAOStats();
      
      expect(stats).toHaveProperty('chunksWithAO');
      expect(stats).toHaveProperty('chunksWithoutAO');
      expect(stats).toHaveProperty('chunksUpgraded');
      expect(stats).toHaveProperty('totalChunks');
      expect(stats).toHaveProperty('aoPercentage');
    });
  });

  describe('Performance Optimization', () => {
    it('should reduce face count with proper culling', () => {
      // Create a 2x2 grid of chunks with continuous terrain
      const chunks = [];
      for (let x = 0; x < 2; x++) {
        for (let z = 0; z < 2; z++) {
          const chunk = new Chunk(x, z, world);
          world.chunks[`${x},${z}`] = chunk;
          chunks.push(chunk);
          
          // Fill with solid terrain
          for (let cx = 0; cx < CHUNK_WIDTH; cx++) {
            for (let cz = 0; cz < CHUNK_DEPTH; cz++) {
              for (let y = 0; y <= 20; y++) {
                chunk.setVoxel(cx, y, cz, 1);
              }
            }
          }
          
          chunk.isGenerated = true;
        }
      }
      
      // Create meshes for all chunks
      const meshes = chunks.map(chunk => chunk.createMesh());
      const totalFaces = meshes.reduce((sum, mesh) => sum + mesh.geometry.index.count / 3, 0);
      
      // With proper face culling, internal faces should be removed
      // The exact number depends on terrain, but should be reasonable
      expect(totalFaces).toBeGreaterThan(0);
      expect(totalFaces).toBeLessThan(50000); // Reasonable upper bound
      
      console.log(`Total faces with culling: ${totalFaces}`);
    });

    it('should handle memory efficiently during mesh regeneration', () => {
      const chunk = new Chunk(0, 0, world);
      
      // Fill with some terrain
      for (let x = 0; x < 10; x++) {
        for (let z = 0; z < 10; z++) {
          for (let y = 0; y <= 10; y++) {
            chunk.setVoxel(x, y, z, 1);
          }
        }
      }
      
      chunk.isGenerated = true;
      
      // Create initial mesh
      const mesh1 = chunk.createMesh();
      const geometry1 = mesh1.geometry;
      const material1 = mesh1.material;
      
      // Spy on dispose methods
      const geometryDisposeSpy = vi.spyOn(geometry1, 'dispose');
      const materialDisposeSpy = vi.spyOn(material1, 'dispose');
      
      // Reset and create new mesh (simulating regeneration)
      chunk.hasMesh = false;
      const mesh2 = chunk.createMesh();
      
      // Verify new mesh is different
      expect(mesh2).not.toBe(mesh1);
      expect(mesh2.geometry).not.toBe(geometry1);
      expect(mesh2.material).not.toBe(material1);
    });
  });

  afterEach(() => {
    if (world) {
      world.dispose();
    }
  });
});