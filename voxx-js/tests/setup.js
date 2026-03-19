/**
 * Common test utilities and mocks
 */

// Mock noise function that returns predictable values
export function mockNoise(x, z) {
  return 0; // Returns 0 for predictable results
}

// Mock noise with specific return value
export function createMockNoise(value) {
  return (x, z) => value;
}

// Test constants
export const TEST_CHUNK_X = 0;
export const TEST_CHUNK_Z = 0;
export const TEST_WORLD_X = 0;
export const TEST_WORLD_Z = 0;
