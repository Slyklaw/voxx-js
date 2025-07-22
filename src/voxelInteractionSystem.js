import { VoxelRaycaster } from './voxelRaycaster.js';
import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './chunk.js';

/**
 * VoxelInteractionSystem handles voxel placement and destruction operations
 * Integrates with existing World and Chunk systems for terrain modification
 */
export class VoxelInteractionSystem {
  constructor(world, scene) {
    this.world = world;
    this.scene = scene;
    this.raycaster = new VoxelRaycaster(world);
    
    // Batch modification system
    this.pendingModifications = [];
    this.modificationQueue = [];
    this.isProcessingBatch = false;
    
    // Chunk update tracking
    this.dirtyChunks = new Set();
    this.chunkUpdateTimer = null;
    this.chunkUpdateDelay = 100; // ms to wait before updating chunk meshes
    
    // Event callbacks
    this.onVoxelModified = null; // Callback for when voxels are modified
    this.onChunkUpdated = null; // Callback for when chunk meshes are updated
  }

  /**
   * Handle voxel interaction from screen coordinates (e.g., mouse click)
   * @param {Vector2} screenPosition - Normalized screen coordinates (-1 to 1)
   * @param {Camera} camera - Three.js camera
   * @param {VoxelModifier} modifier - VoxelModifier component
   * @param {string} action - 'place' or 'destroy'
   * @returns {boolean} True if modification was successful
   */
  handleVoxelClick(screenPosition, camera, modifier, action = 'place') {
    const hitResult = this.raycaster.raycastFromScreen(screenPosition, camera, modifier.maxRange);
    
    if (!hitResult || !hitResult.hit) {
      return false;
    }

    // Check if modification is within range
    if (hitResult.distance < modifier.minRange || hitResult.distance > modifier.maxRange) {
      return false;
    }

    if (action === 'place') {
      return this.placeVoxel(hitResult, modifier);
    } else if (action === 'destroy') {
      return this.destroyVoxel(hitResult, modifier);
    }

    return false;
  }

  /**
   * Place a voxel at the specified location
   * @param {VoxelHitResult} hitResult - Raycast hit result
   * @param {VoxelModifier} modifier - VoxelModifier component
   * @returns {boolean} True if placement was successful
   */
  placeVoxel(hitResult, modifier) {
    if (!modifier.canModify('place', modifier.currentBlockType)) {
      return false;
    }

    const placementPos = this.raycaster.getPlacementPosition(hitResult);
    if (!placementPos || !this.raycaster.isValidPlacementPosition(placementPos)) {
      return false;
    }

    const success = this.setVoxelAt(placementPos, modifier.currentBlockType);
    if (success) {
      modifier.updateModificationTime();
      this.triggerVoxelModifiedEvent('place', placementPos, modifier.currentBlockType);
    }

    return success;
  }

  /**
   * Destroy a voxel at the hit location
   * @param {VoxelHitResult} hitResult - Raycast hit result
   * @param {VoxelModifier} modifier - VoxelModifier component
   * @returns {boolean} True if destruction was successful
   */
  destroyVoxel(hitResult, modifier) {
    if (!modifier.canModify('destroy')) {
      return false;
    }

    if (hitResult.blockType === 0) {
      return false; // Can't destroy air
    }

    const success = this.setVoxelAt(hitResult.voxelPosition, 0); // Set to air
    if (success) {
      modifier.updateModificationTime();
      this.triggerVoxelModifiedEvent('destroy', hitResult.voxelPosition, 0);
    }

    return success;
  }

  /**
   * Set voxel at world coordinates
   * @param {Vector3} worldPos - World position
   * @param {number} blockType - Block type to set
   * @returns {boolean} True if successful
   */
  setVoxelAt(worldPos, blockType) {
    const chunkX = Math.floor(worldPos.x / CHUNK_WIDTH);
    const chunkZ = Math.floor(worldPos.z / CHUNK_DEPTH);
    
    const chunk = this.world.chunks[`${chunkX},${chunkZ}`];
    if (!chunk || !chunk.voxels) {
      return false;
    }
    
    const localX = Math.floor(worldPos.x - chunkX * CHUNK_WIDTH);
    const localY = Math.floor(worldPos.y);
    const localZ = Math.floor(worldPos.z - chunkZ * CHUNK_DEPTH);
    
    // Bounds check
    if (localX < 0 || localX >= CHUNK_WIDTH || 
        localY < 0 || localY >= CHUNK_HEIGHT || 
        localZ < 0 || localZ >= CHUNK_DEPTH) {
      return false;
    }
    
    // Set the voxel
    chunk.setVoxel(localX, localY, localZ, blockType);
    
    // Mark chunk as dirty for mesh update
    this.markChunkDirty(chunkX, chunkZ);
    
    // Check if we need to update adjacent chunks (for boundary voxels)
    this.checkAdjacentChunks(localX, localY, localZ, chunkX, chunkZ);
    
    return true;
  }

  /**
   * Get voxel at world coordinates
   * @param {Vector3} worldPos - World position
   * @returns {Object|null} Voxel data or null if not found
   */
  getVoxelAt(worldPos) {
    return this.raycaster.getVoxelAt(worldPos);
  }

