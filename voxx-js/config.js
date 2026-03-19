// Debug configuration
export const DEBUG = false;
export const RENDER_CONFIG = {
  FOV: 75,
  NEAR_PLANE: 0.1,
  FAR_PLANE: 1000,
  FOG_NEAR: 100,
  FOG_FAR: 400,
  TONE_MAPPING_EXPOSURE: 1.0
};

// Lighting configuration
export const LIGHTING_CONFIG = {
  SKY_COLOR: 0x87ceeb,
  AMBIENT_INTENSITY: 0.4,
  DIRECTIONAL_INTENSITY: 1.0,
  FILL_INTENSITY: 0.5,
  DIRECTIONAL_LIGHT_POSITION: { x: 50, y: 100, z: 50 },
  FILL_LIGHT_POSITION: { x: -50, y: 50, z: -50 }
};

// Lighting defaults for voxel shader
export const LIGHTING_DEFAULTS = {
  AMBIENT: 0.6,
  DIFFUSE: 0.4
};

// Player configuration
export const PLAYER_CONFIG = {
  MOVE_SPEED: 20,
  MAX_REACH: 10,
  SPAWN_POSITION: { x: 16, y: 225, z: 16 }
};

// Sun cycle configuration
export const SUN_CYCLE_CONFIG = {
  DAY_DURATION: 360, // 6 minutes in seconds (06:00 to 18:00)
  NIGHT_DURATION: 360, // 6 minutes in seconds (18:00 to 06:00)
  TOTAL_CYCLE: 720, // 12 minutes total (24 hour cycle)
  TIME_SCALE: 1, // Multiplier for time progression speed
  SUN_RADIUS: 100, // Distance from center
  SUN_HEIGHT: 50, // Base height above ground
  MIN_ELEVATION_DEG: 15, // Minimum sun elevation in degrees
  MAX_ELEVATION_DEG: 75, // Maximum sun elevation in degrees
  SNOW_LINE_HEIGHT: 180 // Height above which snow appears
};

// Sky colors for different times of day
export const SKY_COLORS = {
  DAY: 0x87ceeb, // Sky blue
  SUNSET: 0xff6b35, // Orange
  NIGHT: 0x191970, // Midnight blue
  SUNRISE: 0xffa500 // Orange
};

// UI configuration
export const UI_CONFIG = {
  BIOME_UPDATE_INTERVAL: 0.1, // Update biome display every 100ms
  SELECTION_OUTLINE_SIZE: 1.01,
  SELECTION_OUTLINE_COLOR: 0xffffff,
  SELECTION_OUTLINE_OPACITY: 0.8
};

// Test objects configuration
export const TEST_CONFIG = {
  CUBE_SIZE: { width: 3, height: 6, depth: 3 },
  CUBE_COLOR: 0x8B4513,
  CUBE_POSITION: { x: 20, y: 70, z: 20 }
};

// Mesh generation configuration
export const MESH_CONFIG = {
  ATLAS_WIDTH: 1024,      // Texture atlas width in pixels
  ATLAS_HEIGHT: 512,       // Texture atlas height in pixels
  TILE_SIZE: 16,          // Texture tile size in pixels
  VERTEX_SIZE: 14,        // Floats per vertex (pos:3 + color:3 + normal:3 + uv:2 + tileBase:2 + variant:1)
  STRIDE_BYTES: 56        // VERTEX_SIZE * 4 bytes per float
};

// Atlas UV calculation constants
export const ATLAS_CONFIG = {
  ATLAS_WIDTH: 1024,
  ATLAS_HEIGHT: 512,
  TILE_SIZE: 16,
  UV_SCALE_U: 16 / 1024,  // 0.015625
  UV_SCALE_V: 16 / 512    // 0.03125
};

// Worker pool configuration
export const WORKER_CONFIG = {
  MAX_DISPATCHES_PER_FRAME: 4,
  DISPATCH_BUDGET_MS: 4,
  FRAME_TIME_THRESHOLD_MS: 16,  // ~60fps
  STALE_REQUEST_MAX_DISTANCE: 2
};

// Block rendering configuration
export const BLOCK_CONFIG = {
  DEFAULT_COLOR_R: 0.8,
  DEFAULT_COLOR_G: 0.8,
  DEFAULT_COLOR_B: 0.8,
  DEFAULT_NORMAL_X: 0,
  DEFAULT_NORMAL_Y: 1,
  DEFAULT_NORMAL_Z: 0,
  DEFAULT_TILE_U: 0,
  DEFAULT_TILE_V: 0,
  DEFAULT_VARIANT: 0.0
};

// Biome tuning constants
export const BIOME_TUNING = {
  NOISE_NORMALIZE_FACTOR: 0.5,    // Convert [-1,1] to [0,1]
  BIOME_INDEX_OFFSET: 0.001,       // Slight offset to avoid edge case
  LOWLAND_DEPTH_GRASS: 1,
  LOWLAND_DEPTH_DIRT: 4,
  MOUNTAIN_SNOW_DEPTH: 3,
  MOUNTAIN_DIRT_DEPTH: 6,
  MOUNTAIN_GRASS_DEPTH: 3         // Thin grass layer on mountains
};
