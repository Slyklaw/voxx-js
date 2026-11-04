import { describe, it, expect } from 'vitest';
import { CHUNK_WIDTH } from '../../src/constants.js';

describe('render chunk offsets', () => {
  it('uses 32-wide chunks for world offsets', () => {
    expect(CHUNK_WIDTH).toBe(32);
  });

  it('computes chunk world offset from chunk coordinate', () => {
    const chunkX = 3;
    const chunkZ = -2;
    expect(chunkX * CHUNK_WIDTH).toBe(96);
    expect(chunkZ * CHUNK_WIDTH).toBe(-64);
  });
});