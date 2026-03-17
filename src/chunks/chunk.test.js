import { Chunk } from './chunk.js';

describe('Chunk coordinate calculations', () => {
  let chunk;
  
  beforeEach(() => {
    chunk = new Chunk(1, 2, 3);
  });
  
  test('getVoxelIndex calculates correct index', () => {
    // Index = x + (y * 32) + (z * 32 * 32)
    expect(chunk.getVoxelIndex(0, 0, 0)).toBe(0);
    expect(chunk.getVoxelIndex(1, 0, 0)).toBe(1);
    expect(chunk.getVoxelIndex(0, 1, 0)).toBe(32);
    expect(chunk.getVoxelIndex(0, 0, 1)).toBe(1024);
    expect(chunk.getVoxelIndex(31, 31, 31)).toBe(32767);
  });
  
  test('getVoxel returns null for out of bounds', () => {
    expect(chunk.getVoxel(-1, 0, 0)).toBeNull();
    expect(chunk.getVoxel(32, 0, 0)).toBeNull();
    expect(chunk.getVoxel(0, -1, 0)).toBeNull();
    expect(chunk.getVoxel(0, 32, 0)).toBeNull();
    expect(chunk.getVoxel(0, 0, -1)).toBeNull();
    expect(chunk.getVoxel(0, 0, 32)).toBeNull();
  });
  
  test('getVoxel returns null for uninitialized voxels', () => {
    expect(chunk.getVoxel(0, 0, 0)).toBeNull();
    expect(chunk.getVoxel(16, 16, 16)).toBeNull();
  });
  
  test('setVoxel stores and retrieves voxel', () => {
    const voxel = { type: 'stone', id: 3 };
    const result = chunk.setVoxel(5, 10, 15, voxel);
    
    expect(result).toBe(true);
    expect(chunk.getVoxel(5, 10, 15)).toEqual(voxel);
  });
  
  test('setVoxel returns false for out of bounds', () => {
    expect(chunk.setVoxel(-1, 0, 0, {})).toBe(false);
    expect(chunk.setVoxel(32, 0, 0, {})).toBe(false);
  });
  
  test('setVoxel marks chunk as modified', () => {
    expect(chunk.isModified()).toBe(false);
    chunk.setVoxel(0, 0, 0, { type: 'test' });
    expect(chunk.isModified()).toBe(true);
  });
  
  test('clearModified resets modified flag', () => {
    chunk.setVoxel(0, 0, 0, { type: 'test' });
    chunk.clearModified();
    expect(chunk.isModified()).toBe(false);
  });
  
  test('isEmpty returns true for new chunk', () => {
    expect(chunk.isEmpty()).toBe(true);
  });
  
  test('isEmpty returns false after setting voxel', () => {
    chunk.setVoxel(0, 0, 0, { type: 'test' });
    expect(chunk.isEmpty()).toBe(false);
  });
  
  test('getWorldCoordinates calculates correctly', () => {
    // Chunk at (1, 2, 3), local (5, 10, 15)
    // World = chunk * 32 + local
    const world = chunk.getWorldCoordinates(5, 10, 15);
    expect(world.x).toBe(1 * 32 + 5);  // 37
    expect(world.y).toBe(2 * 32 + 10); // 74
    expect(world.z).toBe(3 * 32 + 15); // 111
  });
  
  test('getKey returns correct format', () => {
    expect(chunk.getKey()).toBe('1,2,3');
  });
  
  test('markLoaded sets loaded flag', () => {
    expect(chunk.loaded).toBe(false);
    chunk.markLoaded();
    expect(chunk.loaded).toBe(true);
  });
});
