import { Chunk } from './Chunk.js';
import { BlockType } from './BlockType.js';
import { Block } from './Block.js';

export class ChunkManager {
    constructor() {
        this.chunks = new Map(); // Map of chunk keys to Chunk objects
        this.renderDistance = 8; // Number of chunks to load in each direction
        this.chunkSize = 16; // Blocks per chunk side
    }

    /**
     * Get chunk key from coordinates
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     * @returns {string} Chunk key in format "x,z"
     */
    getChunkKey(chunkX, chunkZ) {
        return `${chunkX},${chunkZ}`;
    }

    /**
     * Get chunk coordinates from world coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldZ - World Z coordinate
     * @returns {{x: number, z: number}} Chunk coordinates
     */
    getChunkCoordinates(worldX, worldZ) {
        return {
            x: Math.floor(worldX / this.chunkSize),
            z: Math.floor(worldZ / this.chunkSize)
        };
    }

    /**
     * Get or create a chunk at the specified coordinates
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     * @returns {Chunk} The chunk at the specified coordinates
     */
    getChunk(chunkX, chunkZ) {
        const key = this.getChunkKey(chunkX, chunkZ);
        let chunk = this.chunks.get(key);
        
        if (!chunk) {
            chunk = new Chunk(chunkX, chunkZ);
            this.chunks.set(key, chunk);
            this.generateChunk(chunk);
        }
        
        return chunk;
    }

    /**
     * Get a block at world coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {number} worldZ - World Z coordinate
     * @returns {Block|null} The block at the position, or null if out of bounds
     */
    getBlock(worldX, worldY, worldZ) {
        if (worldY < 0 || worldY >= 256) {
            return null;
        }
        
        const chunkCoords = this.getChunkCoordinates(worldX, worldZ);
        const chunk = this.getChunk(chunkCoords.x, chunkCoords.z);
        
        if (!chunk) {
            return null;
        }
        
        const localCoords = chunk.getLocalCoordinates(worldX, worldZ);
        return chunk.getBlock(localCoords.localX, worldY, localCoords.localZ);
    }

    /**
     * Set a block at world coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {number} worldZ - World Z coordinate
     * @param {Block|null} block - The block to set
     * @returns {boolean} True if successful
     */
    setBlock(worldX, worldY, worldZ, block) {
        if (worldY < 0 || worldY >= 256) {
            return false;
        }
        
        const chunkCoords = this.getChunkCoordinates(worldX, worldZ);
        const chunk = this.getChunk(chunkCoords.x, chunkCoords.z);
        
        if (!chunk) {
            return false;
        }
        
        const localCoords = chunk.getLocalCoordinates(worldX, worldZ);
        return chunk.setBlock(localCoords.localX, worldY, localCoords.localZ, block);
    }

    /**
     * Generate terrain for a chunk
     * @param {Chunk} chunk - The chunk to generate
     */
    generateChunk(chunk) {
        // Simple height-based terrain generation
        const baseHeight = 64;
        const amplitude = 10;
        
        for (let localX = 0; localX < 16; localX++) {
            for (let localZ = 0; localZ < 16; localZ++) {
                const worldCoords = chunk.getWorldCoordinates(localX, localZ);
                
                // Simple noise-like height calculation
                const height = baseHeight + Math.floor(
                    Math.sin(worldCoords.worldX * 0.1) * amplitude +
                    Math.cos(worldCoords.worldZ * 0.1) * amplitude
                );
                
                // Generate terrain layers
                for (let y = 0; y < 256; y++) {
                    if (y === height) {
                        // Grass on top
                        const block = new Block(BlockType.GRASS, worldCoords.worldX, y, worldCoords.worldZ);
                        chunk.setBlock(localX, y, localZ, block);
                    } else if (y >= height - 3 && y < height) {
                        // Dirt below grass
                        const block = new Block(BlockType.DIRT, worldCoords.worldX, y, worldCoords.worldZ);
                        chunk.setBlock(localX, y, localZ, block);
                    } else if (y < height - 3 && y > height - 10) {
                        // Stone deeper down
                        const block = new Block(BlockType.STONE, worldCoords.worldX, y, worldCoords.worldZ);
                        chunk.setBlock(localX, y, localZ, block);
                    } else if (y < height - 10) {
                        // Bedrock at bottom
                        const block = new Block(BlockType.STONE, worldCoords.worldX, y, worldCoords.worldZ);
                        chunk.setBlock(localX, y, localZ, block);
                    }
                    // Air above terrain
                }
                
                // Add occasional trees
                if (Math.random() < 0.01) {
                    this.generateTree(chunk, localX, height + 1, localZ);
                }
            }
        }
    }

