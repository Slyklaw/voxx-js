/**
 * Dynamic Texture Atlas System
 * Manages a 1024x1024 texture atlas that textures are dynamically added to
 */

import * as THREE from 'https://unpkg.com/three@0.179.0/build/three.module.js';

export class TextureAtlas {
  constructor(size = 1024) {
    this.size = size;
    this.canvas = null;
    this.context = null;
    this.texture = null;
    this.textureMap = new Map(); // Maps "blockId_face" to atlas coordinates
    this.currentX = 0;
    this.currentY = 0;
    this.rowHeight = 0;
    this.padding = 1; // 1 pixel padding between textures to prevent bleeding
    
    this.init();
  }

  init() {
    // Create canvas for the atlas
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.context = this.canvas.getContext('2d');
    
    // Fill with transparent pixels initially
    this.context.fillStyle = 'rgba(0, 0, 0, 0)';
    this.context.fillRect(0, 0, this.size, this.size);
    
    // Create Three.js texture from canvas
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.wrapS = THREE.RepeatWrapping;
    this.texture.wrapT = THREE.RepeatWrapping;
    this.texture.magFilter = THREE.NearestFilter;
    this.texture.minFilter = THREE.NearestFilter;
    this.texture.needsUpdate = true; // Mark for initial GPU upload
    
    console.log('Texture atlas initialized:', this.size + 'x' + this.size);
    console.log('Atlas canvas created:', this.canvas ? 'SUCCESS' : 'FAILED');
    console.log('Atlas texture created:', this.texture ? 'SUCCESS' : 'FAILED');
  }

  /**
   * Add a texture to the atlas
   * @param {string} key Unique key for this texture (e.g., "stone_top")
   * @param {Uint8Array} textureData Raw RGBA texture data
   * @param {number} width Texture width
   * @param {number} height Texture height
   * @returns {Object} Atlas coordinates {u1, v1, u2, v2} or null if no space
   */
  addTexture(key, textureData, width, height) {
    // Check if texture already exists
    if (this.textureMap.has(key)) {
      return this.textureMap.get(key);
    }

    // Check if texture fits in current row
    if (this.currentX + width + this.padding > this.size) {
      // Move to next row
      this.currentX = 0;
      this.currentY += this.rowHeight + this.padding;
      this.rowHeight = 0;
    }

    // Check if texture fits in atlas at all
    if (this.currentY + height + this.padding > this.size) {
      console.warn('Texture atlas is full! Cannot add texture:', key);
      return null;
    }

    // Create ImageData from raw texture data
    const imageData = new ImageData(width, height);
    for (let i = 0; i < textureData.length; i++) {
      imageData.data[i] = textureData[i];
    }

    // Draw texture to atlas canvas
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempContext = tempCanvas.getContext('2d');
    tempContext.putImageData(imageData, 0, 0);
    
    this.context.drawImage(tempCanvas, this.currentX, this.currentY);

    // Calculate UV coordinates (normalized 0-1)
    const u1 = this.currentX / this.size;
    const v1 = this.currentY / this.size;
    const u2 = (this.currentX + width) / this.size;
    const v2 = (this.currentY + height) / this.size;

    const atlasCoords = { u1, v1, u2, v2, x: this.currentX, y: this.currentY, width, height };
    this.textureMap.set(key, atlasCoords);

    // Update position for next texture
    this.currentX += width + this.padding;
    this.rowHeight = Math.max(this.rowHeight, height);

    // Mark texture as needing update
    this.texture.needsUpdate = true;
    
    console.log(`✅ Added texture "${key}" to atlas at (${this.currentX - width - this.padding}, ${this.currentY}) size: ${width}x${height} UV: (${u1.toFixed(3)}, ${v1.toFixed(3)}) to (${u2.toFixed(3)}, ${v2.toFixed(3)})`);
    
    // Force texture update immediately
    this.texture.needsUpdate = true;

    console.log(`Added texture "${key}" to atlas at (${this.currentX - width - this.padding}, ${this.currentY}) UV: (${u1.toFixed(3)}, ${v1.toFixed(3)}) to (${u2.toFixed(3)}, ${v2.toFixed(3)})`);

    return atlasCoords;
  }

  /**
   * Get atlas coordinates for a texture
   * @param {string} key Texture key
   * @returns {Object} Atlas coordinates or null if not found
   */
  getTextureCoords(key) {
    return this.textureMap.get(key) || null;
  }

  /**
   * Get the Three.js texture
   * @returns {THREE.DataTexture} The atlas texture
   */
  getTexture() {
    // Convert canvas to ImageData and create DataTexture
    const imageData = this.context.getImageData(0, 0, this.size, this.size);
    const dataTexture = new THREE.DataTexture(
      imageData.data,
      this.size,
      this.size,
      THREE.RGBAFormat
    );
    dataTexture.wrapS = THREE.RepeatWrapping;
    dataTexture.wrapT = THREE.RepeatWrapping;
    dataTexture.magFilter = THREE.NearestFilter;
    dataTexture.minFilter = THREE.NearestFilter;
    dataTexture.needsUpdate = true;
    
    console.log('Converting canvas to DataTexture for GPU upload');
    return dataTexture;
  }

  /**
   * Get atlas usage statistics
   * @returns {Object} Usage stats
   */
  getStats() {
    const usedPixels = this.currentY * this.size + this.currentX;
    const totalPixels = this.size * this.size;
    const usagePercent = (usedPixels / totalPixels * 100).toFixed(1);
    
    return {
      textureCount: this.textureMap.size,
      usedPixels,
      totalPixels,
      usagePercent: usagePercent + '%',
      currentPosition: { x: this.currentX, y: this.currentY }
    };
  }

  /**
   * Debug: Save atlas to download (for debugging)
   */
  downloadAtlas() {
    const link = document.createElement('a');
    link.download = 'texture-atlas.png';
    link.href = this.canvas.toDataURL();
    link.click();
  }

  /**
   * Clear the atlas and start over
   */
  clear() {
    this.textureMap.clear();
    this.currentX = 0;
    this.currentY = 0;
    this.rowHeight = 0;
    
    this.context.fillStyle = 'rgba(0, 0, 0, 0)';
    this.context.fillRect(0, 0, this.size, this.size);
    this.texture.needsUpdate = true;
    
    console.log('Texture atlas cleared');
  }

  destroy() {
    if (this.texture) {
      this.texture.dispose();
    }
    this.textureMap.clear();
  }
}