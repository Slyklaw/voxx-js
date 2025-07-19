// Block system definitions
const BlockType = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    WOOD: 4,
    LEAVES: 5
};

// Block class representing a single block in the world
class Block {
    constructor(type = BlockType.AIR, position = { x: 0, y: 0, z: 0 }) {
        this.type = type;
        this.position = { ...position };
        this.metadata = null;
    }
    
    // Get block type name for debugging
    getTypeName() {
        const typeNames = {
            [BlockType.AIR]: 'Air',
            [BlockType.GRASS]: 'Grass',
            [BlockType.DIRT]: 'Dirt',
            [BlockType.STONE]: 'Stone',
            [BlockType.WOOD]: 'Wood',
            [BlockType.LEAVES]: 'Leaves'
        };
        return typeNames[this.type] || 'Unknown';
    }
    
    // Check if block is solid (not air)
    isSolid() {
        return this.type !== BlockType.AIR;
    }
    
    // Clone the block
    clone() {
        const cloned = new Block(this.type, this.position);
        cloned.metadata = this.metadata ? { ...this.metadata } : null;
        return cloned;
    }
}

// Block renderer for creating and managing block meshes
class BlockRenderer {
    constructor() {
        this.geometry = new THREE.BoxGeometry(1, 1, 1);
        this.materials = this.createBlockMaterials();
    }
    
    createBlockMaterials() {
        const materials = {};
        
        // Create color-coded materials for different block types
        materials[BlockType.GRASS] = new THREE.MeshLambertMaterial({ color: 0x228B22 }); // Forest Green
        materials[BlockType.DIRT] = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Saddle Brown
        materials[BlockType.STONE] = new THREE.MeshLambertMaterial({ color: 0x696969 }); // Dim Gray
        materials[BlockType.WOOD] = new THREE.MeshLambertMaterial({ color: 0xDEB887 }); // Burlywood
        materials[BlockType.LEAVES] = new THREE.MeshLambertMaterial({ color: 0x32CD32 }); // Lime Green
        
        return materials;
    }
    
    // Create a mesh for a block
    createBlockMesh(block) {
        if (block.type === BlockType.AIR) {
            return null; // Don't render air blocks
        }
        
        const material = this.materials[block.type];
        if (!material) {
            console.warn(`No material found for block type: ${block.type}`);
            return null;
        }
        
        const mesh = new THREE.Mesh(this.geometry, material);
        mesh.position.set(block.position.x, block.position.y, block.position.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        // Store block reference for later use
        mesh.userData.block = block;
        
        return mesh;
    }
    
    // Update block mesh position
    updateBlockMesh(mesh, block) {
        if (mesh && block) {
            mesh.position.set(block.position.x, block.position.y, block.position.z);
            mesh.userData.block = block;
        }
    }
    
    // Dispose of resources
    dispose() {
        this.geometry.dispose();
        Object.values(this.materials).forEach(material => material.dispose());
    }
}

// Chunk class representing a 16x16x256 section of the world
class Chunk {
    constructor(chunkX, chunkZ) {
        this.chunkX = chunkX;
        this.chunkZ = chunkZ;
        this.blocks = this.initializeBlockArray();
        this.mesh = null;
        this.needsUpdate = false;
        this.isEmpty = true;
    }
    
    // Initialize 3D array for blocks (16x256x16)
    initializeBlockArray() {
        const blocks = [];
        for (let x = 0; x < 16; x++) {
            blocks[x] = [];
            for (let y = 0; y < 256; y++) {
                blocks[x][y] = [];
                for (let z = 0; z < 16; z++) {
                    blocks[x][y][z] = new Block(BlockType.AIR, {
                        x: this.chunkX * 16 + x,
                        y: y,
                        z: this.chunkZ * 16 + z
                    });
                }
            }
        }
        return blocks;
    }
    
    // Get block at local chunk coordinates (0-15, 0-255, 0-15)
    getBlock(localX, localY, localZ) {
        if (localX < 0 || localX >= 16 || localY < 0 || localY >= 256 || localZ < 0 || localZ >= 16) {
            return new Block(BlockType.AIR, { x: 0, y: 0, z: 0 });
        }
        return this.blocks[localX][localY][localZ];
    }
    
    // Set block at local chunk coordinates
    setBlock(localX, localY, localZ, blockType) {
        if (localX < 0 || localX >= 16 || localY < 0 || localY >= 256 || localZ < 0 || localZ >= 16) {
            return false;
        }
        
        const worldX = this.chunkX * 16 + localX;
        const worldY = localY;
        const worldZ = this.chunkZ * 16 + localZ;
        
        this.blocks[localX][localY][localZ] = new Block(blockType, {
            x: worldX,
            y: worldY,
            z: worldZ
        });
        
        this.needsUpdate = true;
        this.isEmpty = this.checkIfEmpty();
        return true;
    }
    
    // Check if chunk contains any non-air blocks
    checkIfEmpty() {
        for (let x = 0; x < 16; x++) {
            for (let y = 0; y < 256; y++) {
                for (let z = 0; z < 16; z++) {
                    if (this.blocks[x][y][z].type !== BlockType.AIR) {
                        return false;
                    }
                }
            }
        }
        return true;
    }
    
    // Get world position from chunk coordinates
    getWorldPosition(localX, localY, localZ) {
        return {
            x: this.chunkX * 16 + localX,
            y: localY,
            z: this.chunkZ * 16 + localZ
        };
    }
    
    // Get all non-air blocks in the chunk
    getNonAirBlocks() {
        const nonAirBlocks = [];
        for (let x = 0; x < 16; x++) {
            for (let y = 0; y < 256; y++) {
                for (let z = 0; z < 16; z++) {
                    const block = this.blocks[x][y][z];
                    if (block.type !== BlockType.AIR) {
                        nonAirBlocks.push(block);
                    }
                }
            }
        }
        return nonAirBlocks;
    }
    
    // Get chunk key for identification
    getKey() {
        return `${this.chunkX},${this.chunkZ}`;
    }
}

// ChunkManager handles chunk creation, storage, and coordinate mapping
class ChunkManager {
    constructor() {
        this.chunks = new Map();
        this.loadedChunks = new Set();
    }
    
    // Convert world coordinates to chunk coordinates
    static worldToChunkCoords(worldX, worldZ) {
        return {
            chunkX: Math.floor(worldX / 16),
            chunkZ: Math.floor(worldZ / 16)
        };
    }
    
