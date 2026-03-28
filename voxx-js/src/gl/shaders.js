import { registerContextResources } from './context.js';

export function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!compiled) {
    const infoLog = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(`Shader compilation error: ${infoLog}`);
  }

  return shader;
}

export function createProgram(gl, vertexSource, fragmentSource) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
    const infoLog = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(`Program linking error: ${infoLog}`);
  }

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  // Register program with context registry for lifecycle management
  // Store sources for recreation on context restore
  const sources = { vertexSource, fragmentSource };
  registerContextResources({
    dispose: () => {
      gl.deleteProgram(program);
    },
    init: () => {
      // Recreate program on context restore using stored sources
      const newVertexShader = compileShader(gl, gl.VERTEX_SHADER, sources.vertexSource);
      const newFragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, sources.fragmentSource);
      gl.attachShader(program, newVertexShader);
      gl.attachShader(program, newFragmentShader);
      gl.linkProgram(program);
      gl.deleteShader(newVertexShader);
      gl.deleteShader(newFragmentShader);
    }
  });

  return program;
}

export function getUniformLocations(gl, program, names) {
  const locations = {};
  for (const name of names) {
    locations[name] = gl.getUniformLocation(program, name);
  }
  return locations;
}

export function getAttribLocations(gl, program, names) {
  const locations = {};
  for (const name of names) {
    locations[name] = gl.getAttribLocation(program, name);
  }
  return locations;
}

export const sampleVertexShader = `#version 300 es
in vec3 aPosition;
uniform mat4 uModelViewProjection;
void main() {
  gl_Position = uModelViewProjection * vec4(aPosition, 1.0);
}`;

export const sampleFragmentShader = `#version 300 es
precision highp float;
uniform vec4 uColor;
out vec4 fragColor;
void main() {
  fragColor = uColor;
}`;
