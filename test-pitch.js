// Quick verification of corrected createViewMatrix
// We'll import the engine module? Since it's ES module, we can't import in Node without mocking WebGL.
// Instead we'll copy the function again and test.
// But we can also require the engine? Let's just copy the function from engine.js (already updated).
// We'll read the file and eval? Simpler: just duplicate the function.

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
    
    // Rotate forward around right axis (positive pitch = look up)
    const finalForwardX = forwardX * cosPitch;
    const finalForwardY = sinPitch;
    const finalForwardZ = forwardZ * cosPitch;
    
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

function approxEqual(a, b, eps = 1e-6) {
    return Math.abs(a - b) < eps;
}

function testPitch() {
    console.log('Testing pitch angles...');
    const mat0 = createViewMatrix({x:0,y:0,z:0}, {yaw:0, pitch:0});
    // Forward column is column2 negative
    const forwardX = -mat0[2];
    const forwardY = -mat0[6];
    const forwardZ = -mat0[10];
    console.assert(approxEqual(forwardX, 0), 'forward X should be 0');
    console.assert(approxEqual(forwardY, 0), 'forward Y should be 0');
    console.assert(approxEqual(forwardZ, 1), 'forward Z should be 1');
    // Up column
    const upX = mat0[1];
    const upY = mat0[5];
    const upZ = mat0[9];
    console.assert(approxEqual(upX, 0), 'up X should be 0');
    console.assert(approxEqual(upY, 1), 'up Y should be 1');
    console.assert(approxEqual(upZ, 0), 'up Z should be 0');
    console.log('Pitch 0°: OK');
    
    const mat90 = createViewMatrix({x:0,y:0,z:0}, {yaw:0, pitch:Math.PI/2});
    const fX = -mat90[2];
    const fY = -mat90[6];
    const fZ = -mat90[10];
    console.assert(approxEqual(fX, 0), 'forward X should be 0');
    console.assert(approxEqual(fY, 1), 'forward Y should be 1');
    console.assert(approxEqual(fZ, 0), 'forward Z should be 0');
    const uX = mat90[1];
    const uY = mat90[5];
    const uZ = mat90[9];
    console.assert(approxEqual(uX, 0), 'up X should be 0');
    console.assert(approxEqual(uY, 0), 'up Y should be 0');
    console.assert(approxEqual(uZ, -1), 'up Z should be -1');
    console.log('Pitch +90°: OK');
    
    const matNeg90 = createViewMatrix({x:0,y:0,z:0}, {yaw:0, pitch:-Math.PI/2});
    const fnX = -matNeg90[2];
    const fnY = -matNeg90[6];
    const fnZ = -matNeg90[10];
    console.assert(approxEqual(fnX, 0), 'forward X should be 0');
    console.assert(approxEqual(fnY, -1), 'forward Y should be -1');
    console.assert(approxEqual(fnZ, 0), 'forward Z should be 0');
    const unX = matNeg90[1];
    const unY = matNeg90[5];
    const unZ = matNeg90[9];
    console.assert(approxEqual(unX, 0), 'up X should be 0');
    console.assert(approxEqual(unY, 0), 'up Y should be 0');
    console.assert(approxEqual(unZ, 1), 'up Z should be 1');
    console.log('Pitch -90°: OK');
    
    // Test yaw 90°, pitch 0
    const matYaw90 = createViewMatrix({x:0,y:0,z:0}, {yaw:Math.PI/2, pitch:0});
    const fyX = -matYaw90[2];
    const fyY = -matYaw90[6];
    const fyZ = -matYaw90[10];
    console.assert(approxEqual(fyX, 1), 'forward X should be 1');
    console.assert(approxEqual(fyY, 0), 'forward Y should be 0');
    console.assert(approxEqual(fyZ, 0), 'forward Z should be 0');
    console.log('Yaw 90°: OK');
    
    // Test combined yaw 45°, pitch 45°
    const matC = createViewMatrix({x:0,y:0,z:0}, {yaw:Math.PI/4, pitch:Math.PI/4});
    const fcX = -matC[2];
    const fcY = -matC[6];
    const fcZ = -matC[10];
    const expectedX = Math.sin(Math.PI/4) * Math.cos(Math.PI/4); // sin45 * cos45 = 0.5
    const expectedY = Math.sin(Math.PI/4); // sin45 = 0.7071
    const expectedZ = Math.cos(Math.PI/4) * Math.cos(Math.PI/4); // cos45 * cos45 = 0.5
    console.assert(approxEqual(fcX, expectedX), `forward X should be ${expectedX}`);
    console.assert(approxEqual(fcY, expectedY), `forward Y should be ${expectedY}`);
    console.assert(approxEqual(fcZ, expectedZ), `forward Z should be ${expectedZ}`);
    console.log('Combined yaw/pitch: OK');
    
    // Test that view matrix transforms a point in front of camera to negative Z
    const matTest = createViewMatrix({x:0,y:10,z:0}, {yaw:0, pitch:0});
    // point at world (0,10,10) relative to camera at (0,11.7,0) is (0, -1.7, 10)
    // In camera space, Z should be -10 (since camera looks down -Z)
    function transformPoint(m, x,y,z,w=1) {
        return [
            m[0]*x + m[4]*y + m[8]*z + m[12]*w,
            m[1]*x + m[5]*y + m[9]*z + m[13]*w,
            m[2]*x + m[6]*y + m[10]*z + m[14]*w,
            m[3]*x + m[7]*y + m[11]*z + m[15]*w
        ];
    }
    const transformed = transformPoint(matTest, 0,10,10);
    console.assert(approxEqual(transformed[2], -10), `Transformed Z should be -10, got ${transformed[2]}`);
    console.log('Point transformation: OK');
    
    console.log('All tests passed!');
}

testPitch();