/**
 * Camera - Handles camera position, rotation, movement, and view matrix calculations
 * Manages player movement via WASD + space/shift, and creates view matrices for rendering.
 */

import { PLAYER_CONFIG, DEBUG } from '../../config.js';

export class Camera {
  constructor(initialPosition = { x: 50, y: 200, z: 50 }, initialRotation = { x: 0.5, y: 0 }) {
    this.position = { ...initialPosition };
    this.rotation = { ...initialRotation };
    this.MIN_POS = -10000;
    this.MAX_POS = 10000;
  }
  
  /**
   * Update camera movement based on input keys and delta time
   */
  updateMovement(deltaTime, keys) {
    if (!document.pointerLockElement) return;

    const yaw = this.rotation.y;
    const forward = {
      x: -Math.sin(yaw),
      y: 0,
      z: -Math.cos(yaw)
    };

    const right = {
      x: forward.z,
      y: 0,
      z: -forward.x
    };

    const speed = PLAYER_CONFIG.MOVE_SPEED * deltaTime;

    if (keys['KeyW']) {
      this.position.x += forward.x * speed;
      this.position.z += forward.z * speed;
    }
    if (keys['KeyS']) {
      this.position.x -= forward.x * speed;
      this.position.z -= forward.z * speed;
    }
    if (keys['KeyA']) {
      this.position.x += right.x * speed;
      this.position.z += right.z * speed;
    }
    if (keys['KeyD']) {
      this.position.x -= right.x * speed;
      this.position.z -= right.z * speed;
    }
    if (keys['Space']) {
      this.position.y += speed;
    }
    if (keys['ShiftLeft'] || keys['ShiftRight']) {
      this.position.y -= speed;
    }

    let clamped = false;
    if (this.position.x < this.MIN_POS || this.position.x > this.MAX_POS) {
      this.position.x = Math.max(this.MIN_POS, Math.min(this.MAX_POS, this.position.x));
      clamped = true;
    }
    if (this.position.y < this.MIN_POS || this.position.y > this.MAX_POS) {
      this.position.y = Math.max(this.MIN_POS, Math.min(this.MAX_POS, this.position.y));
      clamped = true;
    }
    if (this.position.z < this.MIN_POS || this.position.z > this.MAX_POS) {
      this.position.z = Math.max(this.MIN_POS, Math.min(this.MAX_POS, this.position.z));
      clamped = true;
    }
    if (clamped && DEBUG) console.log('[Camera] Position clamped to world bounds');
  }
  
  /**
   * Create view matrix using lookAt from camera position and rotation
   */
  createViewMatrix() {
    const eye = [this.position.x, this.position.y, this.position.z];
    
    const yaw = this.rotation.y;
    const pitch = this.rotation.x;
    
    const forward = [
      -Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch)
    ];
    
    const target = [
      eye[0] + forward[0],
      eye[1] + forward[1],
      eye[2] + forward[2]
    ];
    
    return this.lookAt(eye, target, [0, 1, 0]);
  }
  
  /**
   * LookAt matrix calculation
   */
  lookAt(eye, center, up) {
    let z = [eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]];
    const zLen = Math.sqrt(z[0]*z[0] + z[1]*z[1] + z[2]*z[2]);
    if (zLen < 0.0001) z = [0, 0, -1];
    else z = [z[0]/zLen, z[1]/zLen, z[2]/zLen];
    
    const x = this.normalize(this.cross(up, z));
    const y = this.cross(z, x);
    
    return new Float32Array([
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -this.dot(x, eye), -this.dot(y, eye), -this.dot(z, eye), 1
    ]);
  }
  
  /**
   * Normalize a 3D vector
   */
  normalize(v) {
    const len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    return [v[0]/len, v[1]/len, v[2]/len];
  }
  
  /**
   * Cross product of two 3D vectors
   */
  cross(a, b) {
    return [
      a[1]*b[2] - a[2]*b[1],
      a[2]*b[0] - a[0]*b[2],
      a[0]*b[1] - a[1]*b[0]
    ];
  }
  
  /**
   * Dot product of two 3D vectors
   */
  dot(a, b) {
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
  }
  
  /**
   * Get cardinal direction based on yaw angle
   */
  getCardinalDirection() {
    let degrees = ((this.rotation.y * 180 / Math.PI) % 360 + 360) % 360;
    if (degrees >= 337.5 || degrees < 22.5) return 'N';
    if (degrees >= 22.5 && degrees < 67.5) return 'NE';
    if (degrees >= 67.5 && degrees < 112.5) return 'E';
    if (degrees >= 112.5 && degrees < 157.5) return 'SE';
    if (degrees >= 157.5 && degrees < 202.5) return 'S';
    if (degrees >= 202.5 && degrees < 247.5) return 'SW';
    if (degrees >= 247.5 && degrees < 292.5) return 'W';
    return 'NW';
  }
  
  getPosition() {
    return { ...this.position };
  }
  
  getRotation() {
    return { ...this.rotation };
  }
  
  setPosition(x, y, z) {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
  }
  
  setRotation(x, y) {
    this.rotation.x = x;
    this.rotation.y = y;
  }
}
