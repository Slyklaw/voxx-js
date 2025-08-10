export const vertexShader = `
attribute vec3 color;
attribute float blockType;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vColor;
varying vec2 vUv;
varying float vBlockType;

void main() {
  vNormal = normal;
  vPosition = position;
  vColor = color;
  vUv = uv;
  vBlockType = blockType;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const fragmentShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vColor;
varying vec2 vUv;
varying float vBlockType;

uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 ambientColor;
uniform sampler2D textureAtlas;
uniform vec2 atlasSize;
uniform float blockAtlasPosX[6];
uniform float blockAtlasPosY[6];

// Function to get atlas position for each block type
vec2 getBlockAtlasPos(float blockType) {
  int blockIndex = int(blockType + 0.5); // Round to nearest integer
  if (blockIndex >= 0 && blockIndex < 6) {
    return vec2(blockAtlasPosX[blockIndex], blockAtlasPosY[blockIndex]);
  }
  return vec2(0.0, 0.0); // Default/fallback
}

void main() {
  vec3 normal = normalize(vNormal);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  vec3 lighting = ambientColor + diffuse * lightColor;
  
  // Check if this block should use texture (not AIR)
  bool useTexture = vBlockType > 0.5;
  
  vec3 finalColor;
  if (useTexture) {
    // Get atlas position for this block type
    vec2 blockAtlasPos = getBlockAtlasPos(vBlockType);
    
    // Calculate UV coordinates for texture in atlas
    vec2 atlasUV = vUv;
    
    // Get the fractional part for tiling
    vec2 tileUV = fract(atlasUV);
    
    // Map to the block texture location in the atlas
    float tileSize = 16.0;
    
    // Calculate final UV coordinates
    // Flip Y coordinate because texture atlas is upside down in WebGL
    vec2 finalUV = vec2(
      (blockAtlasPos.x + tileUV.x * tileSize) / atlasSize.x,
      (atlasSize.y - blockAtlasPos.y - tileSize + tileUV.y * tileSize) / atlasSize.y
    );
    
    vec4 texColor = texture2D(textureAtlas, finalUV);
    // Apply texture to blocks with lighting
    finalColor = texColor.rgb * lighting;
  } else {
    // Use vertex color for AIR or fallback
    finalColor = vColor * lighting;
  }
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// Chunk-specific shaders (same as above for consistency)
export const CHUNK_VERTEX_SHADER = `
attribute vec3 color;
attribute float blockType;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vColor;
varying vec2 vUv;
varying float vBlockType;

void main() {
  vNormal = normal;
  vPosition = position;
  vColor = color;
  vUv = uv;
  vBlockType = blockType;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const CHUNK_FRAGMENT_SHADER = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vColor;
varying vec2 vUv;
varying float vBlockType;

uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 ambientColor;
uniform sampler2D textureAtlas;
uniform vec2 atlasSize;
uniform float blockAtlasPosX[6];
uniform float blockAtlasPosY[6];

// Function to get atlas position for each block type
vec2 getBlockAtlasPos(float blockType) {
  int blockIndex = int(blockType + 0.5); // Round to nearest integer
  if (blockIndex >= 0 && blockIndex < 6) {
    return vec2(blockAtlasPosX[blockIndex], blockAtlasPosY[blockIndex]);
  }
  return vec2(0.0, 0.0); // Default/fallback
}

void main() {
  vec3 normal = normalize(vNormal);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  vec3 lighting = ambientColor + diffuse * lightColor;
  
  // Check if this block should use texture (not AIR)
  bool useTexture = vBlockType > 0.5;
  
  vec3 finalColor;
  if (useTexture) {
    // Get atlas position for this block type
    vec2 blockAtlasPos = getBlockAtlasPos(vBlockType);
    
    // Calculate UV coordinates for texture in atlas
    vec2 atlasUV = vUv;
    
    // Get the fractional part for tiling
    vec2 tileUV = fract(atlasUV);
    
    // Map to the block texture location in the atlas
    float tileSize = 16.0;
    
    // Calculate final UV coordinates
    // Flip Y coordinate because texture atlas is upside down in WebGL
    vec2 finalUV = vec2(
      (blockAtlasPos.x + tileUV.x * tileSize) / atlasSize.x,
      (atlasSize.y - blockAtlasPos.y - tileSize + tileUV.y * tileSize) / atlasSize.y
    );
    
    vec4 texColor = texture2D(textureAtlas, finalUV);
    // Apply texture to blocks with lighting
    finalColor = texColor.rgb * lighting;
  } else {
    // Use vertex color for AIR or fallback
    finalColor = vColor * lighting;
  }
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;