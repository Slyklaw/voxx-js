/**
 * Chunk implementation
 */

import { getBlockColor, BLOCK_TYPES, BLOCKS, getBlockAtlasPositions } from './blocks.js';
import { BIOMES, BIOME_CONFIG, generateBiomeHeight, getBiomeBlockType, SEA_LEVEL } from './biomes.js';
import { DEBUG } from './config.js';
// generateMeshData() returns plain arrays compatible with src/gl/buffers.js

// Chunk constants
export const CHUNK_WIDTH = 32;
export const CHUNK_HEIGHT = 256;
export const CHUNK_DEPTH = 32;

export class Chunk {
  constructor(chunkX, chunkZ) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;

    // Voxel data
    this.voxels = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH);

    // Mesh generation state
    this.needsUpdate = true;
    this.hasVoxelData = false;
    this.meshReady = false; // Track when mesh is ready for rendering
    this.neighborChunks = {
      north: null,  // z - 1
      south: null,  // z + 1
      east: null,   // x + 1
      west: null    // x - 1
    };
  }

  getVoxel(x, y, z) {
    if (x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_DEPTH) {
      return 0;
    }
    const index = y * CHUNK_WIDTH * CHUNK_DEPTH + z * CHUNK_WIDTH + x;
    return this.voxels[index];
  }

  setVoxel(x, y, z, value) {
    if (x < 0 || x >= CHUNK_WIDTH || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_DEPTH) {
      return;
    }
    const index = y * CHUNK_WIDTH * CHUNK_DEPTH + z * CHUNK_WIDTH + x;
    this.voxels[index] = value;
    this.needsUpdate = true;
  }

  // Get voxel with neighbor chunk support
  getVoxelWithNeighbors(x, y, z) {
    // If within this chunk, return directly
    if (x >= 0 && x < CHUNK_WIDTH && y >= 0 && y < CHUNK_HEIGHT && z >= 0 && z < CHUNK_DEPTH) {
      return this.getVoxel(x, y, z);
    }

    // Check neighboring chunks
    if (x < 0 && this.neighborChunks.west) {
      return this.neighborChunks.west.getVoxel(CHUNK_WIDTH + x, y, z);
    }
    if (x >= CHUNK_WIDTH && this.neighborChunks.east) {
      return this.neighborChunks.east.getVoxel(x - CHUNK_WIDTH, y, z);
    }
    if (z < 0 && this.neighborChunks.north) {
      return this.neighborChunks.north.getVoxel(x, y, CHUNK_DEPTH + z);
    }
    if (z >= CHUNK_DEPTH && this.neighborChunks.south) {
      return this.neighborChunks.south.getVoxel(x, y, z - CHUNK_DEPTH);
    }

    // Default to air if neighbor not available
    return 0;
  }

  // Check if all required neighbors are available for mesh generation
  canGenerateMesh() {
    return this.hasVoxelData &&
      this.neighborChunks.north && this.neighborChunks.north.hasVoxelData &&
      this.neighborChunks.south && this.neighborChunks.south.hasVoxelData &&
      this.neighborChunks.east && this.neighborChunks.east.hasVoxelData &&
      this.neighborChunks.west && this.neighborChunks.west.hasVoxelData;
  }

  // Set neighbor chunk references
  setNeighbors(north, south, east, west) {
    this.neighborChunks.north = north;
    this.neighborChunks.south = south;
    this.neighborChunks.east = east;
    this.neighborChunks.west = west;
  }

  /** Generate terrain data using biome-based noise functions */
  generate(heightNoise, biomeNoise) {
    const biomeList = Object.values(BIOMES);

    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let z = 0; z < CHUNK_DEPTH; z++) {
        const worldX = this.chunkX * CHUNK_WIDTH + x;
        const worldZ = this.chunkZ * CHUNK_DEPTH + z;

        // Sample biome noise to determine biome blend
        const biomeValue = biomeNoise(worldX / BIOME_CONFIG.BIOME_SCALE, worldZ / BIOME_CONFIG.BIOME_SCALE);
        const normalizedBiome = (biomeValue + 1) * 0.5; // Convert from [-1,1] to [0,1]

        // Determine primary and secondary biomes for blending
        const biomeIndex = normalizedBiome * (biomeList.length - 0.001); // Slight offset to avoid edge case
        const primaryBiomeIdx = Math.floor(biomeIndex);
        const secondaryBiomeIdx = Math.min(primaryBiomeIdx + 1, biomeList.length - 1);
        const blendFactor = biomeIndex - primaryBiomeIdx;

        const primaryBiome = biomeList[primaryBiomeIdx];
        const secondaryBiome = biomeList[secondaryBiomeIdx];

        // Generate height for each biome
        const primaryHeight = generateBiomeHeight(worldX, worldZ, primaryBiome, heightNoise);
        const secondaryHeight = generateBiomeHeight(worldX, worldZ, secondaryBiome, heightNoise);

        // Blend heights between biomes
        const finalHeight = Math.floor(primaryHeight * (1 - blendFactor) + secondaryHeight * blendFactor);
        const clampedHeight = Math.max(0, Math.min(CHUNK_HEIGHT - 1, finalHeight));

        // Determine which biome is dominant for block type selection
        const dominantBiome = blendFactor < 0.5 ? primaryBiome : secondaryBiome;

        // Generate terrain blocks
        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          if (y < clampedHeight) {
            const blockType = getBiomeBlockType(y, clampedHeight, dominantBiome);
            this.setVoxel(x, y, z, blockType);
          }
        }
      }
    }

    // Add water below sea level
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let z = 0; z < CHUNK_DEPTH; z++) {
        for (let y = SEA_LEVEL; y >= 0; y--) {
          if (this.getVoxel(x, y, z) === BLOCK_TYPES.AIR) {
            this.setVoxel(x, y, z, BLOCK_TYPES.WATER);
          }
        }
      }
    }

    // Mark that this chunk has voxel data
    this.hasVoxelData = true;
  }

  generateMeshData() {
    const positions = [];
    const normals = [];
    const colors = [];
    const uvs = [];
    const tileBase = [];  // Tile base UV coordinates for atlas wrapping
    const indices = [];
    const blockTypes = [];
    const triangleVariant = [];  // Per-vertex triangle identifier for debug mode

    const dims = [CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH];
    
    // UV coordinate logging - first 20 faces only
    let uvLogCount = 0;
    const UV_LOG_MAX = 20;

    // Greedy meshing algorithm
    for (let d = 0; d < 3; d++) {
      const u = (d + 1) % 3;
      const v = (d + 2) % 3;

      const x = [0, 0, 0];
      const q = [0, 0, 0];
      q[d] = 1;

      const mask = new Int32Array(dims[u] * dims[v]);

      for (x[d] = -1; x[d] < dims[d];) {
        let n = 0;
        for (x[v] = 0; x[v] < dims[v]; x[v]++) {
          for (x[u] = 0; x[u] < dims[u]; x[u]++) {
            const val1 = this.getVoxelWithNeighbors(x[0], x[1], x[2]);
            const val2 = this.getVoxelWithNeighbors(x[0] + q[0], x[1] + q[1], x[2] + q[2]);
            mask[n++] = (val1 && !val2) ? val1 : (!val1 && val2) ? -val2 : 0;
          }
        }

        x[d]++;
        n = 0;

        for (let j = 0; j < dims[v]; j++) {
          for (let i = 0; i < dims[u];) {
            if (mask[n]) {
              const val = mask[n];

              // Find width
              let w = 1;
              while (i + w < dims[u] && mask[n + w] === val) {
                w++;
              }

              // Find height
              let h = 1;
              while (j + h < dims[v]) {
                let k = 0;
                while (k < w && mask[n + k + h * dims[u]] === val) {
                  k++;
                }
                if (k < w) break;
                h++;
              }

              x[u] = i;
              x[v] = j;

              const du = [0, 0, 0]; du[u] = w;
              const dv = [0, 0, 0]; dv[v] = h;

              const vertexCount = positions.length / 3;

              // Create quad vertices with world positioning
              const worldOffsetX = this.chunkX * CHUNK_WIDTH;
              const worldOffsetZ = this.chunkZ * CHUNK_DEPTH;

              const v1 = [x[0] + worldOffsetX, x[1], x[2] + worldOffsetZ];
              const v2 = [x[0] + du[0] + worldOffsetX, x[1] + du[1], x[2] + du[2] + worldOffsetZ];
              const v3 = [x[0] + dv[0] + worldOffsetX, x[1] + dv[1], x[2] + dv[2] + worldOffsetZ];
              const v4 = [x[0] + du[0] + dv[0] + worldOffsetX, x[1] + du[1] + dv[1], x[2] + du[2] + dv[2] + worldOffsetZ];

              positions.push(...v1, ...v2, ...v3, ...v4);

              // Calculate normal
              const normal = [0, 0, 0];
              if (val > 0) { normal[d] = 1; } else { normal[d] = -1; }
              normals.push(...normal, ...normal, ...normal, ...normal);

              // Get block color and type
              const blockIndex = Math.abs(val);
              const blockColor = getBlockColor(blockIndex);
              for (let i = 0; i < 4; i++) {
                colors.push(blockColor.r, blockColor.g, blockColor.b);
                blockTypes.push(blockIndex); // Store block type for each vertex
              }

              // Add UV coordinates for texture mapping
              if (blockIndex !== BLOCK_TYPES.AIR) {
                // Get atlas position based on face direction (normal)
                const block = BLOCKS[blockIndex];
                let atlasX, atlasY;
                
                // Determine face type from normal direction
                if (normal[1] > 0) {
                  // Top face
                  atlasX = block.atlasPos.top[0];
                  atlasY = block.atlasPos.top[1];
                } else if (normal[1] < 0) {
                  // Bottom face
                  atlasX = block.atlasPos.bottom[0];
                  atlasY = block.atlasPos.bottom[1];
                } else {
                  // Side face
                  atlasX = block.atlasPos.sides[0];
                  atlasY = block.atlasPos.sides[1];
                }
                
                // Convert pixel position to normalized UV coordinates
                // Atlas is 1024x512, each tile is 16x16 pixels
                const ATLAS_WIDTH = 1024;
                const ATLAS_HEIGHT = 512;
                const TILE_SIZE = 16;
                
                // Calculate UV bounds for a SINGLE tile
                const tileU0 = atlasX / ATLAS_WIDTH;
                const tileV0 = atlasY / ATLAS_HEIGHT;
                const tileU1 = (atlasX + TILE_SIZE) / ATLAS_WIDTH;
                const tileV1 = (atlasY + TILE_SIZE) / ATLAS_HEIGHT;
                
                // Tile span in UV space
                const tileSpanU = tileU1 - tileU0;
                const tileSpanV = tileV1 - tileV0;
                
                // Scale UVs by face dimensions for tiling
                // Left edge: UV = tileU0, Right edge: UV = tileU0 + w * tileSpanU
                // Bottom edge: UV = tileV0, Top edge: UV = tileV0 + h * tileSpanV
                const scaledU0 = tileU0;
                const scaledV0 = tileV0;
                const scaledU1 = tileU0 + w * tileSpanU;
                const scaledV1 = tileV0 + h * tileSpanV;
                
                // Push scaled UVs (will be wrapped in shader)
                // UVs are in tile units; shader handles X-face rotation
                uvs.push(
                  scaledU0, scaledV0,  // v1 - bottom-left
                  scaledU1, scaledV0,  // v2 - bottom-right
                  scaledU0, scaledV1,  // v3 - top-left
                  scaledU1, scaledV1   // v4 - top-right
                );
                
                // Push tile base coordinates (same for all 4 vertices)
                tileBase.push(
                  tileU0, tileV0,
                  tileU0, tileV0,
                  tileU0, tileV0,
                  tileU0, tileV0
                );

                if (DEBUG && uvLogCount < UV_LOG_MAX) {
                  const blockName = Object.keys(BLOCK_TYPES).find(k => BLOCK_TYPES[k] === blockIndex) || 'UNKNOWN';
                  const faceDir = normal[1] > 0 ? 'top' : (normal[1] < 0 ? 'bottom' : 'side');
                  console.log(`[Texture] ${blockName} ${faceDir}: atlas=[${atlasX},${atlasY}], size=${w}x${h}, UV=[${scaledU0.toFixed(4)},${scaledV0.toFixed(4)}]-[${scaledU1.toFixed(4)},${scaledV1.toFixed(4)}]`);
                  uvLogCount++;
                  if (uvLogCount === UV_LOG_MAX) {
                    console.log(`[Texture] UV logging limited to first ${UV_LOG_MAX} faces`);
                  }
                }

              } else {
                // Default values for AIR blocks
                uvs.push(0, 0, 1, 0, 0, 1, 1, 1);
                tileBase.push(0, 0, 0, 0, 0, 0, 0, 0);
              }

              // Add triangle variant for debug mode (triangle 1 = 0.0, triangle 2 = 1.0)
              // Each quad creates two triangles: (v1,v2,v3) and (v2,v4,v3)
              // v1=0.0, v2=0.0, v3=0.0 for triangle 1 → all interpolate to 0.0
              // v2=1.0, v4=1.0, v3=1.0 for triangle 2 → all interpolate to 1.0
              if (val > 0) {
                triangleVariant.push(0.0, 0.0, 0.0, 1.0);  // v1,v2,v3 get 0.0; v4 gets 1.0
              } else {
                triangleVariant.push(1.0, 1.0, 1.0, 0.0);  // v1,v2,v3 get 1.0; v4 gets 0.0
              }

              // Create indices for two triangles
              if (val > 0) {
                indices.push(vertexCount, vertexCount + 1, vertexCount + 2);
                indices.push(vertexCount + 1, vertexCount + 3, vertexCount + 2);
              } else {
                indices.push(vertexCount, vertexCount + 2, vertexCount + 1);
                indices.push(vertexCount + 2, vertexCount + 3, vertexCount + 1);
              }

              // Clear mask
              for (let l = 0; l < h; ++l) {
                for (let k = 0; k < w; ++k) {
                  mask[n + k + l * dims[u]] = 0;
                }
              }
              i += w;
              n += w;
            } else {
              i++;
              n++;
            }
          }
        }
      }
    }

    // Log UV coordinate range for this chunk mesh
    if (uvs.length > 0) {
      let minU = Infinity, maxU = -Infinity;
      let minV = Infinity, maxV = -Infinity;
      for (let i = 0; i < uvs.length; i += 2) {
        minU = Math.min(minU, uvs[i]);
        maxU = Math.max(maxU, uvs[i]);
        minV = Math.min(minV, uvs[i + 1]);
        maxV = Math.max(maxV, uvs[i + 1]);
      }
      // Chunk UV range logging (temporarily enabled for debugging)
      // console.log(`[Texture] Chunk (${this.chunkX},${this.chunkZ}) UV range: U[${minU.toFixed(1)},${maxU.toFixed(1)}] V[${minV.toFixed(1)},${maxV.toFixed(1)}], faces: ${indices.length / 6}`);
    }

    return {
      positions: new Float32Array(positions),
      normals: new Float32Array(normals),
      colors: new Float32Array(colors),
      uvs: new Float32Array(uvs),
      tileBase: new Float32Array(tileBase),
      indices: new Uint32Array(indices),
      blockTypes: new Float32Array(blockTypes),
      triangleVariant: new Float32Array(triangleVariant)
    };
  }

  updateMesh(forceUpdate = false) {
    if (!this.needsUpdate && !forceUpdate) return;

    // Only generate mesh if we have all required neighbors, unless forced
    if (!forceUpdate && !this.canGenerateMesh()) {
      return;
    }

    const meshData = this.generateMeshData();
    this.meshData = meshData;
    this.meshReady = true;
    this.needsUpdate = false;
  }

  // Store mesh data for WebGL rendering (src/gl/buffers.js handles actual GL buffers)
  _createMeshFromData(meshData) {
    this.meshData = meshData;
    this.needsUpdate = false;
  }

  _updateMeshInPlace(meshData) {
    this.meshData = meshData;
    this.needsUpdate = false;
  }

  /**
   * Build mesh from worker-provided mesh payload (WebGL2 compatible)
   * meshData: { positions: Float32Array, normals: Float32Array, colors: Float32Array, indices: Uint32Array }
   */
  fromWorkerMesh(meshData) {
    // console.log(`[Chunk] fromWorkerMesh for ${this.chunkX},${this.chunkZ}:`, {
    //   hasPositions: !!meshData?.positions,
    //   positionLength: meshData?.positions?.length,
    //   hasColors: !!meshData?.colors,
    //   hasNormals: !!meshData?.normals,
    //   hasIndices: !!meshData?.indices
    // });
    this.hasVoxelData = true;
    this.meshData = meshData;
    this._createMeshFromData(meshData);
    this.meshReady = true;
    this.needsUpdate = false;
  }

  dispose() {
    // Cleanup - mesh handled by src/gl/buffers.js
    this.meshData = null;
    this.meshReady = false;
  }
}
