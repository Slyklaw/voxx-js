// Block type constants for easy reference
export const BLOCK_TYPES = {
  AIR: 0,
  STONE: 1,
  DIRT: 2,
  GRASS: 3,
  WATER: 4,
  SNOW: 5
};

// Block definitions with visual properties and atlas positions
export const BLOCKS = [
  { type: 'AIR', color: [0, 0, 0, 0], atlasPos: [0, 0] },
  { type: 'STONE', color: [128, 128, 128, 255], atlasPos: [496, 208] },
  { type: 'DIRT', color: [139, 69, 19, 255], atlasPos: [240, 192] },
  { type: 'GRASS', color: [95, 159, 53, 255], atlasPos: [160, 256] },
  { type: 'WATER', color: [30, 144, 255, 200], atlasPos: [128, 112] },
  { type: 'SNOW', color: [255, 255, 255, 255], atlasPos: [496, 16] },
];

// Block names for UI display
export const BLOCK_NAMES = {
  [BLOCK_TYPES.AIR]: 'Air',
  [BLOCK_TYPES.STONE]: 'Stone',
  [BLOCK_TYPES.DIRT]: 'Dirt',
  [BLOCK_TYPES.GRASS]: 'Grass',
  [BLOCK_TYPES.WATER]: 'Water',
  [BLOCK_TYPES.SNOW]: 'Snow'
};

/**
 * Get block color as RGB values (0-1 range)
 * @param {number} blockType - Block type ID
 * @returns {Object} RGB color object
 */
export function getBlockColor(blockType) {
  const block = BLOCKS[blockType];
  if (!block) return { r: 0, g: 0, b: 0 };
  
  return {
    r: block.color[0] / 255,
    g: block.color[1] / 255,
    b: block.color[2] / 255
  };
}

/**
 * Check if a block type is solid (not air)
 * @param {number} blockType - Block type ID
 * @returns {boolean} True if block is solid
 */
export function isBlockSolid(blockType) {
  return blockType !== BLOCK_TYPES.AIR;
}

/**
 * Check if a block type is transparent
 * @param {number} blockType - Block type ID
 * @returns {boolean} True if block is transparent
 */
export function isBlockTransparent(blockType) {
  return blockType === BLOCK_TYPES.AIR || blockType === BLOCK_TYPES.WATER;
}

/**
 * Get atlas positions for all blocks as flat arrays for shader uniforms
 * @returns {Object} Object with x and y position arrays
 */
export function getBlockAtlasPositions() {
  const xPositions = [];
  const yPositions = [];
  
  for (let i = 0; i < BLOCKS.length; i++) {
    xPositions.push(BLOCKS[i].atlasPos[0]);
    yPositions.push(BLOCKS[i].atlasPos[1]);
  }
  
  return { xPositions, yPositions };
}