/**
 * Shared game constants for Voxx-JS voxel engine
 * All magic numbers extracted here for maintainability
 */

// Chunk configuration
export const CHUNK_SIZE = 32;
export const VIEW_DISTANCE = 8;
export const HYSTERESIS_MARGIN = 2;  // Extra chunks beyond VIEW_DISTANCE before unloading
export const CHUNKS_PER_FRAME = 4;   // Max chunks to load in a single frame
export const MAX_POOL_SIZE = 128;    // Max chunk objects to keep in pool

// World generation
export const WORLD_SEED_DEFAULT = 42;

// Player physics
export const GRAVITY = 20.0;
export const JUMP_STRENGTH = 8.0;
export const WALK_SPEED = 5.0;

// Input sensitivity
export const MOUSE_SENSITIVITY = 0.002;
