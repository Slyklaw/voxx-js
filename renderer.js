/**
 * Renderer for Voxel Engine
 */

import * as THREE from 'https://unpkg.com/three@0.179.0/build/three.module.js';
import { SkyRenderer } from './sky.js';
import { vertexShader, fragmentShader } from './shaders.js';

import { pluginManager } from './plugins.js';

export class Renderer {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.canvas = null;
    this.skyRenderer = null;
    this.chunkMeshes = new Map();
    this.outlineMesh = null;
    this.ambientLight = null;
    this.directionalLight = null;
    this.wireframeMode = false;
    this.textureLoader = null;
  }

  async init(canvas) {
    this.canvas = canvas;

    // Create scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB); // Sky blue fallback

    // Create camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      canvas.width / canvas.height,
      0.1,
      1000
    );

    // Create renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: false
    });
    this.renderer.setSize(canvas.width, canvas.height);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Create lighting
    this.setupLighting();

    // Initialize sky renderer
    this.skyRenderer = new SkyRenderer();
    await this.skyRenderer.init(this.scene, this.camera);

    // Initialize texture loader
    this.textureLoader = new THREE.TextureLoader();

    // Create custom textures from plugin data
    this.customTextures = this.createCustomTextures();

    console.log('Renderer initialized successfully');
    console.log('Custom textures created:', Object.keys(this.customTextures));
  }

  setupLighting() {
    // Ambient light
    this.ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(this.ambientLight);

    // Directional light (sun/moon)
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.directionalLight.position.set(0.5, 1, 0.5);

    this.scene.add(this.directionalLight);
  }

  updateUniforms(viewMatrix, projectionMatrix, modelMatrix, lightDirection, lightColor, ambientColor) {
    // Update directional light
    this.directionalLight.position.set(
      -lightDirection[0],
      -lightDirection[1],
      -lightDirection[2]
    );

    this.directionalLight.color.setRGB(lightColor[0], lightColor[1], lightColor[2]);
    this.ambientLight.color.setRGB(ambientColor[0], ambientColor[1], ambientColor[2]);

    // Update shader uniforms
    for (const [key, mesh] of this.chunkMeshes) {
      if (mesh.material.uniforms) {
        mesh.material.uniforms.lightDirection.value.set(
          -lightDirection[0],
          -lightDirection[1],
          -lightDirection[2]
        );
        mesh.material.uniforms.lightColor.value.setRGB(lightColor[0], lightColor[1], lightColor[2]);
        mesh.material.uniforms.ambientColor.value.setRGB(ambientColor[0], ambientColor[1], ambientColor[2]);
      }
    }
  }

  render(chunks, camera, targetedBlock = null, skyData = null) {
    // Update camera position and rotation
    this.camera.position.set(camera.position.x, camera.position.y, camera.position.z);

    // Convert camera rotation to Three.js format
    const euler = new THREE.Euler(camera.rotation.x, camera.rotation.y, camera.rotation.z, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);

    // Update sky
    if (this.skyRenderer && skyData) {
      this.skyRenderer.update(skyData);
    }

    // Update chunk meshes
    this.updateChunkMeshes(chunks);

    // Update block outline
    this.updateBlockOutline(targetedBlock);

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  updateChunkMeshes(chunks) {
    // Remove old chunk meshes that are no longer visible
    const visibleChunkKeys = new Set();
    chunks.forEach(chunk => {
      visibleChunkKeys.add(`${chunk.chunkX},${chunk.chunkZ}`);
    });

    // Remove meshes for chunks that are no longer visible
    for (const [key, mesh] of this.chunkMeshes) {
      if (!visibleChunkKeys.has(key)) {
        this.scene.remove(mesh);
        this.chunkMeshes.delete(key);
      }
    }

    // Add/update meshes for visible chunks
    chunks.forEach(chunk => {
      const key = `${chunk.chunkX},${chunk.chunkZ}`;

      // Only process chunks that have a mesh, are ready for rendering, and have valid geometry
      if (chunk.mesh && chunk.meshReady && chunk.mesh.geometry && chunk.mesh.geometry.attributes.position) {
        const existingMesh = this.chunkMeshes.get(key);

        // If mesh doesn't exist or has changed, update it
        if (!existingMesh || existingMesh !== chunk.mesh) {
          // Remove old mesh if it exists
          if (existingMesh) {
            this.scene.remove(existingMesh);
          }

          // Always dispose old material if it exists
          if (chunk.mesh.material) {
            chunk.mesh.material.dispose();
          }

          // Create appropriate material based on wireframe mode
          let material;
          if (this.wireframeMode) {
            material = new THREE.MeshBasicMaterial({
              color: 0xffffff,
              wireframe: true,
              transparent: true,
              opacity: 0.8
            });
            // Store original material reference for later restoration
            chunk.mesh._originalMaterial = this.createBlockMaterial();
          } else {
            material = this.createBlockMaterial();
          }

          // Apply material to the mesh
          chunk.mesh.material = material;

          // Update texture uniforms if using shader material
          if (material.uniforms && this.customTextures) {
            this.updateMaterialTextures(material);
          }



          // Add new mesh to scene first
          this.scene.add(chunk.mesh);
          this.chunkMeshes.set(key, chunk.mesh);

          // Make mesh visible after ensuring it's properly added to scene
          // Use requestAnimationFrame to ensure the material is compiled
          requestAnimationFrame(() => {
            if (chunk.mesh && this.chunkMeshes.has(key)) {
              chunk.mesh.visible = true;
            }
          });
        }
      }
    });
  }

  updateBlockOutline(targetedBlock) {
    // Remove existing outline
    if (this.outlineMesh) {
      this.scene.remove(this.outlineMesh);
      this.outlineMesh.geometry.dispose();
      this.outlineMesh.material.dispose();
      this.outlineMesh = null;
    }

    if (!targetedBlock || !targetedBlock.hit) return;

    // Create outline geometry
    const geometry = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff00ff,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    });

    this.outlineMesh = new THREE.Mesh(geometry, material);
    this.outlineMesh.position.set(
      targetedBlock.worldX + 0.5,
      targetedBlock.worldY + 0.5,
      targetedBlock.worldZ + 0.5
    );

    this.scene.add(this.outlineMesh);
  }

  resize(width, height) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  setWireframeMode(enabled) {
    this.wireframeMode = enabled;
    
    // Update all existing chunk meshes
    for (const [key, mesh] of this.chunkMeshes) {
      if (mesh.material) {
        if (this.wireframeMode) {
          // Create wireframe material
          if (!mesh._originalMaterial) {
            mesh._originalMaterial = mesh.material;
          }
          
          const wireframeMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            wireframe: true,
            transparent: true,
            opacity: 0.8
          });
          
          mesh.material = wireframeMaterial;
        } else {
          // Restore original material
          if (mesh._originalMaterial) {
            mesh.material.dispose();
            mesh.material = mesh._originalMaterial;
            delete mesh._originalMaterial;
          }
        }
      }
    }
    
    console.log(`Wireframe mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Create custom textures from plugin data
   * @returns {Object} Object mapping block IDs to texture objects with top/sides/bottom
   */
  createCustomTextures() {
    const customTextures = {};
    const allBlocks = pluginManager.getAllBlocks();
    
    for (const block of allBlocks) {
      // Skip blocks without texture data
      if (!block.textures) continue;
      
      const blockTextures = {};
      
      // Create textures for each face (top, sides, bottom)
      ['top', 'sides', 'bottom'].forEach(face => {
        const textureData = block.textures[face];
        if (textureData && textureData.data && textureData.width && textureData.height) {
          // Create Three.js texture from raw data
          const texture = new THREE.DataTexture(
            new Uint8Array(textureData.data),
            textureData.width,
            textureData.height,
            THREE.RGBAFormat
          );
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.RepeatWrapping;
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          texture.needsUpdate = true;
          
          blockTextures[face] = texture;
        }
      });
      
      if (Object.keys(blockTextures).length > 0) {
        customTextures[block.id] = blockTextures;
        console.log(`Created custom textures for block "${block.name}"`);
      }
    }
    
    return customTextures;
  }

  /**
   * Create shader material with individual block textures
   * @returns {THREE.ShaderMaterial} Material with block texture uniforms
   */
  createBlockMaterial() {
    // Create default white texture for missing textures
    const defaultTexture = new THREE.DataTexture(
      new Uint8Array([255, 255, 255, 255]),
      1, 1,
      THREE.RGBAFormat
    );
    defaultTexture.needsUpdate = true;

    // Get textures for each block type
    const getBlockTexture = (blockId, face) => {
      return this.customTextures[blockId]?.[face] || defaultTexture;
    };

    return new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: {
        lightDirection: { value: new THREE.Vector3(0.5, -1.0, 0.5) },
        lightColor: { value: new THREE.Color(0xffffff) },
        ambientColor: { value: new THREE.Color(0x404040) },
        
        // Individual block textures
        airTopTexture: { value: getBlockTexture('air', 'top') },
        airSidesTexture: { value: getBlockTexture('air', 'sides') },
        airBottomTexture: { value: getBlockTexture('air', 'bottom') },
        stoneTopTexture: { value: getBlockTexture('stone', 'top') },
        stoneSidesTexture: { value: getBlockTexture('stone', 'sides') },
        stoneBottomTexture: { value: getBlockTexture('stone', 'bottom') },
        dirtTopTexture: { value: getBlockTexture('dirt', 'top') },
        dirtSidesTexture: { value: getBlockTexture('dirt', 'sides') },
        dirtBottomTexture: { value: getBlockTexture('dirt', 'bottom') },
        grassTopTexture: { value: getBlockTexture('grass', 'top') },
        grassSidesTexture: { value: getBlockTexture('grass', 'sides') },
        grassBottomTexture: { value: getBlockTexture('grass', 'bottom') },
        waterTopTexture: { value: getBlockTexture('water', 'top') },
        waterSidesTexture: { value: getBlockTexture('water', 'sides') },
        waterBottomTexture: { value: getBlockTexture('water', 'bottom') },
        snowTopTexture: { value: getBlockTexture('snow', 'top') },
        snowSidesTexture: { value: getBlockTexture('snow', 'sides') },
        snowBottomTexture: { value: getBlockTexture('snow', 'bottom') }
      }
    });
  }

  /**
   * Update material texture uniforms
   * @param {THREE.ShaderMaterial} material Material to update
   */
  updateMaterialTextures(material) {
    // Create default white texture for missing textures
    const defaultTexture = new THREE.DataTexture(
      new Uint8Array([255, 255, 255, 255]),
      1, 1,
      THREE.RGBAFormat
    );
    defaultTexture.needsUpdate = true;

    // Get textures for each block type
    const getBlockTexture = (blockId, face) => {
      return this.customTextures[blockId]?.[face] || defaultTexture;
    };

    // Update all texture uniforms
    if (material.uniforms) {
      material.uniforms.airTopTexture.value = getBlockTexture('air', 'top');
      material.uniforms.airSidesTexture.value = getBlockTexture('air', 'sides');
      material.uniforms.airBottomTexture.value = getBlockTexture('air', 'bottom');
      material.uniforms.stoneTopTexture.value = getBlockTexture('stone', 'top');
      material.uniforms.stoneSidesTexture.value = getBlockTexture('stone', 'sides');
      material.uniforms.stoneBottomTexture.value = getBlockTexture('stone', 'bottom');
      material.uniforms.dirtTopTexture.value = getBlockTexture('dirt', 'top');
      material.uniforms.dirtSidesTexture.value = getBlockTexture('dirt', 'sides');
      material.uniforms.dirtBottomTexture.value = getBlockTexture('dirt', 'bottom');
      material.uniforms.grassTopTexture.value = getBlockTexture('grass', 'top');
      material.uniforms.grassSidesTexture.value = getBlockTexture('grass', 'sides');
      material.uniforms.grassBottomTexture.value = getBlockTexture('grass', 'bottom');
      material.uniforms.waterTopTexture.value = getBlockTexture('water', 'top');
      material.uniforms.waterSidesTexture.value = getBlockTexture('water', 'sides');
      material.uniforms.waterBottomTexture.value = getBlockTexture('water', 'bottom');
      material.uniforms.snowTopTexture.value = getBlockTexture('snow', 'top');
      material.uniforms.snowSidesTexture.value = getBlockTexture('snow', 'sides');
      material.uniforms.snowBottomTexture.value = getBlockTexture('snow', 'bottom');
    }
  }

  destroy() {
    // Clean up all resources
    for (const [key, mesh] of this.chunkMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
      
      // Clean up original material reference if it exists
      if (mesh._originalMaterial) {
        mesh._originalMaterial.dispose();
      }
    }
    this.chunkMeshes.clear();

    if (this.outlineMesh) {
      this.scene.remove(this.outlineMesh);
      this.outlineMesh.geometry.dispose();
      this.outlineMesh.material.dispose();
    }

    if (this.skyRenderer) {
      this.skyRenderer.destroy();
    }

    this.renderer.dispose();
  }
}
