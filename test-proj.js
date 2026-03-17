// Projection matrix from renderer.js
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

function transformPoint(m, x,y,z,w=1) {
    return [
        m[0]*x + m[4]*y + m[8]*z + m[12]*w,
        m[1]*x + m[5]*y + m[9]*z + m[13]*w,
        m[2]*x + m[6]*y + m[10]*z + m[14]*w,
        m[3]*x + m[7]*y + m[11]*z + m[15]*w
    ];
}

const view = new Float32Array([
    1,0,0,0,
    0,1,0,-12.7,
    0,0,-1,0,
    0,0,0,1
]);
const proj = createProjectionMatrix();
const pv = multiply(proj, view);
console.log('PV matrix:');
for (let i=0;i<4;i++) {
    console.log([pv[i], pv[4+i], pv[8+i], pv[12+i]]);
}

// point in world (0,10,10) -> camera space (0,-2.7,-10)
const camPoint = [0, -2.7, -10, 1];
const clip = transformPoint(pv, camPoint[0], camPoint[1], camPoint[2], camPoint[3]);
console.log('Clip space:', clip);
const ndc = [clip[0]/clip[3], clip[1]/clip[3], clip[2]/clip[3]];
console.log('NDC:', ndc);
console.log('NDC z range? should be between -1 and 1');