    // Convert world coordinates to local chunk coordinates
    static worldToLocalCoords(worldX, worldY, worldZ) {
        const chunkCoords = ChunkManager.worldToChunkCoords(worldX, worldZ);
        return {
            chunkX: chunkCoords.chunkX,
            chunkZ: chunkCoords.chunkZ,
            localX: worldX - (chunkCoords.chunkX * 16),
            localY: worldY,
            localZ: worldZ - (chunkCoords.chunkZ * 16)
        };
    }
    
    // Generate chunk key from coordinates
    static getChunkKey(chunkX, chunkZ) {
        return `${chunkX},${chunkZ}`;
    }
    
    // Get or create chunk at given chunk coordinates
    getOrCreateChunk(chunkX, chunkZ) {
        const key = ChunkManager.getChunkKey(chunkX, chunkZ);
        
        if (!this.chunks.has(key)) {
            const chunk = new Chunk(chunkX, chunkZ);
            this.chunks.set(key, chunk);
            this.loadedChunks.add(key);
        }
        
        return this.chunks.get(key);
    }
    
    // Get chunk at world coordinates
    getChunkAtWorldPos(worldX, worldZ) {
        const { chunkX, chunkZ } = ChunkManager.worldToChunkCoords(worldX, worldZ);
        return this.getOrCreateChunk(chunkX, chunkZ);
    }
    
    // Get block at world coordinates
    getBlock(worldX, worldY, worldZ) {
        const coords = ChunkManager.worldToLocalCoords(worldX, worldY, worldZ);
        const chunk = this.getOrCreateChunk(coords.chunkX, coords.chunkZ);
        return chunk.getBlock(coords.localX, coords.localY, coords.localZ);
    }
    
    // Set block at world coordinates
    setBlock(worldX, worldY, worldZ, blockType) {
        const coords = ChunkManager.worldToLocalCoords(worldX, worldY, worldZ);
        const chunk = this.getOrCreateChunk(coords.chunkX, coords.chunkZ);
        return chunk.setBlock(coords.localX, coords.localY, coords.localZ, blockType);
    }
    
    // Check if block at world coordinates is solid
    isSolid(worldX, worldY, worldZ) {
        const block = this.getBlock(worldX, worldY, worldZ);
        return block.isSolid();
    }
    
    // Get all loaded chunks
    getLoadedChunks() {
        return Array.from(this.chunks.values());
    }
    
    // Get chunks in a radius around a center point
    getChunksInRadius(centerX, centerZ, radius) {
        const chunks = [];
        const centerChunkX = Math.floor(centerX / 16);
        const centerChunkZ = Math.floor(centerZ / 16);
        
        for (let x = centerChunkX - radius; x <= centerChunkX + radius; x++) {
            for (let z = centerChunkZ - radius; z <= centerChunkZ + radius; z++) {
                const chunk = this.getOrCreateChunk(x, z);
                chunks.push(chunk);
            }
        }
        
        return chunks;
    }
    
    // Unload chunk
    unloadChunk(chunkX, chunkZ) {
        const key = ChunkManager.getChunkKey(chunkX, chunkZ);
        const chunk = this.chunks.get(key);
        
        if (chunk) {
            // Clean up mesh if it exists
            if (chunk.mesh) {
                chunk.mesh.geometry.dispose();
                if (Array.isArray(chunk.mesh.material)) {
                    chunk.mesh.material.forEach(mat => mat.dispose());
                } else {
                    chunk.mesh.material.dispose();
                }
            }
            
            this.chunks.delete(key);
            this.loadedChunks.delete(key);
            return true;
        }
        
        return false;
    }
    
    // Get chunk count
    getChunkCount() {
        return this.chunks.size;
    }
    
    // Clear all chunks
    clear() {
        this.chunks.forEach((chunk, key) => {
            if (chunk.mesh) {
                chunk.mesh.geometry.dispose();
                if (Array.isArray(chunk.mesh.material)) {
                    chunk.mesh.material.forEach(mat => mat.dispose());
                } else {
                    chunk.mesh.material.dispose();
                }
            }
        });
        
        this.chunks.clear();
        this.loadedChunks.clear();
    }
}

// Terrain generator for creating procedural terrain
class TerrainGenerator {
    constructor(seed = Math.random() * 1000000) {
        this.seed = seed;
        this.seededRandom = this.createSeededRandom(seed);
        this.heightCache = new Map(); // Cache terrain heights for consistency
    }
    
    // Create a seeded random number generator
    createSeededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }
    
    // Simple noise function using seeded random (fixed for consistency)
    noise(x, z, scale = 1) {
        // Ensure consistent coordinate handling by scaling first, then flooring
        const scaledX = x * scale;
        const scaledZ = z * scale;
        const intX = Math.floor(scaledX);
        const intZ = Math.floor(scaledZ);
        
        // Create deterministic "random" value based on coordinates
        let hash = intX * 374761393 + intZ * 668265263;
        hash = (hash ^ (hash >> 13)) * 1274126177;
        hash = hash ^ (hash >> 16);
        
        return (hash & 0x7fffffff) / 0x7fffffff;
    }
    
    // Generate height at given world coordinates with guaranteed consistency
    generateHeight(worldX, worldZ) {
        // Ensure we're working with consistent integer coordinates
        const x = Math.floor(worldX);
        const z = Math.floor(worldZ);
        
        // Create cache key
        const cacheKey = `${x},${z}`;
        
        // Check cache first
        if (this.heightCache.has(cacheKey)) {
            return this.heightCache.get(cacheKey);
        }
        
        // Use a much simpler, more predictable approach
        let height = 35; // Base height
        
        // Create very smooth, predictable terrain using simple math
        // Use sine waves for smooth, continuous terrain
        const waveX = Math.sin(x * 0.01) * 8;  // Large waves every ~628 blocks
        const waveZ = Math.sin(z * 0.01) * 8;  // Large waves every ~628 blocks
        const waveXZ = Math.sin((x + z) * 0.005) * 4; // Diagonal waves
        
        height += waveX + waveZ + waveXZ;
        
        // Add some smaller variations
        const smallWaveX = Math.sin(x * 0.05) * 2;
        const smallWaveZ = Math.sin(z * 0.05) * 2;
        
        height += smallWaveX + smallWaveZ;
        
        // Ensure minimum height and round to integer
        const finalHeight = Math.max(1, Math.floor(height));
        
        // Cache the result
        this.heightCache.set(cacheKey, finalHeight);
        
        return finalHeight;
    }
    
