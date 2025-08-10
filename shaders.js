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
uniform float blockAtlasTopX[6];
uniform float blockAtlasTopY[6];
uniform float blockAtlasSidesX[6];
uniform float blockAtlasSidesY[6];
uniform float blockAtlasBottomX[6];
uniform float blockAtlasBottomY[6];

// Function to get atlas position for each block type based on face direction
vec2 getBlockAtlasPos(float blockType, vec3 normal) {
  int blockIndex = int(blockType + 0.5); // Round to nearest integer
  if (blockIndex >= 0 && blockIndex < 6) {
    // Determine face type based on normal
    if (normal.y > 0.5) {
      // Top face
      return vec2(blockAtlasTopX[blockIndex], blockAtlasTopY[blockIndex]);
    } else if (normal.y < -0.5) {
      // Bottom face
      return vec2(blockAtlasBottomX[blockIndex], blockAtlasBottomY[blockIndex]);
    } else {
      // Side faces (north, south, east, west)
      return vec2(blockAtlasSidesX[blockIndex], blockAtlasSidesY[blockIndex]);
    }
  }
  return vec2(0.0, 0.0); // Default/fallback
}

// Function to rotate UV coordinates
vec2 rotateUV(vec2 uv, float angle) {
  float cosAngle = cos(angle);
  float sinAngle = sin(angle);
  
  // Center UV around (0.5, 0.5) for rotation
  vec2 centeredUV = uv - 0.5;
  
  // Apply rotation matrix
  vec2 rotatedUV = vec2(
    centeredUV.x * cosAngle - centeredUV.y * sinAngle,
    centeredUV.x * sinAngle + centeredUV.y * cosAngle
  );
  
  // Move back to (0,1) range
  return rotatedUV + 0.5;
}

void main() {
  vec3 normal = normalize(vNormal);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  vec3 lighting = ambientColor + diffuse * lightColor;
  
  // Check if this block should use texture (not AIR)
  bool useTexture = vBlockType > 0.5;
  
  vec3 finalColor;
  if (useTexture) {
    // Get atlas position for this block type and face direction
    vec2 blockAtlasPos = getBlockAtlasPos(vBlockType, normal);
    
    // Calculate UV coordinates for texture in atlas
    vec2 atlasUV = vUv;
    
    // Get the fractional part for tiling
    vec2 tileUV = fract(atlasUV);
    
    // Apply rotation based on face direction (only for side faces)
    if (abs(normal.y) < 0.5) { // Side faces only
      if (abs(normal.x) > 0.5) {
        // East/West faces: rotate 90 degrees
        tileUV = rotateUV(tileUV, 1.5707963); // π/2
      }
    }
    
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
uniform float blockAtlasTopX[6];
uniform float blockAtlasTopY[6];
uniform float blockAtlasSidesX[6];
uniform float blockAtlasSidesY[6];
uniform float blockAtlasBottomX[6];
uniform float blockAtlasBottomY[6];

// Function to get atlas position for each block type based on face direction
vec2 getBlockAtlasPos(float blockType, vec3 normal) {
  int blockIndex = int(blockType + 0.5); // Round to nearest integer
  if (blockIndex >= 0 && blockIndex < 6) {
    // Determine face type based on normal
    if (normal.y > 0.5) {
      // Top face
      return vec2(blockAtlasTopX[blockIndex], blockAtlasTopY[blockIndex]);
    } else if (normal.y < -0.5) {
      // Bottom face
      return vec2(blockAtlasBottomX[blockIndex], blockAtlasBottomY[blockIndex]);
    } else {
      // Side faces (north, south, east, west)
      return vec2(blockAtlasSidesX[blockIndex], blockAtlasSidesY[blockIndex]);
    }
  }
  return vec2(0.0, 0.0); // Default/fallback
}

// Function to rotate UV coordinates
vec2 rotateUV(vec2 uv, float angle) {
  float cosAngle = cos(angle);
  float sinAngle = sin(angle);
  
  // Center UV around (0.5, 0.5) for rotation
  vec2 centeredUV = uv - 0.5;
  
  // Apply rotation matrix
  vec2 rotatedUV = vec2(
    centeredUV.x * cosAngle - centeredUV.y * sinAngle,
    centeredUV.x * sinAngle + centeredUV.y * cosAngle
  );
  
  // Move back to (0,1) range
  return rotatedUV + 0.5;
}

void main() {
  vec3 normal = normalize(vNormal);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  vec3 lighting = ambientColor + diffuse * lightColor;
  
  // Check if this block should use texture (not AIR)
  bool useTexture = vBlockType > 0.5;
  
  vec3 finalColor;
  if (useTexture) {
    // Get atlas position for this block type and face direction
    vec2 blockAtlasPos = getBlockAtlasPos(vBlockType, normal);
    
    // Calculate UV coordinates for texture in atlas
    vec2 atlasUV = vUv;
    
    // Get the fractional part for tiling
    vec2 tileUV = fract(atlasUV);
    
    // Apply rotation based on face direction (only for side faces)
    if (abs(normal.y) < 0.5) { // Side faces only
      if (abs(normal.x) > 0.5) {
        if (normal.x > 0.5) {
          // East face: rotate 180 degrees
          tileUV = rotateUV(tileUV, 3.1415926); // π
        } else {
          // West face: rotate 90 degrees counter-clockwise
          tileUV = rotateUV(tileUV, 1.5707963); // π/2
        }
      }
    }
    
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