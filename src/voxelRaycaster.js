import * as THREE from 'three';
import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from './chunk.js';

/**
 * VoxelRaycaster provides utilities for raycasting against voxel terrain
 * Integrates with chunk-based world system and provides face detection
 */
export class VoxelRaycaster {
  constructor(world) {
    this.world = world;
    this.raycaster = new THREE.Raycaster();
  }

  /**
   * Cast a ray from screen coordinates and return voxel hit information
   * @param {Vector2} screenPosition - Normalized screen coordinates (-1 to 1)
   * @param {Camera} camera - Three.js camera
   * @param {number} maxDistance - Maximum ray distance
   * @returns {VoxelHitResult|null} Hit result or null if no hit
   */
  raycastFromScreen(screenPosition, camera, maxDistance = 100) {
    this.raycaster.setFromCamera(screenPosition, camera);
    return this.raycastFromRay(this.raycaster.ray.origin, this.raycaster.ray.direction, maxDistance);
  }

  /**
   * Cast a ray from world position and direction
   * @param {Vector3} origin - Ray origin in world coordinates
   * @param {Vector3} direction - Ray direction (normalized)
   * @param {number} maxDistance - Maximum ray distance
   * @returns {VoxelHitResult|null} Hit result or null if no hit
   */
  raycastFromRay(origin, direction, maxDistance = 100) {
    const step = 0.1; // Step size for ray marching
    const rayDirection = direction.clone().normalize();
    const currentPos = origin.clone();
    this.rayOrigin = origin.clone(); // Store for distance calculation
    
    for (let distance = 0; distance < maxDistance; distance += step) {
      const voxelPos = this.worldToVoxelCoords(currentPos);
      const voxelData = this.getVoxelAt(voxelPos);
      
      if (voxelData && voxelData.blockType > 0) { // Hit a solid voxel
        // Calculate the exact hit point and face
        const hitResult = this.calculateHitDetails(currentPos, rayDirection, voxelPos, step);
        hitResult.distance = currentPos.distanceTo(origin);
        return hitResult;
      }
      
      currentPos.addScaledVector(rayDirection, step);
    }
    
    return null; // No hit
  }

  /**
   * Get voxel data at world coordinates
   * @param {Vector3} worldPos - World position
   * @returns {Object|null} Voxel data with blockType and chunk coordinates
   */
  getVoxelAt(worldPos) {
    const chunkX = Math.floor(worldPos.x / CHUNK_WIDTH);
    const chunkZ = Math.floor(worldPos.z / CHUNK_DEPTH);
    
    const chunk = this.world.chunks[`${chunkX},${chunkZ}`];
    if (!chunk || !chunk.voxels) {
      return null;
    }
    
    const localX = Math.floor(worldPos.x - chunkX * CHUNK_WIDTH);
    const localY = Math.floor(worldPos.y);
    const localZ = Math.floor(worldPos.z - chunkZ * CHUNK_DEPTH);
    
    // Bounds check
    if (localX < 0 || localX >= CHUNK_WIDTH || 
        localY < 0 || localY >= CHUNK_HEIGHT || 
        localZ < 0 || localZ >= CHUNK_DEPTH) {
      return null;
    }
    
    const blockType = chunk.getVoxel(localX, localY, localZ);
    
    return {
      blockType,
      chunkCoords: { x: chunkX, z: chunkZ },
      localCoords: { x: localX, y: localY, z: localZ },
      worldCoords: { 
        x: chunkX * CHUNK_WIDTH + localX, 
        y: localY, 
        z: chunkZ * CHUNK_DEPTH + localZ 
      }
    };
  }

  /**
   * Convert world coordinates to voxel coordinates
   * @param {Vector3} worldPos - World position
   * @returns {Vector3} Voxel coordinates
   */
  worldToVoxelCoords(worldPos) {
    return new THREE.Vector3(
      Math.floor(worldPos.x),
      Math.floor(worldPos.y),
      Math.floor(worldPos.z)
    );
  }

