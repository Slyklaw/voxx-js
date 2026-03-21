import { describe, it, expect, beforeEach } from 'vitest';
import { Chunk } from '../../chunk.js';
import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from '../../src/constants.js';

describe('Chunk', () => {
  let chunk;

  beforeEach(() => {
    chunk = new Chunk(0, 0);
  });

  describe('constructor', () => {
    it('initializes with correct chunk coordinates', () => {
      expect(chunk.chunkX).toBe(0);
      expect(chunk.chunkZ).toBe(0);
    });

    it('initializes voxel array with correct size', () => {
      expect(chunk.voxels.length).toBe(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH);
    });

    it('marks needsUpdate as true initially', () => {
      expect(chunk.needsUpdate).toBe(true);
    });
  });

  describe('getVoxel', () => {
    it('returns 0 for out-of-bounds coordinates', () => {
      expect(chunk.getVoxel(-1, 0, 0)).toBe(0);
      expect(chunk.getVoxel(0, -1, 0)).toBe(0);
      expect(chunk.getVoxel(0, 0, -1)).toBe(0);
      expect(chunk.getVoxel(CHUNK_WIDTH, 0, 0)).toBe(0);
    });

    it('returns set value after setVoxel', () => {
      chunk.setVoxel(0, 0, 0, 1);
      expect(chunk.getVoxel(0, 0, 0)).toBe(1);
    });
  });

  describe('setVoxel', () => {
    it('marks needsUpdate when voxel changes', () => {
      chunk.needsUpdate = false;
      chunk.setVoxel(5, 5, 5, 1);
      expect(chunk.needsUpdate).toBe(true);
    });

    it('ignores out-of-bounds coordinates', () => {
      expect(() => chunk.setVoxel(-1, 0, 0, 1)).not.toThrow();
    });
  });

  describe('canGenerateMesh', () => {
    it('returns false when no neighbors exist', () => {
      expect(chunk.canGenerateMesh()).toBe(false);
    });

    it('returns false when not all neighbors have voxel data', () => {
      const north = new Chunk(0, -1);
      north.hasVoxelData = true;
      chunk.neighborChunks.north = north;
      expect(chunk.canGenerateMesh()).toBe(false);
    });

    it('returns true when all neighbors have voxel data', () => {
      const north = new Chunk(0, -1);
      const south = new Chunk(0, 1);
      const east = new Chunk(1, 0);
      const west = new Chunk(-1, 0);

      [north, south, east, west].forEach(c => c.hasVoxelData = true);
      chunk.setNeighbors(north, south, east, west);
      chunk.hasVoxelData = true;

      expect(chunk.canGenerateMesh()).toBe(true);
    });
  });
});
