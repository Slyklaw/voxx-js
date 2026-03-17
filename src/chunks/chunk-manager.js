/**
 * Chunk management system for Voxx-JS voxel engine
 * Handles loading, unloading, and organization of chunks
 */
import { CHUNK_SIZE, VIEW_DISTANCE, HYSTERESIS_MARGIN, CHUNKS_PER_FRAME, MAX_POOL_SIZE } from '../core/constants.js';
import { logger } from '../core/logger.js';
import { ChunkError } from '../core/errors.js';
import { Chunk } from './chunk.js';

export class ChunkManager {
    constructor() {
        this.chunks = new Map(); // Store chunks by coordinates
        this.chunkSize = CHUNK_SIZE;

        // View distance in chunks (player can see this many chunks in each direction)
        this.viewDistance = VIEW_DISTANCE;
        this.loadDistance = VIEW_DISTANCE;
        this.unloadDistance = VIEW_DISTANCE + HYSTERESIS_MARGIN;
        this.chunksToLoad = []; // Queue of pending chunk coordinates
        this.pool = []; // Recycled chunk objects

        logger.info('Chunk manager initialized');
    }
    
    /**
     * Get or generate a chunk at the specified position
     * @param {number} x - Chunk X coordinate
     * @param {number} y - Chunk Y coordinate  
     * @param {number} z - Chunk Z coordinate
     */
    getChunk(x, y, z) {
        const chunkKey = `${x},${y},${z}`;
        
        if (this.chunks.has(chunkKey)) {
            return this.chunks.get(chunkKey);
        }
        
        // Try to reuse from pool
        let chunk;
        if (this.pool.length > 0) {
            chunk = this.pool.pop();
            // Reinitialize chunk with new coordinates
            chunk.x = x;
            chunk.y = y;
            chunk.z = z;
            chunk.data.fill(null);
            chunk.loaded = false;
            chunk.modified = false;
            chunk.markLoaded();
            logger.debug(`Reused chunk at (${x}, ${y}, ${z})`);
        } else {
            // Create new chunk
            chunk = new Chunk(x, y, z);
            chunk.markLoaded();
            logger.debug(`Created chunk at (${x}, ${y}, ${z})`);
        }
        
        this.chunks.set(chunkKey, chunk);
        return chunk;
    }
    
    /**
     * Load chunks around the player position
     * @param {Object} playerPos - Player position {x, y, z}
     */
    loadChunksAround(playerPos) {
        const playerChunkX = Math.floor(playerPos.x / this.chunkSize);
        const playerChunkY = Math.floor(playerPos.y / this.chunkSize);
        const playerChunkZ = Math.floor(playerPos.z / this.chunkSize);
        
        // Limit vertical loading to just the chunks where terrain exists (y=-1 to y=1)
        const minY = Math.max(-1, playerChunkY - 1);
        const maxY = Math.min(1, playerChunkY + 1);
        
        // Build queue of missing chunks within load distance
        for (let x = -this.loadDistance; x <= this.loadDistance; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = -this.loadDistance; z <= this.loadDistance; z++) {
                    const chunkX = playerChunkX + x;
                    const chunkY = y;
                    const chunkZ = playerChunkZ + z;
                    const chunkKey = `${chunkX},${chunkY},${chunkZ}`;
                    
                    // Skip if already loaded or already queued
                    if (this.chunks.has(chunkKey) || this.chunksToLoad.some(c => c.key === chunkKey)) {
                        continue;
                    }
                    
                    // Only add chunks within load distance (horizontal only, vertical is limited above)
                    if (Math.abs(x) <= this.loadDistance && Math.abs(z) <= this.loadDistance) {
                        const distance = x*x + z*z; // horizontal distance for sorting
                        this.chunksToLoad.push({ key: chunkKey, x: chunkX, y: chunkY, z: chunkZ, distance });
                    }
                }
            }
        }
        
        // Sort by distance (closest first)
        this.chunksToLoad.sort((a, b) => a.distance - b.distance);
        
        // Load up to CHUNKS_PER_FRAME chunks from the queue
        let loadedCount = 0;
        while (this.chunksToLoad.length > 0 && loadedCount < CHUNKS_PER_FRAME) {
            const chunkInfo = this.chunksToLoad.shift();
            this.getChunk(chunkInfo.x, chunkInfo.y, chunkInfo.z);
            loadedCount++;
        }
        
        if (loadedCount > 0) {
            logger.debug(`Loaded ${loadedCount} chunks, ${this.chunksToLoad.length} remaining in queue`);
        }
    }
    
    /**
     * Recycle a chunk by resetting its state and adding to pool
     * @param {Chunk} chunk - The chunk to recycle
     */
    recycleChunk(chunk) {
        // Clear voxel data
        chunk.data.fill(null);
        // Reset chunk state
        chunk.loaded = false;
        chunk.modified = false;
        // Add to pool for reuse
        this.pool.push(chunk);
        logger.debug(`Recycled chunk at (${chunk.x}, ${chunk.y}, ${chunk.z})`);
    }
    
    /**
     * Unload chunks that are far from the player
     * @param {Object} playerPos - Player position {x, y, z}
     */
    unloadChunksAway(playerPos) {
        const playerChunkX = Math.floor(playerPos.x / this.chunkSize);
        const playerChunkY = Math.floor(playerPos.y / this.chunkSize);
        const playerChunkZ = Math.floor(playerPos.z / this.chunkSize);
        
        // Remove chunks that are outside unload distance
        for (const [key, chunk] of this.chunks.entries()) {
            const [x, y, z] = key.split(',').map(Number);
            
            const distanceX = Math.abs(x - playerChunkX);
            const distanceY = Math.abs(y - playerChunkY);
            const distanceZ = Math.abs(z - playerChunkZ);
            
            // If chunk is outside unload distance, remove it
            if (distanceX > this.unloadDistance || 
                distanceY > this.unloadDistance || 
                distanceZ > this.unloadDistance) {
                
                this.chunks.delete(key);
                // Add to pool if space available
                if (this.pool.length < MAX_POOL_SIZE) {
                    this.recycleChunk(chunk);
                }
                logger.debug(`Unloaded chunk at (${x}, ${y}, ${z})`);
            }
        }
    }
    
    /**
     * Update chunk manager state
     * @param {Object} playerPos - Player position {x, y, z}
     */
    update(playerPos) {
        // Load new chunks around the player
        this.loadChunksAround(playerPos);
        
        // Unload old chunks that are too far away
        this.unloadChunksAway(playerPos);
    }
    
    /**
     * Get all loaded chunks
     */
    getLoadedChunks() {
        return Array.from(this.chunks.values());
    }
    
    /**
     * Check if a chunk exists at the specified position
     * @param {number} x - Chunk X coordinate
     * @param {number} y - Chunk Y coordinate  
     * @param {number} z - Chunk Z coordinate
     */
    hasChunk(x, y, z) {
        const chunkKey = `${x},${y},${z}`;
        return this.chunks.has(chunkKey);
    }
    
    /**
     * Remove a specific chunk
     * @param {number} x - Chunk X coordinate
     * @param {number} y - Chunk Y coordinate  
     * @param {number} z - Chunk Z coordinate
     */
    removeChunk(x, y, z) {
        const chunkKey = `${x},${y},${z}`;
        return this.chunks.delete(chunkKey);
    }
    
    /**
     * Get the total number of loaded chunks
     */
    getChunkCount() {
        return this.chunks.size;
    }
}