    // Simple hash function for consistent terrain generation
    simpleHash(x, z) {
        let hash = x * 374761393 + z * 668265263;
        hash = (hash ^ (hash >> 13)) * 1274126177;
        hash = hash ^ (hash >> 16);
        return Math.abs(hash);
    }
    
    // Determine block type based on height and position
    getBlockTypeAtHeight(worldX, worldY, worldZ, terrainHeight) {
        const depthFromSurface = terrainHeight - worldY;
        
        if (worldY > terrainHeight) {
            return BlockType.AIR;
        }
        
        // Surface block (grass)
        if (depthFromSurface === 0) {
            return BlockType.GRASS;
        }
        
        // Dirt layer (2-4 blocks deep)
        if (depthFromSurface <= 3) {
            return BlockType.DIRT;
        }
        
        // Stone for deeper layers
        return BlockType.STONE;
    }
    
    // Generate terrain for a specific chunk with guaranteed consistency
    generateChunkTerrain(chunk) {
        console.log(`Generating terrain for chunk (${chunk.chunkX}, ${chunk.chunkZ})`);
        
        // Generate blocks directly using world coordinates for perfect consistency
        for (let localX = 0; localX < 16; localX++) {
            for (let localZ = 0; localZ < 16; localZ++) {
                const worldX = chunk.chunkX * 16 + localX;
                const worldZ = chunk.chunkZ * 16 + localZ;
                
                // Get terrain height for this exact world coordinate
                const terrainHeight = this.generateHeight(worldX, worldZ);
                
                // Generate blocks from bottom to terrain height
                for (let worldY = 0; worldY <= Math.min(terrainHeight, 255); worldY++) {
                    const blockType = this.getBlockTypeAtHeight(worldX, worldY, worldZ, terrainHeight);
                    chunk.setBlock(localX, worldY, localZ, blockType);
                }
            }
        }
        
        // Test boundary consistency by checking adjacent coordinates
        this.testBoundaryConsistency(chunk);
    }
    
    // Test that terrain generation is consistent at chunk boundaries
    testBoundaryConsistency(chunk) {
        const chunkX = chunk.chunkX;
        const chunkZ = chunk.chunkZ;
        
        // Test boundary consistency more thoroughly
        console.log(`Testing boundary consistency for chunk (${chunkX}, ${chunkZ})`);
        
        // Test all edges of the chunk
        const edgeTests = [
            // Left edge (x=0) - test against potential left neighbor
            { localX: 0, localZ: 8, worldX: chunkX * 16, worldZ: chunkZ * 16 + 8, neighborWorldX: chunkX * 16 - 1, neighborWorldZ: chunkZ * 16 + 8 },
            // Right edge (x=15) - test against potential right neighbor  
            { localX: 15, localZ: 8, worldX: chunkX * 16 + 15, worldZ: chunkZ * 16 + 8, neighborWorldX: chunkX * 16 + 16, neighborWorldZ: chunkZ * 16 + 8 },
            // Top edge (z=0) - test against potential top neighbor
            { localX: 8, localZ: 0, worldX: chunkX * 16 + 8, worldZ: chunkZ * 16, neighborWorldX: chunkX * 16 + 8, neighborWorldZ: chunkZ * 16 - 1 },
            // Bottom edge (z=15) - test against potential bottom neighbor
            { localX: 8, localZ: 15, worldX: chunkX * 16 + 8, worldZ: chunkZ * 16 + 15, neighborWorldX: chunkX * 16 + 8, neighborWorldZ: chunkZ * 16 + 16 }
        ];
        
        edgeTests.forEach((test, index) => {
            const currentHeight = this.generateHeight(test.worldX, test.worldZ);
            const neighborHeight = this.generateHeight(test.neighborWorldX, test.neighborWorldZ);
            const heightDiff = Math.abs(currentHeight - neighborHeight);
            
            console.log(`Edge ${index}: Current (${test.worldX}, ${test.worldZ}) = ${currentHeight}, Neighbor (${test.neighborWorldX}, ${test.neighborWorldZ}) = ${neighborHeight}, Diff: ${heightDiff}`);
            
            if (heightDiff > 5) {
                console.warn(`Large height difference at chunk boundary: ${heightDiff} blocks`);
            }
        });
        
        // Test cache consistency
        const testCoord = { x: chunkX * 16 + 8, z: chunkZ * 16 + 8 };
        const height1 = this.generateHeight(testCoord.x, testCoord.z);
        const height2 = this.generateHeight(testCoord.x, testCoord.z);
        
        if (height1 !== height2) {
            console.error(`Cache inconsistency detected at (${testCoord.x}, ${testCoord.z}): ${height1} vs ${height2}`);
        } else {
            console.log(`Cache working correctly at (${testCoord.x}, ${testCoord.z}): ${height1}`);
        }
    }
    
    // Verify that chunk boundaries are consistent with neighboring chunks
    verifyChunkBoundaries(chunk, heightMap) {
        const chunkX = chunk.chunkX;
        const chunkZ = chunk.chunkZ;
        
        // Check consistency at chunk edges
        const edgeChecks = [
            // Left edge (x=0)
            { localX: 0, localZ: 8, neighborX: chunkX - 1, neighborZ: chunkZ, neighborLocalX: 15, neighborLocalZ: 8 },
            // Right edge (x=15)
            { localX: 15, localZ: 8, neighborX: chunkX + 1, neighborZ: chunkZ, neighborLocalX: 0, neighborLocalZ: 8 },
            // Top edge (z=0)
            { localX: 8, localZ: 0, neighborX: chunkX, neighborZ: chunkZ - 1, neighborLocalX: 8, neighborLocalZ: 15 },
            // Bottom edge (z=15)
            { localX: 8, localZ: 15, neighborX: chunkX, neighborZ: chunkZ + 1, neighborLocalX: 8, neighborLocalZ: 0 }
        ];
        
        edgeChecks.forEach(check => {
            const currentHeight = heightMap[check.localX][check.localZ];
            const neighborWorldX = check.neighborX * 16 + check.neighborLocalX;
            const neighborWorldZ = check.neighborZ * 16 + check.neighborLocalZ;
            const neighborHeight = this.generateHeight(neighborWorldX, neighborWorldZ);
            
            if (Math.abs(currentHeight - neighborHeight) > 1) {
                console.warn(`Terrain discontinuity detected at chunk (${chunkX}, ${chunkZ}) edge: current=${currentHeight}, neighbor=${neighborHeight}`);
            }
        });
    }
    
    // Get terrain height at specific coordinates (for collision detection)
    getTerrainHeight(worldX, worldZ) {
        return this.generateHeight(worldX, worldZ);
    }
}

