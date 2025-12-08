/**
 * World management system for Voxx-JS voxel engine
 * Handles chunk-based world storage and generation
 */
export class World {
    constructor() {
        this.chunks = new Map(); // Store chunks by coordinates
        this.chunkSize = 32; // 32x32x32 blocks per chunk
        this.worldSeed = Math.random() * 10000;
        
        console.log('World system initialized');
    }
    
    /**
     * Generate a chunk at the specified position
     * @param {number} x - Chunk X coordinate
     * @param {number} y - Chunk Y coordinate  
     * @param {number} z - Chunk Z coordinate
     */
    generateChunk(x, y, z) {
        const chunkKey = `${x},${y},${z}`;
        
        // Check if chunk already exists
        if (this.chunks.has(chunkKey)) {
            return this.chunks.get(chunkKey);
        }
        
        // Create new chunk
        const chunk = {
            x: x,
            y: y,
            z: z,
            data: this.generateChunkData(x, y, z),
            loaded: true
        };
        
        this.chunks.set(chunkKey, chunk);
        console.log(`Generated chunk at (${x}, ${y}, ${z})`);
        return chunk;
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
        
        // Combine multiple noise functions for more natural terrain
        let height = 0;
        height += Math.sin(worldX * 0.02) * Math.sin(worldZ * 0.02) * 5;
        height += Math.sin(worldX * 0.01) * Math.sin(worldZ * 0.01) * 3;
        height += Math.sin(worldX * 0.005) * Math.sin(worldZ * 0.005) * 2;
        
        // Add some randomness
        height += Math.random() * 2;
        
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
     * Get voxel at world position
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} z - World Z coordinate
     */
    getVoxel(x, y, z) {
        // Calculate which chunk this voxel is in
        const chunkX = Math.floor(x / this.chunkSize);
        const chunkY = Math.floor(y / this.chunkSize);
        const chunkZ = Math.floor(z / this.chunkSize);
        
        // Calculate local coordinates within the chunk
        const localX = x % this.chunkSize;
        const localY = y % this.chunkSize;
        const localZ = z % this.chunkSize;
        
        // Get or generate the chunk
        const chunk = this.getChunk(chunkX, chunkY, chunkZ);
        if (!chunk || !chunk.loaded) {
            return null;
        }
        
        // Get voxel data
        const index = this.getVoxelIndex(localX, localY, localZ);
        return chunk.data[index];
    }
    
    /**
     * Get or generate a chunk
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
        return this.generateChunk(x, y, z);
    }
    
    /**
     * Update world state
     */
    update() {
        // World update logic would go here
        // For now, we'll just log that it's running
        // In a real implementation, this might include:
        // - Chunk loading/unloading based on player position
        // - World generation for new areas
        // - Entity updates
    }
    
    /**
     * Load world from storage (simplified)
     */
    loadWorld() {
        console.log('Loading world...');
        // In a real implementation, this would load from IndexedDB or file
    }
    
    /**
     * Save world to storage (simplified)
     */
    saveWorld() {
        console.log('Saving world...');
        // In a real implementation, this would save to IndexedDB or file
    }
}
