/**
 * Renderer for Voxel Engine
 */

import * as THREE from 'https://unpkg.com/three@0.179.0/build/three.module.js';
import { SkyRenderer } from './sky.js';
import { vertexShader, fragmentShader } from './shaders.js';
import { TextureAtlas } from './texture-atlas.js';

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
    this.textureAtlas = null;
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

    // Create texture atlas
    console.log('Creating texture atlas...');
    this.textureAtlas = new TextureAtlas(1024);

    // Create texture system with atlas
    console.log('Creating texture system...');
    this.textureSystem = await this.createTextureSystem();
    console.log('Texture system created:', this.textureSystem ? 'SUCCESS' : 'FAILED');

    console.log('Renderer initialized successfully');
    console.log('Texture system created with', this.textureSystem.textureCount, 'individual textures');
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

      // Set texture system on chunk if available and force regeneration if needed
      if (this.textureSystem && !chunk.textureSystem) {
        chunk.textureSystem = this.textureSystem;
        // Force chunk to regenerate mesh with texture system
        if (chunk.hasVoxelData) {
          chunk.needsUpdate = true;
          chunk.updateMesh(true);
        }
      }

      // Only process chunks that have a mesh, are ready for rendering, and have valid geometry
      if (chunk.mesh && chunk.meshReady && chunk.mesh.geometry &&
        chunk.mesh.geometry.attributes.position &&
        chunk.mesh.geometry.attributes.position.count > 0) {
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
          if (material.uniforms && this.textureSystem) {
            this.updateMaterialTextures(material);
          }

          // No need to update texture indices - block types are set during mesh generation



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
   * Create texture system using texture atlas
   * @returns {Object} Object with atlas texture and UV mapping
   */
  async createTextureSystem() {
    const textureUVMapping = new Map(); // Maps "blockId_face" to UV coordinates
    const blockTypeMapping = new Map(); // Maps blockId -> blockType index
    let blockTypeIndex = 0;

    // Add default white texture to atlas
    const defaultTextureData = new Uint8Array([255, 255, 255, 255]);
    this.textureAtlas.addTexture('default', defaultTextureData, 1, 1);

    // Get all blocks from plugins
    const allBlocks = pluginManager.getAllBlocks();

    // Process plugin blocks first
    for (const block of allBlocks) {
      if (!blockTypeMapping.has(block.id)) {
        blockTypeMapping.set(block.id, blockTypeIndex++);
      }

      if (!block.textures) continue;

      ['top', 'sides', 'bottom'].forEach((face) => {
        const textureData = block.textures[face];
        if (textureData && textureData.data && textureData.width && textureData.height) {
          const key = `${block.id}_${face}`;
          const atlasCoords = this.textureAtlas.addTexture(
            key,
            new Uint8Array(textureData.data),
            textureData.width,
            textureData.height
          );
          
          if (atlasCoords) {
            textureUVMapping.set(key, atlasCoords);
          }
        }
      });
    }

    // Import block textures from block-textures.js
    try {
      const module = await import('./block-textures.js');
      const blockTexturesData = module.blockTextures;
      console.log('Loaded block textures:', Object.keys(blockTexturesData));

      for (const [blockId, faces] of Object.entries(blockTexturesData)) {
        if (!blockTypeMapping.has(blockId)) {
          blockTypeMapping.set(blockId, blockTypeIndex++);
        }

        ['top', 'sides', 'bottom'].forEach((face) => {
          const textureData = faces[face];
          if (textureData && textureData.data && textureData.width && textureData.height) {
            const key = `${blockId}_${face}`;
            const atlasCoords = this.textureAtlas.addTexture(
              key,
              textureData.data,
              textureData.width,
              textureData.height
            );
            
            if (atlasCoords) {
              textureUVMapping.set(key, atlasCoords);
              
              // Debug first few textures
              if (textureUVMapping.size <= 5) {
                console.log(`Added ${key} to atlas:`, {
                  width: textureData.width,
                  height: textureData.height,
                  uv: `(${atlasCoords.u1.toFixed(3)}, ${atlasCoords.v1.toFixed(3)}) to (${atlasCoords.u2.toFixed(3)}, ${atlasCoords.v2.toFixed(3)})`
                });
              }
            }
          }
        });
      }
    } catch (error) {
      console.warn('Could not load block textures:', error);
    }

    console.log('Block type mapping:');
    for (const [blockId, typeIndex] of blockTypeMapping.entries()) {
      console.log(`  ${blockId} -> type ${typeIndex}`);
    }

    const atlasStats = this.textureAtlas.getStats();
    console.log(`✅ Created texture atlas system:`, atlasStats);
    
    // Debug: Log first few texture mappings
    console.log('First few texture UV mappings:');
    let count = 0;
    for (const [key, coords] of textureUVMapping.entries()) {
      if (count < 5) {
        console.log(`  ${key}: UV(${coords.u1.toFixed(3)}, ${coords.v1.toFixed(3)}) to (${coords.u2.toFixed(3)}, ${coords.v2.toFixed(3)})`);
        count++;
      }
    }
    
    // Texture atlas system is working correctly

    // Ensure atlas texture is marked for GPU upload
    const atlasTexture = this.textureAtlas.getTexture();
    atlasTexture.needsUpdate = true;
    
    return {
      atlasTexture: atlasTexture,
      textureUVMapping,
      blockTypeMapping,
      textureAtlas: this.textureAtlas
    };
  }

  /**
   * Create shader material with texture atlas
   * @returns {THREE.ShaderMaterial} Material with atlas texture
   */
  createBlockMaterial() {
    const uniforms = {
      lightDirection: { value: new THREE.Vector3(0.5, -1.0, 0.5) },
      lightColor: { value: new THREE.Color(0xffffff) },
      ambientColor: { value: new THREE.Color(0x404040) },
      atlasTexture: { value: this.textureSystem?.atlasTexture || null }
    };
    
    // Atlas texture is working correctly

    const material = new THREE.ShaderMaterial({
      vertexShader: vertexShader,
      fragmentShader: fragmentShader,
      uniforms: uniforms
    });

    return material;
  }

  /**
   * Update material texture uniforms
   * @param {THREE.ShaderMaterial} material Material to update
   */
  updateMaterialTextures(material) {
    if (!material.uniforms || !this.textureSystem) return;

    // Update atlas texture
    if (material.uniforms.atlasTexture) {
      material.uniforms.atlasTexture.value = this.textureSystem.atlasTexture;
    }
  }

  /**
   * Get texture UV coordinates for a block and face
   * @param {string} blockId Block identifier
   * @param {string} face Face type ('top', 'sides', 'bottom')
   * @returns {Object} UV coordinates {u1, v1, u2, v2} or null
   */
  getTextureUV(blockId, face) {
    if (!this.textureSystem) return null;
    return this.textureSystem.textureUVMapping.get(`${blockId}_${face}`) || null;
  }

  /**
   * Add a new block texture dynamically (for plugin system)
   * @param {string} blockId Block identifier
   * @param {string} face Face type ('top', 'sides', 'bottom')
   * @param {Uint8Array} textureData Raw texture data
   * @param {number} width Texture width
   * @param {number} height Texture height
   */
  addBlockTexture(blockId, face, textureData, width, height) {
    if (!this.textureSystem) return;

    // Create Three.js texture from raw data
    const texture = new THREE.DataTexture(
      textureData,
      width,
      height,
      THREE.RGBAFormat
    );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.needsUpdate = true;

    // Add to texture system
    const textureIndex = this.textureSystem.textureCount;
    this.textureSystem.blockTextures[textureIndex] = texture;
    this.textureSystem.textureMapping.set(`${blockId}_${face}`, textureIndex);
    this.textureSystem.textureCount++;

    // Update block type mapping if needed
    if (!this.textureSystem.blockTypeMapping.has(blockId)) {
      const blockTypeIndex = this.textureSystem.blockTypeMapping.size;
      this.textureSystem.blockTypeMapping.set(blockId, blockTypeIndex);
    }

    // Update shader texture mapping
    const blockType = this.textureSystem.blockTypeMapping.get(blockId);
    const faceType = face === 'top' ? 0 : face === 'sides' ? 1 : 2;
    const mappingIndex = blockType * 3 + faceType;

    if (mappingIndex < 64) {
      this.textureSystem.shaderTextureMapping[mappingIndex] = textureIndex;
    }

    // Update all existing materials
    for (const [key, mesh] of this.chunkMeshes) {
      if (mesh.material && mesh.material.uniforms) {
        this.updateMaterialTextures(mesh.material);
      }
    }

    console.log(`Added texture for ${blockId}_${face} at index ${textureIndex}`);
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

    if (this.textureAtlas) {
      this.textureAtlas.destroy();
    }

    this.renderer.dispose();
  }
}
