import { pluginManager } from './plugins.js';
import baseBlocksPlugin from './base-blocks-plugin.js';

// Initialize with base blocks plugin
pluginManager.registerPlugin(baseBlocksPlugin);

// Block type constants for easy reference (maintained for backward compatibility)
export const BLOCK_TYPES = {
  AIR: pluginManager.getBlockType('air'),
  STONE: pluginManager.getBlockType('stone'),
  DIRT: pluginManager.getBlockType('dirt'),
  GRASS: pluginManager.getBlockType('grass'),
  WATER: pluginManager.getBlockType('water'),
  SNOW: pluginManager.getBlockType('snow')
};

/**
 * Get block definition by type ID
 * @param {number} blockType - Block type ID
 * @returns {Object} Block definition
 */
export function getBlock(blockType) {
  return pluginManager.getBlock(blockType);
}

/**
 * Get all block definitions
 * @returns {Array} Array of block definitions
 */
export function getAllBlocks() {
  return pluginManager.getAllBlocks();
}

/**
 * Get block color as RGB values (0-1 range)
 * @param {number} blockType - Block type ID
 * @returns {Object} RGB color object
 */
export function getBlockColor(blockType) {
  const block = pluginManager.getBlock(blockType);
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
 * @returns {Object} Object with separate arrays for top, sides, and bottom positions
 */
export function getBlockAtlasPositions() {
  return pluginManager.getBlockAtlasPositions();
}
