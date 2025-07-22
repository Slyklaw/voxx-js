import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { World } from '../world.js';

// Mock the WorkerPool and ChunkWorker
vi.mock('../workers/workerPool.js', () => ({
  WorkerPool: vi.fn().mockImplementation(() => ({
    enqueueTask: vi.fn(),
    enqueuePriorityTask: vi.fn(),
    terminate: vi.fn()
  }))
}));

vi.mock('../workers/chunkWorker.js?worker', () => ({
  default: vi.fn()
}));

describe('World Priority Loading System', () => {
  let world;
  let mockScene;

  beforeEach(() => {
    mockScene = {
      add: vi.fn(),
      remove: vi.fn()
    };
    
    world = new World(0.12345, mockScene);
  });

  describe('Initialization', () => {
    it('should initialize with priority loading properties', () => {
      expect(world.initialChunkLoaded).toBe(false);
      expect(world.initialChunkPosition).toBeNull();
      expect(world.priorityQueue).toEqual([]);
      expect(world.isInitializing).toBe(false);
    });
  });

  describe('preloadInitialChunk', () => {
    it('should set initial chunk position correctly', async () => {
      const cameraPosition = new THREE.Vector3(50, 100, 75);
      
      // Mock the chunk loading to complete immediately
      world.initialChunkLoaded = true;
      
      await world.preloadInitialChunk(cameraPosition);
      
      expect(world.isInitializing).toBe(true);
      expect(world.initialChunkPosition).toEqual({
        x: Math.floor(50 / 32), // CHUNK_WIDTH = 32
        z: Math.floor(75 / 32)  // CHUNK_DEPTH = 32
      });
    });

    it('should not reinitialize if already initializing', async () => {
      world.isInitializing = true;
      const initialPosition = world.initialChunkPosition;
      
      const cameraPosition = new THREE.Vector3(100, 100, 100);
      await world.preloadInitialChunk(cameraPosition);
      
      expect(world.initialChunkPosition).toBe(initialPosition);
    });

    it('should call getChunk with priority flag', async () => {
      const cameraPosition = new THREE.Vector3(32, 100, 64);
      const getChunkSpy = vi.spyOn(world, 'getChunk').mockImplementation(() => ({}));
      
      // Mock the chunk loading to complete immediately
      world.initialChunkLoaded = true;
      
      await world.preloadInitialChunk(cameraPosition);
      
      expect(getChunkSpy).toHaveBeenCalledWith(1, 2, true); // priority = true
    });
  });

  describe('getChunk with priority', () => {
    it('should use enqueuePriorityTask for priority chunks', () => {
      const mockWorkerPool = world.workerPool;
      
      world.getChunk(0, 0, true);
      
      expect(mockWorkerPool.enqueuePriorityTask).toHaveBeenCalled();
      expect(mockWorkerPool.enqueueTask).not.toHaveBeenCalled();
    });

    it('should use enqueueTask for normal chunks', () => {
      const mockWorkerPool = world.workerPool;
      
      world.getChunk(0, 0, false);
      
      expect(mockWorkerPool.enqueueTask).toHaveBeenCalled();
      expect(mockWorkerPool.enqueuePriorityTask).not.toHaveBeenCalled();
    });

    it('should mark initial chunk as loaded when priority chunk completes', () => {
      world.initialChunkPosition = { x: 1, z: 1 };
      
      // Simulate the callback being called
      const mockWorkerPool = world.workerPool;
      world.getChunk(1, 1, true);
      
      // Get the callback that was passed to enqueuePriorityTask
      const callback = mockWorkerPool.enqueuePriorityTask.mock.calls[0][1];
      
      // Simulate chunk data being returned
      callback({ voxels: new Uint8Array(32 * 256 * 32) });
      
      expect(world.initialChunkLoaded).toBe(true);
    });
  });

  describe('update method with priority loading', () => {
    it('should not update if initializing and initial chunk not loaded', () => {
      world.isInitializing = true;
      world.initialChunkLoaded = false;
      
      const getChunkSpy = vi.spyOn(world, 'getChunk');
      const cameraPosition = new THREE.Vector3(0, 100, 0);
      
      world.update(cameraPosition, 2);
      
      expect(getChunkSpy).not.toHaveBeenCalled();
    });

    it('should update normally after initial chunk is loaded', () => {
      world.isInitializing = true;
      world.initialChunkLoaded = true;
      
      const getChunkSpy = vi.spyOn(world, 'getChunk').mockImplementation(() => ({}));
      const cameraPosition = new THREE.Vector3(0, 100, 0);
      
      world.update(cameraPosition, 1);
      
      expect(getChunkSpy).toHaveBeenCalled();
    });

    it('should load chunks in distance order', () => {
      world.initialChunkLoaded = true;
      
      const getChunkSpy = vi.spyOn(world, 'getChunk').mockImplementation(() => ({}));
      const cameraPosition = new THREE.Vector3(32, 100, 32); // Chunk (1, 1)
      
      world.update(cameraPosition, 1); // Small render distance for testing
      
      // Should load chunks in order of distance from camera chunk (1, 1)
      const calls = getChunkSpy.mock.calls;
      expect(calls.length).toBeGreaterThan(0);
      
      // The first call should be the closest chunk (camera chunk itself)
      expect(calls[0]).toEqual([1, 1]);
    });
  });
});