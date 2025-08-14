export const vertexShader = `
attribute vec3 color;
attribute float blockType;
attribute float faceType; // 0=top, 1=sides, 2=bottom
attribute vec4 textureBounds; // u1, v1, u2, v2 for atlas bounds
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vColor;
varying vec2 vUv;
varying float vBlockType;
varying float vFaceType;
varying vec4 vTextureBounds;

void main() {
  vNormal = normal;
  vPosition = position;
  vColor = color;
  vUv = uv;
  vBlockType = blockType;
  vFaceType = faceType;
  vTextureBounds = textureBounds;
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
varying vec4 vTextureBounds;

uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 ambientColor;
uniform sampler2D atlasTexture;

void main() {
  vec3 normal = normalize(vNormal);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  vec3 lighting = ambientColor + diffuse * lightColor;
  
  // Check if this block should use texture (not AIR)
  bool useTexture = vBlockType > 0.5;
  
  vec3 finalColor;
  if (useTexture) {
    // Extract texture bounds from vertex attribute
    float u1 = vTextureBounds.x;
    float v1 = vTextureBounds.y;
    float u2 = vTextureBounds.z;
    float v2 = vTextureBounds.w;
    
    // Calculate texture size in atlas space
    float uRange = u2 - u1;
    float vRange = v2 - v1;
    
    // Wrap UV coordinates within the texture bounds for proper tiling
    vec2 localUv = fract(vUv);
    
    // Check face direction and apply appropriate texture rotation
    if (abs(normal.x - 1.0) < 0.1) {
      // East face: rotate -90 degrees
      // -90 degree rotation matrix: [0, 1; -1, 0]
      localUv = vec2(localUv.y, 1.0 - localUv.x);
    } else if (abs(normal.x + 1.0) < 0.1) {
      // West face: rotate -90 degrees
      // -90 degree rotation matrix: [0, 1; -1, 0]
      localUv = vec2(localUv.y, 1.0 - localUv.x);
    } else if (abs(normal.z + 1.0) < 0.1) {
      // South face: rotate 180 degrees
      // 180 degree rotation: flip both u and v
      localUv = vec2(1.0 - localUv.x, 1.0 - localUv.y);
    } else if (abs(normal.z - 1.0) < 0.1) {
      // North face: rotate 180 degrees
      // 180 degree rotation: flip both u and v
      localUv = vec2(1.0 - localUv.x, 1.0 - localUv.y);
    }
    
    vec2 atlasUv = vec2(
      u1 + localUv.x * uRange,
      v1 + localUv.y * vRange
    );
    
    // Sample from texture atlas using properly wrapped coordinates
    vec4 texColor = texture2D(atlasTexture, atlasUv);
    
    // Apply texture to blocks with lighting
    finalColor = texColor.rgb * lighting;
    
    // Debug: Temporarily disabled to see actual texture colors
    // if (texColor.a < 0.1 || length(texColor.rgb) < 0.1) {
    //   finalColor = vec3(1.0, 0.0, 1.0); // Magenta for missing textures
    // }
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