// Basic world representation
class World {
    constructor(seed) {
        this.chunkManager = new ChunkManager();
        this.blockRenderer = new BlockRenderer();
        this.terrainGenerator = new TerrainGenerator(seed);
        this.scene = null; // Will be set by the game
        this.spawnPoint = { x: 0, y: 64, z: 0 };
    }
    
    // Set a block at the given position using chunk system (optimized)
    setBlock(x, y, z, blockType) {
        const worldX = Math.floor(x);
        const worldY = Math.floor(y);
        const worldZ = Math.floor(z);
        
        // Set block in chunk system
        const success = this.chunkManager.setBlock(worldX, worldY, worldZ, blockType);
        
        if (success) {
            // Mark the chunk as needing mesh update instead of creating individual meshes
            const chunkCoords = ChunkManager.worldToChunkCoords(worldX, worldZ);
            const chunk = this.chunkManager.getOrCreateChunk(chunkCoords.chunkX, chunkCoords.chunkZ);
            chunk.needsUpdate = true;
        }
        
        return success;
    }
    
    // Get block at the given position using chunk system
    getBlock(x, y, z) {
        return this.chunkManager.getBlock(Math.floor(x), Math.floor(y), Math.floor(z));
    }
    
    // Remove block at the given position using chunk system
    removeBlock(x, y, z) {
        const worldX = Math.floor(x);
        const worldY = Math.floor(y);
        const worldZ = Math.floor(z);
        
        const block = this.chunkManager.getBlock(worldX, worldY, worldZ);
        
        // Remove mesh from scene
        this.removeBlockMesh(worldX, worldY, worldZ);
        
        // Set to air in chunk system
        this.chunkManager.setBlock(worldX, worldY, worldZ, BlockType.AIR);
        
        return block;
    }
    
    // Helper method to remove block mesh from scene
    removeBlockMesh(x, y, z) {
        if (this.scene) {
            const key = this.getPositionKey(x, y, z);
            const mesh = this.scene.getObjectByName(`block_${key}`);
            if (mesh) {
                this.scene.remove(mesh);
            }
        }
    }
    
    // Generate position key for block identification
    getPositionKey(x, y, z) {
        return `${x},${y},${z}`;
    }
    
    // Check if position has a solid block using chunk system
    isSolid(x, y, z) {
        return this.chunkManager.isSolid(Math.floor(x), Math.floor(y), Math.floor(z));
    }
    
    // Generate initial world chunks around spawn point
    generateInitialWorld(radius = 2) {
        const spawnChunkX = Math.floor(this.spawnPoint.x / 16);
        const spawnChunkZ = Math.floor(this.spawnPoint.z / 16);
        
        console.log(`Generating initial world around spawn point (${this.spawnPoint.x}, ${this.spawnPoint.z}) with radius ${radius}`);
        
        // Generate chunks in a radius around spawn
        for (let chunkX = spawnChunkX - radius; chunkX <= spawnChunkX + radius; chunkX++) {
            for (let chunkZ = spawnChunkZ - radius; chunkZ <= spawnChunkZ + radius; chunkZ++) {
                const chunk = this.chunkManager.getOrCreateChunk(chunkX, chunkZ);
                this.terrainGenerator.generateChunkTerrain(chunk);
            }
        }
        
        // Update spawn point Y to be above terrain
        const terrainHeight = this.terrainGenerator.getTerrainHeight(this.spawnPoint.x, this.spawnPoint.z);
        this.spawnPoint.y = terrainHeight + 2;
        
        const totalBlocks = this.getAllBlocks().length;
        const chunkCount = this.chunkManager.getChunkCount();
        console.log(`Initial world generated with ${totalBlocks} blocks across ${chunkCount} chunks`);
        console.log(`Spawn point set to (${this.spawnPoint.x}, ${this.spawnPoint.y}, ${this.spawnPoint.z})`);
    }
    
    // Generate terrain for a specific chunk (used for dynamic loading)
    generateChunkTerrain(chunkX, chunkZ) {
        const chunk = this.chunkManager.getOrCreateChunk(chunkX, chunkZ);
        this.terrainGenerator.generateChunkTerrain(chunk);
        return chunk;
    }
    
    // Get terrain height at world coordinates
    getTerrainHeight(worldX, worldZ) {
        return this.terrainGenerator.getTerrainHeight(worldX, worldZ);
    }
    
    // Get spawn point
    getSpawnPoint() {
        return { ...this.spawnPoint };
    }
    
    // Set the scene reference for rendering (optimized)
    setScene(scene) {
        this.scene = scene;
        
        // Generate optimized chunk meshes instead of individual block meshes
        this.generateChunkMeshes();
    }
    
    // Generate optimized meshes for all chunks
    generateChunkMeshes() {
        if (!this.scene) return;
        
        console.log('Generating optimized chunk meshes...');
        const chunks = this.chunkManager.getLoadedChunks();
        let totalMeshes = 0;
        
        chunks.forEach(chunk => {
            if (!chunk.isEmpty) {
                const chunkMesh = this.createChunkMesh(chunk);
                if (chunkMesh) {
                    chunkMesh.name = `chunk_${chunk.chunkX}_${chunk.chunkZ}`;
                    this.scene.add(chunkMesh);
                    chunk.mesh = chunkMesh;
                    totalMeshes++;
                }
            }
        });
        
        console.log(`Generated ${totalMeshes} optimized chunk meshes`);
    }
    
