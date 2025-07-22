import * as THREE from 'three';
import { VoxelModifier } from '../voxelModifier.js';
import { VoxelInteractionSystem } from '../voxelInteractionSystem.js';
import { World } from '../world.js';

/**
 * Example demonstrating voxel modification system usage
 * This example shows how to set up and use the VoxelModifier component
 * and VoxelInteractionSystem for terrain modification
 */
export class VoxelModificationExample {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer();
    
    // Initialize world and voxel systems
    this.world = new World(0.12345, this.scene);
    this.voxelInteractionSystem = new VoxelInteractionSystem(this.world, this.scene);
    
    // Create a player modifier component
    this.playerModifier = new VoxelModifier({
      canPlace: true,
      canDestroy: true,
      availableBlocks: [1, 2, 3, 5], // stone, dirt, grass, snow
      currentBlockType: 1, // start with stone
      maxRange: 15,
      minRange: 1,
      modificationCooldown: 150 // 150ms cooldown
    });
    
    this.setupEventListeners();
    this.setupUI();
  }

  setupEventListeners() {
    // Set up event callbacks
    this.voxelInteractionSystem.onVoxelModified = (event) => {
      console.log(`Voxel ${event.action}d at position:`, event.position, 'Block type:', event.blockType);
      this.updateUI();
    };

    this.voxelInteractionSystem.onChunkUpdated = (chunkKeys) => {
      console.log(`Updated ${chunkKeys.length} chunks:`, chunkKeys);
    };

    // Mouse click handling
    document.addEventListener('click', (event) => {
      if (document.pointerLockElement) {
        this.handleMouseClick(event);
      }
    });

    // Keyboard controls for block type switching
    document.addEventListener('keydown', (event) => {
      switch (event.code) {
        case 'KeyQ':
          // Cycle to next block type
          const nextBlockType = this.playerModifier.getNextBlockType();
          this.playerModifier.setCurrentBlockType(nextBlockType);
          this.updateUI();
          break;
        case 'KeyE':
          // Toggle between place and destroy mode
          this.isDestroyMode = !this.isDestroyMode;
          this.updateUI();
          break;
      }
    });
  }

  handleMouseClick(event) {
    // Convert mouse position to normalized device coordinates
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const action = this.isDestroyMode ? 'destroy' : 'place';
    const success = this.voxelInteractionSystem.handleVoxelClick(
      mouse,
      this.camera,
      this.playerModifier,
      action
    );

    if (!success) {
      console.log(`Failed to ${action} voxel - check range, cooldown, or target validity`);
    }
  }

  setupUI() {
    // Create UI elements to show current state
    this.uiContainer = document.createElement('div');
    this.uiContainer.style.position = 'absolute';
    this.uiContainer.style.top = '10px';
    this.uiContainer.style.left = '10px';
    this.uiContainer.style.color = 'white';
    this.uiContainer.style.fontFamily = 'monospace';
    this.uiContainer.style.fontSize = '14px';
    this.uiContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    this.uiContainer.style.padding = '10px';
    this.uiContainer.style.borderRadius = '5px';
    this.uiContainer.style.zIndex = '1000';
    
    document.body.appendChild(this.uiContainer);
    
    this.isDestroyMode = false;
    this.updateUI();
  }

  updateUI() {
    const blockNames = {
      1: 'Stone',
      2: 'Dirt', 
      3: 'Grass',
      5: 'Snow'
    };

    const stats = this.voxelInteractionSystem.getStatistics();
    
    this.uiContainer.innerHTML = `
      <div><strong>Voxel Modification System</strong></div>
      <div>Mode: ${this.isDestroyMode ? 'Destroy' : 'Place'}</div>
      <div>Block: ${blockNames[this.playerModifier.currentBlockType]}</div>
      <div>Range: ${this.playerModifier.minRange}-${this.playerModifier.maxRange}</div>
      <div>Cooldown: ${this.playerModifier.modificationCooldown}ms</div>
      <div>Dirty Chunks: ${stats.dirtyChunksCount}</div>
      <div>Processing: ${stats.isProcessingBatch ? 'Yes' : 'No'}</div>
      <br>
      <div><strong>Controls:</strong></div>
      <div>Click: ${this.isDestroyMode ? 'Destroy' : 'Place'} voxel</div>
      <div>Q: Cycle block type</div>
      <div>E: Toggle place/destroy mode</div>
    `;
  }

  // Example of batch modification
  async createStructure(centerPosition) {
    const modifications = [];
    
    // Create a simple 3x3x3 cube structure
    for (let x = -1; x <= 1; x++) {
      for (let y = 0; y <= 2; y++) {
        for (let z = -1; z <= 1; z++) {
          // Skip center to create a hollow structure
          if (x === 0 && z === 0 && y === 1) continue;
          
          modifications.push({
            position: new THREE.Vector3(
              centerPosition.x + x,
              centerPosition.y + y,
              centerPosition.z + z
            ),
            blockType: this.playerModifier.currentBlockType
          });
        }
      }
    }

    console.log(`Creating structure with ${modifications.length} voxels...`);
    const successCount = await this.voxelInteractionSystem.batchModifyVoxels(
      modifications,
      this.playerModifier
    );
    
    console.log(`Successfully placed ${successCount} voxels`);
  }

  // Example of serialization/deserialization
  saveModifierState() {
    const serialized = this.playerModifier.serialize();
    localStorage.setItem('voxelModifierState', JSON.stringify(serialized));
    console.log('Modifier state saved:', serialized);
  }

  loadModifierState() {
    const saved = localStorage.getItem('voxelModifierState');
    if (saved) {
      const data = JSON.parse(saved);
      this.playerModifier.deserialize(data);
      this.updateUI();
      console.log('Modifier state loaded:', data);
    }
  }

  // Cleanup
  dispose() {
    this.voxelInteractionSystem.dispose();
    if (this.uiContainer) {
      document.body.removeChild(this.uiContainer);
    }
  }
}

// Usage example:
// const example = new VoxelModificationExample();
// 
// // Create a structure at position (10, 65, 10)
// example.createStructure(new THREE.Vector3(10, 65, 10));
//
// // Save/load modifier state
// example.saveModifierState();
// example.loadModifierState();