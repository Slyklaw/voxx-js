import * as THREE from 'three';

/**
 * Sun system that manages day/night cycle with directional lighting and shadows
 */
export class SunSystem {
  constructor(scene, renderer, ambientLight, directionalLight) {
    this.scene = scene;
    this.renderer = renderer;
    this.ambientLight = ambientLight;
    this.directionalLight = directionalLight;
    
    // Day/night cycle configuration
    this.dayDuration = 60; // 60 seconds for day (dusk to dawn)
    this.nightDuration = 60; // 60 seconds for night
    this.totalCycleDuration = this.dayDuration + this.nightDuration; // 120 seconds total
    
    // Time tracking
    this.currentTime = 0; // Current time in the cycle (0 to totalCycleDuration)
    this.isDay = true;
    
    // Light configuration
    this.originalAmbientIntensity = 0.7;
    this.nightAmbientIntensity = 0.4; // Slightly lower for night
    this.dayDirectionalIntensity = 0.8;
    this.nightDirectionalIntensity = 0.0; // No sun at night
    
    // Sun path configuration
    this.sunRadius = 100; // Distance from origin
    this.sunHeight = 50; // Height above ground
    
    // Sky color configuration
    this.daySkyColor = new THREE.Color(0x87ceeb); // Sky blue
    this.nightSkyColor = new THREE.Color(0x0a0a1a); // Very dark blue/black
    this.dawnDuskSkyColor = new THREE.Color(0x4a4a6a); // Purple-ish twilight
    
    this.setupShadows();
    this.setupSunPath();
  }
  
  setupShadows() {
    // Enable shadows on renderer
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Soft shadows
    
    // Configure directional light for shadows
    this.directionalLight.castShadow = true;
    
    // Shadow camera configuration
    const shadowMapSize = 2048;
    this.directionalLight.shadow.mapSize.width = shadowMapSize;
    this.directionalLight.shadow.mapSize.height = shadowMapSize;
    
    // Shadow camera bounds (covers a good area around chunks)
    const shadowDistance = 200;
    this.directionalLight.shadow.camera.left = -shadowDistance;
    this.directionalLight.shadow.camera.right = shadowDistance;
    this.directionalLight.shadow.camera.top = shadowDistance;
    this.directionalLight.shadow.camera.bottom = -shadowDistance;
    this.directionalLight.shadow.camera.near = 0.1;
    this.directionalLight.shadow.camera.far = 500;
    
    // Shadow bias to prevent shadow acne
    this.directionalLight.shadow.bias = -0.0001;
    
    console.log('Sun system: Shadows enabled');
  }
  
  setupSunPath() {
    // Store original light position for reference
    this.originalLightPosition = this.directionalLight.position.clone();
    
    // Lower the ambient light as requested
    this.ambientLight.intensity = this.nightAmbientIntensity;
    
    console.log('Sun system: Day/night cycle initialized');
  }
  
  /**
   * Update the sun position and lighting based on current time
   * @param {number} deltaTime - Time elapsed since last update in seconds
   */
  update(deltaTime) {
    // Update current time in cycle
    this.currentTime += deltaTime;
    if (this.currentTime >= this.totalCycleDuration) {
      this.currentTime -= this.totalCycleDuration;
    }
    
    // Determine if it's day or night
    const wasDay = this.isDay;
    this.isDay = this.currentTime < this.dayDuration;
    
    if (wasDay !== this.isDay) {
      console.log(`Sun system: Switched to ${this.isDay ? 'day' : 'night'}`);
    }
    
    if (this.isDay) {
      this.updateDayLighting();
    } else {
      this.updateNightLighting();
    }
  }
  
