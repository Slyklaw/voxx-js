/**
 * InputHandler - Handles all keyboard and mouse input for the voxel engine
 * Manages pointer lock, camera rotation via mouse movement, keyboard state,
 * and block selection (1-9 keys and mouse wheel).
 */

import { PLAYER_CONFIG, DEBUG } from '../../config.js';

// Convert yaw angle to cardinal direction (N, NE, E, SE, S, SW, W, NW)
function getCardinalDirection(yaw) {
  // Normalize yaw to 0-360 degrees
  let degrees = ((yaw * 180 / Math.PI) % 360 + 360) % 360;
  // Map degrees to cardinal directions (45-degree segments centered on 22.5° offsets)
  if (degrees >= 337.5 || degrees < 22.5) return 'N';
  if (degrees >= 22.5 && degrees < 67.5) return 'NE';
  if (degrees >= 67.5 && degrees < 112.5) return 'E';
  if (degrees >= 112.5 && degrees < 157.5) return 'SE';
  if (degrees >= 157.5 && degrees < 202.5) return 'S';
  if (degrees >= 202.5 && degrees < 247.5) return 'SW';
  if (degrees >= 247.5 && degrees < 292.5) return 'W';
  return 'NW'; // 292.5 to 337.5
}

export class InputHandler {
  constructor(canvas, onBlockSelect, onBlockDestroy, onBlockPlace) {
    this.canvas = canvas;
    this.onBlockSelect = onBlockSelect;
    this.onBlockDestroy = onBlockDestroy;
    this.onBlockPlace = onBlockPlace;
    
    // State
    this.isPointerLocked = false;
    this.keys = {};
    this.selectedBlockType = 1;
    this.rotation = { x: 0.5, y: 0 }; // pitch and yaw (default: looking down at terrain)
    
    this.setupControls();
    this.updateBlockSelectionUI();
  }
  
