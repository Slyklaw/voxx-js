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
    const rayDirection = direction.clone().normalize();
    this.rayOrigin = origin.clone(); // Store for distance calculation
    
    // Use a hybrid approach: coarse ray marching to find candidate voxels,
    // then precise ray-box intersection for accurate face detection
    const step = 0.5; // Larger step for initial search
    const currentPos = origin.clone();
    const candidates = [];
    
    // First pass: find all potential voxel hits
    for (let distance = 0; distance < maxDistance; distance += step) {
      const voxelPos = this.worldToVoxelCoords(currentPos);
      const voxelData = this.getVoxelAt(voxelPos);
      
      if (voxelData && voxelData.blockType > 0) {
        // Check if we already found this voxel
        const key = `${voxelPos.x},${voxelPos.y},${voxelPos.z}`;
        if (!candidates.some(c => c.key === key)) {
          candidates.push({
            key,
            voxelPos: voxelPos.clone(),
            voxelData,
            distance: currentPos.distanceTo(origin)
          });
        }
      }
      
      currentPos.addScaledVector(rayDirection, step);
    }
    
    // Second pass: precise ray-box intersection for each candidate
    let closestHit = null;
    let closestDistance = Infinity;
    
    for (const candidate of candidates) {
      const intersection = this.rayBoxIntersection(
        origin, 
        rayDirection, 
        candidate.voxelPos, 
        new THREE.Vector3(candidate.voxelPos.x + 1, candidate.voxelPos.y + 1, candidate.voxelPos.z + 1)
      );
      
      if (intersection && intersection.distance < closestDistance && intersection.distance <= maxDistance) {
        closestDistance = intersection.distance;
        closestHit = {
          hit: true,
          point: intersection.point,
          voxelPosition: candidate.voxelPos,
          face: intersection.face,
          normal: intersection.normal,
          adjacentPosition: this.calculateAdjacentPosition(candidate.voxelPos, intersection.face),
          blockType: candidate.voxelData.blockType,
          chunkCoords: candidate.voxelData.chunkCoords,
          localCoords: candidate.voxelData.localCoords,
          distance: intersection.distance
        };
      }
    }
    
    return closestHit;
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
   * Precise ray-box intersection using slab method
   * @param {Vector3} rayOrigin - Ray origin
   * @param {Vector3} rayDirection - Ray direction (normalized)
   * @param {Vector3} boxMin - Box minimum corner
   * @param {Vector3} boxMax - Box maximum corner
   * @returns {Object|null} Intersection result with point, face, normal, and distance
   */
  rayBoxIntersection(rayOrigin, rayDirection, boxMin, boxMax) {
    const epsilon = 1e-6;
    
    // Calculate intersection distances for each axis
    const tMin = new THREE.Vector3();
    const tMax = new THREE.Vector3();
    
    // X axis
    if (Math.abs(rayDirection.x) < epsilon) {
      if (rayOrigin.x < boxMin.x || rayOrigin.x > boxMax.x) return null;
      tMin.x = -Infinity;
      tMax.x = Infinity;
    } else {
      const invDirX = 1.0 / rayDirection.x;
      tMin.x = (boxMin.x - rayOrigin.x) * invDirX;
      tMax.x = (boxMax.x - rayOrigin.x) * invDirX;
      if (tMin.x > tMax.x) {
        const temp = tMin.x;
        tMin.x = tMax.x;
        tMax.x = temp;
      }
    }
    
    // Y axis
    if (Math.abs(rayDirection.y) < epsilon) {
      if (rayOrigin.y < boxMin.y || rayOrigin.y > boxMax.y) return null;
      tMin.y = -Infinity;
      tMax.y = Infinity;
    } else {
      const invDirY = 1.0 / rayDirection.y;
      tMin.y = (boxMin.y - rayOrigin.y) * invDirY;
      tMax.y = (boxMax.y - rayOrigin.y) * invDirY;
      if (tMin.y > tMax.y) {
        const temp = tMin.y;
        tMin.y = tMax.y;
        tMax.y = temp;
      }
    }
    
    // Z axis
    if (Math.abs(rayDirection.z) < epsilon) {
      if (rayOrigin.z < boxMin.z || rayOrigin.z > boxMax.z) return null;
      tMin.z = -Infinity;
      tMax.z = Infinity;
    } else {
      const invDirZ = 1.0 / rayDirection.z;
      tMin.z = (boxMin.z - rayOrigin.z) * invDirZ;
      tMax.z = (boxMax.z - rayOrigin.z) * invDirZ;
      if (tMin.z > tMax.z) {
        const temp = tMin.z;
        tMin.z = tMax.z;
        tMax.z = temp;
      }
    }
    
    // Find the intersection
    const tNear = Math.max(tMin.x, tMin.y, tMin.z);
    const tFar = Math.min(tMax.x, tMax.y, tMax.z);
    
    if (tNear > tFar || tFar < 0) return null;
    
    const t = tNear > 0 ? tNear : tFar;
    if (t < 0) return null;
    
    const hitPoint = rayOrigin.clone().addScaledVector(rayDirection, t);
    
    // Determine which face was hit
    let face, normal;
    const tolerance = 1e-4;
    
    if (Math.abs(tNear - tMin.x) < tolerance) {
      // Hit X face
      if (rayDirection.x > 0) {
        face = 'west';
        normal = new THREE.Vector3(-1, 0, 0);
      } else {
        face = 'east';
        normal = new THREE.Vector3(1, 0, 0);
      }
    } else if (Math.abs(tNear - tMin.y) < tolerance) {
      // Hit Y face
      if (rayDirection.y > 0) {
        face = 'bottom';
        normal = new THREE.Vector3(0, -1, 0);
      } else {
        face = 'top';
        normal = new THREE.Vector3(0, 1, 0);
      }
    } else if (Math.abs(tNear - tMin.z) < tolerance) {
      // Hit Z face
      if (rayDirection.z > 0) {
        face = 'north';
        normal = new THREE.Vector3(0, 0, -1);
      } else {
        face = 'south';
        normal = new THREE.Vector3(0, 0, 1);
      }
    } else {
      // Fallback - shouldn't happen with proper intersection
      face = 'unknown';
      normal = new THREE.Vector3(0, 1, 0);
    }
    
    return {
      point: hitPoint,
      face: face,
      normal: normal,
      distance: t
    };
  }

  /**
   * Calculate adjacent position based on face
   * @param {Vector3} voxelPos - Voxel position
   * @param {string} face - Face name
   * @returns {Vector3} Adjacent position
   */
  calculateAdjacentPosition(voxelPos, face) {
    switch (face) {
      case 'west':
        return new THREE.Vector3(voxelPos.x - 1, voxelPos.y, voxelPos.z);
      case 'east':
        return new THREE.Vector3(voxelPos.x + 1, voxelPos.y, voxelPos.z);
      case 'bottom':
        return new THREE.Vector3(voxelPos.x, voxelPos.y - 1, voxelPos.z);
      case 'top':
        return new THREE.Vector3(voxelPos.x, voxelPos.y + 1, voxelPos.z);
      case 'north':
        return new THREE.Vector3(voxelPos.x, voxelPos.y, voxelPos.z - 1);
      case 'south':
        return new THREE.Vector3(voxelPos.x, voxelPos.y, voxelPos.z + 1);
      default:
        return new THREE.Vector3(voxelPos.x, voxelPos.y + 1, voxelPos.z); // Default to top
    }
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
   * Calculate detailed hit information including face detection (legacy method for tests)
   * @param {Vector3} hitPoint - Ray hit point
   * @param {Vector3} rayDirection - Ray direction
   * @param {Vector3} voxelPos - Voxel position that was hit
   * @param {number} stepSize - Ray marching step size (unused in new implementation)
   * @returns {VoxelHitResult} Detailed hit result
   */
  calculateHitDetails(hitPoint, rayDirection, voxelPos, stepSize) {
    // Use the new precise ray-box intersection method
    const boxMin = new THREE.Vector3(voxelPos.x, voxelPos.y, voxelPos.z);
    const boxMax = new THREE.Vector3(voxelPos.x + 1, voxelPos.y + 1, voxelPos.z + 1);
    
    // Create a ray from a point slightly before the hit point
    const rayOrigin = hitPoint.clone().addScaledVector(rayDirection, -0.1);
    const intersection = this.rayBoxIntersection(rayOrigin, rayDirection, boxMin, boxMax);
    
    if (!intersection) {
      // Fallback to simple face detection based on ray direction
      const absDir = new THREE.Vector3(
        Math.abs(rayDirection.x),
        Math.abs(rayDirection.y),
        Math.abs(rayDirection.z)
      );
      
      let face, normal;
      if (absDir.y >= absDir.x && absDir.y >= absDir.z) {
        if (rayDirection.y < 0) {
          face = 'top';
          normal = new THREE.Vector3(0, 1, 0);
        } else {
          face = 'bottom';
          normal = new THREE.Vector3(0, -1, 0);
        }
      } else if (absDir.x >= absDir.z) {
        if (rayDirection.x > 0) {
          face = 'west';
          normal = new THREE.Vector3(-1, 0, 0);
        } else {
          face = 'east';
          normal = new THREE.Vector3(1, 0, 0);
        }
      } else {
        if (rayDirection.z > 0) {
          face = 'north';
          normal = new THREE.Vector3(0, 0, -1);
        } else {
          face = 'south';
          normal = new THREE.Vector3(0, 0, 1);
        }
      }
      
      intersection = { face, normal };
    }
    
    const adjacentPos = this.calculateAdjacentPosition(voxelPos, intersection.face);
    const voxelData = this.getVoxelAt(voxelPos);
    
    return {
      hit: true,
      point: hitPoint.clone(),
      voxelPosition: voxelPos.clone(),
      face: intersection.face,
      normal: intersection.normal,
      adjacentPosition: adjacentPos,
      blockType: voxelData ? voxelData.blockType : 0,
      chunkCoords: voxelData ? voxelData.chunkCoords : null,
      localCoords: voxelData ? voxelData.localCoords : null,
      distance: 0 // Will be set by calling function
    };
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