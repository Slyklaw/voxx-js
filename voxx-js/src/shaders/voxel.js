import { createProgram, getUniformLocations, getAttribLocations } from '../gl/shaders.js';

const voxelVertexShader = `#version 300 es
precision highp float;

layout(location = 0) in vec3 aPosition;
layout(location = 1) in vec3 aColor;
layout(location = 2) in vec3 aNormal;
layout(location = 3) in vec2 aUV;          // Scaled by face dimensions
layout(location = 4) in vec2 aTileBase;    // Base UV coordinates in atlas
layout(location = 5) in float aTriangleVariant;  // 0.0 or 1.0 to distinguish triangles

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec2 uTileSpan;  // Size of one tile in UV space

uniform mat4 uLightSpaceMatrix;

out vec3 vColor;
out vec3 vNormal;
out vec2 vTileUnits;     // Position in tile units for interpolation
out vec2 vTileBase;      // Tile base UV (same for all vertices of a face)
out float vTriangleVariant;  // Pass through to fragment shader
out vec3 vViewPosition;
out vec3 vViewNormal;
out vec4 vFragPosLightSpace;

void main() {
  vColor = aColor;
  vNormal = mat3(uModelMatrix) * aNormal;
  vTileBase = aTileBase;  // Pass through to fragment shader
  vTriangleVariant = aTriangleVariant;
  
  // Convert to tile units: left edge = 0, right edge = faceWidth
  vTileUnits = (aUV - aTileBase) / uTileSpan;
  
  // View-space transforms for G-buffer
  vec4 viewPos = uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
  vViewPosition = viewPos.xyz;
  vViewNormal = mat3(uViewMatrix) * mat3(uModelMatrix) * aNormal;
  
  
  gl_Position = uProjectionMatrix * viewPos;
  vFragPosLightSpace = uLightSpaceMatrix * uModelMatrix * vec4(aPosition, 1.0);
}`;

const voxelFragmentShader = `#version 300 es
precision highp float;
precision highp sampler2DShadow;

in vec3 vColor;
in vec3 vNormal;
in vec2 vTileUnits;   // Position in tile units (interpolated)
in vec2 vTileBase;    // Tile base UV (same for all vertices)
in float vTriangleVariant;  // 0.0 or 1.0 to distinguish triangles
in vec3 vViewNormal;
in vec3 vViewPosition; // View-space position for SSAO
in vec4 vFragPosLightSpace;

uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform float uAmbient;
uniform float uDiffuse;
uniform sampler2D uTextureAtlas;
uniform bool uDebugMode;
uniform vec2 uTileSpan;   // Size of one tile in UV space
uniform bool uUseFloatTextures; // Whether float textures are supported
uniform mat4 uLightSpaceMatrix;
uniform sampler2DShadow uShadowMap;

layout(location = 0) out vec4 gAlbedo;
layout(location = 1) out vec2 gViewNormal;
layout(location = 2) out vec3 gViewPosition;

vec2 octEncode(vec3 n) {
  n /= (abs(n.x) + abs(n.y) + abs(n.z));
  if (n.z < 0.0) {
    n.xy = (1.0 - abs(n.yx)) * vec2(n.x >= 0.0 ? 1.0 : -1.0, n.y >= 0.0 ? 1.0 : -1.0);
  }
  return n.xy * 0.5 + 0.5;
}

float ShadowCalculation(vec4 fragPosLightSpace, vec3 normal, vec3 lightDir) {
  // perform perspective divide
  vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
  // transform to [0,1] range
  projCoords = projCoords * 0.5 + 0.5;
  
  // Keep outside areas fully illuminated to prevent abrupt dark boundaries
  if (projCoords.z > 1.0) return 1.0;
  if (projCoords.x < 0.0 || projCoords.x > 1.0 || projCoords.y < 0.0 || projCoords.y > 1.0) return 1.0;

  // calculate bias (based on depth map resolution and slope)
  float bias = max(0.005 * (1.0 - dot(normal, lightDir)), 0.001);

  // PCF (Percentage-Closer Filtering) 3x3 kernel
  float shadow = 0.0;
  vec2 texelSize = 1.0 / vec2(4096.0); // Size of the shadow map
  for (int x = -1; x <= 1; ++x) {
    for (int y = -1; y <= 1; ++y) {
      // sampler2DShadow hardware comparison directly returns 1.0 (lit) or 0.0 (shadowed)
      shadow += texture(uShadowMap, vec3(projCoords.xy + vec2(x, y) * texelSize, projCoords.z - bias)); 
    }
  }
  return shadow / 9.0;
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 lightDir = normalize(uLightDirection);
  
  // Calculate dynamic shadow factor
  float shadow = ShadowCalculation(vFragPosLightSpace, normal, lightDir);
  
  // Diffuse is heavily suppressed when in shadow
  float diffuse = max(dot(normal, lightDir), 0.0) * uDiffuse * shadow;
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
    // Flip V within tile to correct upside-down textures
    vec2 atlasUV = vTileBase + vec2(wrappedTileUnits.x * uTileSpan.x, (1.0 - wrappedTileUnits.y) * uTileSpan.y);
    
    vec4 texColor = texture(uTextureAtlas, atlasUV);
    baseColor = texColor.rgb;
  }
  
  // Base structural face shading for persistent depth
  float faceShade = 1.0;
  if (abs(normal.x) > 0.5) faceShade = 0.8;      // East/West faces slightly darker
  else if (abs(normal.z) > 0.5) faceShade = 0.9; // North/South faces
  else if (normal.y < -0.5) faceShade = 0.6;     // Bottom faces darkest
  
  vec3 finalColor = baseColor * faceShade * (ambient + diffuse * uLightIntensity) * uLightColor;
  gAlbedo = vec4(finalColor, 1.0);
  gViewNormal = octEncode(normalize(vViewNormal));
  gViewPosition = vViewPosition;
}`;

export function createVoxelProgram(gl) {
  return createProgram(gl, voxelVertexShader, voxelFragmentShader);
}

export function getVoxelUniforms(gl, program) {
  return getUniformLocations(gl, program, [
    'uModelMatrix',
    'uViewMatrix',
    'uProjectionMatrix',
    'uLightDirection',
    'uLightColor',
    'uLightIntensity',
    'uAmbient',
    'uDiffuse',
    'uTextureAtlas',
    'uDebugMode',
    'uTileSpan',
    'uUseFloatTextures',
    'uLightSpaceMatrix',
    'uShadowMap'
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
