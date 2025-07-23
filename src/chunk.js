import * as THREE from 'three';
import { AmbientOcclusionCalculator } from './ambientOcclusionCalculator.js';
import { VertexColorManager } from './vertexColorManager.js';
import { DiagonalOptimizer } from './diagonalOptimizer.js';

export const CHUNK_WIDTH = 32;
export const CHUNK_HEIGHT = 256;
export const CHUNK_DEPTH = 32;
export const SEA_LEVEL = 64;

const blocks = [
  { type: 'AIR', color: [0, 0, 0, 0] },
  { type: 'STONE', color: [128, 128, 128, 255] },
  { type: 'DIRT', color: [139, 69, 19, 255] },
  { type: 'GRASS', color: [95, 159, 53, 255] },
  { type: 'WATER', color: [30, 144, 255, 200] },
  { type: 'SNOW', color: [255, 255, 255, 255] },
];

export class Chunk {
  constructor(chunkX, chunkZ, world = null) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.world = world;

    // Voxel data: 1 for solid, 0 for air
    this.voxels = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH);
    this.mesh = null;
    this.isGenerated = false; // Track if terrain generation is complete
    this.hasMesh = false; // Track if mesh with AO has been created
  }

  /** Helper to get/set voxel data using 3D coordinates */
  getVoxel(x, y, z) {
    const index = y * CHUNK_WIDTH * CHUNK_DEPTH + z * CHUNK_WIDTH + x;
    return this.voxels[index];
  }

  setVoxel(x, y, z, value) {
    const index = y * CHUNK_WIDTH * CHUNK_DEPTH + z * CHUNK_WIDTH + x;
    this.voxels[index] = value;
  }

  /** Generate terrain data using a noise function */
  generate(noise) {
    const octaves = 5;
    const persistence = 0.1; // Ultra-low persistence for maximum lowlands
    const lacunarity = 2.0;
    const scale = 500; // Largest scale for flattest terrain

    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let z = 0; z < CHUNK_DEPTH; z++) {
        const worldX = this.chunkX * CHUNK_WIDTH + x;
        const worldZ = this.chunkZ * CHUNK_DEPTH + z;

        // Multi-octave noise generation
        let amplitude = 1;
        let frequency = 1;
        let height = 0;

        for (let i = 0; i < octaves; i++) {
          const sampleX = (worldX / scale) * frequency;
          const sampleZ = (worldZ / scale) * frequency;
          const noiseValue = noise(sampleX, sampleZ);

          height += noiseValue * amplitude;
          amplitude *= persistence;
          frequency *= lacunarity;
        }

        // Normalize and scale height
        let originalHeight = Math.floor(height * 35) + 150;
        let newHeight;
        if (originalHeight < 120) {
          newHeight = (originalHeight - 115) * (48 / 5);
        } else if (originalHeight <= 180) {
          newHeight = 48 + (originalHeight - 120) * (160 / 60);
        } else {
          newHeight = 208 + (originalHeight - 180) * (48 / 5);
        }
        newHeight = Math.max(0, Math.min(255, Math.floor(newHeight)));
        height = newHeight;

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          if (y < height) {
            let blockType = 1; // STONE by default
            if (height > 190) { // Adjusted snow line up by 50 blocks
              if (y >= height - 3) {
                blockType = 5; // SNOW for top 3 layers
              } else if (y >= height - 4) {
                blockType = 2; // DIRT below snow
              }
            } else {
              if (y === height - 1) {
                blockType = 3; // GRASS
              } else if (y >= height - 4) {
                blockType = 2; // DIRT
              }
            }
            this.setVoxel(x, y, z, blockType);
          }
        }
      }
    }

    // Add water below sea level
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let z = 0; z < CHUNK_DEPTH; z++) {
        for (let y = SEA_LEVEL; y >= 0; y--) {
          if (this.getVoxel(x, y, z) === 0) { // AIR
            this.setVoxel(x, y, z, 4); // WATER
          }
        }
      }
    }
  }

  dispose() {
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
      this.mesh = null;
    }
  }

  /**
   * Check if all 4 direct neighbors (N, S, E, W) are loaded and generated
   * @returns {boolean} True if all neighbors are available for AO calculations
   */
  areNeighborsReady() {
    if (!this.world) return false;

    const neighbors = [
      [this.chunkX - 1, this.chunkZ], // West
      [this.chunkX + 1, this.chunkZ], // East
      [this.chunkX, this.chunkZ - 1], // North
      [this.chunkX, this.chunkZ + 1]  // South
    ];

    let readyCount = 0;
    for (const [x, z] of neighbors) {
      const key = `${x},${z}`;
      const neighbor = this.world.chunks[key];

      // Neighbor must exist, be generated, and not be pending
      if (neighbor && neighbor.isGenerated && !this.world.pendingChunks.has(key)) {
        readyCount++;
      }
    }

    // Debug logging for neighbor readiness (only for first few chunks to avoid spam)
    if (readyCount < 4 && Math.abs(this.chunkX) <= 2 && Math.abs(this.chunkZ) <= 2) {
      console.log(`Chunk (${this.chunkX}, ${this.chunkZ}) has ${readyCount}/4 neighbors ready`);
    }

    return readyCount === 4;
  }

  /** Create a mesh from the voxel data with per-voxel faces for Ambient Occlusion */
  createMesh(forceAO = false) {
    const positions = [];
    const normals = [];
    const uvs = [];
    const indices = [];
    const colors = [];   // for vertex colors with AO

    // Check if we should calculate AO or use basic lighting
    const shouldCalculateAO = forceAO || this.areNeighborsReady();

    // Debug logging (only for chunks near origin to avoid spam)
    if (Math.abs(this.chunkX) <= 2 && Math.abs(this.chunkZ) <= 2) {
      if (this.world && !shouldCalculateAO && !forceAO) {
        console.log(`Chunk (${this.chunkX}, ${this.chunkZ}) creating mesh without AO - neighbors not ready`);
      } else if (shouldCalculateAO) {
        console.log(`Chunk (${this.chunkX}, ${this.chunkZ}) creating mesh with AO`);
      }
    }

    // Initialize AO components only if we're calculating AO
    let aoCalculator, colorManager, diagonalOptimizer;
    if (shouldCalculateAO) {
      aoCalculator = new AmbientOcclusionCalculator();
      colorManager = new VertexColorManager();
      diagonalOptimizer = new DiagonalOptimizer();
    }

    // Face definitions with proper winding order (counter-clockwise when viewed from outside)
    // Each face includes a mapping from vertex index to AO corner index
    const faces = [
      // Positive X (East) - looking at face from outside (+X direction)
      {
        normal: [1, 0, 0],
        name: 'east',
        vertices: [
          [1, 0, 0], // vertex 0: bottom-left
          [1, 1, 0], // vertex 1: top-left  
          [1, 1, 1], // vertex 2: top-right
          [1, 0, 1]  // vertex 3: bottom-right
        ],
        // Map vertex index to AO corner index (AO expects: 0=top-left, 1=top-right, 2=bottom-right, 3=bottom-left)
        aoCornerMap: [3, 0, 1, 2] // vertex[0]->corner[3], vertex[1]->corner[0], vertex[2]->corner[1], vertex[3]->corner[2]
      },
      // Negative X (West) - looking at face from outside (-X direction)
      {
        normal: [-1, 0, 0],
        name: 'west',
        vertices: [
          [0, 0, 1], // vertex 0: bottom-left
          [0, 1, 1], // vertex 1: top-left
          [0, 1, 0], // vertex 2: top-right  
          [0, 0, 0]  // vertex 3: bottom-right
        ],
        aoCornerMap: [3, 0, 1, 2]
      },
      // Positive Y (Top) - looking at face from outside (+Y direction)
      {
        normal: [0, 1, 0],
        name: 'top',
        vertices: [
          [0, 1, 0], // vertex 0: (X-, Z-) -> AO corner 0 (northwest)
          [0, 1, 1], // vertex 1: (X-, Z+) -> AO corner 3 (southwest)  
          [1, 1, 1], // vertex 2: (X+, Z+) -> AO corner 2 (southeast)
          [1, 1, 0]  // vertex 3: (X+, Z-) -> AO corner 1 (northeast)
        ],
        aoCornerMap: [0, 3, 2, 1] // Map to correct AO corners for counter-clockwise winding
      },
      // Negative Y (Bottom) - looking at face from outside (-Y direction)
      {
        normal: [0, -1, 0],
        name: 'bottom',
        vertices: [
          [0, 0, 1], // vertex 0: (X-, Z+) -> AO corner 0 (southwest when looking up)
          [0, 0, 0], // vertex 1: (X-, Z-) -> AO corner 3 (northwest when looking up)
          [1, 0, 0], // vertex 2: (X+, Z-) -> AO corner 2 (northeast when looking up)
          [1, 0, 1]  // vertex 3: (X+, Z+) -> AO corner 1 (southeast when looking up)
        ],
        aoCornerMap: [0, 3, 2, 1] // Map to correct AO corners for counter-clockwise winding
      },
      // Positive Z (South) - looking at face from outside (+Z direction)
      {
        normal: [0, 0, 1],
        name: 'south',
        vertices: [
          [1, 0, 1], // vertex 0: bottom-left
          [1, 1, 1], // vertex 1: top-left
          [0, 1, 1], // vertex 2: top-right
          [0, 0, 1]  // vertex 3: bottom-right
        ],
        aoCornerMap: [3, 0, 1, 2]
      },
      // Negative Z (North) - looking at face from outside (-Z direction)
      {
        normal: [0, 0, -1],
        name: 'north',
        vertices: [
          [0, 0, 0], // vertex 0: bottom-left
          [0, 1, 0], // vertex 1: top-left
          [1, 1, 0], // vertex 2: top-right
          [1, 0, 0]  // vertex 3: bottom-right
        ],
        aoCornerMap: [3, 0, 1, 2]
      }
    ];

    // Iterate through each voxel
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let z = 0; z < CHUNK_DEPTH; z++) {
          const voxel = this.getVoxel(x, y, z);
          if (voxel === 0) continue; // Skip air blocks

          // Check each face of the voxel
          for (const face of faces) {
            // Calculate neighbor position
            const neighborX = x + face.normal[0];
            const neighborY = y + face.normal[1];
            const neighborZ = z + face.normal[2];

            // Check if neighbor is air or out of bounds (expose face)
            let neighborVoxel;
            if (shouldCalculateAO && this.world) {
              // When neighbors are ready, check across chunk boundaries
              const worldX = this.chunkX * CHUNK_WIDTH + neighborX;
              const worldY = neighborY;
              const worldZ = this.chunkZ * CHUNK_DEPTH + neighborZ;
              neighborVoxel = this.world.getVoxel(worldX, worldY, worldZ);
            } else {
              // Fallback to local chunk checking
              neighborVoxel = this.getVoxelSafe(neighborX, neighborY, neighborZ);
            }
            if (neighborVoxel !== 0) continue; // Face is hidden, skip

            // Generate face vertices
            const vertexCount = positions.length / 3;

            // Add vertex positions (offset by voxel position)
            for (const vertex of face.vertices) {
              positions.push(x + vertex[0], y + vertex[1], z + vertex[2]);
            }

            // Add normals (same for all vertices of the face)
            for (let i = 0; i < 4; i++) {
              normals.push(face.normal[0], face.normal[1], face.normal[2]);
            }

            // Add UVs (standard quad mapping)
            uvs.push(0, 0, 1, 0, 1, 1, 0, 1);

            // Calculate ambient occlusion or use basic lighting
            let aoValues = [1.0, 1.0, 1.0, 1.0]; // Default to full light

            if (shouldCalculateAO) {
              // Calculate AO for each vertex using the corner mapping
              aoValues = [];
              for (let vertexIdx = 0; vertexIdx < 4; vertexIdx++) {
                try {
                  // Map vertex index to AO corner index
                  const aoCornerIdx = face.aoCornerMap[vertexIdx];
                  const aoValue = aoCalculator.calculateVertexAO(
                    this, x, y, z, face.name, aoCornerIdx
                  );
                  aoValues.push(aoValue);
                } catch (error) {
                  // Fallback to full light if AO calculation fails
                  aoValues.push(1.0);
                }
              }
            }

            // Get base block color
            const blockColor = blocks[voxel].color;
            const baseR = blockColor[0] / 255;
            const baseG = blockColor[1] / 255;
            const baseB = blockColor[2] / 255;

            // Apply AO to vertex colors
            if (shouldCalculateAO) {
              for (let aoIdx = 0; aoIdx < 4; aoIdx++) {
                const aoColor = colorManager.aoToColor(aoValues[aoIdx]);
                // Multiply base color by AO factor
                colors.push(baseR * aoColor.r, baseG * aoColor.g, baseB * aoColor.b);
              }
            } else {
              // Use basic lighting without AO
              for (let aoIdx = 0; aoIdx < 4; aoIdx++) {
                colors.push(baseR, baseG, baseB);
              }
            }

            // Generate triangle indices with diagonal optimization
            const useACDiagonal = shouldCalculateAO ?
              diagonalOptimizer.chooseOptimalDiagonal(aoValues) :
              false; // Use default diagonal when no AO

            if (useACDiagonal) {
              // Use diagonal from vertex 0 to vertex 2 (A-C diagonal)
              indices.push(vertexCount, vertexCount + 1, vertexCount + 2);
              indices.push(vertexCount, vertexCount + 2, vertexCount + 3);
            } else {
              // Use diagonal from vertex 1 to vertex 3 (B-D diagonal)
              indices.push(vertexCount, vertexCount + 1, vertexCount + 3);
              indices.push(vertexCount + 1, vertexCount + 2, vertexCount + 3);
            }
          }
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.hasMesh = true;
    return this.mesh;
  }

  /**
   * Safely get voxel value, returning 0 (air) for out-of-bounds coordinates
   * @param {number} x - X coordinate
   * @param {number} y - Y coordinate
   * @param {number} z - Z coordinate
   * @returns {number} Voxel value or 0 if out of bounds
   */
  getVoxelSafe(x, y, z) {
    if (x < 0 || x >= CHUNK_WIDTH ||
      y < 0 || y >= CHUNK_HEIGHT ||
      z < 0 || z >= CHUNK_DEPTH) {
      return 0; // Air
    }
    return this.getVoxel(x, y, z);
  }


}
