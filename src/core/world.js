/**
 * World management system for Voxx-JS voxel engine
 * Handles chunk-based world storage and generation
 */
import { CHUNK_SIZE, WORLD_SEED_DEFAULT } from './constants.js';
import { ChunkManager } from '../chunks/chunk-manager.js';
import { logger } from './logger.js';
import { VoxelError } from './errors.js';
import { createRNG } from './prng.js';

export class World {
    constructor() {
        this.chunkManager = new ChunkManager();
        this.chunkSize = CHUNK_SIZE;
        this.worldSeed = WORLD_SEED_DEFAULT;
        this.rng = createRNG(this.worldSeed);

        logger.info(`World system initialized with seed: ${this.worldSeed}`);
        
        // Load initial chunks around spawn point
        this.loadInitialChunks();
    }
    
    /**
     * Load initial chunks around spawn point so terrain is visible on startup
     */
    loadInitialChunks() {
        // Load chunks in a 5x5 area around origin
        for (let x = -2; x <= 2; x++) {
            for (let z = -2; z <= 2; z++) {
                // Get chunk (creates it)
                this.chunkManager.getChunk(x, 0, z);
                // Generate terrain data
                this.generateChunk(x, 0, z);
            }
        }
        logger.info('Loaded initial chunks around spawn');
    }
    
    /**
     * Generate a chunk at the specified position
     * @param {number} x - Chunk X coordinate
     * @param {number} y - Chunk Y coordinate  
     * @param {number} z - Chunk Z coordinate
     */
    generateChunk(x, y, z) {
        const existing = this.chunkManager.getChunk(x, y, z);
        if (existing.data.some(v => v !== null)) {
            return existing; // Already generated
        }
        
        // Generate data into chunk
        const data = this.generateChunkData(x, y, z);
        existing.data = data;
        existing.markLoaded();
        logger.debug(`Generated chunk at (${x}, ${y}, ${z})`);
        return existing;
    }
    
    /**
     * Generate chunk data using noise functions
     * @param {number} x - Chunk X coordinate
     * @param {number} y - Chunk Y coordinate  
     * @param {number} z - Chunk Z coordinate
     */
    generateChunkData(x, y, z) {
        // Create empty chunk data
        const data = new Array(this.chunkSize * this.chunkSize * this.chunkSize);
        
        // Simple terrain generation using noise
        for (let cx = 0; cx < this.chunkSize; cx++) {
            for (let cz = 0; cz < this.chunkSize; cz++) {
                // Generate height at this position using a simple noise function
                const height = this.getHeightAt(cx, cz, x, z);
                
                for (let cy = 0; cy < this.chunkSize; cy++) {
                    const index = this.getVoxelIndex(cx, cy, cz);
                    
                    // Set voxel based on height and position
                    if (cy <= height) {
                        // Simple terrain layers - surface, dirt, stone
                        if (cy === height) {
                            data[index] = { type: 'grass', id: 1 };
                        } else if (cy > height - 4) {
                            data[index] = { type: 'dirt', id: 2 };
                        } else {
                            data[index] = { type: 'stone', id: 3 };
                        }
                    } else {
                        data[index] = null; // Air
                    }
                }
            }
        }
        
        return data;
    }
    
    /**
     * Get height at a specific position using noise functions
     * @param {number} x - Local X coordinate within chunk
     * @param {number} z - Local Z coordinate within chunk
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     */
    getHeightAt(x, z, chunkX, chunkZ) {
        // Simple noise-like function for terrain generation
        const worldX = chunkX * this.chunkSize + x;
        const worldZ = chunkZ * this.chunkSize + z;
        
        // Use deterministic noise based on position
        // Create seeded values from world coordinates
        const seedX = createRNG(worldX * 1000 + worldZ);
        const seedZ = createRNG(worldZ * 1000 + worldX);
        
        // Combine multiple noise functions for more natural terrain
        let height = 0;
        height += Math.sin(worldX * 0.02) * Math.sin(worldZ * 0.02) * 5;
        height += Math.sin(worldX * 0.01) * Math.sin(worldZ * 0.01) * 3;
        height += Math.sin(worldX * 0.005) * Math.sin(worldZ * 0.005) * 2;
        
        // Use deterministic random component based on position
        height += seedX() * 2;
        
        // Set base height and clamp
        height = Math.max(1, Math.min(this.chunkSize - 1, 10 + height));
        
        return Math.floor(height);
    }
    
    /**
     * Get voxel index from coordinates
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     */
    getVoxelIndex(x, y, z) {
        return x + (y * this.chunkSize) + (z * this.chunkSize * this.chunkSize);
    }
    
    /**
     * Get voxel at world position with coordinate validation
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} z - World Z coordinate
     * @returns {Object|null} Voxel data or null if invalid/out of bounds
     */
    getVoxel(x, y, z) {
        // Validate coordinates are numbers
        if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') {
            logger.warn(`Invalid voxel coordinates: (${x}, ${y}, ${z}) - not numbers`);
            return null;
        }

        // Calculate chunk and local coordinates
        const chunkX = Math.floor(x / this.chunkSize);
        const chunkY = Math.floor(y / this.chunkSize);
        const chunkZ = Math.floor(z / this.chunkSize);
        
        // Handle negative coordinates properly
        const localX = ((x % this.chunkSize) + this.chunkSize) % this.chunkSize;
        const localY = ((y % this.chunkSize) + this.chunkSize) % this.chunkSize;
        const localZ = ((z % this.chunkSize) + this.chunkSize) % this.chunkSize;

        // Get chunk
        const chunk = this.chunkManager.getChunk(chunkX, chunkY, chunkZ);
        if (!chunk || !chunk.loaded) {
            return null;
        }

        // Use chunk's getVoxel which has bounds checking
        return chunk.getVoxel(localX, localY, localZ);
    }
    
    /**
     * Get or generate a chunk (delegates to ChunkManager)
     * @param {number} x - Chunk X coordinate
     * @param {number} y - Chunk Y coordinate  
     * @param {number} z - Chunk Z coordinate
     */
    getChunk(x, y, z) {
        return this.chunkManager.getChunk(x, y, z);
    }
    
    /**
     * Update world state
     * @param {Object} playerPos - Player position {x, y, z}
     */
    update(playerPos) {
        if (playerPos && this.chunkManager) {
            this.chunkManager.update(playerPos);
        }
    }
    
    /**
     * Load world from storage (simplified)
     */
    loadWorld() {
        logger.info('Loading world...');
        // In a real implementation, this would load from IndexedDB or file
    }
    
    /**
     * Save world to storage (simplified)
     */
    saveWorld() {
        logger.info('Saving world...');
        // In a real implementation, this would save to IndexedDB or file
    }
}
