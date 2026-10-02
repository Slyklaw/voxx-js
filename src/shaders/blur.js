import { createProgram, getUniformLocations } from '../gl/shaders.js';

const blurVertexShader = `#version 300 es
precision highp float;

out vec2 TexCoords;

void main() {
    float x = float((gl_VertexID & 1) << 2);
    float y = float((gl_VertexID & 2) << 1);
    TexCoords = vec2(x * 0.5, y * 0.5);
    gl_Position = vec4(x - 1.0, y - 1.0, 0.0, 1.0);
}`;

const blurFragmentShader = `#version 300 es
precision highp float;

in vec2 TexCoords;

uniform sampler2D ssaoInput;
uniform sampler2D gPosition;

out float FragColor;

void main() {
    vec2 texelSize = 1.0 / vec2(textureSize(ssaoInput, 0));
    float result = 0.0;
    float weightSum = 0.0;
    
    // Get depth of the center pixel being blurred
    float centerDepth = texture(gPosition, TexCoords).z;
    
    for (int x = -2; x < 2; ++x) {
        for (int y = -2; y < 2; ++y) {
            vec2 offset = vec2(float(x), float(y)) * texelSize;
            float sampleDepth = texture(gPosition, TexCoords + offset).z;
            
            // Depth difference weight: if the adjacent pixel varies wildly in depth,
            // don't include its AO value in the blur. This prevents halo bleeding!
            float depthDiff = abs(centerDepth - sampleDepth);
            float weight = depthDiff < 0.2 ? 1.0 : 0.0;
            
            result += texture(ssaoInput, TexCoords + offset).r * weight;
            weightSum += weight;
        }
    }
    
    // Fallback to center value if all samples rejected
    FragColor = weightSum > 0.0 ? result / weightSum : texture(ssaoInput, TexCoords).r;
}`;

export function createBlurProgram(gl) {
  return createProgram(gl, blurVertexShader, blurFragmentShader);
}

export function getBlurUniforms(gl, program) {
  return getUniformLocations(gl, program, [
    'ssaoInput',
    'gPosition'
  ]);
}