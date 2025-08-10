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
uniform vec2 waterAtlasPos;

void main() {
  vec3 normal = normalize(vNormal);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  vec3 lighting = ambientColor + diffuse * lightColor;
  
  // Check if this is a water block using block type (4.0 = WATER)
  bool isWater = abs(vBlockType - 4.0) < 0.5;
  
  vec3 finalColor;
  if (isWater) {
    // Calculate UV coordinates for water texture in atlas
    vec2 atlasUV = vUv;
    
    // Get the fractional part for tiling
    vec2 tileUV = fract(atlasUV);
    
    // Map to the water texture location in the atlas
    float tileSize = 16.0;
    
    // Calculate final UV coordinates
    // Flip Y coordinate because texture atlas is upside down in WebGL
    vec2 finalUV = vec2(
      (waterAtlasPos.x + tileUV.x * tileSize) / atlasSize.x,
      (atlasSize.y - waterAtlasPos.y - tileSize + tileUV.y * tileSize) / atlasSize.y
    );
    
    vec4 texColor = texture2D(textureAtlas, finalUV);
    // Apply texture to water blocks with lighting
    finalColor = texColor.rgb * lighting;
  } else {
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
uniform vec2 waterAtlasPos;

void main() {
  vec3 normal = normalize(vNormal);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  vec3 lighting = ambientColor + diffuse * lightColor;
  
  // Check if this is a water block using block type (4.0 = WATER)
  bool isWater = abs(vBlockType - 4.0) < 0.5;
  
  vec3 finalColor;
  if (isWater) {
    // Calculate UV coordinates for water texture in atlas
    vec2 atlasUV = vUv;
    
    // Get the fractional part for tiling
    vec2 tileUV = fract(atlasUV);
    
    // Map to the water texture location in the atlas
    float tileSize = 16.0;
    
    // Calculate final UV coordinates
    // Flip Y coordinate because texture atlas is upside down in WebGL
    vec2 finalUV = vec2(
      (waterAtlasPos.x + tileUV.x * tileSize) / atlasSize.x,
      (atlasSize.y - waterAtlasPos.y - tileSize + tileUV.y * tileSize) / atlasSize.y
    );
    
    vec4 texColor = texture2D(textureAtlas, finalUV);
    // Apply texture to water blocks with lighting
    finalColor = texColor.rgb * lighting;
  } else {
    finalColor = vColor * lighting;
  }
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;