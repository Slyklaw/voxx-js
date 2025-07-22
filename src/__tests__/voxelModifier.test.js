import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VoxelModifier } from '../voxelModifier.js';

describe('VoxelModifier', () => {
  let modifier;

  beforeEach(() => {
    modifier = new VoxelModifier();
  });

  describe('constructor', () => {
    it('should create with default values', () => {
      expect(modifier.type).toBe('VoxelModifier');
      expect(modifier.canPlace).toBe(true);
      expect(modifier.canDestroy).toBe(true);
      expect(modifier.availableBlocks).toEqual([1, 2, 3, 5]);
      expect(modifier.currentBlockType).toBe(1);
      expect(modifier.maxRange).toBe(10);
      expect(modifier.minRange).toBe(1);
      expect(modifier.modificationCooldown).toBe(100);
      expect(modifier.batchSize).toBe(1);
      expect(modifier.batchDelay).toBe(50);
    });

    it('should create with custom options', () => {
      const customModifier = new VoxelModifier({
        canPlace: false,
        canDestroy: false,
        availableBlocks: [1, 2],
        currentBlockType: 2,
        maxRange: 20,
        minRange: 2,
        modificationCooldown: 200,
        batchSize: 5,
        batchDelay: 100
      });

      expect(customModifier.canPlace).toBe(false);
      expect(customModifier.canDestroy).toBe(false);
      expect(customModifier.availableBlocks).toEqual([1, 2]);
      expect(customModifier.currentBlockType).toBe(2);
      expect(customModifier.maxRange).toBe(20);
      expect(customModifier.minRange).toBe(2);
      expect(customModifier.modificationCooldown).toBe(200);
      expect(customModifier.batchSize).toBe(5);
      expect(customModifier.batchDelay).toBe(100);
    });
  });

  describe('canModify', () => {
    it('should allow placement when canPlace is true and block type is available', () => {
      expect(modifier.canModify('place', 1)).toBe(true);
      expect(modifier.canModify('place', 2)).toBe(true);
      expect(modifier.canModify('place', 3)).toBe(true);
      expect(modifier.canModify('place', 5)).toBe(true);
    });

    it('should not allow placement when canPlace is false', () => {
      modifier.canPlace = false;
      expect(modifier.canModify('place', 1)).toBe(false);
    });

    it('should not allow placement of unavailable block types', () => {
      expect(modifier.canModify('place', 4)).toBe(false); // water not in available blocks
      expect(modifier.canModify('place', 6)).toBe(false); // invalid block type
    });

    it('should allow destruction when canDestroy is true', () => {
      expect(modifier.canModify('destroy')).toBe(true);
    });

    it('should not allow destruction when canDestroy is false', () => {
      modifier.canDestroy = false;
      expect(modifier.canModify('destroy')).toBe(false);
    });

    it('should respect cooldown period', () => {
      // Mock Date.now to control time
      const mockNow = vi.spyOn(Date, 'now');
      mockNow.mockReturnValue(1000);

      modifier.lastModificationTime = 950; // 50ms ago
      expect(modifier.canModify('place', 1)).toBe(false);

      modifier.lastModificationTime = 850; // 150ms ago
      expect(modifier.canModify('place', 1)).toBe(true);

      mockNow.mockRestore();
    });

    it('should return false for invalid actions', () => {
      expect(modifier.canModify('invalid')).toBe(false);
    });
  });

  describe('updateModificationTime', () => {
    it('should update the last modification time', () => {
      const mockNow = vi.spyOn(Date, 'now');
      mockNow.mockReturnValue(5000);

      modifier.updateModificationTime();
      expect(modifier.lastModificationTime).toBe(5000);

      mockNow.mockRestore();
    });
  });

  describe('setCurrentBlockType', () => {
    it('should set block type if it is available', () => {
      expect(modifier.setCurrentBlockType(2)).toBe(true);
      expect(modifier.currentBlockType).toBe(2);

      expect(modifier.setCurrentBlockType(3)).toBe(true);
      expect(modifier.currentBlockType).toBe(3);
    });

    it('should not set block type if it is not available', () => {
      const originalBlockType = modifier.currentBlockType;
      
      expect(modifier.setCurrentBlockType(4)).toBe(false); // water
      expect(modifier.currentBlockType).toBe(originalBlockType);

      expect(modifier.setCurrentBlockType(6)).toBe(false); // invalid
      expect(modifier.currentBlockType).toBe(originalBlockType);
    });
  });

  describe('getNextBlockType', () => {
    it('should cycle through available block types', () => {
      modifier.currentBlockType = 1;
      expect(modifier.getNextBlockType()).toBe(2);

      modifier.currentBlockType = 2;
      expect(modifier.getNextBlockType()).toBe(3);

      modifier.currentBlockType = 3;
      expect(modifier.getNextBlockType()).toBe(5);

      modifier.currentBlockType = 5;
      expect(modifier.getNextBlockType()).toBe(1); // wrap around
    });

    it('should handle single block type', () => {
      modifier.availableBlocks = [1];
      modifier.currentBlockType = 1;
      expect(modifier.getNextBlockType()).toBe(1);
    });
  });

  describe('serialize', () => {
    it('should serialize all properties correctly', () => {
      const serialized = modifier.serialize();
      
      expect(serialized).toEqual({
        type: 'VoxelModifier',
        canPlace: true,
        canDestroy: true,
        availableBlocks: [1, 2, 3, 5],
        currentBlockType: 1,
        maxRange: 10,
        minRange: 1,
        modificationCooldown: 100,
        batchSize: 1,
        batchDelay: 50
      });
    });

    it('should create independent arrays for availableBlocks', () => {
      const serialized = modifier.serialize();
      serialized.availableBlocks.push(99);
      
      expect(modifier.availableBlocks).not.toContain(99);
    });
  });

  describe('deserialize', () => {
    it('should deserialize all properties correctly', () => {
      const data = {
        canPlace: false,
        canDestroy: false,
        availableBlocks: [2, 3],
        currentBlockType: 3,
        maxRange: 15,
        minRange: 3,
        modificationCooldown: 150,
        batchSize: 3,
        batchDelay: 75
      };

      modifier.deserialize(data);

      expect(modifier.canPlace).toBe(false);
      expect(modifier.canDestroy).toBe(false);
      expect(modifier.availableBlocks).toEqual([2, 3]);
      expect(modifier.currentBlockType).toBe(3);
      expect(modifier.maxRange).toBe(15);
      expect(modifier.minRange).toBe(3);
      expect(modifier.modificationCooldown).toBe(150);
      expect(modifier.batchSize).toBe(3);
      expect(modifier.batchDelay).toBe(75);
      expect(modifier.lastModificationTime).toBe(0);
    });

    it('should create independent arrays for availableBlocks', () => {
      const data = {
        availableBlocks: [1, 2, 3],
        canPlace: true,
        canDestroy: true,
        currentBlockType: 1,
        maxRange: 10,
        minRange: 1,
        modificationCooldown: 100,
        batchSize: 1,
        batchDelay: 50
      };

      modifier.deserialize(data);
      data.availableBlocks.push(99);
      
      expect(modifier.availableBlocks).not.toContain(99);
    });
  });
});