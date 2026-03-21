import { createProgram, getUniformLocations } from '../gl/shaders.js';

const compositeVertexShader = `#version 300 es
precision highp float;

out vec2 TexCoords;

void main() {
    float x = float((gl_VertexID & 1) << 2);
    float y = float((gl_VertexID & 2) << 1);
    TexCoords = vec2(x * 0.5, y * 0.5);
    gl_Position = vec4(x - 1.0, y - 1.0, 0.0, 1.0);
}`;

const compositeFragmentShader = `#version 300 es
precision highp float;

in vec2 TexCoords;

uniform sampler2D gAlbedo;
uniform sampler2D ssaoBlur;
uniform float uAOIntensity;

out vec4 FragColor;

void main() {
    vec3 albedo = texture(gAlbedo, TexCoords).rgb;
    
    float ao = 1.0;
    if (uAOIntensity > 0.0) {
        // WebGL samples 0.0-1.0 across the entire texture regardless of its size compared to the screen
        ao = texture(ssaoBlur, TexCoords).r;
        // Apply intensity as power curve: higher = darker shadows
        ao = pow(ao, uAOIntensity);
    }
    
    // Composite: multiply albedo by AO factor
    FragColor = vec4(albedo * ao, 1.0);
}`;

export function createCompositeProgram(gl) {
  return createProgram(gl, compositeVertexShader, compositeFragmentShader);
}

export function getCompositeUniforms(gl, program) {
  return getUniformLocations(gl, program, [
    'gAlbedo',
    'ssaoBlur',
    'uAOIntensity'
  ]);
}