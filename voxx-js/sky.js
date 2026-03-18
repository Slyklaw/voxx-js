/**
 * Sky Renderer
 */

import * as THREE from 'https://unpkg.com/three@0.179.0/build/three.module.js';

export class SkyRenderer {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.skyMesh = null;
    this.sunLight = null;
    this.moonLight = null;
    this.skyMaterial = null;
  }

  async init(scene, camera) {
    this.scene = scene;
    this.camera = camera;

    // Create sky dome
    const skyGeometry = new THREE.SphereGeometry(500, 32, 15);
    skyGeometry.scale(-1, 1, 1); // Invert the sphere so we see the inside

    // Create sky material
    this.skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: new THREE.Vector3(0.5, -1, 0.5) },
        moonDirection: { value: new THREE.Vector3(-0.5, -0.5, -0.5) },
        cycleProgress: { value: 0.0 },
        sunElevation: { value: 0.0 },
        moonElevation: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        varying vec3 vSunDirection;
        varying vec3 vMoonDirection;
        
        uniform vec3 sunDirection;
        uniform vec3 moonDirection;
        
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          vSunDirection = normalize(sunDirection);
          vMoonDirection = normalize(moonDirection);
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float cycleProgress;
        uniform float sunElevation;
        uniform float moonElevation;
        
        varying vec3 vWorldPosition;
        varying vec3 vSunDirection;
        varying vec3 vMoonDirection;
        
        vec3 getSkyColor(vec3 viewDir, vec3 sunDir, float sunElev) {
          // Simple sky gradient based on sun position
          float t = max(0.0, dot(viewDir, sunDir));
          float elevation = max(0.0, sunElev);
          
          // Day colors
          vec3 dayTop = vec3(0.2, 0.4, 0.8);
          vec3 dayHorizon = vec3(0.5, 0.7, 1.0);
          vec3 daySun = vec3(1.0, 0.9, 0.7);
          
          // Night colors
          vec3 nightTop = vec3(0.0, 0.0, 0.1);
          vec3 nightHorizon = vec3(0.1, 0.1, 0.3);
          vec3 nightMoon = vec3(0.7, 0.7, 0.9);
          
          // Mix based on sun elevation
          vec3 topColor = mix(nightTop, dayTop, elevation);
          vec3 horizonColor = mix(nightHorizon, dayHorizon, elevation);
          
          // Calculate sky gradient
          float horizonFactor = pow(max(0.0, viewDir.y), 0.5);
          vec3 skyColor = mix(horizonColor, topColor, 1.0 - horizonFactor);
          
          // Add sun/moon glow
          float sunGlow = pow(max(0.0, dot(viewDir, sunDir)), 32.0) * elevation;
          float moonGlow = pow(max(0.0, dot(viewDir, vMoonDirection)), 16.0) * moonElevation;
          
          skyColor += daySun * sunGlow * 0.5;
          skyColor += nightMoon * moonGlow * 0.3;
          
          return skyColor;
        }
        
        void main() {
          vec3 viewDir = normalize(vWorldPosition);
          
          vec3 skyColor = getSkyColor(viewDir, vSunDirection, sunElevation);
          
          gl_FragColor = vec4(skyColor, 1.0);
        }
      `,
      side: THREE.BackSide
    });

    this.skyMesh = new THREE.Mesh(skyGeometry, this.skyMaterial);
    this.scene.add(this.skyMesh);

    console.log('Sky renderer initialized');
  }

  update(skyData) {
    if (!this.skyMaterial) return;

    // Update sky uniforms
    this.skyMaterial.uniforms.sunDirection.value.set(
      skyData.sunDirection[0],
      skyData.sunDirection[1],
      skyData.sunDirection[2]
    );
    
    this.skyMaterial.uniforms.moonDirection.value.set(
      skyData.moonDirection[0],
      skyData.moonDirection[1],
      skyData.moonDirection[2]
    );
    
    this.skyMaterial.uniforms.cycleProgress.value = skyData.cycleProgress;
    this.skyMaterial.uniforms.sunElevation.value = skyData.sunElevation;
    this.skyMaterial.uniforms.moonElevation.value = skyData.moonElevation;
  }

  destroy() {
    if (this.skyMesh) {
      this.scene.remove(this.skyMesh);
      this.skyMesh.geometry.dispose();
      this.skyMaterial.dispose();
      this.skyMesh = null;
    }
  }
}