  updateDayLighting() {
    // Calculate sun position during day (0 to dayDuration)
    const dayProgress = this.currentTime / this.dayDuration; // 0 to 1
    
    // Sun moves in an arc from east to west
    // At 0 (dawn): sun is in the east, low on horizon
    // At 0.5 (noon): sun is overhead
    // At 1 (dusk): sun is in the west, low on horizon
    
    const angle = dayProgress * Math.PI; // 0 to PI (half circle)
    const sunX = Math.cos(angle) * this.sunRadius; // East to West
    const sunY = Math.sin(angle) * this.sunHeight + this.sunHeight; // Arc height
    const sunZ = 0; // Keep sun in the same Z plane
    
    // Update directional light position
    this.directionalLight.position.set(sunX, sunY, sunZ);
    
    // Update light intensity based on sun height
    // Higher sun = brighter light
    const heightFactor = Math.sin(angle); // 0 at horizon, 1 at zenith
    const lightIntensity = this.dayDirectionalIntensity * Math.max(0.1, heightFactor);
    this.directionalLight.intensity = lightIntensity;
    
    // Update ambient light for day
    const ambientIntensity = this.nightAmbientIntensity + 
      (this.originalAmbientIntensity - this.nightAmbientIntensity) * heightFactor;
    this.ambientLight.intensity = ambientIntensity;
    
    // Update sky color based on time of day and sun height
    this.updateSkyColor(dayProgress, heightFactor);
    
    // Update light color based on time of day
    if (dayProgress < 0.1 || dayProgress > 0.9) {
      // Dawn/dusk - warmer, orange light
      this.directionalLight.color.setHex(0xffa500); // Orange
    } else if (dayProgress < 0.3 || dayProgress > 0.7) {
      // Morning/evening - slightly warm
      this.directionalLight.color.setHex(0xffddaa); // Warm white
    } else {
      // Midday - pure white
      this.directionalLight.color.setHex(0xffffff); // White
    }
  }
  
  updateNightLighting() {
    // During night, no directional light (sun is gone)
    this.directionalLight.intensity = this.nightDirectionalIntensity;
    this.ambientLight.intensity = this.nightAmbientIntensity;
    
    // Position sun below horizon (not visible but maintains shadow camera)
    this.directionalLight.position.set(0, -this.sunHeight, 0);
    
    // Night light color (if any intensity)
    this.directionalLight.color.setHex(0x4444ff); // Cool blue
    
    // Set sky to dark night color
    this.scene.background = this.nightSkyColor;
  }
  
  /**
   * Update sky color based on time of day and sun position
   * @param {number} dayProgress - Progress through day (0-1)
   * @param {number} heightFactor - Sun height factor (0-1)
   */
  updateSkyColor(dayProgress, heightFactor) {
    let skyColor;
    
    if (dayProgress < 0.15 || dayProgress > 0.85) {
      // Dawn/dusk - transition between night and day colors
      const twilightFactor = dayProgress < 0.15 ? 
        (dayProgress / 0.15) : // Dawn: 0 to 1
        ((1 - dayProgress) / 0.15); // Dusk: 1 to 0
      
      // Interpolate between night and dawn/dusk colors
      skyColor = new THREE.Color().lerpColors(
        this.nightSkyColor,
        this.dawnDuskSkyColor,
        twilightFactor
      );
    } else {
      // Day time - interpolate between dawn/dusk and full day based on sun height
      const dayFactor = Math.max(0.2, heightFactor); // Minimum brightness during day
      skyColor = new THREE.Color().lerpColors(
        this.dawnDuskSkyColor,
        this.daySkyColor,
        dayFactor
      );
    }
    
    this.scene.background = skyColor;
  }
  
  /**
   * Enable or disable shadows on chunk meshes
   * @param {THREE.Mesh} mesh - Chunk mesh to configure
   */
  enableShadowsOnMesh(mesh) {
    if (mesh && mesh.material) {
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  }
  
  /**
   * Get current time information
   * @returns {Object} Time information
   */
  getTimeInfo() {
    const dayProgress = this.isDay ? (this.currentTime / this.dayDuration) : 0;
    const nightProgress = !this.isDay ? ((this.currentTime - this.dayDuration) / this.nightDuration) : 0;
    
    // Calculate sky brightness as a percentage
    const currentSkyColor = this.scene.background;
    const skyBrightness = (currentSkyColor.r + currentSkyColor.g + currentSkyColor.b) / 3;
    
    return {
      isDay: this.isDay,
      currentTime: this.currentTime,
      totalCycleDuration: this.totalCycleDuration,
      dayProgress: dayProgress,
      nightProgress: nightProgress,
      sunIntensity: this.directionalLight.intensity,
      ambientIntensity: this.ambientLight.intensity,
      skyBrightness: skyBrightness
    };
  }
  
  /**
   * Set time of day manually (for testing)
   * @param {number} time - Time in seconds (0 to totalCycleDuration)
   */
  setTime(time) {
    this.currentTime = Math.max(0, Math.min(time, this.totalCycleDuration - 0.001));
    this.update(0); // Update lighting immediately
  }
  
  /**
   * Skip to day or night
   * @param {boolean} toDay - True for day, false for night
   */
  skipTo(toDay) {
    if (toDay) {
      this.currentTime = this.dayDuration * 0.5; // Noon
    } else {
      this.currentTime = this.dayDuration + (this.nightDuration * 0.5); // Midnight
    }
    this.update(0);
  }
}