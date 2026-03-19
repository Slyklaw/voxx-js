import { createProgram, getUniformLocations, getAttribLocations } from '../gl/shaders.js';

const voxelVertexShader = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aColor;
layout(location = 2) in vec3 aNormal;
layout(location = 3) in vec2 aUV;          // Scaled by face dimensions
layout(location = 4) in vec2 aTileBase;    // Base UV coordinates in atlas
layout(location = 5) in float aTriangleVariant;  // 0.0 or 1.0 to distinguish triangles

uniform mat4 uModelViewProjection;
uniform mat4 uModelMatrix;
uniform vec2 uTileSpan;  // Size of one tile in UV space

out vec3 vColor;
out vec3 vNormal;
out vec2 vTileUnits;     // Position in tile units for interpolation
out vec2 vTileBase;      // Tile base UV (same for all vertices of a face)
out float vTriangleVariant;  // Pass through to fragment shader

void main() {
  vColor = aColor;
  vNormal = mat3(uModelMatrix) * aNormal;
  vTileBase = aTileBase;  // Pass through to fragment shader
  vTriangleVariant = aTriangleVariant;
  
  // Convert to tile units: left edge = 0, right edge = faceWidth
  vTileUnits = (aUV - aTileBase) / uTileSpan;
  
  gl_Position = uModelViewProjection * vec4(aPosition, 1.0);
}`;

const voxelFragmentShader = `#version 300 es
precision highp float;

in vec3 vColor;
in vec3 vNormal;
in vec2 vTileUnits;   // Position in tile units (interpolated)
in vec2 vTileBase;    // Tile base UV (same for all vertices)
in float vTriangleVariant;  // 0.0 or 1.0 to distinguish triangles

uniform vec3 uLightDirection;
uniform float uAmbient;
uniform float uDiffuse;
uniform sampler2D uTextureAtlas;
uniform bool uDebugMode;
uniform vec2 uTileSpan;   // Size of one tile in UV space

out vec4 fragColor;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightDirection);
  
  float diffuse = max(dot(normal, lightDir), 0.0) * uDiffuse;
  float ambient = uAmbient;
  
  vec3 baseColor;
  if (uDebugMode) {
    // In debug mode, slightly brighten or darken based on triangle variant
    float variantFactor = mix(0.7, 1.0, vTriangleVariant);
    baseColor = vColor * variantFactor;
  } else {
    // Rotate X faces 90° counter-clockwise: (u, v) → (1-v, u)
    vec2 tileUnits = vTileUnits;
    if (abs(normal.x) > 0.5) {
      tileUnits = vec2(1.0 - vTileUnits.y, vTileUnits.x);
    }
    
    // Wrap tile units within single tile [0, 1)
    vec2 wrappedTileUnits = fract(tileUnits);
    
    // If wrapped is near 0 and original was > 0.5, it wrapped from an integer
    // Use this to map integer-wrapped values to near 1 (right edge of tile)
    vec2 isNearZero = step(wrappedTileUnits, vec2(0.001));
    vec2 isLargeUnit = step(vec2(0.5), tileUnits);
    wrappedTileUnits = mix(wrappedTileUnits, vec2(0.999), isNearZero * isLargeUnit);
    
    // Compute atlas UV using tile base and wrapped position
    vec2 atlasUV = vTileBase + wrappedTileUnits * uTileSpan;
    
    vec4 texColor = texture(uTextureAtlas, atlasUV);
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
    'uDebugMode',
    'uTileSpan'
  ]);
}

export function getVoxelAttribs(gl, program) {
  return getAttribLocations(gl, program, [
    'aPosition',
    'aColor',
    'aNormal',
    'aUV',
    'aTileBase',
    'aTriangleVariant'
  ]);
}

export const DEFAULT_LIGHT_DIRECTION = [0.5, 1.0, 0.3];
export const DEFAULT_AMBIENT = 0.4;
export const DEFAULT_DIFFUSE = 0.6;