    /**
     * Generate a tree at the specified position
     * @param {Chunk} chunk - The chunk containing the tree
     * @param {number} x - Local X coordinate
     * @param {number} y - Starting Y coordinate
     * @param {number} z - Local Z coordinate
     */
    generateTree(chunk, x, y, z) {
        const treeHeight = 4 + Math.floor(Math.random() * 3);
        
        // Generate trunk
        for (let i = 0; i < treeHeight; i++) {
            if (y + i < 256) {
                const worldCoords = chunk.getWorldCoordinates(x, z);
                const block = new Block(BlockType.WOOD, worldCoords.worldX, y + i, worldCoords.worldZ);
                chunk.setBlock(x, y + i, z, block);
            }
        }
        
        // Generate leaves
        const leafStart = y + treeHeight - 2;
        for (let dx = -2; dx <= 2; dx++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dz = -2; dz <= 2; dz++) {
                    const distance = Math.abs(dx) + Math.abs(dz);
                    if (distance <= 2 && Math.random() > 0.3) {
                        const leafX = x + dx;
                        const leafY = leafStart + dy;
                        const leafZ = z + dz;
                        
                        if (leafX >= 0 && leafX < 16 && leafY >= 0 && leafY < 256 && leafZ >= 0 && leafZ < 16) {
                            const worldCoords = chunk.getWorldCoordinates(leafX, leafZ);
                            const block = new Block(BlockType.LEAVES, worldCoords.worldX, leafY, worldCoords.worldZ);
                            chunk.setBlock(leafX, leafY, leafZ, block);
                        }
                    }
                }
            }
        }
    }

    /**
     * Load chunks around a world position
     * @param {number} worldX - World X coordinate
     * @param {number} worldZ - World Z coordinate
     */
    loadChunksAround(worldX, worldZ) {
        const centerChunk = this.getChunkCoordinates(worldX, worldZ);
        
        // Load chunks in render distance
        for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
            for (let dz = -this.renderDistance; dz <= this.renderDistance; dz++) {
                const chunkX = centerChunk.x + dx;
                const chunkZ = centerChunk.z + dz;
                this.getChunk(chunkX, chunkZ);
            }
        }
    }

    /**
     * Unload chunks that are too far from the player
     * @param {number} worldX - World X coordinate
     * @param {number} worldZ - World Z coordinate
     */
    unloadDistantChunks(worldX, worldZ) {
        const centerChunk = this.getChunkCoordinates(worldX, worldZ);
        const chunksToUnload = [];
        
        for (const [key, chunk] of this.chunks) {
            const distance = Math.max(
                Math.abs(chunk.x - centerChunk.x),
                Math.abs(chunk.z - centerChunk.z)
            );
            
            if (distance > this.renderDistance + 2) {
                chunksToUnload.push(key);
            }
        }
        
        // Unload chunks
        for (const key of chunksToUnload) {
            this.chunks.delete(key);
        }
    }

    /**
     * Get all loaded chunks
     * @returns {Chunk[]} Array of all loaded chunks
     */
    getLoadedChunks() {
        return Array.from(this.chunks.values());
    }

    /**
     * Get chunks that need mesh updates
     * @returns {Chunk[]} Array of chunks needing updates
     */
    getChunksNeedingUpdates() {
        return this.getLoadedChunks().filter(chunk => chunk.needsUpdate);
    }

    /**
     * Clear all chunks
     */
    clear() {
        this.chunks.clear();
    }

    /**
     * Serialize all chunks for saving
     * @returns {Object} Serialized chunk data
     */
    serialize() {
        const data = {};
        for (const [key, chunk] of this.chunks) {
            data[key] = chunk.serialize();
        }
        return data;
    }

    /**
     * Deserialize chunks from saved data
     * @param {Object} data - Serialized chunk data
     */
    deserialize(data) {
        this.clear();
        for (const [key, chunkData] of Object.entries(data)) {
            const chunk = Chunk.deserialize(chunkData);
            this.chunks.set(key, chunk);
        }
    }

    /**
     * Get the number of loaded chunks
     * @returns {number} Number of loaded chunks
     */
    getChunkCount() {
        return this.chunks.size;
    }

    /**
     * Check if a chunk exists at the specified coordinates
     * @param {number} chunkX - Chunk X coordinate
     * @param {number} chunkZ - Chunk Z coordinate
     * @returns {boolean} True if chunk exists
     */
    hasChunk(chunkX, chunkZ) {
        const key = this.getChunkKey(chunkX, chunkZ);
        return this.chunks.has(key);
    }

    /**
     * Get chunk coordinates for all loaded chunks
     * @returns {{x: number, z: number}[]} Array of chunk coordinates
     */
    getLoadedChunkCoordinates() {
        return Array.from(this.chunks.values()).map(chunk => ({
            x: chunk.x,
            z: chunk.z
        }));
    }
}
