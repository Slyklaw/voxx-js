// Quick test of createViewMatrix from engine.js
// Copy the function here and test with some rotations

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
    // Positive pitch = look up (positive Y)
    const finalForwardX = forwardX;
    const finalForwardY = forwardY * cosPitch + forwardZ * sinPitch;
    const finalForwardZ = -forwardY * sinPitch + forwardZ * cosPitch;
    
    // World up vector
    const worldUpX = 0, worldUpY = 1, worldUpZ = 0;
    
    // Recompute up vector = cross(right, forward) to ensure orthogonality
    const upX = rightY * finalForwardZ - rightZ * finalForwardY;
    const upY = rightZ * finalForwardX - rightX * finalForwardZ;
    const upZ = rightX * finalForwardY - rightY * finalForwardX;
    
    // Translation components
    const transX = -(rightX * eyeX + rightY * eyeY + rightZ * eyeZ);
    const transY = -(upX * eyeX + upY * eyeY + upZ * eyeZ);
    const transZ = -(finalForwardX * eyeX + finalForwardY * eyeY - finalForwardZ * eyeZ);
    
    // Column-major: rotation basis vectors as columns, translation as dot products
    // Note: camera's Z axis is -forward (since camera looks down -Z in OpenGL)
    return new Float32Array([
        rightX, upX, -finalForwardX, 0,
        rightY, upY, -finalForwardY, 0,
        rightZ, upZ, -finalForwardZ, 0,
        transX, transY, transZ, 1
    ]);
}

function test() {
    console.log('=== Testing pitch ===');
    const mat0 = createViewMatrix({x:0,y:0,z:0}, {yaw:0, pitch:0});
    console.log('Pitch 0° forward column:', mat0[2], mat0[6], mat0[10]);
    console.log('Expected forward: (0,0,-1) because camera looks down -Z');
    
    const mat90 = createViewMatrix({x:0,y:0,z:0}, {yaw:0, pitch:Math.PI/2});
    console.log('Pitch +90° forward column:', mat90[2], mat90[6], mat90[10]);
    console.log('Expected forward: (0,-1,0) because looking up -> forward +Y, camera -Z axis = -forward = (0,-1,0)');
    
    const matNeg90 = createViewMatrix({x:0,y:0,z:0}, {yaw:0, pitch:-Math.PI/2});
    console.log('Pitch -90° forward column:', matNeg90[2], matNeg90[6], matNeg90[10]);
    console.log('Expected forward: (0,1,0) because looking down -> forward -Y, camera -Z axis = (0,1,0)');
    
    // Check up vector
    console.log('\nUp vectors:');
    console.log('Pitch 0 up column:', mat0[1], mat0[5], mat0[9]);
    console.log('Pitch +90 up column:', mat90[1], mat90[5], mat90[9]);
    console.log('Pitch -90 up column:', matNeg90[1], matNeg90[5], matNeg90[9]);
}

test();