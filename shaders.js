export const vertexShader = `
attribute vec3 color;
attribute float blockType;
attribute float faceType; // 0=top, 1=sides, 2=bottom
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vColor;
varying vec2 vUv;
varying float vBlockType;
varying float vFaceType;

void main() {
  vNormal = normal;
  vPosition = position;
  vColor = color;
  vUv = uv;
  vBlockType = blockType;
  vFaceType = faceType;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const fragmentShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vColor;
varying vec2 vUv;
varying float vBlockType;
varying float vFaceType;

uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 ambientColor;

// Individual block textures
uniform sampler2D airTopTexture;
uniform sampler2D airSidesTexture;
uniform sampler2D airBottomTexture;
uniform sampler2D stoneTopTexture;
uniform sampler2D stoneSidesTexture;
uniform sampler2D stoneBottomTexture;
uniform sampler2D dirtTopTexture;
uniform sampler2D dirtSidesTexture;
uniform sampler2D dirtBottomTexture;
uniform sampler2D grassTopTexture;
uniform sampler2D grassSidesTexture;
uniform sampler2D grassBottomTexture;
uniform sampler2D waterTopTexture;
uniform sampler2D waterSidesTexture;
uniform sampler2D waterBottomTexture;
uniform sampler2D snowTopTexture;
uniform sampler2D snowSidesTexture;
uniform sampler2D snowBottomTexture;

vec4 getBlockTexture(float blockType, float faceType, vec2 uv) {
  int blockIndex = int(blockType + 0.5);
  int face = int(faceType + 0.5);
  
  // Air (0)
  if (blockIndex == 0) {
    if (face == 0) return texture2D(airTopTexture, uv);
    else if (face == 1) return texture2D(airSidesTexture, uv);
    else return texture2D(airBottomTexture, uv);
  }
  // Stone (1)
  else if (blockIndex == 1) {
    if (face == 0) return texture2D(stoneTopTexture, uv);
    else if (face == 1) return texture2D(stoneSidesTexture, uv);
    else return texture2D(stoneBottomTexture, uv);
  }
  // Dirt (2)
  else if (blockIndex == 2) {
    if (face == 0) return texture2D(dirtTopTexture, uv);
    else if (face == 1) return texture2D(dirtSidesTexture, uv);
    else return texture2D(dirtBottomTexture, uv);
  }
  // Grass (3)
  else if (blockIndex == 3) {
    if (face == 0) return texture2D(grassTopTexture, uv);
    else if (face == 1) return texture2D(grassSidesTexture, uv);
    else return texture2D(grassBottomTexture, uv);
  }
  // Water (4)
  else if (blockIndex == 4) {
    if (face == 0) return texture2D(waterTopTexture, uv);
    else if (face == 1) return texture2D(waterSidesTexture, uv);
    else return texture2D(waterBottomTexture, uv);
  }
  // Snow (5)
  else if (blockIndex == 5) {
    if (face == 0) return texture2D(snowTopTexture, uv);
    else if (face == 1) return texture2D(snowSidesTexture, uv);
    else return texture2D(snowBottomTexture, uv);
  }
  
  // Fallback to white
  return vec4(1.0, 1.0, 1.0, 1.0);
}

void main() {
  vec3 normal = normalize(vNormal);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  vec3 lighting = ambientColor + diffuse * lightColor;
  
  // Check if this block should use texture (not AIR)
  bool useTexture = vBlockType > 0.5;
  
  vec3 finalColor;
  if (useTexture) {
    // Get texture for this block type and face
    vec4 texColor = getBlockTexture(vBlockType, vFaceType, vUv);
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
export const CHUNK_VERTEX_SHADER = vertexShader;
export const CHUNK_FRAGMENT_SHADER = fragmentShader;
