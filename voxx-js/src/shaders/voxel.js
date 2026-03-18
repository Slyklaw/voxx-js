import { createProgram, getUniformLocations, getAttribLocations } from './shaders.js';

const voxelVertexShader = `#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aColor;
in vec3 aNormal;

uniform mat4 uModelViewProjection;
uniform mat4 uModelMatrix;

out vec3 vColor;
out vec3 vNormal;

void main() {
  vColor = aColor;
  vNormal = mat3(uModelMatrix) * aNormal;
  gl_Position = uModelViewProjection * vec4(aPosition, 1.0);
}`;

const voxelFragmentShader = `#version 300 es
precision highp float;

in vec3 vColor;
in vec3 vNormal;

uniform vec3 uLightDirection;
uniform float uAmbient;
uniform float uDiffuse;

out vec4 fragColor;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightDirection);
  
  float diffuse = max(dot(normal, lightDir), 0.0) * uDiffuse;
  float ambient = uAmbient;
  
  vec3 finalColor = vColor * (ambient + diffuse);
  fragColor = vec4(finalColor, 1.0);
}`;

export function createVoxelProgram(gl) {
  return createProgram(gl, voxelVertexShader, voxelFragmentShader);
}

export function getVoxelUniforms(gl, program) {
  return getUniformLocations(gl, program, [
    'uModelViewProjection',
    'uModelMatrix',
    'uLightDirection',
    'uAmbient',
    'uDiffuse'
  ]);
}

export function getVoxelAttribs(gl, program) {
  return getAttribLocations(gl, program, [
    'aPosition',
    'aColor',
    'aNormal'
  ]);
}

export const DEFAULT_LIGHT_DIRECTION = [0.5, 1.0, 0.3];
export const DEFAULT_AMBIENT = 0.4;
export const DEFAULT_DIFFUSE = 0.6;
