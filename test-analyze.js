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

function analyze(mat, label) {
    console.log('\n' + label);
    console.log('Right (column0):', mat[0], mat[4], mat[8]);
    console.log('Up (column1):', mat[1], mat[5], mat[9]);
    console.log('Forward (column2 negative):', -mat[2], -mat[6], -mat[10]);
    console.log('Translation:', mat[12], mat[13], mat[14]);
    // Check orthonormality
    const r = [mat[0], mat[4], mat[8]];
    const u = [mat[1], mat[5], mat[9]];
    const f = [-mat[2], -mat[6], -mat[10]];
    const dot = (a,b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
    console.log('dot(r,u):', dot(r,u));
    console.log('dot(r,f):', dot(r,f));
    console.log('dot(u,f):', dot(u,f));
    console.log('|r|:', Math.sqrt(dot(r,r)));
    console.log('|u|:', Math.sqrt(dot(u,u)));
    console.log('|f|:', Math.sqrt(dot(f,f)));
}

analyze(createViewMatrix({x:0,y:0,z:0}, {yaw:0, pitch:0}), 'Pitch 0°');
analyze(createViewMatrix({x:0,y:0,z:0}, {yaw:0, pitch:Math.PI/2}), 'Pitch +90°');
analyze(createViewMatrix({x:0,y:0,z:0}, {yaw:0, pitch:-Math.PI/2}), 'Pitch -90°');
analyze(createViewMatrix({x:0,y:0,z:0}, {yaw:Math.PI/4, pitch:Math.PI/4}), 'Yaw 45°, Pitch 45°');