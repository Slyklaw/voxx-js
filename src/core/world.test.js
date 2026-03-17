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
    // Should not throw for negative coordinates
    expect(() => world.getVoxel(-1, 0, 0)).not.toThrow();
    const result = world.getVoxel(-1, 0, 0);
    // Chunk at (-1, 0, 0) is loaded as part of initial chunks around spawn
    // Result may be a voxel or null depending on terrain height
    expect(result === null || typeof result === 'object').toBe(true);
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

describe('World generation determinism', () => {
  test('world generation is deterministic with same seed', () => {
    const seed = 42; // WORLD_SEED_DEFAULT
    const world1 = new World();
    const world2 = new World(); // same default seed
    
    // Generate chunk in first world
    const chunk1 = world1.generateChunk(0, 0, 0);
    expect(chunk1).toBeDefined();
    
    // Generate same chunk in second world
    const chunk2 = world2.generateChunk(0, 0, 0);
    expect(chunk2).toBeDefined();
    
    // Compare voxel data at multiple sample points
    const samplePoints = [
      [0, 0, 0],
      [16, 16, 16],
      [31, 31, 31],
      [5, 10, 20],
      [0, 31, 0],
    ];
    
    for (const [x, y, z] of samplePoints) {
      const voxel1 = chunk1.getVoxel(x, y, z);
      const voxel2 = chunk2.getVoxel(x, y, z);
      expect(voxel2).toEqual(voxel1);
    }
    
    // Also verify that chunk's height data matches (if available)
    // For simplex noise, height should be identical
    // We can sample getHeightAt if World exposes it, but generateChunk already uses seeded noise.
  });
  
  test('world generation differs with different seeds', () => {
    const world1 = new World();
    const world2 = new World();
    world2.worldSeed = 12345; // different seed
    
    const chunk1 = world1.generateChunk(0, 0, 0);
    const chunk2 = world2.generateChunk(0, 0, 0);
    
    // At least one sample point should differ
    let differs = false;
    for (let x = 0; x < 32 && !differs; x += 5) {
      for (let y = 0; y < 32 && !differs; y += 5) {
        for (let z = 0; z < 32 && !differs; z += 5) {
          const voxel1 = chunk1.getVoxel(x, y, z);
          const voxel2 = chunk2.getVoxel(x, y, z);
          if (voxel1 !== voxel2) {
            differs = true;
          }
        }
      }
    }
    expect(differs).toBe(true);
  });
});
