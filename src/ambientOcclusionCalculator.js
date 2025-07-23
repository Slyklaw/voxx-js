/**
 * AmbientOcclusionCalculator - Core system for calculating vertex-based ambient occlusion
 * 
 * This class implements the vertex-based ambient occlusion technique where each vertex
 * of a voxel face is assigned a light or shadow value based on the occupancy of its
 * three adjacent neighboring voxels.
 */
export class AmbientOcclusionCalculator {
  constructor() {
    // Face direction vectors for normal calculation
    this.faceDirections = {
      'top': { normal: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] },
      'bottom': { normal: [0, -1, 0], u: [1, 0, 0], v: [0, 0, -1] },
      'north': { normal: [0, 0, -1], u: [1, 0, 0], v: [0, 1, 0] },
      'south': { normal: [0, 0, 1], u: [-1, 0, 0], v: [0, 1, 0] },
      'east': { normal: [1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
      'west': { normal: [-1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] }
    };

    // Corner offsets for each face (clockwise from top-left when viewed from outside)
    this.cornerOffsets = {
      'top': [
        [-0.5, 0, -0.5], // corner 0: top-left
        [0.5, 0, -0.5],  // corner 1: top-right
        [0.5, 0, 0.5],   // corner 2: bottom-right
        [-0.5, 0, 0.5]   // corner 3: bottom-left
      ],
      'bottom': [
        [-0.5, 0, 0.5],  // corner 0: top-left (when viewed from below)
        [0.5, 0, 0.5],   // corner 1: top-right
        [0.5, 0, -0.5],  // corner 2: bottom-right
        [-0.5, 0, -0.5]  // corner 3: bottom-left
      ],
      'north': [
        [-0.5, 0.5, 0],  // corner 0: top-left
        [0.5, 0.5, 0],   // corner 1: top-right
        [0.5, -0.5, 0],  // corner 2: bottom-right
        [-0.5, -0.5, 0]  // corner 3: bottom-left
      ],
      'south': [
        [0.5, 0.5, 0],   // corner 0: top-left
        [-0.5, 0.5, 0],  // corner 1: top-right
        [-0.5, -0.5, 0], // corner 2: bottom-right
        [0.5, -0.5, 0]   // corner 3: bottom-left
      ],
      'east': [
        [0, 0.5, -0.5],  // corner 0: top-left
        [0, 0.5, 0.5],   // corner 1: top-right
        [0, -0.5, 0.5],  // corner 2: bottom-right
        [0, -0.5, -0.5]  // corner 3: bottom-left
      ],
      'west': [
        [0, 0.5, 0.5],   // corner 0: top-left
        [0, 0.5, -0.5],  // corner 1: top-right
        [0, -0.5, -0.5], // corner 2: bottom-right
        [0, -0.5, 0.5]   // corner 3: bottom-left
      ]
    };
  }

  /**
   * Calculate ambient occlusion for a face vertex
   * @param {Chunk} chunk - The chunk containing the voxel
   * @param {number} x - Voxel X coordinate
   * @param {number} y - Voxel Y coordinate  
   * @param {number} z - Voxel Z coordinate
   * @param {string} face - Face direction ('top', 'bottom', 'north', 'south', 'east', 'west')
   * @param {number} cornerIndex - Corner index (0-3) for the face
   * @returns {number} Ambient occlusion value (0 = full shadow, 1 = full light)
   */
  calculateVertexAO(chunk, x, y, z, face, cornerIndex) {
    if (!this.faceDirections[face]) {
      throw new Error(`Invalid face direction: ${face}`);
    }

    if (cornerIndex < 0 || cornerIndex > 3) {
      throw new Error(`Invalid corner index: ${cornerIndex}. Must be 0-3.`);
    }

    // Check if this vertex is near a chunk boundary and needs consistent calculation
    const CHUNK_WIDTH = 32;
    const CHUNK_DEPTH = 32;
    const isNearBoundary = (x <= 1 || x >= CHUNK_WIDTH - 2 || z <= 1 || z >= CHUNK_DEPTH - 2);
    
    if (isNearBoundary && chunk.world) {
      // Use world-space consistent AO calculation for boundary vertices
      return this.calculateBoundaryVertexAO(chunk, x, y, z, face, cornerIndex);
    }

    // Get the three neighboring voxel positions for this vertex
    const neighbors = this.getVertexNeighbors(x, y, z, face, cornerIndex);
    
    // Count solid neighbors (each solid neighbor contributes to occlusion)
    let solidCount = 0;
    for (const neighbor of neighbors) {
      if (this.isVoxelSolid(chunk, neighbor.x, neighbor.y, neighbor.z)) {
        solidCount++;
      }
    }

    // Convert solid count to AO value
    // 0 solid neighbors = full light (1.0)
    // 1 solid neighbor = slight shadow (0.75)
    // 2 solid neighbors = medium shadow (0.5)
    // 3 solid neighbors = full shadow (0.25)
    const aoValues = [1.0, 0.75, 0.5, 0.25];
    return aoValues[solidCount];
  }

  /**
   * Calculate AO for vertices near chunk boundaries using world-space coordinates
   * This ensures consistent AO values for vertices at the same world position
   * @param {Chunk} chunk - The chunk containing the voxel
   * @param {number} x - Voxel X coordinate (local to chunk)
   * @param {number} y - Voxel Y coordinate
   * @param {number} z - Voxel Z coordinate (local to chunk)
   * @param {string} face - Face direction
   * @param {number} cornerIndex - Corner index (0-3)
   * @returns {number} Ambient occlusion value
   */
  calculateBoundaryVertexAO(chunk, x, y, z, face, cornerIndex) {
    const CHUNK_WIDTH = 32;
    const CHUNK_DEPTH = 32;
    
    // Convert to world coordinates
    const worldX = chunk.chunkX * CHUNK_WIDTH + x;
    const worldZ = chunk.chunkZ * CHUNK_DEPTH + z;
    
    // Get neighbors in local coordinates
    const localNeighbors = this.getVertexNeighbors(x, y, z, face, cornerIndex);
    
    // Convert neighbors to world coordinates and check using world.getVoxel
    let solidCount = 0;
    for (const neighbor of localNeighbors) {
      const neighborWorldX = chunk.chunkX * CHUNK_WIDTH + neighbor.x;
      const neighborWorldZ = chunk.chunkZ * CHUNK_DEPTH + neighbor.z;
      
      // Use world lookup for consistency
      const voxelValue = chunk.world.getVoxel(neighborWorldX, neighbor.y, neighborWorldZ);
      if (voxelValue > 0) {
        solidCount++;
      }
    }
    
    // Convert solid count to AO value
    const aoValues = [1.0, 0.75, 0.5, 0.25];
    return aoValues[solidCount];
  }

  /**
   * Get the three neighboring voxel positions for a vertex
   * @param {number} x - Base voxel X coordinate
   * @param {number} y - Base voxel Y coordinate
   * @param {number} z - Base voxel Z coordinate
   * @param {string} face - Face direction
   * @param {number} cornerIndex - Corner index (0-3)
   * @returns {Array<{x: number, y: number, z: number}>} Array of three neighbor positions
   */
  getVertexNeighbors(x, y, z, face, cornerIndex) {
    if (!this.faceDirections[face]) {
      throw new Error(`Invalid face direction: ${face}`);
    }

    if (cornerIndex < 0 || cornerIndex > 3) {
      throw new Error(`Invalid corner index: ${cornerIndex}. Must be 0-3.`);
    }

    // For vertex-based AO, we need to check the 3 voxels that meet at each vertex corner
    // This is based on the standard vertex AO algorithm used in voxel engines
    
    const neighbors = [];
    
    // Define neighbor offsets for each face and corner combination
    // These represent the 3 voxels that influence each vertex corner
    // For each face, we check voxels adjacent to that face surface
    const neighborMaps = {
      'top': [
        // Corner 0 (top-left): check west-above, north-above, and northwest-above
        [{ x: -1, y: 1, z: 0 }, { x: 0, y: 1, z: -1 }, { x: -1, y: 1, z: -1 }],
        // Corner 1 (top-right): check east-above, north-above, and northeast-above  
        [{ x: 1, y: 1, z: 0 }, { x: 0, y: 1, z: -1 }, { x: 1, y: 1, z: -1 }],
        // Corner 2 (bottom-right): check east-above, south-above, and southeast-above
        [{ x: 1, y: 1, z: 0 }, { x: 0, y: 1, z: 1 }, { x: 1, y: 1, z: 1 }],
        // Corner 3 (bottom-left): check west-above, south-above, and southwest-above
        [{ x: -1, y: 1, z: 0 }, { x: 0, y: 1, z: 1 }, { x: -1, y: 1, z: 1 }]
      ],
      'bottom': [
        // Corner 0: check west-below, south-below, and southwest-below
        [{ x: -1, y: -1, z: 0 }, { x: 0, y: -1, z: 1 }, { x: -1, y: -1, z: 1 }],
        // Corner 1: check east-below, south-below, and southeast-below
        [{ x: 1, y: -1, z: 0 }, { x: 0, y: -1, z: 1 }, { x: 1, y: -1, z: 1 }],
        // Corner 2: check east-below, north-below, and northeast-below
        [{ x: 1, y: -1, z: 0 }, { x: 0, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }],
        // Corner 3: check west-below, north-below, and northwest-below
        [{ x: -1, y: -1, z: 0 }, { x: 0, y: -1, z: -1 }, { x: -1, y: -1, z: -1 }]
      ],
      'north': [
        // Corner 0: check west-north, up-north, and west-up-north
        [{ x: -1, y: 0, z: -1 }, { x: 0, y: 1, z: -1 }, { x: -1, y: 1, z: -1 }],
        // Corner 1: check east-north, up-north, and east-up-north
        [{ x: 1, y: 0, z: -1 }, { x: 0, y: 1, z: -1 }, { x: 1, y: 1, z: -1 }],
        // Corner 2: check east-north, down-north, and east-down-north
        [{ x: 1, y: 0, z: -1 }, { x: 0, y: -1, z: -1 }, { x: 1, y: -1, z: -1 }],
        // Corner 3: check west-north, down-north, and west-down-north
        [{ x: -1, y: 0, z: -1 }, { x: 0, y: -1, z: -1 }, { x: -1, y: -1, z: -1 }]
      ],
      'south': [
        // Corner 0: check east-south, up-south, and east-up-south
        [{ x: 1, y: 0, z: 1 }, { x: 0, y: 1, z: 1 }, { x: 1, y: 1, z: 1 }],
        // Corner 1: check west-south, up-south, and west-up-south
        [{ x: -1, y: 0, z: 1 }, { x: 0, y: 1, z: 1 }, { x: -1, y: 1, z: 1 }],
        // Corner 2: check west-south, down-south, and west-down-south
        [{ x: -1, y: 0, z: 1 }, { x: 0, y: -1, z: 1 }, { x: -1, y: -1, z: 1 }],
        // Corner 3: check east-south, down-south, and east-down-south
        [{ x: 1, y: 0, z: 1 }, { x: 0, y: -1, z: 1 }, { x: 1, y: -1, z: 1 }]
      ],
      'east': [
        // Corner 0: check north-east, up-east, and north-up-east
        [{ x: 1, y: 0, z: -1 }, { x: 1, y: 1, z: 0 }, { x: 1, y: 1, z: -1 }],
        // Corner 1: check south-east, up-east, and south-up-east
        [{ x: 1, y: 0, z: 1 }, { x: 1, y: 1, z: 0 }, { x: 1, y: 1, z: 1 }],
        // Corner 2: check south-east, down-east, and south-down-east
        [{ x: 1, y: 0, z: 1 }, { x: 1, y: -1, z: 0 }, { x: 1, y: -1, z: 1 }],
        // Corner 3: check north-east, down-east, and north-down-east
        [{ x: 1, y: 0, z: -1 }, { x: 1, y: -1, z: 0 }, { x: 1, y: -1, z: -1 }]
      ],
      'west': [
        // Corner 0: check south-west, up-west, and south-up-west
        [{ x: -1, y: 0, z: 1 }, { x: -1, y: 1, z: 0 }, { x: -1, y: 1, z: 1 }],
        // Corner 1: check north-west, up-west, and north-up-west
        [{ x: -1, y: 0, z: -1 }, { x: -1, y: 1, z: 0 }, { x: -1, y: 1, z: -1 }],
        // Corner 2: check north-west, down-west, and north-down-west
        [{ x: -1, y: 0, z: -1 }, { x: -1, y: -1, z: 0 }, { x: -1, y: -1, z: -1 }],
        // Corner 3: check south-west, down-west, and south-down-west
        [{ x: -1, y: 0, z: 1 }, { x: -1, y: -1, z: 0 }, { x: -1, y: -1, z: 1 }]
      ]
    };

    const offsets = neighborMaps[face][cornerIndex];
    
    for (const offset of offsets) {
      neighbors.push({
        x: x + offset.x,
        y: y + offset.y,
        z: z + offset.z
      });
    }

    return neighbors;
  }

  /**
   * Check if a voxel position is solid (contributes to occlusion)
   * @param {Chunk} chunk - The chunk to check
   * @param {number} x - Voxel X coordinate (local to chunk)
   * @param {number} y - Voxel Y coordinate
   * @param {number} z - Voxel Z coordinate (local to chunk)
   * @returns {boolean} True if voxel is solid, false if air or out of bounds
   */
  isVoxelSolid(chunk, x, y, z) {
    // Import chunk constants
    const CHUNK_WIDTH = 32;
    const CHUNK_HEIGHT = 256;
    const CHUNK_DEPTH = 32;
    
    // Handle vertical boundaries (Y) first - these don't require cross-chunk lookups
    if (y < 0 || y >= CHUNK_HEIGHT) {
      // Out of vertical bounds - treat as air for consistency with chunk.getVoxel behavior
      return false;
    }
    
    // Check if coordinates are within current chunk bounds
    if (x >= 0 && x < CHUNK_WIDTH && z >= 0 && z < CHUNK_DEPTH) {
      // Within current chunk - use direct lookup
      const voxelValue = chunk.getVoxel(x, y, z);
      return voxelValue > 0;
    }
    
    // Coordinates are outside current chunk - need cross-chunk lookup
    if (chunk.world && typeof chunk.world.getVoxel === 'function') {
      // Calculate world coordinates
      const worldX = chunk.chunkX * CHUNK_WIDTH + x;
      const worldZ = chunk.chunkZ * CHUNK_DEPTH + z;
      
      // Use world's getVoxel method for cross-chunk lookup
      const voxelValue = chunk.world.getVoxel(worldX, y, worldZ);
      return voxelValue > 0;
    } else {
      // No world reference available - treat out-of-bounds as air
      // This is the safest fallback that prevents incorrect AO calculations
      return false;
    }
  }
}