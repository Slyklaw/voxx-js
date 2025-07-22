/**
 * VoxelModifier component for entities that can modify terrain
 * This component defines the capabilities and properties for voxel modification
 */
export class VoxelModifier {
  constructor(options = {}) {
    this.type = 'VoxelModifier';
    
    // Modification capabilities
    this.canPlace = options.canPlace !== undefined ? options.canPlace : true;
    this.canDestroy = options.canDestroy !== undefined ? options.canDestroy : true;
    
    // Block types this modifier can place
    this.availableBlocks = options.availableBlocks || [1, 2, 3, 5]; // stone, dirt, grass, snow
    this.currentBlockType = options.currentBlockType || 1; // default to stone
    
    // Modification range and constraints
    this.maxRange = options.maxRange || 10;
    this.minRange = options.minRange || 1;
    
    // Modification speed/cooldown
    this.modificationCooldown = options.modificationCooldown || 100; // ms
    this.lastModificationTime = 0;
    
    // Batch modification settings
    this.batchSize = options.batchSize || 1; // number of voxels to modify at once
    this.batchDelay = options.batchDelay || 50; // ms between batch operations
  }

  /**
   * Check if this modifier can perform a modification action
   * @param {string} action - 'place' or 'destroy'
   * @param {number} blockType - Block type for placement
   * @returns {boolean} True if action is allowed
   */
  canModify(action, blockType = null) {
    const now = Date.now();
    if (now - this.lastModificationTime < this.modificationCooldown) {
      return false;
    }

    if (action === 'place') {
      return this.canPlace && (blockType === null || this.availableBlocks.includes(blockType));
    } else if (action === 'destroy') {
      return this.canDestroy;
    }

    return false;
  }

  /**
   * Update the last modification time
   */
  updateModificationTime() {
    this.lastModificationTime = Date.now();
  }

  /**
   * Set the current block type for placement
   * @param {number} blockType - Block type to set
   * @returns {boolean} True if block type was set successfully
   */
  setCurrentBlockType(blockType) {
    if (this.availableBlocks.includes(blockType)) {
      this.currentBlockType = blockType;
      return true;
    }
    return false;
  }

  /**
   * Get the next available block type (for cycling through blocks)
   * @returns {number} Next block type
   */
  getNextBlockType() {
    const currentIndex = this.availableBlocks.indexOf(this.currentBlockType);
    const nextIndex = (currentIndex + 1) % this.availableBlocks.length;
    return this.availableBlocks[nextIndex];
  }

  /**
   * Serialize component data
   * @returns {Object} Serialized data
   */
  serialize() {
    return {
      type: this.type,
      canPlace: this.canPlace,
      canDestroy: this.canDestroy,
      availableBlocks: [...this.availableBlocks],
      currentBlockType: this.currentBlockType,
      maxRange: this.maxRange,
      minRange: this.minRange,
      modificationCooldown: this.modificationCooldown,
      batchSize: this.batchSize,
      batchDelay: this.batchDelay
    };
  }

  /**
   * Deserialize component data
   * @param {Object} data - Serialized data
   */
  deserialize(data) {
    this.canPlace = data.canPlace;
    this.canDestroy = data.canDestroy;
    this.availableBlocks = [...data.availableBlocks];
    this.currentBlockType = data.currentBlockType;
    this.maxRange = data.maxRange;
    this.minRange = data.minRange;
    this.modificationCooldown = data.modificationCooldown;
    this.batchSize = data.batchSize;
    this.batchDelay = data.batchDelay;
    this.lastModificationTime = 0; // Reset cooldown on deserialize
  }
}