  /**
   * Mark a chunk as dirty for mesh regeneration
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkZ - Chunk Z coordinate
   */
  markChunkDirty(chunkX, chunkZ) {
    const chunkKey = `${chunkX},${chunkZ}`;
    this.dirtyChunks.add(chunkKey);
    
    // Schedule chunk update
    if (this.chunkUpdateTimer) {
      clearTimeout(this.chunkUpdateTimer);
    }
    
    this.chunkUpdateTimer = setTimeout(() => {
      this.updateDirtyChunks();
    }, this.chunkUpdateDelay);
  }

  /**
   * Check if adjacent chunks need updating for boundary voxels
   * @param {number} localX - Local X coordinate within chunk
   * @param {number} localY - Local Y coordinate within chunk
   * @param {number} localZ - Local Z coordinate within chunk
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkZ - Chunk Z coordinate
   */
  checkAdjacentChunks(localX, localY, localZ, chunkX, chunkZ) {
    // Check if voxel is on chunk boundary
    if (localX === 0) {
      this.markChunkDirty(chunkX - 1, chunkZ);
    } else if (localX === CHUNK_WIDTH - 1) {
      this.markChunkDirty(chunkX + 1, chunkZ);
    }
    
    if (localZ === 0) {
      this.markChunkDirty(chunkX, chunkZ - 1);
    } else if (localZ === CHUNK_DEPTH - 1) {
      this.markChunkDirty(chunkX, chunkZ + 1);
    }
  }

  /**
   * Update all dirty chunks by regenerating their meshes
   */
  updateDirtyChunks() {
    const chunksToUpdate = Array.from(this.dirtyChunks);
    this.dirtyChunks.clear();
    
    for (const chunkKey of chunksToUpdate) {
      const chunk = this.world.chunks[chunkKey];
      if (chunk && chunk.voxels) {
        this.updateChunkMesh(chunk);
      }
    }
    
    if (chunksToUpdate.length > 0 && this.onChunkUpdated) {
      this.onChunkUpdated(chunksToUpdate);
    }
  }

  /**
   * Update a single chunk's mesh
   * @param {Chunk} chunk - Chunk to update
   */
  updateChunkMesh(chunk) {
    // Remove old mesh from scene
    if (chunk.mesh) {
      this.scene.remove(chunk.mesh);
      chunk.mesh.geometry.dispose();
      chunk.mesh.material.dispose();
    }
    
    // Create new mesh
    const newMesh = chunk.createMesh();
    newMesh.position.set(
      chunk.chunkX * CHUNK_WIDTH, 
      0, 
      chunk.chunkZ * CHUNK_DEPTH
    );
    
    // Enable shadows on the new mesh
    newMesh.castShadow = true;
    newMesh.receiveShadow = true;
    
    this.scene.add(newMesh);
    chunk.mesh = newMesh;
  }

  /**
   * Batch modify multiple voxels
   * @param {Array} modifications - Array of {position: Vector3, blockType: number}
   * @param {VoxelModifier} modifier - VoxelModifier component
   * @returns {Promise<number>} Number of successful modifications
   */
  async batchModifyVoxels(modifications, modifier) {
    if (this.isProcessingBatch) {
      return 0;
    }

    this.isProcessingBatch = true;
    let successCount = 0;

    try {
      for (let i = 0; i < modifications.length; i += modifier.batchSize) {
        const batch = modifications.slice(i, i + modifier.batchSize);
        
        for (const mod of batch) {
          if (this.setVoxelAt(mod.position, mod.blockType)) {
            successCount++;
            this.triggerVoxelModifiedEvent(
              mod.blockType === 0 ? 'destroy' : 'place',
              mod.position,
              mod.blockType
            );
          }
        }
        
        // Wait between batches to avoid blocking
        if (i + modifier.batchSize < modifications.length) {
          await new Promise(resolve => setTimeout(resolve, modifier.batchDelay));
        }
      }
    } finally {
      this.isProcessingBatch = false;
    }

    return successCount;
  }

  /**
   * Trigger voxel modified event
   * @param {string} action - 'place' or 'destroy'
   * @param {Vector3} position - World position
   * @param {number} blockType - Block type
   */
  triggerVoxelModifiedEvent(action, position, blockType) {
    if (this.onVoxelModified) {
      this.onVoxelModified({
        action,
        position: position.clone(),
        blockType,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Get statistics about voxel modifications
   * @returns {Object} Statistics object
   */
  getStatistics() {
    return {
      dirtyChunksCount: this.dirtyChunks.size,
      isProcessingBatch: this.isProcessingBatch,
      pendingModifications: this.pendingModifications.length
    };
  }

  /**
   * Clear all pending modifications and dirty chunks
   */
  clear() {
    this.pendingModifications = [];
    this.modificationQueue = [];
    this.dirtyChunks.clear();
    this.isProcessingBatch = false;
    
    if (this.chunkUpdateTimer) {
      clearTimeout(this.chunkUpdateTimer);
      this.chunkUpdateTimer = null;
    }
  }

  /**
   * Dispose of the system and clean up resources
   */
  dispose() {
    this.clear();
    this.onVoxelModified = null;
    this.onChunkUpdated = null;
  }
}