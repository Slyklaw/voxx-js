import { createProgram, getUniformLocations, getAttribLocations } from '../gl/shaders.js';

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
uniform vec3 uTopColor;
uniform vec3 uBottomColor;

out vec4 fragColor;

void main() {
  // Dithering to reduce banding
  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
  
  // Apply dithering
  vec3 topColor = uTopColor + (dither - 0.5) * 0.02;
  vec3 bottomColor = uBottomColor + (dither - 0.5) * 0.02;
  
  // Vertical gradient: map y from [-100,100] to [0,1]
  float verticalFactor = clamp((vPosition.y + 100.0) / 200.0, 0.0, 1.0);
  vec3 skyColor = mix(bottomColor, topColor, verticalFactor);
  
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
    'uTopColor',
    'uBottomColor'
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
