import { createProgram, getUniformLocations, getAttribLocations } from '../gl/shaders.js';

const shadowVertexShader = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
uniform mat4 uLightSpaceMatrix;

void main() {
    gl_Position = uLightSpaceMatrix * vec4(aPosition, 1.0);
}`;

const shadowFragmentShader = `#version 300 es
precision highp float;
void main() {
    // Empty, WebGL inherently writes to depth buffer
}`;

export function createShadowProgram(gl) {
  return createProgram(gl, shadowVertexShader, shadowFragmentShader);
}

export function getShadowUniforms(gl, program) {
  return getUniformLocations(gl, program, [
    'uLightSpaceMatrix'
  ]);
}

export function getShadowAttribs(gl, program) {
  return getAttribLocations(gl, program, [
    'aPosition'
  ]);
}