    // Create an optimized mesh for a single chunk
    createChunkMesh(chunk) {
        const blocksByType = {
            [BlockType.GRASS]: [],
            [BlockType.DIRT]: [],
            [BlockType.STONE]: []
        };
        
        // Collect all block positions by type
        for (let x = 0; x < 16; x++) {
            for (let y = 0; y < 256; y++) {
                for (let z = 0; z < 16; z++) {
                    const block = chunk.getBlock(x, y, z);
                    if (block.type !== BlockType.AIR) {
                        if (!blocksByType[block.type]) {
                            blocksByType[block.type] = [];
                        }
                        blocksByType[block.type].push({
                            x: chunk.chunkX * 16 + x,
                            y: y,
                            z: chunk.chunkZ * 16 + z
                        });
                    }
                }
            }
        }
        
        // Create merged geometries for each block type using InstancedMesh for better performance
        const meshes = [];
        
        Object.keys(blocksByType).forEach(blockType => {
            const positions = blocksByType[blockType];
            if (positions.length > 0) {
                // Use BufferGeometry merging for correct polygon rendering
                const geometriesToMerge = [];
                const blockGeometry = new THREE.BoxGeometry(1, 1, 1);
                
                positions.forEach(pos => {
                    const geometry = blockGeometry.clone();
                    geometry.translate(pos.x, pos.y, pos.z);
                    geometriesToMerge.push(geometry);
                });
                
                // Use THREE.BufferGeometryUtils.mergeGeometries if available, otherwise use manual merging
                let mergedGeometry;
                if (THREE.BufferGeometryUtils && THREE.BufferGeometryUtils.mergeGeometries) {
                    mergedGeometry = THREE.BufferGeometryUtils.mergeGeometries(geometriesToMerge);
                } else {
                    // Fallback: use manual merging
                    mergedGeometry = this.mergeGeometries(geometriesToMerge);
                }
                
                if (mergedGeometry) {
                    // Create mesh with appropriate material
                    const material = this.blockRenderer.materials[blockType];
                    if (material) {
                        const mesh = new THREE.Mesh(mergedGeometry, material);
                        meshes.push(mesh);
                    }
                }
                
                // Clean up temporary geometries
                geometriesToMerge.forEach(geo => geo.dispose());
            }
        });
        
        // If we have multiple meshes, create a group
        if (meshes.length > 1) {
            const group = new THREE.Group();
            meshes.forEach(mesh => group.add(mesh));
            return group;
        } else if (meshes.length === 1) {
            return meshes[0];
        }
        
        return null;
    }
    
    // Manual geometry merging fallback
    mergeGeometries(geometries) {
        if (geometries.length === 0) return null;
        
        let totalVertices = 0;
        let totalIndices = 0;
        
        // Count total vertices and indices
        geometries.forEach(geo => {
            totalVertices += geo.attributes.position.count;
            if (geo.index) {
                totalIndices += geo.index.count;
            } else {
                totalIndices += geo.attributes.position.count;
            }
        });
        
        // Create arrays for merged data
        const positions = new Float32Array(totalVertices * 3);
        const normals = new Float32Array(totalVertices * 3);
        const uvs = new Float32Array(totalVertices * 2);
        const indices = new Uint32Array(totalIndices);
        
        let vertexOffset = 0;
        let indexOffset = 0;
        let vertexCount = 0;
        
        // Merge geometries
        geometries.forEach(geo => {
            const posAttr = geo.attributes.position;
            const normalAttr = geo.attributes.normal;
            const uvAttr = geo.attributes.uv;
            
            // Copy vertex data
            positions.set(posAttr.array, vertexOffset * 3);
            normals.set(normalAttr.array, vertexOffset * 3);
            uvs.set(uvAttr.array, vertexOffset * 2);
            
            // Copy and adjust indices
            if (geo.index) {
                for (let i = 0; i < geo.index.count; i++) {
                    indices[indexOffset + i] = geo.index.array[i] + vertexCount;
                }
                indexOffset += geo.index.count;
            } else {
                // Generate indices for non-indexed geometry
                for (let i = 0; i < posAttr.count; i++) {
                    indices[indexOffset + i] = vertexCount + i;
                }
                indexOffset += posAttr.count;
            }
            
            vertexOffset += posAttr.count;
            vertexCount += posAttr.count;
        });
        
        // Create merged geometry
        const mergedGeometry = new THREE.BufferGeometry();
        mergedGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        mergedGeometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
        mergedGeometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
        mergedGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
        
        return mergedGeometry;
    }
    
    // Get all blocks from all chunks (for testing/debugging)
    getAllBlocks() {
        const allBlocks = [];
        const chunks = this.chunkManager.getLoadedChunks();
        
        chunks.forEach(chunk => {
            const nonAirBlocks = chunk.getNonAirBlocks();
            allBlocks.push(...nonAirBlocks);
        });
        
        return allBlocks;
    }
    
    // Get chunk manager for direct access
    getChunkManager() {
        return this.chunkManager;
    }
    
    // Dispose of resources
    dispose() {
        if (this.blockRenderer) {
            this.blockRenderer.dispose();
        }
        if (this.chunkManager) {
            this.chunkManager.clear();
        }
    }
}

// Input handling system
class InputHandler {
    constructor() {
        this.keys = {};
        this.mouseMovement = { x: 0, y: 0 };
        this.isPointerLocked = false;
        
        this.initEventListeners();
    }
    
    initEventListeners() {
        // Keyboard events
        document.addEventListener('keydown', (event) => this.onKeyDown(event));
        document.addEventListener('keyup', (event) => this.onKeyUp(event));
        
        // Mouse events
        document.addEventListener('mousemove', (event) => this.onMouseMove(event));
        document.addEventListener('click', (event) => this.onMouseClick(event));
        
        // Pointer lock events
        document.addEventListener('pointerlockchange', () => this.onPointerLockChange());
        document.addEventListener('pointerlockerror', () => this.onPointerLockError());
    }
    
    onKeyDown(event) {
        this.keys[event.code] = true;
        
        // Prevent default behavior for game keys
        if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space'].includes(event.code)) {
            event.preventDefault();
        }
    }
    
    onKeyUp(event) {
        this.keys[event.code] = false;
    }
    
    onMouseMove(event) {
        if (this.isPointerLocked) {
            this.mouseMovement.x = event.movementX || 0;
            this.mouseMovement.y = event.movementY || 0;
        }
    }
    
    onMouseClick(event) {
        // Request pointer lock on click if not already locked
        if (!this.isPointerLocked) {
            document.body.requestPointerLock();
        }
    }
    
    onPointerLockChange() {
        this.isPointerLocked = document.pointerLockElement === document.body;
        console.log('Pointer lock:', this.isPointerLocked ? 'enabled' : 'disabled');
    }
    
    onPointerLockError() {
        console.error('Pointer lock failed');
    }
    
    isKeyPressed(keyCode) {
        return !!this.keys[keyCode];
    }
    
    getMouseMovement() {
        const movement = { ...this.mouseMovement };
        this.mouseMovement.x = 0;
        this.mouseMovement.y = 0;
        return movement;
    }
    
    dispose() {
        document.removeEventListener('keydown', this.onKeyDown);
        document.removeEventListener('keyup', this.onKeyUp);
        document.removeEventListener('mousemove', this.onMouseMove);
        document.removeEventListener('click', this.onMouseClick);
        document.removeEventListener('pointerlockchange', this.onPointerLockChange);
        document.removeEventListener('pointerlockerror', this.onPointerLockError);
    }
}

