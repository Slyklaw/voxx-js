/**
 * Math utilities for matrix and vector operations
 * Extracted from main.js for modularity
 */

/**
 * Multiply two 4x4 matrices
 * @param {Float32Array} a - First 4x4 matrix
 * @param {Float32Array} b - Second 4x4 matrix
 * @returns {Float32Array} Result 4x4 matrix
 */
export function multiplyMatrices(a, b) {
  const result = new Float32Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      result[j * 4 + i] = 0;
      for (let k = 0; k < 4; k++) {
        result[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k];
      }
    }
  }
  return result;
}

/**
 * Normalize a vector
 * @param {number[]} v - 3D vector [x, y, z]
 * @returns {number[]} Normalized vector
 */
export function normalize(v) {
  const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
  return [v[0]/len, v[1]/len, v[2]/len];
}

/**
 * Compute cross product of two 3D vectors
 * @param {number[]} a - First vector [x, y, z]
 * @param {number[]} b - Second vector [x, y, z]
 * @returns {number[]} Cross product [x, y, z]
 */
export function cross(a, b) {
  return [
    a[1]*b[2] - a[2]*b[1],
    a[2]*b[0] - a[0]*b[2],
    a[0]*b[1] - a[1]*b[0]
  ];
}

/**
 * Compute dot product of two 3D vectors
 * @param {number[]} a - First vector [x, y, z]
 * @param {number[]} b - Second vector [x, y, z]
 * @returns {number} Dot product
 */
export function dot(a, b) {
  return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}

/**
 * Create a view matrix using lookAt
 * @param {number[]} eye - Camera position [x, y, z]
 * @param {number[]} center - Target position [x, y, z]
 * @param {number[]} up - Up vector [x, y, z]
 * @returns {Float32Array} 4x4 view matrix
 */
export function lookAt(eye, center, up) {
  let z = [eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]];
  const zLen = Math.sqrt(z[0]*z[0] + z[1]*z[1] + z[2]*z[2]);
  if (zLen < 0.0001) z = [0, 0, -1]; // Handle looking at self
  else z = [z[0]/zLen, z[1]/zLen, z[2]/zLen];
  
  // Process right and up vectors naturally - pitch clamping prevents true zero normals
  const x = normalize(cross(up, z));
  const y = cross(z, x);
  
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -dot(x, eye), -dot(y, eye), -dot(z, eye), 1
  ]);
}

/**
 * Create a perspective projection matrix
 * @param {number} fov - Field of view in radians
 * @param {number} aspect - Aspect ratio (width/height)
 * @param {number} near - Near plane distance
 * @param {number} far - Far plane distance
 * @returns {Float32Array} 4x4 projection matrix
 */
export function createProjectionMatrix(fov, aspect, near, far) {
  const f = 1.0 / Math.tan(fov / 2);
  const nf = 1 / (near - far);
  
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0
  ]);
}
