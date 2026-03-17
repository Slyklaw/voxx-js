// Test view matrix
function createViewMatrix(playerPos = { x: 0, y: 50, z: 0 }, playerRot = { yaw: 0, pitch: 0 }) {
    const eyeX = playerPos.x;
    const eyeY = playerPos.y + 1.7;
    const eyeZ = playerPos.z;
    
    const cosYaw = Math.cos(-playerRot.yaw);
    const sinYaw = Math.sin(-playerRot.yaw);
    
    const cosPitch = Math.cos(-playerRot.pitch);
    const sinPitch = Math.sin(-playerRot.pitch);
    
    // Original forward vector (points +Z)
    const forwardX = sinYaw;
    const forwardY = sinPitch * cosYaw;
    const forwardZ = cosPitch * cosYaw;
    
    // Right vector
    const rightX = cosYaw;
    const rightY = -sinPitch * sinYaw;
    const rightZ = -cosPitch * sinYaw;
    
    // Up vector
    const upX = 0;
    const upY = cosPitch;
    const upZ = -sinPitch;
    
    // We want camera to look -Z, so negate forward vector
    const negForwardX = -forwardX;
    const negForwardY = -forwardY;
    const negForwardZ = -forwardZ;
    
    // Translation components
    const transX = -rightX * eyeX - rightY * eyeY - rightZ * eyeZ;
    const transY = -upX * eyeX - upY * eyeY - upZ * eyeZ;
    const transZ = -negForwardX * eyeX - negForwardY * eyeY - negForwardZ * eyeZ;
    
    return new Float32Array([
        rightX, upX, negForwardX, 0,
        rightY, upY, negForwardY, 0,
        rightZ, upZ, negForwardZ, 0,
        transX, transY, transZ, 1
    ]);
}

const mat = createViewMatrix({x:0,y:11,z:0}, {yaw:0,pitch:0});
console.log('View matrix:');
for (let i=0;i<4;i++) {
    console.log([mat[i], mat[4+i], mat[8+i], mat[12+i]]);
}
// compute forward vector (column2)
console.log('Forward vector:', mat[2], mat[6], mat[10]);
// compute right vector (column0)
console.log('Right vector:', mat[0], mat[4], mat[8]);
// compute up vector (column1)
console.log('Up vector:', mat[1], mat[5], mat[9]);

// Transform a point in front of camera (world (0,10,10))
function transformPoint(m, x,y,z,w=1) {
    return [
        m[0]*x + m[4]*y + m[8]*z + m[12]*w,
        m[1]*x + m[5]*y + m[9]*z + m[13]*w,
        m[2]*x + m[6]*y + m[10]*z + m[14]*w,
        m[3]*x + m[7]*y + m[11]*z + m[15]*w
    ];
}
console.log('Transformed (0,10,10):', transformPoint(mat,0,10,10));