// First-person camera controller
class FirstPersonCameraController {
    constructor(camera, inputHandler, world = null) {
        this.camera = camera;
        this.inputHandler = inputHandler;
        this.world = world; // Reference to world for terrain collision
        
        // Camera rotation
        this.yaw = 0;
        this.pitch = 0;
        this.mouseSensitivity = 0.002;
        
        // Movement
        this.position = new THREE.Vector3(0, 5, 10);
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.moveSpeed = 5.0;
        this.jumpSpeed = 8.0;
        this.gravity = -20.0;
        this.isGrounded = false;
        this.playerHeight = 1.8; // Player height for collision
        
        // Movement directions
        this.forward = new THREE.Vector3();
        this.right = new THREE.Vector3();
        this.up = new THREE.Vector3(0, 1, 0);
        
        this.updateCamera();
    }
    
    // Set world reference for terrain collision
    setWorld(world) {
        this.world = world;
    }
    
    update(deltaTime) {
        this.handleMouseLook();
        this.handleMovement(deltaTime);
        this.updateCamera();
    }
    
    handleMouseLook() {
        if (!this.inputHandler.isPointerLocked) return;
        
        const mouseMovement = this.inputHandler.getMouseMovement();
        
        this.yaw -= mouseMovement.x * this.mouseSensitivity;
        this.pitch -= mouseMovement.y * this.mouseSensitivity;
        
        // Clamp pitch to prevent camera flipping
        this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
    }
    
    handleMovement(deltaTime) {
        // Calculate movement directions based on camera rotation
        this.forward.set(
            -Math.sin(this.yaw),
            0,
            -Math.cos(this.yaw)
        ).normalize();
        
        this.right.set(
            Math.cos(this.yaw),
            0,
            -Math.sin(this.yaw)
        ).normalize();
        
        // Handle horizontal movement
        const moveVector = new THREE.Vector3();
        
        if (this.inputHandler.isKeyPressed('KeyW')) {
            moveVector.add(this.forward);
        }
        if (this.inputHandler.isKeyPressed('KeyS')) {
            moveVector.sub(this.forward);
        }
        if (this.inputHandler.isKeyPressed('KeyA')) {
            moveVector.sub(this.right);
        }
        if (this.inputHandler.isKeyPressed('KeyD')) {
            moveVector.add(this.right);
        }
        
        // Normalize diagonal movement
        if (moveVector.length() > 0) {
            moveVector.normalize();
            moveVector.multiplyScalar(this.moveSpeed * deltaTime);
            this.position.add(moveVector);
        }
        
        // Handle altitude controls (free-flight mode for terrain exploration)
        if (this.inputHandler.isKeyPressed('Space')) {
            // Spacebar: Move up
            this.position.y += this.moveSpeed * deltaTime;
        }
        if (this.inputHandler.isKeyPressed('ShiftLeft')) {
            // Left Shift: Move down
            this.position.y -= this.moveSpeed * deltaTime;
        }
        
        // Disable gravity and terrain collision for free exploration
        // (Comment out the original physics for now)
        /*
        // Handle jumping
        if (this.inputHandler.isKeyPressed('Space') && this.isGrounded) {
            this.velocity.y = this.jumpSpeed;
            this.isGrounded = false;
        }
        
        // Apply gravity
        this.velocity.y += this.gravity * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        
        // Terrain-based collision detection
        if (this.world) {
            const terrainHeight = this.world.getTerrainHeight(this.position.x, this.position.z);
            const groundLevel = terrainHeight + this.playerHeight;
            
            if (this.position.y <= groundLevel) {
                this.position.y = groundLevel;
                this.velocity.y = 0;
                this.isGrounded = true;
            } else {
                this.isGrounded = false;
            }
        } else {
            // Fallback to simple ground collision if no world reference
            if (this.position.y <= 2) {
                this.position.y = 2;
                this.velocity.y = 0;
                this.isGrounded = true;
            }
        }
        */
    }
    
    updateCamera() {
        // Set camera position
        this.camera.position.copy(this.position);
        
        // Calculate look direction
        const lookDirection = new THREE.Vector3(
            -Math.sin(this.yaw) * Math.cos(this.pitch),
            Math.sin(this.pitch),
            -Math.cos(this.yaw) * Math.cos(this.pitch)
        );
        
        // Set camera rotation
        const lookAt = new THREE.Vector3().addVectors(this.position, lookDirection);
        this.camera.lookAt(lookAt);
    }
    
    getPosition() {
        return this.position.clone();
    }
    
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.updateCamera();
    }
}

class MinecraftClone {
    constructor() {
        this.canvas = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = null;
        
        // Game state
        this.isRunning = false;
        this.lastTime = 0;
        
        // First-person camera controls
        this.cameraController = null;
        this.inputHandler = null;
        
        // World system
        this.world = null;
        
        // UI elements
        this.fpsCounter = null;
        this.cameraLocationDisplay = null;
        
        this.init();
    }
    
    init() {
        console.log('Initializing Minecraft Clone...');
        
        // Get canvas element
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('Canvas element not found!');
            return;
        }
        
        // Initialize Three.js components
        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initClock();
        
        // Initialize input and camera controls
        this.initControls();
        
        // Initialize UI elements
        this.initUI();
        
        // Add some basic content for testing
        this.addTestContent();
        
        // Handle window resize
        window.addEventListener('resize', () => this.onWindowResize());
        
        // Hide loading screen
        const loadingElement = document.getElementById('loading');
        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        
        // Start the game loop
        this.start();
        
