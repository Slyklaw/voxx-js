import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import * as THREE from 'three';
import { VoxelInteractionSystem } from '../voxelInteractionSystem.js';
import { VoxelModifier } from '../voxelModifier.js';
import { World } from '../world.js';
import { Chunk, CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from '../chunk.js';

// Mock VoxelRaycaster
vi.mock('../voxelRaycaster.js', () => ({
  VoxelRaycaster: vi.fn().mockImplementation(() => ({
    raycastFromScreen: vi.fn(),
    getVoxelAt: vi.fn(),
    getPlacementPosition: vi.fn(),
    isValidPlacementPosition: vi.fn()
  }))
}));

describe('VoxelInteractionSystem', () => {
  let system;
  let mockWorld;
  let mockScene;
  let mockChunk;
  let modifier;

  beforeEach(() => {
    // Create mock scene
    mockScene = {
      add: vi.fn(),
      remove: vi.fn()
    };

    // Create mock chunk
    mockChunk = {
      chunkX: 0,
      chunkZ: 0,
      voxels: new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH),
      setVoxel: vi.fn(),
      getVoxel: vi.fn(),
      createMesh: vi.fn(() => ({
        position: { set: vi.fn() },
        geometry: { dispose: vi.fn() },
        material: { dispose: vi.fn() }
      })),
      mesh: null,
      constructor: { CHUNK_HEIGHT }
    };

    // Create mock world
    mockWorld = {
      chunks: {
        '0,0': mockChunk
      }
    };

    system = new VoxelInteractionSystem(mockWorld, mockScene);
    modifier = new VoxelModifier();

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    system.dispose();
  });

  describe('constructor', () => {
    it('should initialize with correct properties', () => {
      expect(system.world).toBe(mockWorld);
      expect(system.scene).toBe(mockScene);
      expect(system.pendingModifications).toEqual([]);
      expect(system.modificationQueue).toEqual([]);
      expect(system.isProcessingBatch).toBe(false);
      expect(system.dirtyChunks.size).toBe(0);
      expect(system.chunkUpdateDelay).toBe(100);
    });
  });

  describe('handleVoxelClick', () => {
    it('should return false when raycast misses', () => {
      system.raycaster.raycastFromScreen.mockReturnValue(null);
      
      const screenPos = new THREE.Vector2(0, 0);
      const camera = new THREE.Camera();
      
      const result = system.handleVoxelClick(screenPos, camera, modifier, 'place');
      expect(result).toBe(false);
    });

    it('should return false when hit is out of range', () => {
      const hitResult = {
        hit: true,
        distance: 15, // beyond maxRange of 10
        voxelPosition: new THREE.Vector3(1, 1, 1)
      };
      
      system.raycaster.raycastFromScreen.mockReturnValue(hitResult);
      
      const screenPos = new THREE.Vector2(0, 0);
      const camera = new THREE.Camera();
      
      const result = system.handleVoxelClick(screenPos, camera, modifier, 'place');
      expect(result).toBe(false);
    });

    it('should call placeVoxel for place action', () => {
      const hitResult = {
        hit: true,
        distance: 5,
        voxelPosition: new THREE.Vector3(1, 1, 1)
      };
      
      system.raycaster.raycastFromScreen.mockReturnValue(hitResult);
      system.placeVoxel = vi.fn().mockReturnValue(true);
      
      const screenPos = new THREE.Vector2(0, 0);
      const camera = new THREE.Camera();
      
      const result = system.handleVoxelClick(screenPos, camera, modifier, 'place');
      expect(result).toBe(true);
      expect(system.placeVoxel).toHaveBeenCalledWith(hitResult, modifier);
    });

    it('should call destroyVoxel for destroy action', () => {
      const hitResult = {
        hit: true,
        distance: 5,
        voxelPosition: new THREE.Vector3(1, 1, 1)
      };
      
      system.raycaster.raycastFromScreen.mockReturnValue(hitResult);
      system.destroyVoxel = vi.fn().mockReturnValue(true);
      
      const screenPos = new THREE.Vector2(0, 0);
      const camera = new THREE.Camera();
      
      const result = system.handleVoxelClick(screenPos, camera, modifier, 'destroy');
      expect(result).toBe(true);
      expect(system.destroyVoxel).toHaveBeenCalledWith(hitResult, modifier);
    });
  });

  describe('placeVoxel', () => {
    it('should return false when modifier cannot place', () => {
      modifier.canPlace = false;
      
      const hitResult = { hit: true };
      const result = system.placeVoxel(hitResult, modifier);
      
      expect(result).toBe(false);
    });

    it('should return false when placement position is invalid', () => {
      const hitResult = { hit: true };
      const placementPos = new THREE.Vector3(1, 1, 1);
      
      system.raycaster.getPlacementPosition.mockReturnValue(placementPos);
      system.raycaster.isValidPlacementPosition.mockReturnValue(false);
      
      const result = system.placeVoxel(hitResult, modifier);
      expect(result).toBe(false);
    });

    it('should place voxel successfully', () => {
      const hitResult = { hit: true };
      const placementPos = new THREE.Vector3(1, 1, 1);
      
      system.raycaster.getPlacementPosition.mockReturnValue(placementPos);
      system.raycaster.isValidPlacementPosition.mockReturnValue(true);
      system.setVoxelAt = vi.fn().mockReturnValue(true);
      system.triggerVoxelModifiedEvent = vi.fn();
      
      const updateTimeSpy = vi.spyOn(modifier, 'updateModificationTime');
      
      const result = system.placeVoxel(hitResult, modifier);
      
      expect(result).toBe(true);
      expect(system.setVoxelAt).toHaveBeenCalledWith(placementPos, modifier.currentBlockType);
      expect(updateTimeSpy).toHaveBeenCalled();
      expect(system.triggerVoxelModifiedEvent).toHaveBeenCalledWith(
        'place', 
        placementPos, 
        modifier.currentBlockType
      );
    });
  });

  describe('destroyVoxel', () => {
    it('should return false when modifier cannot destroy', () => {
      modifier.canDestroy = false;
      
      const hitResult = { hit: true, blockType: 1 };
      const result = system.destroyVoxel(hitResult, modifier);
      
      expect(result).toBe(false);
    });

    it('should return false when trying to destroy air', () => {
      const hitResult = { hit: true, blockType: 0 };
      const result = system.destroyVoxel(hitResult, modifier);
      
      expect(result).toBe(false);
    });

    it('should destroy voxel successfully', () => {
      const hitResult = { 
        hit: true, 
        blockType: 1,
        voxelPosition: new THREE.Vector3(1, 1, 1)
      };
      
      system.setVoxelAt = vi.fn().mockReturnValue(true);
      system.triggerVoxelModifiedEvent = vi.fn();
      
      const updateTimeSpy = vi.spyOn(modifier, 'updateModificationTime');
      
      const result = system.destroyVoxel(hitResult, modifier);
      
      expect(result).toBe(true);
      expect(system.setVoxelAt).toHaveBeenCalledWith(hitResult.voxelPosition, 0);
      expect(updateTimeSpy).toHaveBeenCalled();
      expect(system.triggerVoxelModifiedEvent).toHaveBeenCalledWith(
        'destroy', 
        hitResult.voxelPosition, 
        0
      );
    });
  });

  describe('setVoxelAt', () => {
    it('should return false for non-existent chunk', () => {
      const worldPos = new THREE.Vector3(100, 1, 100); // Outside existing chunks
      const result = system.setVoxelAt(worldPos, 1);
      
      expect(result).toBe(false);
    });

    it('should return false for chunk without voxel data', () => {
      mockChunk.voxels = null;
      
      const worldPos = new THREE.Vector3(1, 1, 1);
      const result = system.setVoxelAt(worldPos, 1);
      
      expect(result).toBe(false);
    });

    it('should return false for out-of-bounds coordinates', () => {
      const worldPos = new THREE.Vector3(1, 300, 1); // Y too high
      const result = system.setVoxelAt(worldPos, 1);
      
      expect(result).toBe(false);
    });

    it('should set voxel successfully and mark chunk dirty', () => {
      const worldPos = new THREE.Vector3(1, 1, 1);
      system.markChunkDirty = vi.fn();
      system.checkAdjacentChunks = vi.fn();
      
      const result = system.setVoxelAt(worldPos, 2);
      
      expect(result).toBe(true);
      expect(mockChunk.setVoxel).toHaveBeenCalledWith(1, 1, 1, 2);
      expect(system.markChunkDirty).toHaveBeenCalledWith(0, 0);
      expect(system.checkAdjacentChunks).toHaveBeenCalledWith(1, 1, 1, 0, 0);
    });
  });

  describe('markChunkDirty', () => {
    it('should add chunk to dirty set', () => {
      system.markChunkDirty(0, 0);
      expect(system.dirtyChunks.has('0,0')).toBe(true);
    });

    it('should schedule chunk update', async () => {
      const updateSpy = vi.spyOn(system, 'updateDirtyChunks').mockImplementation(() => {});
      system.chunkUpdateDelay = 10; // Short delay for testing
      
      system.markChunkDirty(0, 0);
      
      // Wait for the timeout to complete
      await new Promise(resolve => setTimeout(resolve, 15));
      
      expect(updateSpy).toHaveBeenCalled();
    });

    it('should clear previous timer when called multiple times', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      
      system.markChunkDirty(0, 0);
      system.markChunkDirty(1, 1);
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('checkAdjacentChunks', () => {
    beforeEach(() => {
      system.markChunkDirty = vi.fn();
    });

    it('should mark adjacent chunks dirty for boundary voxels', () => {
      // Test X boundary
      system.checkAdjacentChunks(0, 1, 1, 0, 0); // localX = 0
      expect(system.markChunkDirty).toHaveBeenCalledWith(-1, 0);

      system.markChunkDirty.mockClear();
      system.checkAdjacentChunks(CHUNK_WIDTH - 1, 1, 1, 0, 0); // localX = max
      expect(system.markChunkDirty).toHaveBeenCalledWith(1, 0);

      // Test Z boundary
      system.markChunkDirty.mockClear();
      system.checkAdjacentChunks(1, 1, 0, 0, 0); // localZ = 0
      expect(system.markChunkDirty).toHaveBeenCalledWith(0, -1);

      system.markChunkDirty.mockClear();
      system.checkAdjacentChunks(1, 1, CHUNK_DEPTH - 1, 0, 0); // localZ = max
      expect(system.markChunkDirty).toHaveBeenCalledWith(0, 1);
    });

    it('should not mark adjacent chunks for non-boundary voxels', () => {
      system.checkAdjacentChunks(5, 5, 5, 0, 0);
      expect(system.markChunkDirty).not.toHaveBeenCalled();
    });
  });

  describe('updateDirtyChunks', () => {
    it('should update all dirty chunks', () => {
      system.dirtyChunks.add('0,0');
      system.updateChunkMesh = vi.fn();
      system.onChunkUpdated = vi.fn();
      
      system.updateDirtyChunks();
      
      expect(system.updateChunkMesh).toHaveBeenCalledWith(mockChunk);
      expect(system.onChunkUpdated).toHaveBeenCalledWith(['0,0']);
      expect(system.dirtyChunks.size).toBe(0);
    });

    it('should skip chunks that do not exist', () => {
      system.dirtyChunks.add('1,1'); // Non-existent chunk
      system.updateChunkMesh = vi.fn();
      
      system.updateDirtyChunks();
      
      expect(system.updateChunkMesh).not.toHaveBeenCalled();
    });
  });

  describe('updateChunkMesh', () => {
    it('should remove old mesh and create new one', () => {
      const oldMesh = {
        geometry: { dispose: vi.fn() },
        material: { dispose: vi.fn() }
      };
      mockChunk.mesh = oldMesh;
      
      const newMesh = {
        position: { set: vi.fn() }
      };
      mockChunk.createMesh.mockReturnValue(newMesh);
      
      system.updateChunkMesh(mockChunk);
      
      expect(mockScene.remove).toHaveBeenCalledWith(oldMesh);
      expect(oldMesh.geometry.dispose).toHaveBeenCalled();
      expect(oldMesh.material.dispose).toHaveBeenCalled();
      expect(newMesh.position.set).toHaveBeenCalledWith(0, 0, 0);
      expect(mockScene.add).toHaveBeenCalledWith(newMesh);
      expect(mockChunk.mesh).toBe(newMesh);
    });
  });

  describe('batchModifyVoxels', () => {
    it('should process modifications in batches', async () => {
      const modifications = [
        { position: new THREE.Vector3(1, 1, 1), blockType: 1 },
        { position: new THREE.Vector3(2, 1, 1), blockType: 2 },
        { position: new THREE.Vector3(3, 1, 1), blockType: 3 }
      ];
      
      modifier.batchSize = 2;
      modifier.batchDelay = 10;
      
      system.setVoxelAt = vi.fn().mockReturnValue(true);
      system.triggerVoxelModifiedEvent = vi.fn();
      
      const result = await system.batchModifyVoxels(modifications, modifier);
      
      expect(result).toBe(3);
      expect(system.setVoxelAt).toHaveBeenCalledTimes(3);
      expect(system.triggerVoxelModifiedEvent).toHaveBeenCalledTimes(3);
    });

    it('should not process if already processing batch', async () => {
      system.isProcessingBatch = true;
      
      const modifications = [
        { position: new THREE.Vector3(1, 1, 1), blockType: 1 }
      ];
      
      const result = await system.batchModifyVoxels(modifications, modifier);
      expect(result).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('should return correct statistics', () => {
      system.dirtyChunks.add('0,0');
      system.dirtyChunks.add('1,1');
      system.isProcessingBatch = true;
      system.pendingModifications = [1, 2, 3];
      
      const stats = system.getStatistics();
      
      expect(stats).toEqual({
        dirtyChunksCount: 2,
        isProcessingBatch: true,
        pendingModifications: 3
      });
    });
  });

  describe('clear', () => {
    it('should clear all pending data', () => {
      system.pendingModifications = [1, 2, 3];
      system.modificationQueue = [4, 5, 6];
      system.dirtyChunks.add('0,0');
      system.isProcessingBatch = true;
      system.chunkUpdateTimer = setTimeout(() => {}, 1000);
      
      system.clear();
      
      expect(system.pendingModifications).toEqual([]);
      expect(system.modificationQueue).toEqual([]);
      expect(system.dirtyChunks.size).toBe(0);
      expect(system.isProcessingBatch).toBe(false);
      expect(system.chunkUpdateTimer).toBeNull();
    });
  });

  describe('dispose', () => {
    it('should clear data and remove callbacks', () => {
      system.onVoxelModified = vi.fn();
      system.onChunkUpdated = vi.fn();
      system.clear = vi.fn();
      
      system.dispose();
      
      expect(system.clear).toHaveBeenCalled();
      expect(system.onVoxelModified).toBeNull();
      expect(system.onChunkUpdated).toBeNull();
    });
  });
});