/**
 * BlockEditor - Handles block placement and destruction with shared mesh update logic
 * Manages raycasting, block editing operations, and WebGL mesh synchronization.
 */

import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from '../constants.js';
import { DEBUG } from '../../config.js';
import { createChunkMeshFromData } from '../gl/buffers.js';

export class BlockEditor {
  constructor(world, gl, chunkMeshes, voxelAttribs) {
    this.world = world;
    this.gl = gl;
    this.chunkMeshes = chunkMeshes;
    this.voxelAttribs = voxelAttribs;
    this.targetedBlock = null;
    this.selectedBlockType = 1;
  }
  
  /**
   * Raycast to find block at cursor position using DDA algorithm
   */
  raycastBlock(origin, direction, maxDistance = 8) {
    const x = Math.floor(origin[0]);
    const y = Math.floor(origin[1]);
    const z = Math.floor(origin[2]);
    
    const stepX = direction[0] >= 0 ? 1 : -1;
    const stepY = direction[1] >= 0 ? 1 : -1;
    const stepZ = direction[2] >= 0 ? 1 : -1;
    
    const tDeltaX = direction[0] !== 0 ? Math.abs(1 / direction[0]) : Infinity;
    const tDeltaY = direction[1] !== 0 ? Math.abs(1 / direction[1]) : Infinity;
    const tDeltaZ = direction[2] !== 0 ? Math.abs(1 / direction[2]) : Infinity;
    
    let tMaxX = direction[0] !== 0 ? ((stepX > 0 ? x + 1 : x) - origin[0]) / direction[0] : Infinity;
    let tMaxY = direction[1] !== 0 ? ((stepY > 0 ? y + 1 : y) - origin[1]) / direction[1] : Infinity;
    let tMaxZ = direction[2] !== 0 ? ((stepZ > 0 ? z + 1 : z) - origin[2]) / direction[2] : Infinity;
    
    let currentX = x, currentY = y, currentZ = z;
    let lastX = currentX, lastY = currentY, lastZ = currentZ;
    
    for (let i = 0; i < maxDistance * 3; i++) {
      const chunkX = Math.floor(currentX / CHUNK_WIDTH);
      const chunkZ = Math.floor(currentZ / CHUNK_WIDTH);
      const chunk = this.world.getChunk(chunkX, chunkZ);
      
      if (chunk) {
        const localX = ((currentX % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH;
        const localZ = ((currentZ % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH;
        const localY = currentY;
        
        if (localY >= 0 && localY < CHUNK_HEIGHT) {
          const voxel = chunk.getVoxel(localX, localY, localZ);
          if (voxel !== 0) {
            return {
              hit: true,
              x: currentX, y: currentY, z: currentZ,
              chunkX, chunkZ,
              localX, localY, localZ,
              normalX: lastX - currentX,
              normalY: lastY - currentY,
              normalZ: lastZ - currentZ,
              voxel
            };
          }
        }
      }
      
      lastX = currentX; lastY = currentY; lastZ = currentZ;
      
      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          currentX += stepX;
          tMaxX += tDeltaX;
        } else {
          currentZ += stepZ;
          tMaxZ += tDeltaZ;
        }
      } else {
        if (tMaxY < tMaxZ) {
          currentY += stepY;
          tMaxY += tDeltaY;
        } else {
          currentZ += stepZ;
          tMaxZ += tDeltaZ;
        }
      }
      
      if (tMaxX > maxDistance && tMaxY > maxDistance && tMaxZ > maxDistance) {
        break;
      }
    }
    
    return { hit: false };
  }
  
  /**
   * Update targeted block based on camera position and rotation
   */
  updateTargetedBlock(cameraPosition, cameraRotation) {
    if (!this.isLocked()) {
      this.targetedBlock = null;
      return;
    }
    
    const yaw = cameraRotation.y;
    const pitch = cameraRotation.x;
    
    const direction = [
      -Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch)
    ];
    
    const origin = [cameraPosition.x, cameraPosition.y, cameraPosition.z];
    const result = this.raycastBlock(origin, direction, 8);
    
    if (result.hit) {
      if (!this.targetedBlock || this.targetedBlock.x !== result.x || 
          this.targetedBlock.y !== result.y || this.targetedBlock.z !== result.z) {
        if (DEBUG) console.log(`[BlockEdit] Target: ${result.x},${result.y},${result.z} (type=${result.voxel})`);
      }
      this.targetedBlock = result;
    } else {
      if (this.targetedBlock) {
        if (DEBUG) console.log('[BlockEdit] Target lost');
      }
      this.targetedBlock = null;
    }
  }
  
  isLocked() {
    return document.pointerLockElement !== null;
  }
  
  /**
   * Destroy the currently targeted block
   */
  destroyBlock() {
    if (!this.targetedBlock || !this.targetedBlock.hit) {
      if (DEBUG) console.log('[BlockEdit] destroyBlock: no target');
      return;
    }
    
    const chunk = this.world.getChunk(this.targetedBlock.chunkX, this.targetedBlock.chunkZ);
    if (chunk) {
      chunk.setVoxel(this.targetedBlock.localX, this.targetedBlock.localY, this.targetedBlock.localZ, 0);
      
      // Shared mesh update logic: regenerate mesh data
      chunk.meshData = chunk.generateMeshData();
      
      // Delete old WebGL mesh so it gets recreated
      this.clearChunkWebGLMesh(chunk);
      
      // Immediately recreate WebGL mesh
      this.syncChunkToWebGL(chunk);
      
      // Mark neighbor chunks for update if block is on boundary
      this.markNeighborChunksForUpdate(
        this.targetedBlock.chunkX, this.targetedBlock.chunkZ,
        this.targetedBlock.localX, this.targetedBlock.localY, this.targetedBlock.localZ
      );
      
      if (DEBUG) console.log(`[BlockEdit] Destroyed block at ${this.targetedBlock.x},${this.targetedBlock.y},${this.targetedBlock.z}`);
    }
  }
  
  /**
   * Place a block at the targeted position
   */
  placeBlock(selectedBlockType) {
    if (!this.targetedBlock || !this.targetedBlock.hit) {
      if (DEBUG) console.log('[BlockEdit] placeBlock: no target');
      return;
    }
    
    const blockType = selectedBlockType || this.selectedBlockType;
    
    // Place on the face we hit (step back from hit)
    const placeX = this.targetedBlock.x + this.targetedBlock.normalX;
    const placeY = this.targetedBlock.y + this.targetedBlock.normalY;
    const placeZ = this.targetedBlock.z + this.targetedBlock.normalZ;
    
    const chunkX = Math.floor(placeX / CHUNK_WIDTH);
    const chunkZ = Math.floor(placeZ / CHUNK_WIDTH);
    const chunk = this.world.getChunk(chunkX, chunkZ);
    
    if (chunk) {
      const localX = ((placeX % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH;
      const localZ = ((placeZ % CHUNK_WIDTH) + CHUNK_WIDTH) % CHUNK_WIDTH;
      
      if (placeY >= 0 && placeY < CHUNK_HEIGHT) {
        const existing = chunk.getVoxel(localX, placeY, localZ);
        if (existing === 0) {
          chunk.setVoxel(localX, placeY, localZ, blockType);
          
          // Shared mesh update logic: regenerate mesh data
          chunk.meshData = chunk.generateMeshData();
          
          // Delete old WebGL mesh so it gets recreated
          this.clearChunkWebGLMesh(chunk);
          
          // Immediately recreate WebGL mesh
          this.syncChunkToWebGL(chunk);
          
          // Mark neighbor chunks for update if block is on boundary
          this.markNeighborChunksForUpdate(chunkX, chunkZ, localX, placeY, localZ);
          
          if (DEBUG) console.log(`[BlockEdit] Placed block type ${blockType} at ${placeX},${placeY},${placeZ}`);
        } else {
          if (DEBUG) console.log('[BlockEdit] placeBlock: position occupied');
        }
      }
    }
  }
  
  /**
   * Mark neighboring chunks for update when block changes near boundary
   */
  markNeighborChunksForUpdate(chunkX, chunkZ, localX, localY, localZ) {
    const neighbors = [];
    
    // West neighbor (localX == 0)
    if (localX === 0) {
      neighbors.push({ x: chunkX - 1, z: chunkZ });
    }
    // East neighbor (localX == CHUNK_WIDTH - 1)
    if (localX === CHUNK_WIDTH - 1) {
      neighbors.push({ x: chunkX + 1, z: chunkZ });
    }
    // North neighbor (localZ == 0)
    if (localZ === 0) {
      neighbors.push({ x: chunkX, z: chunkZ - 1 });
    }
    // South neighbor (localZ == CHUNK_DEPTH - 1)
    if (localZ === CHUNK_DEPTH - 1) {
      neighbors.push({ x: chunkX, z: chunkZ + 1 });
    }
    
    for (const n of neighbors) {
      const neighborChunk = this.world.getChunk(n.x, n.z);
      if (neighborChunk && neighborChunk.hasVoxelData) {
        neighborChunk.meshData = neighborChunk.generateMeshData();
        neighborChunk.needsUpdate = true;
        // Recreate WebGL mesh for neighbor chunk
        this.syncChunkToWebGL(neighborChunk);
        if (DEBUG) console.log(`[BlockEdit] Marked neighbor chunk ${n.x},${n.z} for update`);
      }
    }
  }
  
  /**
   * Clear WebGL mesh data for a chunk
   */
  clearChunkWebGLMesh(chunk) {
    if (chunk._webglMesh) {
      this.gl.deleteBuffer(chunk._webglMesh.vbo);
      this.gl.deleteBuffer(chunk._webglMesh.ibo);
      this.gl.deleteVertexArray(chunk._webglMesh.vao);
      chunk._webglMesh = null;
      this.chunkMeshes.delete(`${chunk.chunkX},${chunk.chunkZ}`);
    }
  }
  
  /**
   * Synchronize chunk mesh to WebGL - recreate WebGL buffers after block edit
   */
  syncChunkToWebGL(chunk) {
    const key = `${chunk.chunkX},${chunk.chunkZ}`;
    
    if (chunk._webglMesh) {
      return chunk._webglMesh;
    }

    if (!chunk.meshData || !chunk.meshData.positions || chunk.meshData.positions.length === 0) {
      return null;
    }

    try {
      const webglMesh = createChunkMeshFromData(this.gl, chunk.meshData, this.voxelAttribs);
      if (webglMesh) {
        chunk._webglMesh = webglMesh;
        this.chunkMeshes.set(key, webglMesh);
        if (DEBUG) console.log(`[WebGL2] Created mesh for chunk ${key}: ${webglMesh.vertexCount} vertices`);
      }
      return webglMesh;
    } catch (e) {
      console.error(`[WebGL2] Error creating mesh for chunk ${key}:`, e);
      return null;
    }
  }
  
  getTargetedBlock() {
    return this.targetedBlock;
  }
  
  setSelectedBlockType(type) {
    this.selectedBlockType = type;
  }
  
  getSelectedBlockType() {
    return this.selectedBlockType;
  }
}
