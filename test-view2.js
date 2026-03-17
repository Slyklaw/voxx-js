// Test view matrix
function createViewMatrix(playerPos = { x: 0, y: 50, z: 0 }, playerRot = { yaw: 0, pitch: 0 }) {
    const eyeX = playerPos.x;
    const eyeY = playerPos.y + 1.7;
    const eyeZ = playerPos.z;
    
    const yaw = playerRot.yaw;
    const pitch = playerRot.pitch;
    
    // Apply yaw first (rotation around Y axis)
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    
    // Forward direction after yaw (horizontal)
    const forwardX = sinYaw;
    const forwardY = 0;
    const forwardZ = cosYaw;
    
    // Right vector after yaw
    const rightX = cosYaw;
    const rightY = 0;
    const rightZ = -sinYaw;
    
    // Now apply pitch (rotation around right axis)
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    
    // Rotate forward around right axis
    const finalForwardX = forwardX;
    const finalForwardY = forwardY * cosPitch + forwardZ * sinPitch;
    const finalForwardZ = -forwardY * sinPitch + forwardZ * cosPitch;
    
    // World up vector
    const worldUpX = 0, worldUpY = 1, worldUpZ = 0;
    
    // Recompute up
    const upX = rightY * finalForwardZ - rightZ * finalForwardY;
    const upY = rightZ * finalForwardX - rightX * finalForwardZ;
    const upZ = rightX * finalForwardY - rightY * finalForwardX;
    
    const transX = -(rightX * eyeX + rightY * eyeY + rightZ * eyeZ);
    const transY = -(upX * eyeX + upY * eyeY + upZ * eyeZ);
    const transZ = -(finalForwardX * eyeX + finalForwardY * eyeY - finalForwardZ * eyeZ);
    
    return new Float32Array([
        rightX, upX, -finalForwardX, 0,
        rightY, upY, -finalForwardY, 0,
        rightZ, upZ, -finalForwardZ, 0,
        transX, transY, transZ, 1
    ]);
}

// Compute forward vector from debug formula
function debugLookVector(yaw, pitch) {
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    
    const afterYawX = sinYaw;
    const afterYawZ = cosYaw;
    
    return {
        x: afterYawX,
        y: afterYawZ * sinPitch,
        z: afterYawZ * cosPitch
    };
}

// Test cases
const testCases = [
    { yaw: 0, pitch: 0 },
    { yaw: -Math.PI/2, pitch: 0.628 }, // -90°, 36°
    { yaw: Math.PI/4, pitch: 0.3 },
];

for (const tc of testCases) {
    const mat = createViewMatrix({x:0,y:11,z:0}, tc);
    // Extract forward vector from matrix (column2 is -forward)
    const forwardX = -mat[2];
    const forwardY = -mat[6];
    const forwardZ = -mat[10];
    const expected = debugLookVector(tc.yaw, tc.pitch);
    console.log(`Yaw ${tc.yaw} Pitch ${tc.pitch}:`);
    console.log(`  Expected forward: (${expected.x.toFixed(3)}, ${expected.y.toFixed(3)}, ${expected.z.toFixed(3)})`);
    console.log(`  Matrix forward:   (${forwardX.toFixed(3)}, ${forwardY.toFixed(3)}, ${forwardZ.toFixed(3)})`);
    const diff = Math.hypot(forwardX-expected.x, forwardY-expected.y, forwardZ-expected.z);
    console.log(`  Difference: ${diff.toFixed(6)}`);
}