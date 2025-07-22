import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { VoxelRaycaster } from '../voxelRaycaster.js';
import { Chunk, CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from '../chunk.js';

// Mock world for testing
class MockWorld {
  constructor() {
    this.chunks = {};
  }
  
  addChunk(chunkX, chunkZ, voxelData = null) {
    const chunk = new Chunk(chunkX, chunkZ);
    if (voxelData) {
      chunk.voxels = new Uint8Array(voxelData);
    } else {
      // Create a simple test pattern: solid ground at y=0-2, air above
      for (let x = 0; x < CHUNK_WIDTH; x++) {
        for (let z = 0; z < CHUNK_DEPTH; z++) {
          for (let y = 0; y < 3; y++) {
            chunk.setVoxel(x, y, z, 1); // Stone
          }
        }
      }
    }
    this.chunks[`${chunkX},${chunkZ}`] = chunk;
    return chunk;
  }
}

describe('VoxelRaycaster', () => {
  let raycaster;
  let mockWorld;
  let camera;

  beforeEach(() => {
    mockWorld = new MockWorld();
    raycaster = new VoxelRaycaster(mockWorld);
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 10, 0);
  });

  describe('worldToVoxelCoords', () => {
    it('should convert world coordinates to voxel coordinates', () => {
      const worldPos = new THREE.Vector3(5.7, 10.3, -2.8);
      const voxelPos = raycaster.worldToVoxelCoords(worldPos);
      
      expect(voxelPos.x).toBe(5);
      expect(voxelPos.y).toBe(10);
      expect(voxelPos.z).toBe(-3);
    });

    it('should handle negative coordinates correctly', () => {
      const worldPos = new THREE.Vector3(-5.7, -10.3, -2.8);
      const voxelPos = raycaster.worldToVoxelCoords(worldPos);
      
      expect(voxelPos.x).toBe(-6);
      expect(voxelPos.y).toBe(-11);
      expect(voxelPos.z).toBe(-3);
    });
  });

  describe('getVoxelAt', () => {
    beforeEach(() => {
      mockWorld.addChunk(0, 0);
    });

    it('should return voxel data for valid positions', () => {
      const worldPos = new THREE.Vector3(5, 1, 10);
      const voxelData = raycaster.getVoxelAt(worldPos);
      
      expect(voxelData).toBeTruthy();
      expect(voxelData.blockType).toBe(1); // Stone
      expect(voxelData.chunkCoords).toEqual({ x: 0, z: 0 });
      expect(voxelData.localCoords).toEqual({ x: 5, y: 1, z: 10 });
      expect(voxelData.worldCoords).toEqual({ x: 5, y: 1, z: 10 });
    });

    it('should return air for positions above ground', () => {
      const worldPos = new THREE.Vector3(5, 5, 10);
      const voxelData = raycaster.getVoxelAt(worldPos);
      
      expect(voxelData).toBeTruthy();
      expect(voxelData.blockType).toBe(0); // Air
    });

    it('should return null for positions in unloaded chunks', () => {
      const worldPos = new THREE.Vector3(100, 1, 100);
      const voxelData = raycaster.getVoxelAt(worldPos);
      
      expect(voxelData).toBeNull();
    });

    it('should return null for out-of-bounds positions', () => {
      const worldPos = new THREE.Vector3(5, 300, 10); // Above chunk height
      const voxelData = raycaster.getVoxelAt(worldPos);
      
      expect(voxelData).toBeNull();
    });

    it('should handle positions in different chunks', () => {
      mockWorld.addChunk(1, 0);
      const worldPos = new THREE.Vector3(35, 1, 10); // In chunk (1, 0)
      const voxelData = raycaster.getVoxelAt(worldPos);
      
      expect(voxelData).toBeTruthy();
      expect(voxelData.chunkCoords).toEqual({ x: 1, z: 0 });
      expect(voxelData.localCoords).toEqual({ x: 3, y: 1, z: 10 });
    });
  });

  describe('raycastFromRay', () => {
    beforeEach(() => {
      mockWorld.addChunk(0, 0);
    });

    it('should detect hits on solid voxels', () => {
      const origin = new THREE.Vector3(5, 10, 10);
      const direction = new THREE.Vector3(0, -1, 0); // Downward
      
      const result = raycaster.raycastFromRay(origin, direction, 20);
      
      expect(result).toBeTruthy();
      expect(result.hit).toBe(true);
      expect(result.blockType).toBe(1); // Stone
      expect(result.face).toBe('top');
      expect(result.normal.y).toBe(1);
    });

    it('should return null when no voxels are hit', () => {
      const origin = new THREE.Vector3(5, 10, 10);
      const direction = new THREE.Vector3(0, 1, 0); // Upward
      
      const result = raycaster.raycastFromRay(origin, direction, 20);
      
      expect(result).toBeNull();
    });

    it('should respect maximum distance', () => {
      const origin = new THREE.Vector3(5, 10, 10);
      const direction = new THREE.Vector3(0, -1, 0); // Downward
      
      const result = raycaster.raycastFromRay(origin, direction, 5); // Too short
      
      expect(result).toBeNull();
    });

    it('should detect different faces correctly', () => {
      // Test hitting from the side
      const origin = new THREE.Vector3(-5, 1, 10);
      const direction = new THREE.Vector3(1, 0, 0); // Eastward
      
      const result = raycaster.raycastFromRay(origin, direction, 20);
      
      expect(result).toBeTruthy();
      expect(result.face).toBe('west');
      expect(result.normal.x).toBe(-1);
    });
  });

  describe('raycastFromScreen', () => {
    beforeEach(() => {
      mockWorld.addChunk(0, 0);
      camera.position.set(5, 10, 10);
      camera.lookAt(5, 2, 10); // Look down at ground level
      camera.updateMatrixWorld(); // Ensure camera matrices are updated
    });

    it('should cast ray from screen center', () => {
      const screenPos = new THREE.Vector2(0, 0); // Center of screen
      
      const result = raycaster.raycastFromScreen(screenPos, camera, 20);
      
      expect(result).toBeTruthy();
      expect(result.hit).toBe(true);
      expect(result.blockType).toBe(1);
    });

    it('should handle off-screen coordinates', () => {
      const screenPos = new THREE.Vector2(2, 2); // Far off screen
      
      const result = raycaster.raycastFromScreen(screenPos, camera, 20);
      
      // Should still work but might not hit anything depending on camera angle
      expect(result).toBeDefined();
    });
  });

  describe('calculateHitDetails', () => {
    beforeEach(() => {
      mockWorld.addChunk(0, 0);
    });

    it('should calculate correct face normals', () => {
      const hitPoint = new THREE.Vector3(5.5, 2.5, 10.5);
      const rayDirection = new THREE.Vector3(1, 0, 0); // Moving east
      const voxelPos = new THREE.Vector3(5, 2, 10);
      
      const result = raycaster.calculateHitDetails(hitPoint, rayDirection, voxelPos, 0.1);
      
      // When moving east, we hit the west face of the voxel
      expect(result.face).toBe('west');
      expect(result.normal.x).toBe(-1);
      expect(result.normal.y).toBe(0);
      expect(result.normal.z).toBe(0);
    });

    it('should calculate correct adjacent positions for placement', () => {
      const hitPoint = new THREE.Vector3(5.5, 2.5, 10.5);
      const rayDirection = new THREE.Vector3(0, 1, 0); // Moving up
      const voxelPos = new THREE.Vector3(5, 2, 10);
      
      const result = raycaster.calculateHitDetails(hitPoint, rayDirection, voxelPos, 0.1);
      
      // When moving up, we hit the bottom face of the voxel
      expect(result.face).toBe('bottom');
      expect(result.adjacentPosition.x).toBe(5);
      expect(result.adjacentPosition.y).toBe(1);
      expect(result.adjacentPosition.z).toBe(10);
    });
  });

  describe('getPlacementPosition', () => {
    it('should return adjacent position from hit result', () => {
      const hitResult = {
        hit: true,
        adjacentPosition: new THREE.Vector3(5, 3, 10)
      };
      
      const placementPos = raycaster.getPlacementPosition(hitResult);
      
      expect(placementPos).toEqual(new THREE.Vector3(5, 3, 10));
    });

    it('should return null for invalid hit results', () => {
      const hitResult = { hit: false };
      
      const placementPos = raycaster.getPlacementPosition(hitResult);
      
      expect(placementPos).toBeNull();
    });

    it('should return null for null hit results', () => {
      const placementPos = raycaster.getPlacementPosition(null);
      
      expect(placementPos).toBeNull();
    });
  });

  describe('isValidPlacementPosition', () => {
    beforeEach(() => {
      mockWorld.addChunk(0, 0);
    });

    it('should return true for valid air positions', () => {
      const position = new THREE.Vector3(5, 5, 10); // Air above ground
      
      const isValid = raycaster.isValidPlacementPosition(position);
      
      expect(isValid).toBe(true);
    });

    it('should return false for occupied positions', () => {
      const position = new THREE.Vector3(5, 1, 10); // Solid ground
      
      const isValid = raycaster.isValidPlacementPosition(position);
      
      expect(isValid).toBe(false);
    });

    it('should return false for out-of-bounds positions', () => {
      const position = new THREE.Vector3(5, -5, 10); // Below world
      
      const isValid = raycaster.isValidPlacementPosition(position);
      
      expect(isValid).toBe(false);
    });

    it('should return false for positions above world height', () => {
      const position = new THREE.Vector3(5, 300, 10); // Above world
      
      const isValid = raycaster.isValidPlacementPosition(position);
      
      expect(isValid).toBe(false);
    });
  });

  describe('cross-chunk boundary handling', () => {
    beforeEach(() => {
      mockWorld.addChunk(0, 0);
      mockWorld.addChunk(1, 0);
    });

    it('should handle raycasting across chunk boundaries', () => {
      const origin = new THREE.Vector3(30, 10, 10); // Near chunk boundary
      const direction = new THREE.Vector3(1, -1, 0).normalize(); // Diagonal down-east
      
      const result = raycaster.raycastFromRay(origin, direction, 50);
      
      expect(result).toBeTruthy();
      expect(result.hit).toBe(true);
    });

    it('should correctly identify voxels in different chunks', () => {
      const positionChunk0 = new THREE.Vector3(31, 1, 10); // Last voxel in chunk 0
      const positionChunk1 = new THREE.Vector3(32, 1, 10); // First voxel in chunk 1
      
      const voxelData0 = raycaster.getVoxelAt(positionChunk0);
      const voxelData1 = raycaster.getVoxelAt(positionChunk1);
      
      expect(voxelData0.chunkCoords).toEqual({ x: 0, z: 0 });
      expect(voxelData1.chunkCoords).toEqual({ x: 1, z: 0 });
    });
  });
});