        console.log('Minecraft Clone initialized successfully!');
    }
    
    initScene() {
        this.scene = new THREE.Scene();
        
        // Set background color (sky blue)
        this.scene.background = new THREE.Color(0x87CEEB);
        
        // Add fog for depth perception
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
    }
    
    initCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        
        // Set initial camera position
        this.camera.position.set(0, 10, 10);
        this.camera.lookAt(0, 0, 0);
    }
    
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false
        });
        
        // Set renderer properties
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        // Temporarily disable shadows for performance testing
        this.renderer.shadowMap.enabled = false;
        // this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        
        // Enable gamma correction for better colors
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    
    initClock() {
        this.clock = new THREE.Clock();
    }
    
    initControls() {
        // Initialize input handler
        this.inputHandler = new InputHandler();
        
        // Initialize first-person camera controller (world will be set later)
        this.cameraController = new FirstPersonCameraController(this.camera, this.inputHandler);
        
        console.log('Input and camera controls initialized');
    }
    
    initUI() {
        // Initialize FPS counter
        this.fpsCounter = new FPSCounter();
        
        // Initialize camera location display
        this.cameraLocationDisplay = new CameraLocationDisplay();
        
        console.log('UI elements initialized');
    }
    
    addTestContent() {
        // Add brighter lighting to make terrain more visible
        const ambientLight = new THREE.AmbientLight(0x404040, 0.8); // Increased ambient light
        this.scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Increased directional light
        directionalLight.position.set(10, 10, 10); // Closer light position
        directionalLight.castShadow = false; // Shadows disabled for performance
        this.scene.add(directionalLight);
        
        // Initialize world system with a random seed
        const worldSeed = Math.floor(Math.random() * 1000000);
        this.world = new World(worldSeed);
        
        // Generate initial world terrain around spawn point (minimal for testing)
        console.log('Starting terrain generation...');
        
        // Generate proper terrain using the terrain generation system
        console.log('Generating proper terrain...');
        
        // Generate terrain in a small area around spawn (1 chunk radius = 3x3 chunks)
        this.world.generateInitialWorld(1); // Generate 1 chunk radius around spawn to maintain performance
        
        // Set scene reference after terrain generation to add blocks to scene
        this.world.setScene(this.scene);
        
        console.log('Terrain generation completed');
        console.log(`Scene now has ${this.scene.children.length} objects`);
        
        // Set world reference for camera controller terrain collision
        this.cameraController.setWorld(this.world);
        
        // Set camera controller position to spawn point
        const spawnPoint = this.world.getSpawnPoint();
        console.log(`Spawn point: (${spawnPoint.x}, ${spawnPoint.y}, ${spawnPoint.z})`);
        
        // Position camera higher to see more terrain variation
        const cameraX = spawnPoint.x + 10;
        const cameraY = spawnPoint.y + 15; // Much higher to see terrain from above
        const cameraZ = spawnPoint.z + 10;
        
        this.cameraController.setPosition(cameraX, cameraY, cameraZ);
        
        // Look down and towards the spawn area to see terrain variation
        this.cameraController.yaw = -Math.PI / 4; // Look towards spawn area
        this.cameraController.pitch = -0.6; // Look down to see terrain
        this.cameraController.updateCamera();
        
        console.log(`Camera positioned at (${cameraX}, ${cameraY}, ${cameraZ}) looking down at terrain`);
        console.log(`Spawn point is at: (${spawnPoint.x}, ${spawnPoint.y}, ${spawnPoint.z})`);
        
        console.log(`World system initialized with seed ${worldSeed} and terrain generated`);
    }
    
    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.lastTime = performance.now();
        this.gameLoop();
        
        console.log('Game loop started');
    }
    
    stop() {
        this.isRunning = false;
        console.log('Game loop stopped');
    }
    
    gameLoop() {
        if (!this.isRunning) return;
        
        // Request next frame
        requestAnimationFrame(() => this.gameLoop());
        
        // Calculate delta time
        const currentTime = performance.now();
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Update game systems
        this.update(deltaTime);
        
        // Render the scene
        this.render();
    }
    
    update(deltaTime) {
        // Update camera controls
        this.updateCamera(deltaTime);
        
        // Update chunk loading based on camera position
        this.updateChunkLoading();
        
        // Update UI elements
        this.updateUI(deltaTime);
    }
    
    updateChunkLoading() {
        if (!this.world || !this.cameraController) return;
        
        const cameraPos = this.cameraController.getPosition();
        const chunkX = Math.floor(cameraPos.x / 16);
        const chunkZ = Math.floor(cameraPos.z / 16);
        
        const renderDistance = 3; // Load chunks within 3 chunk radius
        const unloadDistance = 5; // Unload chunks beyond 5 chunk radius
        
        // Load new chunks around camera
        this.loadChunksAroundPosition(chunkX, chunkZ, renderDistance);
        
        // Unload distant chunks
        this.unloadDistantChunks(chunkX, chunkZ, unloadDistance);
    }
    
    loadChunksAroundPosition(centerChunkX, centerChunkZ, radius) {
        for (let x = centerChunkX - radius; x <= centerChunkX + radius; x++) {
            for (let z = centerChunkZ - radius; z <= centerChunkZ + radius; z++) {
                const chunkKey = `${x},${z}`;
                
                // Check if chunk is already loaded
                if (!this.world.chunkManager.chunks.has(chunkKey)) {
                    console.log(`Loading chunk (${x}, ${z})`);
                    
                    // Generate and load new chunk
                    const chunk = this.world.chunkManager.getOrCreateChunk(x, z);
                    this.world.terrainGenerator.generateChunkTerrain(chunk);
                    
                    // Debug: Check terrain height at chunk boundaries for consistency
                    const worldX = x * 16;
                    const worldZ = z * 16;
                    
                    // Check heights at chunk corners
                    const corner1 = this.world.terrainGenerator.generateHeight(worldX, worldZ);
                    const corner2 = this.world.terrainGenerator.generateHeight(worldX + 15, worldZ);
                    const corner3 = this.world.terrainGenerator.generateHeight(worldX, worldZ + 15);
                    const corner4 = this.world.terrainGenerator.generateHeight(worldX + 15, worldZ + 15);
                    
                    console.log(`Chunk (${x}, ${z}) at world (${worldX}, ${worldZ}) heights: ${corner1}, ${corner2}, ${corner3}, ${corner4}`);
                    
                    // Create optimized mesh for the new chunk
                    if (!chunk.isEmpty && this.scene) {
                        const chunkMesh = this.world.createChunkMesh(chunk);
                        if (chunkMesh) {
                            chunkMesh.name = `chunk_${x}_${z}`;
                            this.scene.add(chunkMesh);
                            chunk.mesh = chunkMesh;
                        }
                    }
                }
            }
        }
    }
    
    unloadDistantChunks(centerChunkX, centerChunkZ, maxDistance) {
        const chunksToUnload = [];
        
        // Find chunks that are too far away
        this.world.chunkManager.chunks.forEach((chunk, key) => {
            const distance = Math.max(
                Math.abs(chunk.chunkX - centerChunkX),
                Math.abs(chunk.chunkZ - centerChunkZ)
            );
            
            if (distance > maxDistance) {
                chunksToUnload.push(chunk);
            }
        });
        
        // Unload distant chunks
        chunksToUnload.forEach(chunk => {
            // Remove mesh from scene
            if (chunk.mesh && this.scene) {
                this.scene.remove(chunk.mesh);
                
                // Dispose of geometry and materials
                if (chunk.mesh.geometry) {
                    chunk.mesh.geometry.dispose();
                }
                if (chunk.mesh.material) {
                    if (Array.isArray(chunk.mesh.material)) {
                        chunk.mesh.material.forEach(mat => mat.dispose());
                    } else {
                        chunk.mesh.material.dispose();
                    }
                }
            }
            
            // Remove chunk from manager
            this.world.chunkManager.unloadChunk(chunk.chunkX, chunk.chunkZ);
        });
        
        if (chunksToUnload.length > 0) {
            console.log(`Unloaded ${chunksToUnload.length} distant chunks`);
        }
    }
    
    updateCamera(deltaTime) {
        // Update first-person camera controller
        if (this.cameraController) {
            this.cameraController.update(deltaTime);
        }
    }
    
    updateUI(deltaTime) {
        // Update FPS counter
        if (this.fpsCounter) {
            this.fpsCounter.update(deltaTime);
        }
        
        // Update camera location display
        if (this.cameraLocationDisplay) {
            this.cameraLocationDisplay.update(this.cameraController);
        }
    }
    
    render() {
        if (!this.renderer || !this.scene || !this.camera) return;
        
        this.renderer.render(this.scene, this.camera);
    }
    
    onWindowResize() {
        if (!this.camera || !this.renderer) return;
        
        // Update camera aspect ratio
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        
        // Update renderer size
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        console.log('Window resized, camera and renderer updated');
    }
    
    // Cleanup method for proper disposal
    dispose() {
        this.stop();
        
        // Dispose UI elements
        if (this.fpsCounter) {
            this.fpsCounter.dispose();
        }
        
        if (this.cameraLocationDisplay) {
            this.cameraLocationDisplay.dispose();
        }
        
        // Dispose world system
        if (this.world) {
            this.world.dispose();
        }
        
        // Dispose input handler
        if (this.inputHandler) {
            this.inputHandler.dispose();
        }
        
        if (this.renderer) {
            this.renderer.dispose();
        }
        
        // Dispose of geometries and materials
        this.scene.traverse((object) => {
            if (object.geometry) {
                object.geometry.dispose();
            }
            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });
        
        console.log('Game resources disposed');
    }
}

