/**
 * Chunk management system for Voxx-JS voxel engine
 * Handles loading, unloading, and organization of chunks
 */
export class ChunkManager {
    constructor(world) {
        this.world = world;
        this.chunks = new Map(); // Store chunks by coordinates
        this.chunkSize = 32; // 32x32x32 blocks per chunk
        
        // View distance in chunks (player can see this many chunks in each direction)
        this.viewDistance = 8;
        
        console.log('Chunk manager initialized');
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
        
        // Generate new chunk if it doesn't exist
        const chunk = new Chunk(x, y, z);
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
        
        // Load chunks within view distance
        for (let x = -this.viewDistance; x <= this.viewDistance; x++) {
            for (let y = -this.viewDistance; y <= this.viewDistance; y++) {
                for (let z = -this.viewDistance; z <= this.viewDistance; z++) {
                    const chunkX = playerChunkX + x;
                    const chunkY = playerChunkY + y;
                    const chunkZ = playerChunkZ + z;
                    
                    // Only generate chunks that are within reasonable bounds
                    if (Math.abs(x) <= this.viewDistance && 
                        Math.abs(y) <= this.viewDistance && 
                        Math.abs(z) <= this.viewDistance) {
                        
                        this.getChunk(chunkX, chunkY, chunkZ);
                    }
                }
            }
        }
        
        console.log(`Loaded chunks around player position (${playerPos.x}, ${playerPos.y}, ${playerPos.z})`);
    }
    
    /**
     * Unload chunks that are far from the player
     * @param {Object} playerPos - Player position {x, y, z}
     */
    unloadChunksAway(playerPos) {
        const playerChunkX = Math.floor(playerPos.x / this.chunkSize);
        const playerChunkY = Math.floor(playerPos.y / this.chunkSize);
        const playerChunkZ = Math.floor(playerPos.z / this.chunkSize);
        
        // Remove chunks that are outside view distance
        for (const [key, chunk] of this.chunks.entries()) {
            const [x, y, z] = key.split(',').map(Number);
            
            const distanceX = Math.abs(x - playerChunkX);
            const distanceY = Math.abs(y - playerChunkY);
            const distanceZ = Math.abs(z - playerChunkZ);
            
            // If chunk is outside view distance, remove it
            if (distanceX > this.viewDistance || 
                distanceY > this.viewDistance || 
                distanceZ > this.viewDistance) {
                
                this.chunks.delete(key);
                console.log(`Unloaded chunk at (${x}, ${y}, ${z})`);
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
