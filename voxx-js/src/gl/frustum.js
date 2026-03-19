/**
 * Frustum culling system for chunk visibility testing.
 * Extracts view frustum planes from view-projection matrix and tests
 * AABB (Axis-Aligned Bounding Box) visibility for chunk culling.
 */

import { CHUNK_WIDTH, CHUNK_HEIGHT, CHUNK_DEPTH } from '../../chunkCore.js';

/**
 * Represents a frustum plane.
 * Plane equation: ax + by + cz + d = 0
 * Normal points inward toward visible space.
 */
export class FrustumPlane {
  constructor(a = 0, b = 0, c = 0, d = 0) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
  }

  /**
   * Normalize the plane (make the normal unit length).
   */
  normalize() {
    const len = Math.sqrt(this.a * this.a + this.b * this.b + this.c * this.c);
    if (len > 0.0001) {
      this.a /= len;
      this.b /= len;
      this.c /= len;
      this.d /= len;
    }
    return this;
  }

  /**
   * Compute distance from a point to this plane.
   */
  distanceToPoint(x, y, z) {
    return this.a * x + this.b * y + this.c * z + this.d;
  }
}

/**
 * Frustum class that extracts and manages view frustum planes.
 * Used for visibility testing of chunks and other scene objects.
 */
export class Frustum {
  constructor() {
    this.planes = [
      new FrustumPlane(), // Near
      new FrustumPlane(), // Far
      new FrustumPlane(), // Left
      new FrustumPlane(), // Right
      new FrustumPlane(), // Top
      new FrustumPlane()  // Bottom
    ];
  }

  /**
   * Extract frustum planes from a combined view-projection matrix.
   * Uses the standard extraction method from Real-Time Rendering.
   * @param {Float32Array} viewMatrix - 4x4 view matrix (column-major)
   * @param {Float32Array} projectionMatrix - 4x4 projection matrix (column-major)
   */
  extractFromMatrices(viewMatrix, projectionMatrix) {
    // Compute view-projection matrix: proj * view
    const vp = new Float32Array(16);
    this.multiplyMatrices(vp, projectionMatrix, viewMatrix);

    // Column-major layout: element at row r, col c is at index c * 4 + r
    const m = vp;

    // Extract planes (Real-Time Rendering method)
    // Left plane: m[3][0] + m[0][0]
    this.planes[2].a = m[12] + m[0];
    this.planes[2].b = m[13] + m[1];
    this.planes[2].c = m[14] + m[2];
    this.planes[2].d = m[15] + m[3];
    this.planes[2].normalize();

    // Right plane: m[3][0] - m[0][0]
    this.planes[3].a = m[12] - m[0];
    this.planes[3].b = m[13] - m[1];
    this.planes[3].c = m[14] - m[2];
    this.planes[3].d = m[15] - m[3];
    this.planes[3].normalize();

    // Bottom plane: m[3][1] + m[1][1]
    this.planes[4].a = m[12] + m[4];
    this.planes[4].b = m[13] + m[5];
    this.planes[4].c = m[14] + m[6];
    this.planes[4].d = m[15] + m[7];
    this.planes[4].normalize();

    // Top plane: m[3][1] - m[1][1]
    this.planes[5].a = m[12] - m[4];
    this.planes[5].b = m[13] - m[5];
    this.planes[5].c = m[14] - m[6];
    this.planes[5].d = m[15] - m[7];
    this.planes[5].normalize();

    // Near plane: m[3][2] + m[2][2]
    this.planes[0].a = m[12] + m[8];
    this.planes[0].b = m[13] + m[9];
    this.planes[0].c = m[14] + m[10];
    this.planes[0].d = m[15] + m[11];
    this.planes[0].normalize();

    // Far plane: m[3][2] - m[2][2]
    this.planes[1].a = m[12] - m[8];
    this.planes[1].b = m[13] - m[9];
    this.planes[1].c = m[14] - m[10];
    this.planes[1].d = m[15] - m[11];
    this.planes[1].normalize();
  }

  /**
   * Multiply two 4x4 matrices (column-major).
   * out = a * b
   */
  multiplyMatrices(out, a, b) {
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a[k * 4 + i] * b[j * 4 + k];
        }
        out[j * 4 + i] = sum;
      }
    }
  }

  /**
   * Test if an AABB is visible within the frustum.
   * Uses the "inside all planes" test with corner approximation.
   * @param {number} minX - Min X of AABB
   * @param {number} minY - Min Y of AABB
   * @param {number} minZ - Min Z of AABB
   * @param {number} maxX - Max X of AABB
   * @param {number} maxY - Max Y of AABB
   * @param {number} maxZ - Max Z of AABB
   * @returns {boolean} True if AABB is potentially visible (may be inside frustum)
   */
  isBoxVisible(minX, minY, minZ, maxX, maxY, maxZ) {
    for (let i = 0; i < 6; i++) {
      const plane = this.planes[i];

      // Test AABB against plane using the "closest corner" method
      // If the entire AABB is on the negative side of the plane, it's invisible
      let px = plane.a >= 0 ? maxX : minX;
      let py = plane.b >= 0 ? maxY : minY;
      let pz = plane.c >= 0 ? maxZ : minZ;

      if (plane.a * px + plane.b * py + plane.c * pz + plane.d < 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Test if a chunk is visible within the frustum.
   * Uses the chunk's world-space bounding box.
   * @param {number} chunkX - Chunk X coordinate
   * @param {number} chunkZ - Chunk Z coordinate
   * @returns {boolean} True if the chunk is potentially visible
   */
  isChunkVisible(chunkX, chunkZ) {
    // World coordinates of chunk corners
    const minX = chunkX * CHUNK_WIDTH;
    const minY = 0;
    const minZ = chunkZ * CHUNK_DEPTH;
    const maxX = minX + CHUNK_WIDTH;
    const maxY = CHUNK_HEIGHT;
    const maxZ = minZ + CHUNK_DEPTH;

    return this.isBoxVisible(minX, minY, minZ, maxX, maxY, maxZ);
  }
}
