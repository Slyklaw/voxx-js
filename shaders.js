export const vertexShader = `
attribute vec3 color;
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vColor;

void main() {
  vNormal = normal;
  vPosition = position;
  vColor = color;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const fragmentShader = `
varying vec3 vNormal;
varying vec3 vPosition;
varying vec3 vColor;

uniform vec3 lightDirection;
uniform vec3 lightColor;
uniform vec3 ambientColor;

void main() {
  vec3 normal = normalize(vNormal);
  float diffuse = max(dot(normal, lightDirection), 0.0);
  vec3 lighting = ambientColor + diffuse * lightColor;
  gl_FragColor = vec4(vColor * lighting, 1.0);
}
`;
