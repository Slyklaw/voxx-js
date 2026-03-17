// Copy view matrix creation from engine.js
function createViewMatrix(playerPos = { x: 0, y: 50, z: 0 }, playerRot = { yaw: 0, pitch: 0 }) {
    const eyeX = playerPos.x;
    const eyeY = playerPos.y + 1.7;
    const eyeZ = playerPos.z;
    
    const cosYaw = Math.cos(-playerRot.yaw);
    const sinYaw = Math.sin(-playerRot.yaw);
    
    const cosPitch = Math.cos(-playerRot.pitch);
    const sinPitch = Math.sin(-playerRot.pitch);
    
    return new Float32Array([
        cosYaw,           0,                sinYaw,              0,
        -sinPitch * sinYaw,  cosPitch,        sinPitch * cosYaw,  0,
        -cosPitch * sinYaw, -sinPitch,        cosPitch * cosYaw,  0,
        -cosYaw * eyeX - sinYaw * eyeZ,
        sinPitch * sinYaw * eyeX - cosPitch * eyeY - sinPitch * cosYaw * eyeZ,
        cosPitch * sinYaw * eyeX + sinPitch * eyeY - cosPitch * cosYaw * eyeZ,
        1
    ]);
}

// Simple projection matrix from renderer.js
function createProjectionMatrix() {
    const fov = Math.PI / 4;
    const aspect = 800 / 600;
    const near = 0.1;
    const far = 100.0;
    const f = 1.0 / Math.tan(fov / 2);
    return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) / (near - far), -1,
        0, 0, (2 * far * near) / (near - far), 0
    ]);
}

// Multiply 4x4 matrices column-major
function multiply(a, b) {
    const result = new Float32Array(16);
    for (let col = 0; col < 4; col++) {
        for (let row = 0; row < 4; row++) {
            let sum = 0;
            for (let k = 0; k < 4; k++) {
                sum += a[k * 4 + row] * b[col * 4 + k];
            }
            result[col * 4 + row] = sum;
        }
    }
    return result;
}

// Transform point by matrix (column-major, point as column vector)
function transformPoint(matrix, x, y, z, w = 1) {
    const out = [0,0,0,0];
    for (let row = 0; row < 4; row++) {
        let sum = 0;
        sum += matrix[0 * 4 + row] * x;
        sum += matrix[1 * 4 + row] * y;
        sum += matrix[2 * 4 + row] * z;
        sum += matrix[3 * 4 + row] * w;
        out[row] = sum;
    }
    return out;
}

const playerPos = { x: 0, y: 11, z: 0 };
const playerRot = { yaw: 0, pitch: 0 };
const view = createViewMatrix(playerPos, playerRot);
const proj = createProjectionMatrix();
const pv = multiply(proj, view);

console.log('View matrix:');
for (let i = 0; i < 4; i++) {
    console.log([view[i], view[4+i], view[8+i], view[12+i]]);
}

// Test point: a voxel at world (0,10,10) (just below camera, ahead)
const worldPoint = [0, 10, 10];
const camSpace = transformPoint(view, worldPoint[0], worldPoint[1], worldPoint[2]);
console.log('Camera space:', camSpace);
// Expected: since camera at (0,12.7,0) looking +Z, point relative to camera is (0, -2.7, 10). In camera space, Z should be 10 (positive), meaning in front of camera (since forward is +Z). 
// However typical OpenGL camera space has -Z forward, so positive Z is behind camera. Let's see.

const clipSpace = transformPoint(pv, worldPoint[0], worldPoint[1], worldPoint[2]);
console.log('Clip space:', clipSpace);
// Perspective division
const ndc = [clipSpace[0]/clipSpace[3], clipSpace[1]/clipSpace[3], clipSpace[2]/clipSpace[3]];
console.log('NDC:', ndc);
// If ndc z is between -1 and 1, point is visible.

// Also compute look vector from view matrix forward column
console.log('Forward vector (column 2):', view[2], view[6], view[10]);