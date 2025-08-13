/**
 * Plugin Manager for Voxel Engine
 * Handles loading and registration of block plugins
 */

class PluginManager {
  constructor() {
    this.plugins = [];
    this.blocks = [];
    this.blockMap = new Map(); // Map block IDs to block definitions
    this.blockTypes = {}; // Map block names to type IDs
    this.nextBlockId = 0;
    this.basePluginRegistered = false;
  }

  /**
   * Register a plugin
   * @param {Object} plugin - Plugin object containing block definitions
   * @returns {boolean} True if registration was successful
   */
  registerPlugin(plugin) {
    // Validate plugin structure
    if (!plugin || !plugin.name || !plugin.version || !Array.isArray(plugin.blocks)) {
      console.error('Invalid plugin structure');
      return false;
    }

    // First plugin must contain all required base blocks
    if (!this.basePluginRegistered) {
      if (!this.isValidBasePlugin(plugin)) {
        console.error('First plugin must contain all required base block definitions');
        return false;
      }
      this.basePluginRegistered = true;
    }

    // Register the plugin
    this.plugins.push(plugin);
    
    // Register each block in the plugin
    for (const block of plugin.blocks) {
      this.registerBlock(block);
    }

    console.log(`Plugin "${plugin.name}" v${plugin.version} registered successfully`);
    return true;
  }

  /**
   * Validate that the first plugin contains all required base blocks
   * @param {Object} plugin - Plugin to validate
   * @returns {boolean} True if plugin is a valid base plugin
   */
  isValidBasePlugin(plugin) {
    const requiredBlocks = ['air', 'stone', 'dirt', 'grass', 'water', 'snow'];
    const pluginBlockIds = plugin.blocks.map(block => block.id);
    
    return requiredBlocks.every(requiredBlock => 
      pluginBlockIds.includes(requiredBlock)
    );
  }

  /**
   * Register a block definition
   * @param {Object} block - Block definition
   */
  registerBlock(block) {
    // Validate block structure
    if (!block || !block.id || !block.name || !block.color) {
      console.error('Invalid block structure:', block);
      return;
    }

    // Assign block type ID if not already assigned
    if (this.blockTypes[block.id] === undefined) {
      this.blockTypes[block.id] = this.nextBlockId++;
    }

    // Store block definition
    const blockType = this.blockTypes[block.id];
    const blockDef = {
      ...block,
      type: blockType
    };

    this.blocks[blockType] = blockDef;
    this.blockMap.set(block.id, blockDef);

    console.log(`Block "${block.name}" registered with type ID ${blockType}`);
  }

  /**
   * Get block definition by type ID
   * @param {number} blockType - Block type ID
   * @returns {Object|null} Block definition or null if not found
   */
  getBlock(blockType) {
    return this.blocks[blockType] || null;
  }

  /**
   * Get block definition by ID
   * @param {string} blockId - Block ID
   * @returns {Object|null} Block definition or null if not found
   */
  getBlockById(blockId) {
    return this.blockMap.get(blockId) || null;
  }

  /**
   * Get block type ID by block ID
   * @param {string} blockId - Block ID
   * @returns {number|null} Block type ID or null if not found
   */
  getBlockType(blockId) {
    const block = this.blockMap.get(blockId);
    return block ? block.type : null;
  }

  /**
   * Get all registered blocks
   * @returns {Array} Array of block definitions
   */
  getAllBlocks() {
    return this.blocks.filter(block => block !== undefined);
  }

  /**
   * Get block names for UI display
   * @returns {Object} Object mapping block type IDs to names
   */
  getBlockNames() {
    const names = {};
    for (const [id, block] of this.blockMap) {
      names[block.type] = block.name;
    }
    return names;
  }

  /**
   * Get block atlas positions for all blocks
   * @returns {Object} Object with separate arrays for top, sides, and bottom positions
   */
  getBlockAtlasPositions() {
    const topXPositions = [];
    const topYPositions = [];
    const sidesXPositions = [];
    const sidesYPositions = [];
    const bottomXPositions = [];
    const bottomYPositions = [];
    
    // Fill arrays with default values first
    for (let i = 0; i < this.nextBlockId; i++) {
      topXPositions.push(0);
      topYPositions.push(0);
      sidesXPositions.push(0);
      sidesYPositions.push(0);
      bottomXPositions.push(0);
      bottomYPositions.push(0);
    }
    
    // Update with actual block positions
    for (const block of this.blocks) {
      if (block && block.atlasPos) {
        const type = block.type;
        topXPositions[type] = block.atlasPos.top[0];
        topYPositions[type] = block.atlasPos.top[1];
        sidesXPositions[type] = block.atlasPos.sides[0];
        sidesYPositions[type] = block.atlasPos.sides[1];
        bottomXPositions[type] = block.atlasPos.bottom[0];
        bottomYPositions[type] = block.atlasPos.bottom[1];
      }
    }
    
    return { 
      topXPositions, topYPositions,
      sidesXPositions, sidesYPositions,
      bottomXPositions, bottomYPositions
    };
  }
}

// Create singleton instance
export const pluginManager = new PluginManager();
