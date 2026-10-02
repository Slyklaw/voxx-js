import { createProgram, getUniformLocations } from '../gl/shaders.js';

const ssaoVertexShader = `#version 300 es
precision highp float;

out vec2 TexCoords;

void main() {
    // Fullscreen triangle from gl_VertexID
    float x = float((gl_VertexID & 1) << 2);
    float y = float((gl_VertexID & 2) << 1);
    TexCoords = vec2(x * 0.5, y * 0.5);
    gl_Position = vec4(x - 1.0, y - 1.0, 0.0, 1.0);
}`;

const ssaoFragmentShader = `#version 300 es
precision highp float;

in vec2 TexCoords;

uniform sampler2D gPosition;
uniform sampler2D gNormal;
uniform sampler2D texNoise;
uniform vec3 samples[32];
uniform mat4 projection;
uniform vec2 noiseScale;
uniform float radius;
uniform float bias;

out vec4 FragColor;

// Decode octahedral normal
vec3 octDecode(vec2 f) {
    f = f * 2.0 - 1.0;
    vec3 n = vec3(f.x, f.y, 1.0 - abs(f.x) - abs(f.y));
    float t = max(-n.z, 0.0);
    n.x += n.x >= 0.0 ? -t : t;
    n.y += n.y >= 0.0 ? -t : t;
    return normalize(n);
}

void main() {
    vec2 uv = clamp(TexCoords, 0.0, 1.0);
    vec3 fragPos = texture(gPosition, uv).rgb;
    
    // Skip sky areas (positions near or in front of camera)
    if (fragPos.z > -0.5) {
        FragColor = vec4(1.0, 1.0, 1.0, 1.0); // No occlusion for sky
        return;
    }
    
    vec3 normal = octDecode(texture(gNormal, TexCoords).rg);
    vec3 randomVec = texture(texNoise, TexCoords * noiseScale).xyz;
    
    vec3 tangent = normalize(randomVec - normal * dot(randomVec, normal));
    vec3 bitangent = cross(normal, tangent);
    mat3 TBN = mat3(tangent, bitangent, normal);
    
    float occlusion = 0.0;
    for(int i = 0; i < 32; ++i) {
        vec3 samplePos = TBN * samples[i];
        samplePos = fragPos + samplePos * radius;
        
        vec4 offset = projection * vec4(samplePos, 1.0);
        offset.xyz /= offset.w;
        offset.xyz = offset.xyz * 0.5 + 0.5;
        
        float sampleDepth = texture(gPosition, offset.xy).z;
        float rangeCheck = smoothstep(0.0, 1.0, radius / abs(fragPos.z - sampleDepth));
        occlusion += (sampleDepth >= samplePos.z + bias ? 1.0 : 0.0) * rangeCheck;
    }
    occlusion = 1.0 - (occlusion / 32.0);
    FragColor = vec4(occlusion, occlusion, occlusion, 1.0);
}`;

export function createSSAOProgram(gl) {
  return createProgram(gl, ssaoVertexShader, ssaoFragmentShader);
}

export function getSSAOUniforms(gl, program) {
  return getUniformLocations(gl, program, [
    'gPosition',
    'gNormal',
    'texNoise',
    'samples[0]',
    'projection',
    'noiseScale',
    'radius',
    'bias'
  ]);
}

export function generateKernelSamples(size = 32) {
  const kernel = [];
  for (let i = 0; i < size; ++i) {
    let sample = [
      Math.random() * 2.0 - 1.0,
      Math.random() * 2.0 - 1.0,
      Math.random()
    ];
    // Normalize to unit hemisphere
    const len = Math.sqrt(sample[0]*sample[0] + sample[1]*sample[1] + sample[2]*sample[2]);
    sample = sample.map(v => v / len);
    // Weight samples toward center
    const scale = i / size;
    const interpolation = 0.1 + 0.9 * scale * scale;
    sample = sample.map(v => v * interpolation);
    kernel.push(sample);
  }
  return kernel;
}

export function createNoiseTexture(gl, size = 4) {
  const noiseData = new Float32Array(size * size * 3);
  for (let i = 0; i < size * size; ++i) {
    // Random tangent vector (z = 0)
    noiseData[i*3 + 0] = Math.random() * 2.0 - 1.0;
    noiseData[i*3 + 1] = Math.random() * 2.0 - 1.0;
    noiseData[i*3 + 2] = 0.0;
  }
  const noiseTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, noiseTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB16F, size, size, 0, gl.RGB, gl.FLOAT, noiseData);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  return noiseTexture;
}