const CAMERA_UBO_BINDING = 0;
const GLOBAL_UBO_BINDING = 1;

const CAMERA_UBO_SIZE = 128;
const GLOBAL_UBO_SIZE = 16;

export function createUBO(gl, size, bindingPoint) {
  const ubo = gl.createBuffer();
  gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
  gl.bufferData(gl.UNIFORM_BUFFER, size, gl.DYNAMIC_DRAW);
  gl.bindBufferBase(gl.UNIFORM_BUFFER, bindingPoint, ubo);
  gl.bindBuffer(gl.UNIFORM_BUFFER, null);
  return ubo;
}

export function createCameraUBO(gl) {
  return createUBO(gl, CAMERA_UBO_SIZE, CAMERA_UBO_BINDING);
}

export function createGlobalUBO(gl) {
  return createUBO(gl, GLOBAL_UBO_SIZE, GLOBAL_UBO_BINDING);
}

export function updateCameraUBO(gl, ubo, viewMatrix, projectionMatrix) {
  gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);

  const data = new Float32Array(32);
  data.set(viewMatrix, 0);
  data.set(projectionMatrix, 16);

  gl.bufferSubData(gl.UNIFORM_BUFFER, 0, data);
  gl.bindBuffer(gl.UNIFORM_BUFFER, null);
}

export function updateGlobalUBO(gl, ubo, lightDir, timeOfDay, ambient) {
  gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);

  const data = new Float32Array(4);
  data[0] = lightDir[0];
  data[1] = lightDir[1];
  data[2] = lightDir[2];
  data[3] = timeOfDay;

  const ambientData = new Float32Array([ambient[0], ambient[1], ambient[2], 0]);
  gl.bufferSubData(gl.UNIFORM_BUFFER, 0, data);

  gl.bindBuffer(gl.UNIFORM_BUFFER, null);
}

export function bindCameraUBO(gl, ubo) {
  gl.bindBufferBase(gl.UNIFORM_BUFFER, CAMERA_UBO_BINDING, ubo);
}

export function bindGlobalUBO(gl, ubo) {
  gl.bindBufferBase(gl.UNIFORM_BUFFER, GLOBAL_UBO_BINDING, ubo);
}

export function bindUBO(gl, ubo, bindingPoint) {
  gl.bindBufferBase(gl.UNIFORM_BUFFER, bindingPoint, ubo);
}

export function deleteUBO(gl, ubo) {
  if (ubo) {
    gl.deleteBuffer(ubo);
  }
}

export const UBO_BINDINGS = {
  CAMERA: CAMERA_UBO_BINDING,
  GLOBAL: GLOBAL_UBO_BINDING
};

export const UBO_SIZES = {
  CAMERA: CAMERA_UBO_SIZE,
  GLOBAL: GLOBAL_UBO_SIZE
};
