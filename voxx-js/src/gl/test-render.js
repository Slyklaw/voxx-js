import { gl } from './context.js';
import { createProgram, sampleVertexShader, sampleFragmentShader, getAttribLocations, getUniformLocations } from './shaders.js';

let testProgram = null;
let testVAO = null;
let colorLocation = null;

function initTestRender() {
  testProgram = createProgram(gl, sampleVertexShader, sampleFragmentShader);

  const attribs = getAttribLocations(gl, testProgram, ['aPosition']);
  colorLocation = getUniformLocations(gl, testProgram, ['uColor']).color;

  const positions = new Float32Array([
    0.0, 0.5, 0.0,
   -0.5, -0.5, 0.0,
    0.5, -0.5, 0.0
  ]);

  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  testVAO = gl.createVertexArray();
  gl.bindVertexArray(testVAO);

  gl.enableVertexAttribArray(attribs.aPosition);
  gl.vertexAttribPointer(attribs.aPosition, 3, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);
}

export function renderTestTriangle(glContext, program) {
  if (!testVAO) {
    initTestRender();
  }

  glContext.clearColor(0.133, 0.133, 0.133, 1.0);
  glContext.clear(glContext.COLOR_BUFFER_BIT | glContext.DEPTH_BUFFER_BIT);

  glContext.useProgram(program);

  const mvp = new Float32Array([
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  ]);
  
  const mvpLocation = glContext.getUniformLocation(program, 'uModelViewProjection');
  glContext.uniformMatrix4fv(mvpLocation, false, mvp);

  const colorLocation = glContext.getUniformLocation(program, 'uColor');
  glContext.uniform4f(colorLocation, 1.0, 1.0, 1.0, 1.0);

  glContext.bindVertexArray(testVAO);
  glContext.drawArrays(glContext.TRIANGLES, 0, 3);
  glContext.bindVertexArray(null);
}

export function cleanupTestRender() {
  if (testVAO) {
    gl.deleteVertexArray(testVAO);
    testVAO = null;
  }
  if (testProgram) {
    gl.deleteProgram(testProgram);
    testProgram = null;
  }
}

export { initTestRender };
