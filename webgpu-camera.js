/**
 * WebGPU Camera implementation
 * Replaces Three.js camera with custom matrix calculations
 */

export class WebGPUCamera {
  constructor(fov = 75, aspect = 1, near = 0.1, far = 1000) {
    this.fov = fov;
    this.aspect = aspect;
    this.near = near;
    this.far = far;
    
    // Position camera for better terrain viewing
    this.position = { x: 16, y: 280, z: 16 }; // Above chunk 0,0
    this.rotation = { x: -0.5, y: 0, z: 0 }; // Look down slightly
    
    // Matrices
    this.viewMatrix = new Float32Array(16);
    this.projectionMatrix = new Float32Array(16);
    this.viewProjectionMatrix = new Float32Array(16);
    
    this.updateProjectionMatrix();
  }

  updateProjectionMatrix() {
    // Right-handed camera looking down -Z in view space.
    const fovRad = (this.fov * Math.PI) / 180;
    const f = 1.0 / Math.tan(fovRad / 2);
    const nf = 1.0 / (this.near - this.far);

    // WebGPU/WGSL uses column-major math but our arrays are laid out row-major for CPU mul below.
    // This projection matches typical GL style: z in NDC [-1,1], with -Z forward in view.
    this.projectionMatrix.set([
      f / this.aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (this.far + this.near) * nf, -1,
      0, 0, (2 * this.far * this.near) * nf, 0
    ]);
  }

  updateViewMatrix() {
    const { x: px, y: py, z: pz } = this.position;
    const { x: rx, y: ry } = this.rotation;

    // Right-handed FPS camera: yaw around Y, then pitch around X. Forward is -Z in view space.
    const cx = Math.cos(rx), sx = Math.sin(rx);
    const cy = Math.cos(ry), sy = Math.sin(ry);

    // Rotation matrix R = R_y(ry) * R_x(rx)
    const r00 = cy;
    const r01 = sy * sx;
    const r02 = sy * cx;
    const r10 = 0;
    const r11 = cx;
    const r12 = -sx;
    const r20 = -sy;
    const r21 = cy * sx;
    const r22 = cy * cx;

    // View matrix is inverse of camera transform: V = R^T * T^{-1}
    // For rotation-only camera, inverse is transpose; translation component = -(R^T * p)
    const t0 = -(r00 * px + r10 * py + r20 * pz);
    const t1 = -(r01 * px + r11 * py + r21 * pz);
    const t2 = -(r02 * px + r12 * py + r22 * pz);

    this.viewMatrix.set([
      r00, r01, r02, 0,
      r10, r11, r12, 0,
      r20, r21, r22, 0,
      t0,  t1,  t2,  1
    ]);
  }

  updateViewProjectionMatrix() {
    this.updateViewMatrix();

    // Multiply projection (p) by view (v): result = p * v
    const p = this.projectionMatrix;
    const v = this.viewMatrix;
    const out = this.viewProjectionMatrix;

    for (let r = 0; r < 4; r++) {
      const pr0 = p[r * 4 + 0], pr1 = p[r * 4 + 1], pr2 = p[r * 4 + 2], pr3 = p[r * 4 + 3];
      out[r * 4 + 0] = pr0 * v[0] + pr1 * v[4] + pr2 * v[8]  + pr3 * v[12];
      out[r * 4 + 1] = pr0 * v[1] + pr1 * v[5] + pr2 * v[9]  + pr3 * v[13];
      out[r * 4 + 2] = pr0 * v[2] + pr1 * v[6] + pr2 * v[10] + pr3 * v[14];
      out[r * 4 + 3] = pr0 * v[3] + pr1 * v[7] + pr2 * v[11] + pr3 * v[15];
    }
  }

  getWorldDirection() {
    const { x: rx, y: ry } = this.rotation;
    const cosX = Math.cos(rx);
    const sinX = Math.sin(rx);
    const cosY = Math.cos(ry);
    const sinY = Math.sin(ry);

    // Forward direction (FPS-style, Y up)
    return {
      x: -sinY * cosX,
      y: -sinX,
      z: -cosY * cosX
    };
  }

  setAspect(aspect) {
    this.aspect = aspect;
    this.updateProjectionMatrix();
  }
}
