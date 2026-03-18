import { createProgram, getUniformLocations, getAttribLocations } from '../gl/shaders.js';

const voxelVertexShader = `#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aColor;
in vec3 aNormal;
in vec2 aUV;

uniform mat4 uModelViewProjection;
uniform mat4 uModelMatrix;

out vec3 vColor;
out vec3 vNormal;
out vec2 vUV;

void main() {
  vColor = aColor;
  vNormal = mat3(uModelMatrix) * aNormal;
  vUV = aUV;
  gl_Position = uModelViewProjection * vec4(aPosition, 1.0);
}`;

const voxelFragmentShader = `#version 300 es
precision highp float;

in vec3 vColor;
in vec3 vNormal;
in vec2 vUV;

uniform vec3 uLightDirection;
uniform float uAmbient;
uniform float uDiffuse;
uniform sampler2D uTextureAtlas;
uniform bool uDebugMode;  // true = show vertex colors, false = show texture

out vec4 fragColor;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightDirection);
  
  float diffuse = max(dot(normal, lightDir), 0.0) * uDiffuse;
  float ambient = uAmbient;
  
  vec3 baseColor;
  if (uDebugMode) {
    baseColor = vColor;  // Show vertex colors for debugging
  } else {
    vec4 texColor = texture(uTextureAtlas, vUV);
    baseColor = texColor.rgb;
  }
  
  vec3 finalColor = baseColor * (ambient + diffuse);
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
    'uDiffuse',
    'uTextureAtlas',
    'uDebugMode'
  ]);
}

export function getVoxelAttribs(gl, program) {
  return getAttribLocations(gl, program, [
    'aPosition',
    'aColor',
    'aNormal',
    'aUV'
  ]);
}

export const DEFAULT_LIGHT_DIRECTION = [0.5, 1.0, 0.3];
export const DEFAULT_AMBIENT = 0.4;
export const DEFAULT_DIFFUSE = 0.6;
