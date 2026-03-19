import { DEBUG } from './config.js';

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
// Atlas is 1024x512, tiles are 16x16 (64x32 grid)
// Corrected positions based on actual atlas analysis:
// - Stone: gray tile at [48, 0]
// - Dirt: tan/brown tile at [16, 96]
// - Grass: green top at [336, 0], brown sides at [336, 48]
// - Water: blue tile at [320, 0]
// - Snow: white tile at [96, 64]
export const BLOCKS = [
  { type: 'AIR', color: [0, 0, 0, 0], atlasPos: { top: [0, 0], sides: [0, 0], bottom: [0, 0] } },
  { type: 'STONE', color: [128, 128, 128, 255], atlasPos: { top: [496, 208], sides: [496, 208], bottom: [496, 208] } },
  { type: 'DIRT', color: [139, 69, 19, 255], atlasPos: { top: [240, 192], sides: [240, 192], bottom: [240, 192] } },
  { type: 'GRASS', color: [95, 159, 53, 255], atlasPos: { top: [160, 256], sides: [176, 240], bottom: [240, 192] } },
  { type: 'WATER', color: [30, 144, 255, 200], atlasPos: { top: [128, 112], sides: [128, 112], bottom: [128, 112] } },
  { type: 'SNOW', color: [255, 255, 255, 255], atlasPos: { top: [496, 16], sides: [496, 16], bottom: [496, 16] } },
];

export const BLOCK_TYPES_COUNT = BLOCKS.length;

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
 * Debug assertion for valid block type
 * @param {number} blockType - Block type ID
 * @param {string} operation - Name of the operation being performed
 */
function assertValidBlockType(blockType, operation) {
  if (DEBUG && (blockType < 0 || blockType >= BLOCK_TYPES_COUNT)) {
    console.error(`[Blocks] Invalid block type ${blockType} in ${operation}`);
  }
}

/**
 * Get block color as RGB values (0-1 range)
 * @param {number} blockType - Block type ID
 * @returns {Object} RGB color object
 */
export function getBlockColor(blockType) {
  assertValidBlockType(blockType, 'getBlockColor');
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
  assertValidBlockType(blockType, 'isBlockSolid');
  return blockType !== BLOCK_TYPES.AIR;
}

/**
 * Check if a block type is transparent
 * @param {number} blockType - Block type ID
 * @returns {boolean} True if block is transparent
 */
export function isBlockTransparent(blockType) {
  assertValidBlockType(blockType, 'isBlockTransparent');
  return blockType === BLOCK_TYPES.AIR || blockType === BLOCK_TYPES.WATER;
}

/**
 * Get atlas positions for all blocks as flat arrays for shader uniforms
 * @returns {Object} Object with separate arrays for top, sides, and bottom positions
 */
export function getBlockAtlasPositions() {
  const topXPositions = [];
  const topYPositions = [];
  const sidesXPositions = [];
  const sidesYPositions = [];
  const bottomXPositions = [];
  const bottomYPositions = [];
  
  for (let i = 0; i < BLOCKS.length; i++) {
    const block = BLOCKS[i];
    topXPositions.push(block.atlasPos.top[0]);
    topYPositions.push(block.atlasPos.top[1]);
    sidesXPositions.push(block.atlasPos.sides[0]);
    sidesYPositions.push(block.atlasPos.sides[1]);
    bottomXPositions.push(block.atlasPos.bottom[0]);
    bottomYPositions.push(block.atlasPos.bottom[1]);
  }
  
  return { 
    topXPositions, topYPositions,
    sidesXPositions, sidesYPositions,
    bottomXPositions, bottomYPositions
  };
}

// Block atlas position logging at startup (commented - causes spam in production)
// (function logBlockAtlasPositions() {
//   console.log('[Texture] Block Atlas Positions:');
//   for (let i = 0; i < BLOCKS.length; i++) {
//     const block = BLOCKS[i];
//     console.log(`[Texture]   ${block.type} (index ${i}): top=[${block.atlasPos.top}], sides=[${block.atlasPos.sides}], bottom=[${block.atlasPos.bottom}]`);
//   }
// })();
