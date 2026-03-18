import { createProgram, getUniformLocations, getAttribLocations } from './shaders.js';

const selectionVertexShader = `#version 300 es
precision highp float;

in vec3 aPosition;

uniform mat4 uModelViewProjection;
uniform vec3 uBlockPosition;
uniform float uBlockSize;

out vec3 vPosition;

void main() {
  vec3 worldPos = aPosition * uBlockSize + uBlockPosition;
  vPosition = worldPos;
  gl_Position = uModelViewProjection * vec4(worldPos, 1.0);
}`;

const selectionFragmentShader = `#version 300 es
precision highp float;

uniform vec3 uSelectionColor;

out vec4 fragColor;

void main() {
  fragColor = vec4(uSelectionColor, 1.0);
}`;

export function createSelectionProgram(gl) {
  return createProgram(gl, selectionVertexShader, selectionFragmentShader);
}

export function getSelectionUniforms(gl, program) {
  return getUniformLocations(gl, program, [
    'uModelViewProjection',
    'uBlockPosition',
    'uBlockSize',
    'uSelectionColor'
  ]);
}

export function getSelectionAttribs(gl, program) {
  return getAttribLocations(gl, program, ['aPosition']);
}

export const DEFAULT_SELECTION_COLOR = [1.0, 0.0, 1.0];
export const DEFAULT_BLOCK_SIZE = 1.0;

export function createWireframeCubeVertices() {
  return new Float32Array([
    -0.5, -0.5, -0.5,
     0.5, -0.5, -0.5,
     0.5,  0.5, -0.5,
    -0.5,  0.5, -0.5,
    -0.5, -0.5,  0.5,
     0.5, -0.5,  0.5,
     0.5,  0.5,  0.5,
    -0.5,  0.5,  0.5
  ]);
}

export function createWireframeCubeIndices() {
  return new Uint16Array([
    0, 1, 1, 2, 2, 3, 3, 0,
    4, 5, 5, 6, 6, 7, 7, 4,
    0, 4, 1, 5, 2, 6, 3, 7
  ]);
}
