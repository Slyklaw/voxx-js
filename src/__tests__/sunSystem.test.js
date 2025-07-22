import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { SunSystem } from '../sunSystem.js';

// Mock Three.js objects
const createMockRenderer = () => ({
  shadowMap: {
    enabled: false,
    type: null
  }
});

const createMockLight = (intensity = 1.0) => ({
  intensity,
  position: new THREE.Vector3(0, 0, 0),
  color: { setHex: vi.fn() },
  castShadow: false,
  shadow: {
    mapSize: { width: 0, height: 0 },
    camera: {
      left: 0, right: 0, top: 0, bottom: 0,
      near: 0, far: 0
    },
    bias: 0
  }
});

describe('SunSystem', () => {
  let scene, renderer, ambientLight, directionalLight, sunSystem;

  beforeEach(() => {
    scene = new THREE.Scene();
    renderer = createMockRenderer();
    ambientLight = createMockLight(0.7);
    directionalLight = createMockLight(0.8);
    
    sunSystem = new SunSystem(scene, renderer, ambientLight, directionalLight);
  });

  describe('initialization', () => {
    it('should initialize with correct cycle durations', () => {
      expect(sunSystem.dayDuration).toBe(60);
      expect(sunSystem.nightDuration).toBe(60);
      expect(sunSystem.totalCycleDuration).toBe(120);
    });

    it('should start at day', () => {
      expect(sunSystem.isDay).toBe(true);
      expect(sunSystem.currentTime).toBe(0);
    });

    it('should enable shadows on renderer', () => {
      expect(renderer.shadowMap.enabled).toBe(true);
      expect(renderer.shadowMap.type).toBe(THREE.PCFSoftShadowMap);
    });

    it('should configure directional light for shadows', () => {
      expect(directionalLight.castShadow).toBe(true);
      expect(directionalLight.shadow.mapSize.width).toBe(2048);
      expect(directionalLight.shadow.mapSize.height).toBe(2048);
    });

    it('should lower ambient light intensity', () => {
      expect(ambientLight.intensity).toBe(0.4); // nightAmbientIntensity
    });
  });

  describe('day/night cycle', () => {
    it('should transition from day to night after day duration', () => {
      expect(sunSystem.isDay).toBe(true);
      
      // Update to just before night
      sunSystem.update(59);
      expect(sunSystem.isDay).toBe(true);
      
      // Update to night
      sunSystem.update(2);
      expect(sunSystem.isDay).toBe(false);
    });

    it('should transition from night back to day after full cycle', () => {
      // Skip to night
      sunSystem.update(70);
      expect(sunSystem.isDay).toBe(false);
      
      // Complete the cycle
      sunSystem.update(60);
      expect(sunSystem.isDay).toBe(true);
    });

    it('should reset cycle time after full duration', () => {
      sunSystem.update(125); // More than full cycle
      expect(sunSystem.currentTime).toBeLessThan(sunSystem.totalCycleDuration);
    });
  });

  describe('lighting updates', () => {
    it('should update sun position during day', () => {
      const originalPosition = directionalLight.position.clone();
      
      sunSystem.update(30); // Midday
      
      expect(directionalLight.position.x).not.toBe(originalPosition.x);
      expect(directionalLight.position.y).toBeGreaterThan(originalPosition.y);
    });

    it('should have maximum intensity at midday', () => {
      sunSystem.update(30); // Midday (50% through day)
      
      expect(directionalLight.intensity).toBeGreaterThan(0.5);
    });

    it('should have zero intensity at night', () => {
      sunSystem.update(90); // Middle of night
      
      expect(directionalLight.intensity).toBe(0);
    });

    it('should change light color during day', () => {
      // Dawn/dusk should be orange
      sunSystem.update(3); // Early morning (5% through day)
      expect(directionalLight.color.setHex).toHaveBeenCalledWith(0xffa500);
      
      // Midday should be white
      sunSystem.update(27); // Total 30s = midday
      expect(directionalLight.color.setHex).toHaveBeenCalledWith(0xffffff);
    });

    it('should update sky brightness throughout day/night cycle', () => {
      // Start of day - should be darker
      sunSystem.update(3); // Dawn
      const dawnBrightness = sunSystem.getTimeInfo().skyBrightness;
      
      // Midday - should be brightest
      sunSystem.update(27); // Total 30s = midday
      const middayBrightness = sunSystem.getTimeInfo().skyBrightness;
      
      // Night - should be darkest
      sunSystem.update(60); // Total 90s = middle of night
      const nightBrightness = sunSystem.getTimeInfo().skyBrightness;
      
      expect(middayBrightness).toBeGreaterThan(dawnBrightness);
      expect(dawnBrightness).toBeGreaterThan(nightBrightness);
      expect(nightBrightness).toBeLessThan(0.2); // Night should be quite dark
    });
  });

  describe('manual controls', () => {
    it('should skip to day correctly', () => {
      sunSystem.skipTo(true);
      
      expect(sunSystem.isDay).toBe(true);
      expect(sunSystem.currentTime).toBe(30); // Noon
    });

    it('should skip to night correctly', () => {
      sunSystem.skipTo(false);
      
      expect(sunSystem.isDay).toBe(false);
      expect(sunSystem.currentTime).toBe(90); // Midnight
    });

    it('should set time manually', () => {
      sunSystem.setTime(45);
      
      expect(sunSystem.currentTime).toBe(45);
    });

    it('should clamp manual time to valid range', () => {
      sunSystem.setTime(-10);
      expect(sunSystem.currentTime).toBe(0);
      
      sunSystem.setTime(200);
      expect(sunSystem.currentTime).toBeLessThan(120);
      expect(sunSystem.currentTime).toBeGreaterThan(119);
    });
  });

  describe('time info', () => {
    it('should provide correct time information during day', () => {
      sunSystem.update(15); // 25% through day
      
      const timeInfo = sunSystem.getTimeInfo();
      
      expect(timeInfo.isDay).toBe(true);
      expect(timeInfo.dayProgress).toBeCloseTo(0.25);
      expect(timeInfo.nightProgress).toBe(0);
      expect(timeInfo.skyBrightness).toBeGreaterThan(0);
    });

    it('should provide correct time information during night', () => {
      sunSystem.update(75); // 25% through night
      
      const timeInfo = sunSystem.getTimeInfo();
      
      expect(timeInfo.isDay).toBe(false);
      expect(timeInfo.dayProgress).toBe(0);
      expect(timeInfo.nightProgress).toBeCloseTo(0.25);
      expect(timeInfo.skyBrightness).toBeLessThan(0.2); // Night should be dark
    });
  });

  describe('shadow configuration', () => {
    it('should enable shadows on mesh', () => {
      const mockMesh = {
        material: {},
        castShadow: false,
        receiveShadow: false
      };
      
      sunSystem.enableShadowsOnMesh(mockMesh);
      
      expect(mockMesh.castShadow).toBe(true);
      expect(mockMesh.receiveShadow).toBe(true);
    });

    it('should handle null mesh gracefully', () => {
      expect(() => {
        sunSystem.enableShadowsOnMesh(null);
      }).not.toThrow();
    });
  });
});