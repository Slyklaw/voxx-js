import * as THREE from 'three';
import { VoxelRaycaster } from '../voxelRaycaster.js';

/**
 * Example demonstrating voxel raycasting integration with the existing engine
 * This shows how to use the VoxelRaycaster for voxel targeting and face detection
 */
export class VoxelRaycastExample {
  constructor(world, camera, renderer) {
    this.world = world;
    this.camera = camera;
    this.renderer = renderer;
    this.raycaster = new VoxelRaycaster(world);
    
    // Visual indicators for debugging
    this.hitIndicator = null;
    this.placementIndicator = null;
    this.setupVisualIndicators();
    
    // Mouse position for raycasting
    this.mouse = new THREE.Vector2();
    this.setupEventListeners();
  }

  setupVisualIndicators() {
    // Red cube to show hit voxel
    const hitGeometry = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const hitMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000, 
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    this.hitIndicator = new THREE.Mesh(hitGeometry, hitMaterial);
    this.hitIndicator.visible = false;
    
    // Green cube to show placement position
    const placementGeometry = new THREE.BoxGeometry(1.02, 1.02, 1.02);
    const placementMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00, 
      wireframe: true,
      transparent: true,
      opacity: 0.3
    });
    this.placementIndicator = new THREE.Mesh(placementGeometry, placementMaterial);
    this.placementIndicator.visible = false;
  }

  setupEventListeners() {
    // Update mouse position
    this.renderer.domElement.addEventListener('mousemove', (event) => {
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    });

    // Handle clicks for demonstration
    this.renderer.domElement.addEventListener('click', (event) => {
      if (document.pointerLockElement) {
        this.handleVoxelClick();
      }
    });
  }

  handleVoxelClick() {
    // Cast ray from screen center (crosshair position)
    const screenCenter = new THREE.Vector2(0, 0);
    const hitResult = this.raycaster.raycastFromScreen(screenCenter, this.camera, 100);
    
    if (hitResult && hitResult.hit) {
      console.log('Voxel Hit:', {
        position: hitResult.voxelPosition,
        face: hitResult.face,
        blockType: hitResult.blockType,
        distance: hitResult.distance.toFixed(2)
      });
      
      // Example: Could destroy or place voxel here
      // this.destroyVoxel(hitResult.voxelPosition);
      // this.placeVoxel(hitResult.adjacentPosition, 1); // Place stone
    }
  }

  update() {
    // Continuously raycast from mouse position for visual feedback
    const hitResult = this.raycaster.raycastFromScreen(this.mouse, this.camera, 100);
    
    if (hitResult && hitResult.hit) {
      // Show hit indicator
      this.hitIndicator.position.copy(hitResult.voxelPosition);
      this.hitIndicator.visible = true;
      
      // Show placement indicator
      const placementPos = this.raycaster.getPlacementPosition(hitResult);
      if (placementPos && this.raycaster.isValidPlacementPosition(placementPos)) {
        this.placementIndicator.position.copy(placementPos);
        this.placementIndicator.visible = true;
      } else {
        this.placementIndicator.visible = false;
      }
    } else {
      // Hide indicators when not hitting anything
      this.hitIndicator.visible = false;
      this.placementIndicator.visible = false;
    }
  }

  addToScene(scene) {
    scene.add(this.hitIndicator);
    scene.add(this.placementIndicator);
  }

  removeFromScene(scene) {
    scene.remove(this.hitIndicator);
    scene.remove(this.placementIndicator);
  }

  dispose() {
    this.hitIndicator.geometry.dispose();
    this.hitIndicator.material.dispose();
    this.placementIndicator.geometry.dispose();
    this.placementIndicator.material.dispose();
  }

  // Example methods for voxel modification (would be implemented in task 3.2)
  destroyVoxel(voxelPosition) {
    console.log('Would destroy voxel at:', voxelPosition);
    // Implementation would go here in task 3.2
  }

  placeVoxel(position, blockType) {
    console.log('Would place voxel at:', position, 'type:', blockType);
    // Implementation would go here in task 3.2
  }
}

// Usage example:
// const raycastExample = new VoxelRaycastExample(world, camera, renderer);
// raycastExample.addToScene(scene);
// 
// // In animation loop:
// raycastExample.update();