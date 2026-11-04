import { describe, it, expect } from 'vitest';
import { BlockEditor } from '../../src/blockEditor/BlockEditor.js';

describe('BlockEditor.raycastBlock', () => {
  it('returns a hit when a solid voxel is present', () => {
    const world = {
      getChunk: () => ({
        getVoxel: (x, y, z) => (x === 0 && y === 0 && z === 0 ? 1 : 0)
      })
    };
    const editor = new BlockEditor(world, null, new Map(), null);
    const result = editor.raycastBlock([0.5, 0.5, 0.5], [1, 0, 0], 8);
    expect(result.hit).toBe(true);
    expect(result.x).toBe(0);
    expect(result.y).toBe(0);
    expect(result.z).toBe(0);
  });

  it('returns no hit for an empty world', () => {
    const world = {
      getChunk: () => ({
        getVoxel: () => 0
      })
    };
    const editor = new BlockEditor(world, null, new Map(), null);
    const result = editor.raycastBlock([0.5, 0.5, 0.5], [1, 0, 0], 8);
    expect(result.hit).toBe(false);
  });
});