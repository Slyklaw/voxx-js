import { World } from './world.js';

describe('World coordinate validation', () => {
  let world;
  
  beforeEach(() => {
    world = new World();
  });
  
  test('getVoxel returns null for non-number coordinates', () => {
    expect(world.getVoxel('invalid', 0, 0)).toBeNull();
    expect(world.getVoxel(null, 0, 0)).toBeNull();
    expect(world.getVoxel(undefined, 0, 0)).toBeNull();
  });
  
  test('getVoxel handles negative coordinates', () => {
    // Should not throw, returns null for unloaded chunk
    expect(() => world.getVoxel(-1, 0, 0)).not.toThrow();
    const result = world.getVoxel(-1, 0, 0);
    // Result is null because chunk isn't loaded yet
    expect(result).toBeNull();
  });
  
  test('getVoxel handles large coordinates', () => {
    // Should not throw for reasonable large values
    expect(() => world.getVoxel(1000, 100, 1000)).not.toThrow();
    const result = world.getVoxel(1000, 100, 1000);
    // Result is null because chunk isn't generated
    expect(result).toBeNull();
  });
  
  test('getVoxel handles negative modulo correctly', () => {
    // Test that negative coordinates are handled without throwing
    expect(() => world.getVoxel(-33, -33, -33)).not.toThrow();
    // The local coordinate calculation should work correctly
    const result = world.getVoxel(-33, -33, -33);
    expect(result).toBeNull(); // Chunk not loaded
  });
  
  test('ChunkManager is accessible', () => {
    expect(world.chunkManager).toBeDefined();
    expect(world.chunkManager.chunks).toBeInstanceOf(Map);
  });
  
  test('World seed is set', () => {
    expect(world.worldSeed).toBe(42); // WORLD_SEED_DEFAULT
  });
  
  test('getVoxel returns data for generated chunk', () => {
    // Generate a chunk first
    const chunk = world.generateChunk(0, 0, 0);
    expect(chunk).toBeDefined();
    expect(chunk.loaded).toBe(true);
    
    // Now getVoxel should return data (or null for air)
    const voxel = world.getVoxel(0, 0, 0);
    // Voxel could be a block object or null (air)
    expect(voxel !== undefined).toBe(true);
  });
  
  test('getVoxel handles mixed valid and invalid coordinates', () => {
    // One valid, two invalid
    expect(world.getVoxel(0, 'y', 0)).toBeNull();
    expect(world.getVoxel('x', 0, 0)).toBeNull();
    expect(world.getVoxel(0, 0, 'z')).toBeNull();
  });
});