// FPS Counter class for performance monitoring
class FPSCounter {
    constructor() {
        this.element = null;
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.currentFPS = 0;
        this.updateInterval = 500; // Update every 0.5 seconds
        this.lastUpdateTime = 0;
        
        this.createElement();
    }
    
    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'ui-element fps-counter';
        this.element.textContent = 'FPS: 0';
        
        // Add to UI container
        const uiContainer = document.getElementById('ui');
        if (uiContainer) {
            uiContainer.appendChild(this.element);
        }
    }
    
    update(deltaTime) {
        // Skip update if deltaTime is invalid
        if (deltaTime <= 0 || !isFinite(deltaTime)) {
            return;
        }
        
        this.frameCount++;
        const currentTime = performance.now();
        
        // Update FPS calculation every updateInterval milliseconds
        if (currentTime - this.lastUpdateTime >= this.updateInterval) {
            const timeDiff = (currentTime - this.lastTime) / 1000;
            
            if (timeDiff > 0) {
                this.currentFPS = Math.round(this.frameCount / timeDiff);
                
                // Cap FPS at reasonable maximum
                if (this.currentFPS > 999 || !isFinite(this.currentFPS)) {
                    this.currentFPS = 999;
                }
                
                this.updateDisplay(this.currentFPS);
            }
            
            // Reset counters
            this.frameCount = 0;
            this.lastTime = currentTime;
            this.lastUpdateTime = currentTime;
        }
    }
    
    updateDisplay(fps) {
        if (!this.element) return;
        
        // Cap FPS display at reasonable maximum
        let displayFPS = fps;
        if (displayFPS > 999 || !isFinite(displayFPS)) {
            displayFPS = 999;
        }
        
        this.element.textContent = `FPS: ${displayFPS}`;
        
        // Color coding: green for >30 FPS, red for ≤30 FPS
        if (displayFPS > 30) {
            this.element.style.color = '#00ff00'; // Green
        } else {
            this.element.style.color = '#ff0000'; // Red
        }
    }
    
    dispose() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
    }
}

// Camera Location Display class for position tracking
class CameraLocationDisplay {
    constructor() {
        this.element = null;
        this.lastPosition = null;
        
        this.createElement();
    }
    
    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'ui-element camera-location';
        this.element.textContent = 'Position: Loading...';
        
        // Add to UI container
        const uiContainer = document.getElementById('ui');
        if (uiContainer) {
            uiContainer.appendChild(this.element);
        }
    }
    
    update(cameraController) {
        if (!this.element) return;
        
        // Handle missing camera controller
        if (!cameraController) {
            this.element.textContent = 'Position: Loading...';
            return;
        }
        
        try {
            const position = cameraController.getPosition();
            
            // Handle invalid position data
            if (!position || typeof position.x !== 'number' || typeof position.y !== 'number' || typeof position.z !== 'number') {
                this.element.textContent = 'Position: Error';
                this.lastPosition = null; // Reset to allow recovery
                console.warn('Invalid position data received from camera controller');
                return;
            }
            
            // Check if position has changed to minimize DOM updates
            if (this.lastPosition && 
                Math.abs(position.x - this.lastPosition.x) < 0.01 &&
                Math.abs(position.y - this.lastPosition.y) < 0.01 &&
                Math.abs(position.z - this.lastPosition.z) < 0.01) {
                return; // No significant change, skip update
            }
            
            // Format and display coordinates
            const formattedCoords = this.formatCoordinates(position.x, position.y, position.z);
            this.element.textContent = formattedCoords;
            
            // Store last position for change detection
            this.lastPosition = { x: position.x, y: position.y, z: position.z };
            
        } catch (error) {
            this.element.textContent = 'Position: Error';
            this.lastPosition = null; // Reset to allow recovery
            console.warn('Error updating camera location display:', error);
        }
    }
    
    formatCoordinates(x, y, z) {
        // Handle null/undefined coordinates with defaults
        const safeX = (x != null && isFinite(x)) ? x : 0;
        const safeY = (y != null && isFinite(y)) ? y : 0;
        const safeZ = (z != null && isFinite(z)) ? z : 0;
        
        // Format to 2 decimal places with proper labeling
        return `X: ${safeX.toFixed(2)}, Y: ${safeY.toFixed(2)}, Z: ${safeZ.toFixed(2)}`;
    }
    
    dispose() {
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
        this.element = null;
        this.lastPosition = null;
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new MinecraftClone();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.game) {
        window.game.dispose();
    }
});