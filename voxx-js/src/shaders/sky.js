import { createProgram, getUniformLocations, getAttribLocations } from './shaders.js';

const skyVertexShader = `#version 300 es
precision highp float;

in vec3 aPosition;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

out vec3 vPosition;

void main() {
  vec4 worldPos = uModelMatrix * vec4(aPosition, 1.0);
  vPosition = worldPos.xyz;
  
  mat4 viewNoTranslation = uViewMatrix;
  viewNoTranslation[3] = vec4(0.0, 0.0, 0.0, 1.0);
  
  vec4 viewPos = viewNoTranslation * worldPos;
  gl_Position = uProjectionMatrix * viewPos;
}`;

const skyFragmentShader = `#version 300 es
precision highp float;

in vec3 vPosition;

uniform float uTimeOfDay;
uniform vec3 uDayTopColor;
uniform vec3 uDayBottomColor;
uniform vec3 uNightTopColor;
uniform vec3 uNightBottomColor;

out vec4 fragColor;

void main() {
  vec3 dayColor = mix(uDayBottomColor, uDayTopColor, max(0.0, vPosition.y * 0.5 + 0.5));
  vec3 nightColor = mix(uNightBottomColor, uNightTopColor, max(0.0, vPosition.y * 0.5 + 0.5));
  
  vec3 skyColor = mix(nightColor, dayColor, uTimeOfDay);
  fragColor = vec4(skyColor, 1.0);
}`;

export function createSkyProgram(gl) {
  return createProgram(gl, skyVertexShader, skyFragmentShader);
}

export function getSkyUniforms(gl, program) {
  return getUniformLocations(gl, program, [
    'uModelMatrix',
    'uViewMatrix',
    'uProjectionMatrix',
    'uTimeOfDay',
    'uDayTopColor',
    'uDayBottomColor',
    'uNightTopColor',
    'uNightBottomColor'
  ]);
}

export function getSkyAttribs(gl, program) {
  return getAttribLocations(gl, program, ['aPosition']);
}

export const DEFAULT_DAY_TOP = [0.53, 0.81, 0.92];
export const DEFAULT_DAY_BOTTOM = [1.0, 1.0, 1.0];
export const DEFAULT_NIGHT_TOP = [0.043, 0.063, 0.149];
export const DEFAULT_NIGHT_BOTTOM = [0.106, 0.153, 0.271];

export function getDefaultColors() {
  return {
    dayTop: DEFAULT_DAY_TOP,
    dayBottom: DEFAULT_DAY_BOTTOM,
    nightTop: DEFAULT_NIGHT_TOP,
    nightBottom: DEFAULT_NIGHT_BOTTOM
  };
}
