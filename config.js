// Rendering configuration
export const RENDER_CONFIG = {
  FOV: 75,
  NEAR_PLANE: 0.1,
  FAR_PLANE: 1000,
  FOG_NEAR: 100,
  FOG_FAR: 400,
  SHADOW_MAP_SIZE: 1024,
  TONE_MAPPING_EXPOSURE: 1.0,
  SHADOW_CAMERA_BOUNDS: 100,
  SHADOW_CAMERA_NEAR: 1,
  SHADOW_CAMERA_FAR: 400
};

// Lighting configuration
export const LIGHTING_CONFIG = {
  SKY_COLOR: 0x87ceeb,
  AMBIENT_INTENSITY: 0.4,
  DIRECTIONAL_INTENSITY: 1.0,
  FILL_INTENSITY: 0.5,
  SHADOW_BIAS: -0.0005,
  SHADOW_NORMAL_BIAS: 0.05,
  SHADOW_RADIUS: 2,
  DIRECTIONAL_LIGHT_POSITION: { x: 50, y: 100, z: 50 },
  FILL_LIGHT_POSITION: { x: -50, y: 50, z: -50 }
};

// Player configuration
export const PLAYER_CONFIG = {
  MOVE_SPEED: 15,
  MAX_REACH: 10,
  SPAWN_POSITION: { x: 16, y: 225, z: 16 }
};

// Sun cycle configuration
export const SUN_CYCLE_CONFIG = {
  DAY_DURATION: 60, // 1 minute in seconds
  NIGHT_DURATION: 60, // 1 minute in seconds
  TOTAL_CYCLE: 120, // 2 minutes total
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