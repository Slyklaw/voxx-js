import * as THREE from 'three';

export const CHUNK_WIDTH = 32;
export const CHUNK_HEIGHT = 32;
export const CHUNK_DEPTH = 32;

export class Chunk {
  constructor(chunkX, chunkZ) {
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;

    // Voxel data: 1 for solid, 0 for air
    this.voxels = new Uint8Array(CHUNK_WIDTH * CHUNK_HEIGHT * CHUNK_DEPTH);
    this.mesh = null;
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
    for (let x = 0; x < CHUNK_WIDTH; x++) {
      for (let z = 0; z < CHUNK_DEPTH; z++) {
        const worldX = this.chunkX * CHUNK_WIDTH + x;
        const worldZ = this.chunkZ * CHUNK_DEPTH + z;

        // Generate a height value using simplex noise
        const height = Math.floor(noise(worldX / 50, worldZ / 50) * 10) + 15;

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          if (y < height) {
            this.setVoxel(x, y, z, 1); // Solid block
          }
        }
      }
    }
  }

  /** Create a mesh from the voxel data (naive implementation) */
  createMesh() {
    const chunkGroup = new THREE.Group();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardMaterial({ color: 0x88aa88 }); // Greenish color

    for (let y = 0; y < CHUNK_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_DEPTH; z++) {
        for (let x = 0; x < CHUNK_WIDTH; x++) {
          if (this.getVoxel(x, y, z) === 1) {
            const voxelMesh = new THREE.Mesh(geometry, material);
            voxelMesh.position.set(x, y, z);
            chunkGroup.add(voxelMesh);
          }
        }
      }
    }

    console.warn(`Naive meshing is very slow. A single chunk generated ${chunkGroup.children.length} meshes.`);
    this.mesh = chunkGroup;
    return this.mesh;
  }
}