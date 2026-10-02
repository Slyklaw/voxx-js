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
  AMBIENT: 0.4,
  DIFFUSE: 0.8
};

// Player configuration
export const PLAYER_CONFIG = {
  MOVE_SPEED: 20,
  MAX_REACH: 10,
  SPAWN_POSITION: { x: 16, y: 225, z: 16 }
};

// SSAO configuration
export const SSAO_CONFIG = {
  ENABLED: true,
  INTENSITY: 1.0,
  RADIUS: 0.5,
  BIAS: 0.025,
  KERNEL_SIZE: 32
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

// Sky gradient stops for multi-stop interpolation
// Aligned to clock: 8am-8pm is day, 8pm-8am is night
// Stop positions are hours (0-24)
export const SKY_STOP_POSITIONS = [0, 6, 8, 10, 12, 14, 18, 20, 24]; // midnight, dawn, day start, morning, noon, afternoon, dusk, night start, midnight
export const SKY_TOP_COLOR_STOPS = [
  [0.043, 0.063, 0.149],   // 0:00 midnight - night
  [0.2, 0.15, 0.3],        // 6:00 dawn - purple
  [0.25, 0.5, 1.0],        // 8:00 day starts - sky blue
  [0.3, 0.55, 1.0],        // 10:00 morning - light blue
  [0.25, 0.5, 1.0],        // 12:00 noon - full day blue
  [0.3, 0.55, 1.0],        // 14:00 afternoon - light blue
  [0.3, 0.2, 0.4],         // 18:00 dusk - purple
  [0.043, 0.063, 0.149],   // 20:00 night starts - dark
  [0.043, 0.063, 0.149]    // 24:00 midnight - night
];
export const SKY_BOTTOM_COLOR_STOPS = [
  [0.106, 0.153, 0.271],   // 0:00 midnight - night
  [0.8, 0.4, 0.2],         // 6:00 dawn - orange
  [0.95, 0.95, 1.0],       // 8:00 day starts - warm white
  [0.98, 0.98, 1.0],       // 10:00 morning - warm white
  [1.0, 1.0, 1.0],         // 12:00 noon - white
  [0.98, 0.98, 1.0],       // 14:00 afternoon - warm white
  [0.8, 0.3, 0.2],         // 18:00 dusk - red-orange
  [0.106, 0.153, 0.271],   // 20:00 night starts - dark
  [0.106, 0.153, 0.271]    // 24:00 midnight - night
];

// Sun/light configuration - matches sky stop positions
// Direction: normalized direction vector (pointing toward light source)
// Color: RGB light color
// Intensity: multiplier for light strength
export const SUN_LIGHT_DIRECTION_STOPS = [
  [0.3, 0.7, 0.3],   // 0:00 midnight - moon from above
  [1.0, 0.0, 0.0],   // 6:00 dawn - sun at horizon (east)
  [0.5, 0.5, 0.5],   // 8:00 morning - rising
  [0.0, 1.0, 0.0],   // 10:00 - high
  [0.0, 1.0, 0.0],   // 12:00 noon - overhead
  [0.0, 1.0, 0.0],   // 14:00 afternoon - high
  [-0.5, 0.5, 0.5],  // 18:00 dusk - setting (west)
  [0.3, 0.7, 0.3],   // 20:00 night - moon from above
  [0.3, 0.7, 0.3]    // 24:00 midnight - moon from above
];
export const SUN_LIGHT_COLOR_STOPS = [
  [0.3, 0.3, 0.5],   // 0:00 midnight - blue moonlight
  [1.0, 0.6, 0.3],   // 6:00 dawn - orange/red sunrise
  [1.0, 0.95, 0.8],  // 8:00 morning - warm white
  [1.0, 1.0, 0.95],  // 10:00 - bright warm
  [1.0, 1.0, 1.0],   // 12:00 noon - white sunlight
  [1.0, 1.0, 0.95],  // 14:00 afternoon - bright warm
  [1.0, 0.7, 0.4],   // 18:00 dusk - orange/golden
  [0.3, 0.3, 0.5],   // 20:00 night - blue moonlight
  [0.3, 0.3, 0.5]    // 24:00 midnight - blue moonlight
];
export const SUN_LIGHT_INTENSITY_STOPS = [
  0.35,  // 0:00 midnight - dim
  0.3,   // 6:00 dawn - low
  0.7,   // 8:00 morning - rising
  0.9,   // 10:00 - bright
  1.0,   // 12:00 noon - full
  0.9,   // 14:00 afternoon - bright
  0.5,   // 18:00 dusk - dimming
  0.35,  // 20:00 night - dim
  0.35   // 24:00 midnight - dim
];

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