  /**
   * Calculate detailed hit information including face detection
   * @param {Vector3} hitPoint - Ray hit point
   * @param {Vector3} rayDirection - Ray direction
   * @param {Vector3} voxelPos - Voxel position that was hit
   * @param {number} stepSize - Ray marching step size
   * @returns {VoxelHitResult} Detailed hit result
   */
  calculateHitDetails(hitPoint, rayDirection, voxelPos, stepSize) {
    // Get the previous point to determine entry direction
    const prevPoint = hitPoint.clone().addScaledVector(rayDirection, -stepSize);
    
    // Calculate face based on ray direction and entry point
    const voxelMin = new THREE.Vector3(voxelPos.x, voxelPos.y, voxelPos.z);
    const voxelMax = new THREE.Vector3(voxelPos.x + 1, voxelPos.y + 1, voxelPos.z + 1);
    
    let face, normal, adjacentPos;
    
    // Determine which face was hit by checking which boundary the ray crossed
    const epsilon = 0.001;
    
    if (Math.abs(hitPoint.x - voxelMin.x) < epsilon && rayDirection.x > 0) {
      // Hit west face (entering from west)
      face = 'west';
      normal = new THREE.Vector3(-1, 0, 0);
      adjacentPos = new THREE.Vector3(voxelPos.x - 1, voxelPos.y, voxelPos.z);
    } else if (Math.abs(hitPoint.x - voxelMax.x) < epsilon && rayDirection.x < 0) {
      // Hit east face (entering from east)
      face = 'east';
      normal = new THREE.Vector3(1, 0, 0);
      adjacentPos = new THREE.Vector3(voxelPos.x + 1, voxelPos.y, voxelPos.z);
    } else if (Math.abs(hitPoint.y - voxelMin.y) < epsilon && rayDirection.y > 0) {
      // Hit bottom face (entering from below)
      face = 'bottom';
      normal = new THREE.Vector3(0, -1, 0);
      adjacentPos = new THREE.Vector3(voxelPos.x, voxelPos.y - 1, voxelPos.z);
    } else if (Math.abs(hitPoint.y - voxelMax.y) < epsilon && rayDirection.y < 0) {
      // Hit top face (entering from above)
      face = 'top';
      normal = new THREE.Vector3(0, 1, 0);
      adjacentPos = new THREE.Vector3(voxelPos.x, voxelPos.y + 1, voxelPos.z);
    } else if (Math.abs(hitPoint.z - voxelMin.z) < epsilon && rayDirection.z > 0) {
      // Hit north face (entering from north)
      face = 'north';
      normal = new THREE.Vector3(0, 0, -1);
      adjacentPos = new THREE.Vector3(voxelPos.x, voxelPos.y, voxelPos.z - 1);
    } else if (Math.abs(hitPoint.z - voxelMax.z) < epsilon && rayDirection.z < 0) {
      // Hit south face (entering from south)
      face = 'south';
      normal = new THREE.Vector3(0, 0, 1);
      adjacentPos = new THREE.Vector3(voxelPos.x, voxelPos.y, voxelPos.z + 1);
    } else {
      // Fallback: determine face based on ray direction
      const absDir = new THREE.Vector3(
        Math.abs(rayDirection.x),
        Math.abs(rayDirection.y),
        Math.abs(rayDirection.z)
      );
      
      if (absDir.y >= absDir.x && absDir.y >= absDir.z) {
        // Primarily vertical ray
        if (rayDirection.y < 0) {
          face = 'top';
          normal = new THREE.Vector3(0, 1, 0);
          adjacentPos = new THREE.Vector3(voxelPos.x, voxelPos.y + 1, voxelPos.z);
        } else {
          face = 'bottom';
          normal = new THREE.Vector3(0, -1, 0);
          adjacentPos = new THREE.Vector3(voxelPos.x, voxelPos.y - 1, voxelPos.z);
        }
      } else if (absDir.x >= absDir.z) {
        // Primarily horizontal X ray
        if (rayDirection.x > 0) {
          face = 'west';
          normal = new THREE.Vector3(-1, 0, 0);
          adjacentPos = new THREE.Vector3(voxelPos.x - 1, voxelPos.y, voxelPos.z);
        } else {
          face = 'east';
          normal = new THREE.Vector3(1, 0, 0);
          adjacentPos = new THREE.Vector3(voxelPos.x + 1, voxelPos.y, voxelPos.z);
        }
      } else {
        // Primarily horizontal Z ray
        if (rayDirection.z > 0) {
          face = 'north';
          normal = new THREE.Vector3(0, 0, -1);
          adjacentPos = new THREE.Vector3(voxelPos.x, voxelPos.y, voxelPos.z - 1);
        } else {
          face = 'south';
          normal = new THREE.Vector3(0, 0, 1);
          adjacentPos = new THREE.Vector3(voxelPos.x, voxelPos.y, voxelPos.z + 1);
        }
      }
    }
    
    const voxelData = this.getVoxelAt(voxelPos);
    
    return {
      hit: true,
      point: hitPoint.clone(),
      voxelPosition: voxelPos.clone(),
      face: face,
      normal: normal,
      adjacentPosition: adjacentPos, // Position where a new voxel could be placed
      blockType: voxelData ? voxelData.blockType : 0,
      chunkCoords: voxelData ? voxelData.chunkCoords : null,
      localCoords: voxelData ? voxelData.localCoords : null,
      distance: 0 // Will be set by calling function
    };
  }

  /**
   * Get the position where a new voxel should be placed when clicking on a face
   * @param {VoxelHitResult} hitResult - Result from raycast
   * @returns {Vector3} Position for voxel placement
   */
  getPlacementPosition(hitResult) {
    if (!hitResult || !hitResult.hit) {
      return null;
    }
    
    return hitResult.adjacentPosition.clone();
  }

  /**
   * Check if a position is valid for voxel placement
   * @param {Vector3} position - World position to check
   * @returns {boolean} True if position is valid for placement
   */
  isValidPlacementPosition(position) {
    // Check bounds
    if (position.y < 0 || position.y >= CHUNK_HEIGHT) {
      return false;
    }
    
    // Check if position is already occupied
    const voxelData = this.getVoxelAt(position);
    return voxelData && voxelData.blockType === 0; // Only place in air
  }
}

/**
 * @typedef {Object} VoxelHitResult
 * @property {boolean} hit - Whether a voxel was hit
 * @property {Vector3} point - World position of hit point
 * @property {Vector3} voxelPosition - Position of the hit voxel
 * @property {string} face - Face that was hit ('top', 'bottom', 'north', 'south', 'east', 'west')
 * @property {Vector3} normal - Surface normal at hit point
 * @property {Vector3} adjacentPosition - Position adjacent to hit face (for placement)
 * @property {number} blockType - Type of block that was hit
 * @property {Object} chunkCoords - Chunk coordinates {x, z}
 * @property {Object} localCoords - Local coordinates within chunk {x, y, z}
 * @property {number} distance - Distance from ray origin to hit point
 */