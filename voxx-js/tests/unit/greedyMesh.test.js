import { describe, it, expect, beforeEach } from 'vitest';
import { generateMeshData } from '../../greedyMesh.js';
import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from '../../chunkCore.js';
import { BLOCK_TYPES } from '../../blocks.js';

describe('greedyMesh.js', () => {
  // Create a simple mock chunk with voxel data
  function createMockChunk() {
    return {
      chunkX: 0,
      chunkZ: 0,
      voxels: new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH)
    };
  }

  describe('generateMeshData', () => {
    it('returns mesh data with required array properties', () => {
      const chunk = createMockChunk();
      const getVoxel = () => 0; // Empty chunk
      const mesh = generateMeshData(chunk, getVoxel, 0, 0);

      expect(mesh).toHaveProperty('positions');
      expect(mesh).toHaveProperty('normals');
      expect(mesh).toHaveProperty('uvs');
      expect(mesh).toHaveProperty('tileBase');
      expect(mesh).toHaveProperty('indices');
      expect(mesh).toHaveProperty('colors');
      expect(mesh).toHaveProperty('blockTypes');
      expect(mesh).toHaveProperty('triangleVariant');
    });

    it('returns empty arrays for chunk with no voxels', () => {
      const chunk = createMockChunk();
      const getVoxel = () => 0;
      const mesh = generateMeshData(chunk, getVoxel, 0, 0);

      expect(mesh.positions.length).toBe(0);
      expect(mesh.normals.length).toBe(0);
      expect(mesh.indices.length).toBe(0);
    });

    it('returns correct array types for empty chunk', () => {
      const chunk = createMockChunk();
      const getVoxel = () => 0;
      const mesh = generateMeshData(chunk, getVoxel, 0, 0);

      expect(mesh.positions).toBeInstanceOf(Float32Array);
      expect(mesh.normals).toBeInstanceOf(Float32Array);
      expect(mesh.indices).toBeInstanceOf(Uint32Array);
      expect(mesh.colors).toBeInstanceOf(Float32Array);
      expect(mesh.uvs).toBeInstanceOf(Float32Array);
    });

    it('produces non-empty mesh for chunk with a single solid block', () => {
      const chunk = createMockChunk();
      // Set a single block at the center of the chunk
      const centerX = Math.floor(CHUNK_WIDTH / 2);
      const centerY = 1;
      const centerZ = Math.floor(CHUNK_DEPTH / 2);
      const getVoxel = (x, y, z) => {
        if (x === centerX && y === centerY && z === centerZ) return BLOCK_TYPES.STONE;
        return 0;
      };
      const mesh = generateMeshData(chunk, getVoxel, 0, 0);

      // A single block should produce faces (at least some vertices)
      expect(mesh.positions.length).toBeGreaterThan(0);
      expect(mesh.normals.length).toBeGreaterThan(0);
    });

    it('creates proper indices for triangles', () => {
      const chunk = createMockChunk();
      const getVoxel = () => BLOCK_TYPES.STONE;
      const mesh = generateMeshData(chunk, getVoxel, 0, 0);

      if (mesh.indices.length > 0) {
        // Indices should be valid integers
        expect(Number.isInteger(mesh.indices[0])).toBe(true);
        // Triangle indices: each group of 3 forms a triangle
        expect(mesh.indices.length % 3).toBe(0);
      }
    });

    it('respects world offset for chunkX and chunkZ', () => {
      const chunk = createMockChunk();
      const chunkX = 2;
      const chunkZ = 3;

      // All solid chunk - produces faces at chunk boundaries
      const getVoxel = () => BLOCK_TYPES.STONE;
      const mesh = generateMeshData(chunk, getVoxel, chunkX, chunkZ);

      expect(mesh.positions.length).toBeGreaterThan(0);

      // Check that at least some positions reflect world offset
      const worldOffsetX = chunkX * CHUNK_WIDTH;
      const worldOffsetZ = chunkZ * CHUNK_DEPTH;
      const hasOffset = Array.from(mesh.positions).some((val, i) => {
        if (i % 3 === 0) { // x-coords
          return val >= worldOffsetX;
        }
        return false;
      });
      expect(hasOffset).toBe(true);
    });

    it('produces mesh with blockTypes array matching vertex count', () => {
      const chunk = createMockChunk();
      const getVoxel = () => BLOCK_TYPES.STONE;
      const mesh = generateMeshData(chunk, getVoxel, 0, 0);

      const vertexCount = mesh.positions.length / 3;
      expect(mesh.blockTypes.length).toBe(vertexCount);
      expect(mesh.colors.length / 3).toBe(vertexCount);
    });

    it('handles negative world coordinates', () => {
      const chunk = createMockChunk();
      const chunkX = -1;
      const chunkZ = -1;

      const getVoxel = () => BLOCK_TYPES.STONE;
      const mesh = generateMeshData(chunk, getVoxel, chunkX, chunkZ);

      expect(mesh.positions.length).toBeGreaterThan(0);
      // Positions should be in world space (negative offsets)
      const worldOffsetX = chunkX * CHUNK_WIDTH;
      expect(mesh.positions[0]).toBeLessThanOrEqual(worldOffsetX + CHUNK_WIDTH);
    });
  });
});
