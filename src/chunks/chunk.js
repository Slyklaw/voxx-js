/**
 * Chunk data structure for Voxx-JS voxel engine
 * Represents a 32x32x32 section of the world
 */
export class Chunk {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
        
        // Initialize chunk data
        this.data = new Array(32 * 32 * 32);
        this.loaded = false;
        this.modified = false;
        
        // Initialize all voxels to air (null)
        for (let i = 0; i < this.data.length; i++) {
            this.data[i] = null;
        }
        
        console.log(`Chunk created at (${x}, ${y}, ${z})`);
    }
    
    /**
     * Get voxel at local coordinates within the chunk
     * @param {number} x - Local X coordinate (0-31)
     * @param {number} y - Local Y coordinate (0-31)
     * @param {number} z - Local Z coordinate (0-31)
     */
    getVoxel(x, y, z) {
        // Bounds checking
        if (x < 0 || x >= 32 || y < 0 || y >= 32 || z < 0 || z >= 32) {
            return null;
        }
        
        const index = this.getVoxelIndex(x, y, z);
        return this.data[index];
    }
    
    /**
     * Set voxel at local coordinates within the chunk
     * @param {number} x - Local X coordinate (0-31)
     * @param {number} y - Local Y coordinate (0-31)
     * @param {number} z - Local Z coordinate (0-31)
     * @param {Object|null} voxel - Voxel data or null for air
     */
    setVoxel(x, y, z, voxel) {
        // Bounds checking
        if (x < 0 || x >= 32 || y < 0 || y >= 32 || z < 0 || z >= 32) {
            return false;
        }
        
        const index = this.getVoxelIndex(x, y, z);
        this.data[index] = voxel;
        this.modified = true;
        return true;
    }
    
    /**
     * Get voxel index from local coordinates
     * @param {number} x - Local X coordinate (0-31)
     * @param {number} y - Local Y coordinate (0-31)
     * @param {number} z - Local Z coordinate (0-31)
     */
    getVoxelIndex(x, y, z) {
        return x + (y * 32) + (z * 32 * 32);
    }
    
    /**
     * Get world coordinates from local chunk coordinates
     * @param {number} localX - Local X coordinate within chunk
     * @param {number} localY - Local Y coordinate within chunk
     * @param {number} localZ - Local Z coordinate within chunk
     */
    getWorldCoordinates(localX, localY, localZ) {
        return {
            x: this.x * 32 + localX,
            y: this.y * 32 + localY,
            z: this.z * 32 + localZ
        };
    }
    
    /**
     * Check if chunk is empty (contains no non-air voxels)
     */
    isEmpty() {
        for (let i = 0; i < this.data.length; i++) {
            if (this.data[i] !== null) {
                return false;
            }
        }
        return true;
    }
    
    /**
     * Mark chunk as loaded
     */
    markLoaded() {
        this.loaded = true;
    }
    
    /**
     * Check if chunk is modified
     */
    isModified() {
        return this.modified;
    }
    
    /**
     * Mark chunk as not modified
     */
    clearModified() {
        this.modified = false;
    }
    
    /**
     * Get chunk key for use in maps
     */
    getKey() {
        return `${this.x},${this.y},${this.z}`;
    }
}
