// Corrected createViewMatrix
function createViewMatrix(playerPos = { x: 0, y: 50, z: 0 }, playerRot = { yaw: 0, pitch: 0 }) {
    const eyeX = playerPos.x;
    const eyeY = playerPos.y + 1.7;
    const eyeZ = playerPos.z;
    
    const yaw = playerRot.yaw;
    const pitch = playerRot.pitch;
    
    // Yaw rotation
    const cosYaw = Math.cos(yaw);
    const sinYaw = Math.sin(yaw);
    
    // Forward after yaw (horizontal)
    const forwardX = sinYaw;
    const forwardY = 0;
    const forwardZ = cosYaw;
    
    // Right vector = cross(worldUp, forward) where worldUp = (0,1,0)
    const rightX = cosYaw;
    const rightY = 0;
    const rightZ = -sinYaw;
    
    // Pitch rotation around right axis
    const cosPitch = Math.cos(pitch);
    const sinPitch = Math.sin(pitch);
    
    // Rotate forward around right axis (right axis unchanged)
    const finalForwardX = forwardX;
    const finalForwardY = forwardY * cosPitch + forwardZ * sinPitch;
    const finalForwardZ = -forwardY * sinPitch + forwardZ * cosPitch;
    
    // Up vector = cross(finalForward, right) (ensures no roll)
    const upX = finalForwardY * rightZ - finalForwardZ * rightY;
    const upY = finalForwardZ * rightX - finalForwardX * rightZ;
    const upZ = finalForwardX * rightY - finalForwardY * rightX;
    
    // Translation components
    const transX = -(rightX * eyeX + rightY * eyeY + rightZ * eyeZ);
    const transY = -(upX * eyeX + upY * eyeY + upZ * eyeZ);
    const transZ = finalForwardX * eyeX + finalForwardY * eyeY + finalForwardZ * eyeZ;
    
    // Column-major: columns are right, up, -finalForward, translation
    return new Float32Array([
        rightX, upX, -finalForwardX, 0,
        rightY, upY, -finalForwardY, 0,
        rightZ, upZ, -finalForwardZ, 0,
        transX, transY, transZ, 1
    ]);
}

function test() {
    console.log('=== Corrected camera ===');
    const mat0 = createViewMatrix({x:0,y:0,z:0}, {yaw:0, pitch:0});
    console.log('Pitch 0° forward column:', mat0[2], mat0[6], mat0[10]);
    console.log('Pitch 0° up column:', mat0[1], mat0[5], mat0[9]);
    console.log('Pitch 0° right column:', mat0[0], mat0[4], mat0[8]);
    
    const mat90 = createViewMatrix({x:0,y:0,z:0}, {yaw:0, pitch:Math.PI/2});
    console.log('Pitch +90° forward column:', mat90[2], mat90[6], mat90[10]);
    console.log('Pitch +90° up column:', mat90[1], mat90[5], mat90[9]);
    
    const matNeg90 = createViewMatrix({x:0,y:0,z:0}, {yaw:0, pitch:-Math.PI/2});
    console.log('Pitch -90° forward column:', matNeg90[2], matNeg90[6], matNeg90[10]);
    console.log('Pitch -90° up column:', matNeg90[1], matNeg90[5], matNeg90[9]);
    
    // Test yaw
    const matYaw = createViewMatrix({x:0,y:0,z:0}, {yaw:Math.PI/2, pitch:0});
    console.log('Yaw 90° forward column:', matYaw[2], matYaw[6], matYaw[10]);
    console.log('Yaw 90° right column:', matYaw[0], matYaw[4], matYaw[8]);
    
    // Transform a point in front of camera
    function transformPoint(m, x,y,z,w=1) {
        return [
            m[0]*x + m[4]*y + m[8]*z + m[12]*w,
            m[1]*x + m[5]*y + m[9]*z + m[13]*w,
            m[2]*x + m[6]*y + m[10]*z + m[14]*w,
            m[3]*x + m[7]*y + m[11]*z + m[15]*w
        ];
    }
    console.log('Transform (0,10,10) with pitch 0:', transformPoint(mat0, 0,10,10));
    console.log('Expected Z = -10 (point in front)');
}

test();