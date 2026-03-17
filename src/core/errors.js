/**
 * Custom error classes for Voxx-JS voxel engine
 * Provides typed errors with contextual metadata for better debugging
 */

export class VoxelError extends Error {
  constructor(message, coordinates = null) {
    super(message);
    this.name = 'VoxelError';
    this.coordinates = coordinates;
  }
}

export class ChunkError extends Error {
  constructor(message, chunkKey = null) {
    super(message);
    this.name = 'ChunkError';
    this.chunkKey = chunkKey;
  }
}

export class PlayerError extends Error {
  constructor(message, context = null) {
    super(message);
    this.name = 'PlayerError';
    this.context = context;
  }
}

export class EngineError extends Error {
  constructor(message, system = null) {
    super(message);
    this.name = 'EngineError';
    this.system = system;
  }
}