  setupControls() {
    // Pointer lock on canvas click
    this.canvas.addEventListener('click', () => {
      this.canvas.requestPointerLock();
    });

    // Pointer lock change handler
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.canvas;
      const instructions = document.getElementById('instructions');
      const crosshair = document.getElementById('crosshair');

      if (this.isPointerLocked) {
        instructions.style.display = 'none';
        crosshair.style.display = 'block';
      } else {
        instructions.style.display = 'block';
        crosshair.style.display = 'none';
      }
    });

    // Mouse movement for camera rotation
    document.addEventListener('mousemove', (event) => {
      if (!this.isPointerLocked) return;

      const sensitivity = 0.002;
      this.rotation.y -= event.movementX * sensitivity;
      this.rotation.x -= event.movementY * sensitivity;
      const maxPitch = (Math.PI / 2) - 0.001;
      const clampedPitch = Math.max(-maxPitch, Math.min(maxPitch, this.rotation.x));
      if (clampedPitch !== this.rotation.x) {
        this.rotation.x = clampedPitch;
        if (DEBUG) console.log('[Camera] Pitch clamped to bounds');
      }
    });

    // Keyboard down - track keys and handle special keys
    document.addEventListener('keydown', (event) => {
      this.keys[event.code] = true;
      
      // Block selection - update selectedBlockType for keys 1-9
      const num = parseInt(event.key);
      if (num >= 1 && num <= 9 && this.isPointerLocked) {
        this.selectedBlockType = num;
        if (DEBUG) console.log(`[BlockEdit] Key ${event.key} pressed -> selectedBlockType = ${this.selectedBlockType}`);
        this.updateBlockSelectionUI();
        if (this.onBlockSelect) {
          this.onBlockSelect(this.selectedBlockType);
        }
      }
      
      // Toggle debug colors mode (V key)
      if (event.code === 'KeyV' && this.isPointerLocked) {
        window.toggleDebugColors?.();
      }
      
      // Toggle wireframe mode (F key)
      if (event.code === 'KeyF' && this.isPointerLocked) {
        window.toggleWireframe?.();
      }
    });

    // Mousewheel for block selection
    document.addEventListener('wheel', (event) => {
      if (!this.isPointerLocked) return;
      
      const blockCount = 9; // Allow selecting blocks 1-9
      
      if (event.deltaY > 0) {
        // Scroll down - next block
        this.selectedBlockType = (this.selectedBlockType % blockCount) + 1;
      } else if (event.deltaY < 0) {
        // Scroll up - previous block
        this.selectedBlockType = ((this.selectedBlockType - 2 + blockCount) % blockCount) + 1;
      }
      
      if (DEBUG) console.log(`[BlockEdit] Wheel -> selectedBlockType = ${this.selectedBlockType}`);
      this.updateBlockSelectionUI();
      if (this.onBlockSelect) {
        this.onBlockSelect(this.selectedBlockType);
      }
    });

    // Keyboard up - release key
    document.addEventListener('keyup', (event) => {
      this.keys[event.code] = false;
    });

    // Block editing mouse events
    document.addEventListener('mousedown', (event) => {
      if (!this.isPointerLocked) return;
      if (DEBUG) console.log(`[BlockEdit] mousedown: button=${event.button}`);
      
      if (event.button === 0) {
        // Left click - break block
        if (this.onBlockDestroy) {
          this.onBlockDestroy();
        }
      } else if (event.button === 2) {
        // Right click - place block
        if (this.onBlockPlace) {
          this.onBlockPlace();
        }
      }
    });

    // Prevent context menu on right click
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // UI button handlers
    this.setupUIHandlers();
  }
  
  setupUIHandlers() {
    // Render distance controls
    document.getElementById('render-inc')?.addEventListener('click', () => {
      const el = document.getElementById('render-distance-value');
      if (el) {
        const current = parseInt(el.textContent);
        el.textContent = Math.min(32, current + 1);
        if (window.setRenderDistance) {
          window.setRenderDistance(parseInt(el.textContent));
        }
      }
    });

    document.getElementById('render-dec')?.addEventListener('click', () => {
      const el = document.getElementById('render-distance-value');
      if (el) {
        const current = parseInt(el.textContent);
        el.textContent = Math.max(1, current - 1);
        if (window.setRenderDistance) {
          window.setRenderDistance(parseInt(el.textContent));
        }
      }
    });

    // Speed controls
    document.getElementById('speed-inc')?.addEventListener('click', () => {
      const el = document.getElementById('move-speed-value');
      if (el) {
        PLAYER_CONFIG.MOVE_SPEED = Math.min(200, parseInt(el.textContent) + 10);
        el.textContent = PLAYER_CONFIG.MOVE_SPEED;
      }
    });

    document.getElementById('speed-dec')?.addEventListener('click', () => {
      const el = document.getElementById('move-speed-value');
      if (el) {
        PLAYER_CONFIG.MOVE_SPEED = Math.max(1, parseInt(el.textContent) - 10);
        el.textContent = PLAYER_CONFIG.MOVE_SPEED;
      }
    });

    // SSAO toggle
    document.getElementById('ssao-toggle')?.addEventListener('change', (e) => {
      if (window.updateSSAOSettings) {
        window.updateSSAOSettings({ enabled: e.target.checked });
      }
    });

    // SSAO intensity slider
    document.getElementById('ssao-intensity')?.addEventListener('input', (e) => {
      const value = parseInt(e.target.value) / 100;
      const valueEl = document.getElementById('ssao-intensity-value');
      if (valueEl) valueEl.textContent = value.toFixed(1);
      if (window.updateSSAOSettings) {
        window.updateSSAOSettings({ intensity: value });
      }
    });

    // SSAO radius slider
    document.getElementById('ssao-radius')?.addEventListener('input', (e) => {
      const value = parseInt(e.target.value) / 10;
      const valueEl = document.getElementById('ssao-radius-value');
      if (valueEl) valueEl.textContent = value.toFixed(1);
      if (window.updateSSAOSettings) {
        window.updateSSAOSettings({ radius: value });
      }
    });
  }
  
  updateBlockSelectionUI() {
    document.querySelectorAll('.block-item').forEach(item => {
      const blockNum = parseInt(item.dataset.block);
      item.classList.toggle('selected', blockNum === this.selectedBlockType);
    });
  }
  
  getKeys() {
    return this.keys;
  }
  
  getSelectedBlockType() {
    return this.selectedBlockType;
  }
  
  isLocked() {
    return this.isPointerLocked;
  }
  
  getRotation() {
    return this.rotation;
  }
  
  setRotation(x, y) {
    this.rotation.x = x;
    this.rotation.y = y;
  }
  
  getCardinalDirection() {
    return getCardinalDirection(this.rotation.y);
  }
}
