import { Block } from './Block.js';
import { BlockType } from './BlockType.js';

export class Chunk {
    constructor(x, z) {
        this.x = x; // Chunk X coordinate
        this.z = z; // Chunk Z coordinate
        this.blocks = new Array(16); // 16x256x16 blocks
        
        // Initialize 3D array with null values
        for (let i = 0; i < 16; i++) {
            this.blocks[i] = new Array(256);
            for (let j = 0; j < 256; j++) {
                this.blocks[i][j] = new Array(16);
                for (let k = 0; k < 16; k++) {
                    this.blocks[i][j][k] = null;
                }
            }
        }
        
        this.mesh = null; // Three.js mesh for this chunk
        this.needsUpdate = false;
        this.isEmpty = true;
    }

    /**
     * Get a block at local chunk coordinates
     * @param {number} x - Local X coordinate (0-15)
     * @param {number} y - Y coordinate (0-255)
     * @param {number} z - Local Z coordinate (0-15)
     * @returns {Block|null} The block at the position, or null if out of bounds
     */
    getBlock(x, y, z) {
        if (x < 0 || x >= 16 || y < 0 || y >= 256 || z < 0 || z >= 16) {
            return null;
        }
        return this.blocks[x][y][z];
    }

    /**
     * Set a block at local chunk coordinates
     * @param {number} x - Local X coordinate (0-15)
     * @param {number} y - Y coordinate (0-255)
     * @param {number} z - Local Z coordinate (0-15)
     * @param {Block|null} block - The block to set, or null to remove
     * @returns {boolean} True if successful, false if out of bounds
     */
    setBlock(x, y, z, block) {
        if (x < 0 || x >= 16 || y < 0 || y >= 256 || z < 0 || z >= 16) {
            return false;
        }
        
        this.blocks[x][y][z] = block;
        this.needsUpdate = true;
        
        // Update empty status
        if (block !== null && block.type !== BlockType.AIR) {
            this.isEmpty = false;
        } else {
            this.checkIfEmpty();
        }
        
        return true;
    }

    /**
     * Get world coordinates from chunk coordinates
     * @param {number} localX - Local X coordinate (0-15)
     * @param {number} localZ - Local Z coordinate (0-15)
     * @returns {{worldX: number, worldZ: number}} World coordinates
     */
    getWorldCoordinates(localX, localZ) {
        return {
            worldX: this.x * 16 + localX,
            worldZ: this.z * 16 + localZ
        };
    }

    /**
     * Get local chunk coordinates from world coordinates
     * @param {number} worldX - World X coordinate
     * @param {number} worldZ - World Z coordinate
     * @returns {{localX: number, localZ: number}} Local chunk coordinates
     */
    getLocalCoordinates(worldX, worldZ) {
        return {
            localX: worldX - this.x * 16,
            localZ: worldZ - this.z * 16
        };
    }

    /**
     * Check if this chunk contains a world position
     * @param {number} worldX - World X coordinate
     * @param {number} worldZ - World Z coordinate
     * @returns {boolean} True if this chunk contains the position
     */
    containsWorldPosition(worldX, worldZ) {
        const chunkX = Math.floor(worldX / 16);
        const chunkZ = Math.floor(worldZ / 16);
        return chunkX === this.x && chunkZ === this.z;
    }

    /**
     * Check if the chunk is completely empty (all air blocks)
     * @returns {boolean} True if the chunk is empty
     */
    checkIfEmpty() {
        for (let x = 0; x < 16; x++) {
            for (let y = 0; y < 256; y++) {
                for (let z = 0; z < 16; z++) {
                    const block = this.blocks[x][y][z];
                    if (block && block.type !== BlockType.AIR) {
                        this.isEmpty = false;
                        return false;
                    }
                }
            }
        }
        this.isEmpty = true;
        return true;
    }

    /**
     * Fill the chunk with a specific block type
     * @param {BlockType} blockType - The block type to fill with
     * @param {number} minY - Minimum Y level (inclusive)
     * @param {number} maxY - Maximum Y level (inclusive)
     */
    fill(blockType, minY = 0, maxY = 255) {
        minY = Math.max(0, Math.min(255, minY));
        maxY = Math.max(0, Math.min(255, maxY));
        
        for (let x = 0; x < 16; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = 0; z < 16; z++) {
                    const worldCoords = this.getWorldCoordinates(x, z);
                    this.blocks[x][y][z] = new Block(blockType, worldCoords.worldX, y, worldCoords.worldZ);
                }
            }
        }
        
        this.isEmpty = blockType === BlockType.AIR;
        this.needsUpdate = true;
    }

    /**
     * Clear all blocks from the chunk
     */
    clear() {
        for (let x = 0; x < 16; x++) {
            for (let y = 0; y < 256; y++) {
                for (let z = 0; z < 16; z++) {
                    this.blocks[x][y][z] = null;
                }
            }
        }
        this.isEmpty = true;
        this.needsUpdate = true;
    }

    /**
     * Get all non-air blocks in the chunk
     * @returns {Block[]} Array of non-air blocks
     */
    getNonAirBlocks() {
        const blocks = [];
        for (let x = 0; x < 16; x++) {
            for (let y = 0; y < 256; y++) {
                for (let z = 0; z < 16; z++) {
                    const block = this.blocks[x][y][z];
                    if (block && block.type !== BlockType.AIR) {
                        blocks.push(block);
                    }
                }
            }
        }
        return blocks;
    }

    /**
     * Get chunk key for storage/lookup
     * @returns {string} Chunk key in format "x,z"
     */
    getKey() {
        return `${this.x},${this.z}`;
    }

    /**
     * Serialize chunk data for saving
     * @returns {Object} Serialized chunk data
     */
    serialize() {
        const blocks = [];
        for (let x = 0; x < 16; x++) {
            for (let y = 0; y < 256; y++) {
                for (let z = 0; z < 16; z++) {
                    const block = this.blocks[x][y][z];
                    if (block && block.type !== BlockType.AIR) {
                        blocks.push({
                            x, y, z,
                            type: block.type
                        });
                    }
                }
            }
        }
        
        return {
            x: this.x,
            z: this.z,
            blocks: blocks,
            isEmpty: this.isEmpty
        };
    }

    /**
     * Deserialize chunk data from saved format
     * @param {Object} data - Serialized chunk data
     * @returns {Chunk} The deserialized chunk
     */
    static deserialize(data) {
        const chunk = new Chunk(data.x, data.z);
        chunk.clear();
        chunk.isEmpty = data.isEmpty;
        
        for (const blockData of data.blocks) {
            const worldCoords = chunk.getWorldCoordinates(blockData.x, blockData.z);
            const block = new Block(blockData.type, worldCoords.worldX, blockData.y, worldCoords.worldZ);
            chunk.setBlock(blockData.x, blockData.y, blockData.z, block);
        }
        
        return chunk;
    }
}
