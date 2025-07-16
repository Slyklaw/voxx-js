// Unit tests for chunk-based world structure
// Tests chunk coordinate calculations and block access

// Mock Three.js for testing environment
if (typeof THREE === 'undefined') {
    global.THREE = {
        BoxGeometry: class BoxGeometry {},
        MeshLambertMaterial: class MeshLambertMaterial {
            constructor(options) {
                this.color = options.color;
            }
            dispose() {}
        },
        Mesh: class Mesh {
            constructor(geometry, material) {
                this.geometry = geometry;
                this.material = material;
                this.position = { set: () => {}, x: 0, y: 0, z: 0 };
                this.userData = {};
                this.castShadow = false;
                this.receiveShadow = false;
            }
        },
        Vector3: class Vector3 {
            constructor(x = 0, y = 0, z = 0) {
                this.x = x;
                this.y = y;
                this.z = z;
            }
            set(x, y, z) {
                this.x = x;
                this.y = y;
                this.z = z;
                return this;
            }
            clone() {
                return new THREE.Vector3(this.x, this.y, this.z);
            }
        }
    };
}

// Define the classes we need for testing
const BlockType = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    WOOD: 4,
    LEAVES: 5
};

class Block {
    constructor(type = BlockType.AIR, position = { x: 0, y: 0, z: 0 }) {
        this.type = type;
        this.position = { ...position };
        this.metadata = null;
    }
    
    isSolid() {
        return this.type !== BlockType.AIR;
    }
}

class Chunk {
    constructor(chunkX, chunkZ) {
        this.chunkX = chunkX;
        this.chunkZ = chunkZ;
        this.blocks = this.initializeBlockArray();
        this.mesh = null;
        this.needsUpdate = false;
        this.isEmpty = true;
    }
    
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
    
    getBlock(localX, localY, localZ) {
        if (localX < 0 || localX >= 16 || localY < 0 || localY >= 256 || localZ < 0 || localZ >= 16) {
            return new Block(BlockType.AIR, { x: 0, y: 0, z: 0 });
        }
        return this.blocks[localX][localY][localZ];
    }
    
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
    
    getWorldPosition(localX, localY, localZ) {
        return {
            x: this.chunkX * 16 + localX,
            y: localY,
            z: this.chunkZ * 16 + localZ
        };
    }
    
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
    
    getKey() {
        return `${this.chunkX},${this.chunkZ}`;
    }
}

class ChunkManager {
    constructor() {
        this.chunks = new Map();
        this.loadedChunks = new Set();
    }
    
    static worldToChunkCoords(worldX, worldZ) {
        return {
            chunkX: Math.floor(worldX / 16),
            chunkZ: Math.floor(worldZ / 16)
        };
    }
    
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
    
    static getChunkKey(chunkX, chunkZ) {
        return `${chunkX},${chunkZ}`;
    }
    
    getOrCreateChunk(chunkX, chunkZ) {
        const key = ChunkManager.getChunkKey(chunkX, chunkZ);
        
        if (!this.chunks.has(key)) {
            const chunk = new Chunk(chunkX, chunkZ);
            this.chunks.set(key, chunk);
            this.loadedChunks.add(key);
        }
        
        return this.chunks.get(key);
    }
    
    getChunkAtWorldPos(worldX, worldZ) {
        const { chunkX, chunkZ } = ChunkManager.worldToChunkCoords(worldX, worldZ);
        return this.getOrCreateChunk(chunkX, chunkZ);
    }
    
    getBlock(worldX, worldY, worldZ) {
        const coords = ChunkManager.worldToLocalCoords(worldX, worldY, worldZ);
        const chunk = this.getOrCreateChunk(coords.chunkX, coords.chunkZ);
        return chunk.getBlock(coords.localX, coords.localY, coords.localZ);
    }
    
    setBlock(worldX, worldY, worldZ, blockType) {
        const coords = ChunkManager.worldToLocalCoords(worldX, worldY, worldZ);
        const chunk = this.getOrCreateChunk(coords.chunkX, coords.chunkZ);
        return chunk.setBlock(coords.localX, coords.localY, coords.localZ, blockType);
    }
    
    isSolid(worldX, worldY, worldZ) {
        const block = this.getBlock(worldX, worldY, worldZ);
        return block.isSolid();
    }
    
    getLoadedChunks() {
        return Array.from(this.chunks.values());
    }
    
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
    
    unloadChunk(chunkX, chunkZ) {
        const key = ChunkManager.getChunkKey(chunkX, chunkZ);
        const chunk = this.chunks.get(key);
        
        if (chunk) {
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
    
    getChunkCount() {
        return this.chunks.size;
    }
    
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

// Test runner
class TestRunner {
    constructor() {
        this.tests = [];
        this.passed = 0;
        this.failed = 0;
    }
    
    test(name, testFn) {
        this.tests.push({ name, testFn });
    }
    
    async run() {
        console.log('Running chunk system tests...\n');
        
        for (const { name, testFn } of this.tests) {
            try {
                await testFn();
                console.log(`✓ ${name}`);
                this.passed++;
            } catch (error) {
                console.log(`✗ ${name}: ${error.message}`);
                this.failed++;
            }
        }
        
        console.log(`\nTest Results: ${this.passed} passed, ${this.failed} failed`);
        return this.failed === 0;
    }
    
    assertEqual(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(`Expected ${expected}, got ${actual}. ${message}`);
        }
    }
    
    assertTrue(condition, message = '') {
        if (!condition) {
            throw new Error(`Expected true, got false. ${message}`);
        }
    }
    
    assertFalse(condition, message = '') {
        if (condition) {
            throw new Error(`Expected false, got true. ${message}`);
        }
    }
    
    assertDeepEqual(actual, expected, message = '') {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}. ${message}`);
        }
    }
}

const runner = new TestRunner();

// Test ChunkManager coordinate conversion functions
runner.test('ChunkManager.worldToChunkCoords - positive coordinates', () => {
    const result = ChunkManager.worldToChunkCoords(17, 25);
    runner.assertDeepEqual(result, { chunkX: 1, chunkZ: 1 }, 'Should convert world coords to chunk coords');
});

runner.test('ChunkManager.worldToChunkCoords - negative coordinates', () => {
    const result = ChunkManager.worldToChunkCoords(-17, -25);
    runner.assertDeepEqual(result, { chunkX: -2, chunkZ: -2 }, 'Should handle negative coordinates correctly');
});

runner.test('ChunkManager.worldToChunkCoords - zero coordinates', () => {
    const result = ChunkManager.worldToChunkCoords(0, 0);
    runner.assertDeepEqual(result, { chunkX: 0, chunkZ: 0 }, 'Should handle zero coordinates');
});

runner.test('ChunkManager.worldToChunkCoords - boundary coordinates', () => {
    const result1 = ChunkManager.worldToChunkCoords(15, 15);
    runner.assertDeepEqual(result1, { chunkX: 0, chunkZ: 0 }, 'Should handle chunk boundary (15,15)');
    
    const result2 = ChunkManager.worldToChunkCoords(16, 16);
    runner.assertDeepEqual(result2, { chunkX: 1, chunkZ: 1 }, 'Should handle chunk boundary (16,16)');
});

runner.test('ChunkManager.worldToLocalCoords - basic conversion', () => {
    const result = ChunkManager.worldToLocalCoords(17, 64, 25);
    runner.assertDeepEqual(result, {
        chunkX: 1,
        chunkZ: 1,
        localX: 1,
        localY: 64,
        localZ: 9
    }, 'Should convert world coords to local chunk coords');
});

runner.test('ChunkManager.worldToLocalCoords - negative coordinates', () => {
    const result = ChunkManager.worldToLocalCoords(-17, 32, -25);
    runner.assertDeepEqual(result, {
        chunkX: -2,
        chunkZ: -2,
        localX: 15,
        localY: 32,
        localZ: 7
    }, 'Should handle negative coordinates in local conversion');
});

runner.test('ChunkManager.getChunkKey - generates correct key', () => {
    const key = ChunkManager.getChunkKey(5, -3);
    runner.assertEqual(key, '5,-3', 'Should generate correct chunk key');
});

// Test Chunk class functionality
runner.test('Chunk constructor - initializes correctly', () => {
    const chunk = new Chunk(2, -1);
    runner.assertEqual(chunk.chunkX, 2, 'Should set chunkX correctly');
    runner.assertEqual(chunk.chunkZ, -1, 'Should set chunkZ correctly');
    runner.assertTrue(chunk.isEmpty, 'New chunk should be empty');
    runner.assertFalse(chunk.needsUpdate, 'New chunk should not need update');
});

runner.test('Chunk.getBlock - returns correct block', () => {
    const chunk = new Chunk(0, 0);
    const block = chunk.getBlock(5, 10, 7);
    runner.assertEqual(block.type, BlockType.AIR, 'Should return air block initially');
    runner.assertDeepEqual(block.position, { x: 5, y: 10, z: 7 }, 'Should have correct world position');
});

runner.test('Chunk.getBlock - handles out of bounds', () => {
    const chunk = new Chunk(0, 0);
    const block1 = chunk.getBlock(-1, 10, 7);
    const block2 = chunk.getBlock(16, 10, 7);
    const block3 = chunk.getBlock(5, 256, 7);
    
    runner.assertEqual(block1.type, BlockType.AIR, 'Should return air for negative X');
    runner.assertEqual(block2.type, BlockType.AIR, 'Should return air for X >= 16');
    runner.assertEqual(block3.type, BlockType.AIR, 'Should return air for Y >= 256');
});

runner.test('Chunk.setBlock - sets block correctly', () => {
    const chunk = new Chunk(1, 1);
    const success = chunk.setBlock(5, 10, 7, BlockType.STONE);
    
    runner.assertTrue(success, 'Should return true for successful set');
    runner.assertTrue(chunk.needsUpdate, 'Should mark chunk as needing update');
    runner.assertFalse(chunk.isEmpty, 'Should mark chunk as not empty');
    
    const block = chunk.getBlock(5, 10, 7);
    runner.assertEqual(block.type, BlockType.STONE, 'Should set block type correctly');
    runner.assertDeepEqual(block.position, { x: 21, y: 10, z: 23 }, 'Should calculate world position correctly');
});

runner.test('Chunk.setBlock - handles out of bounds', () => {
    const chunk = new Chunk(0, 0);
    const success1 = chunk.setBlock(-1, 10, 7, BlockType.STONE);
    const success2 = chunk.setBlock(16, 10, 7, BlockType.STONE);
    const success3 = chunk.setBlock(5, 256, 7, BlockType.STONE);
    
    runner.assertFalse(success1, 'Should return false for negative X');
    runner.assertFalse(success2, 'Should return false for X >= 16');
    runner.assertFalse(success3, 'Should return false for Y >= 256');
});

runner.test('Chunk.getWorldPosition - calculates correctly', () => {
    const chunk = new Chunk(2, -1);
    const worldPos = chunk.getWorldPosition(5, 64, 10);
    runner.assertDeepEqual(worldPos, { x: 37, y: 64, z: -6 }, 'Should calculate world position correctly');
});

runner.test('Chunk.getNonAirBlocks - returns only non-air blocks', () => {
    const chunk = new Chunk(0, 0);
    chunk.setBlock(0, 0, 0, BlockType.STONE);
    chunk.setBlock(1, 1, 1, BlockType.GRASS);
    chunk.setBlock(2, 2, 2, BlockType.AIR);
    
    const nonAirBlocks = chunk.getNonAirBlocks();
    runner.assertEqual(nonAirBlocks.length, 2, 'Should return only non-air blocks');
    runner.assertEqual(nonAirBlocks[0].type, BlockType.STONE, 'First block should be stone');
    runner.assertEqual(nonAirBlocks[1].type, BlockType.GRASS, 'Second block should be grass');
});

runner.test('Chunk.getKey - returns correct key', () => {
    const chunk = new Chunk(5, -3);
    const key = chunk.getKey();
    runner.assertEqual(key, '5,-3', 'Should return correct chunk key');
});

// Test ChunkManager functionality
runner.test('ChunkManager.getOrCreateChunk - creates new chunk', () => {
    const manager = new ChunkManager();
    const chunk = manager.getOrCreateChunk(2, 3);
    
    runner.assertEqual(chunk.chunkX, 2, 'Should create chunk with correct X');
    runner.assertEqual(chunk.chunkZ, 3, 'Should create chunk with correct Z');
    runner.assertEqual(manager.getChunkCount(), 1, 'Should have one chunk');
});

runner.test('ChunkManager.getOrCreateChunk - returns existing chunk', () => {
    const manager = new ChunkManager();
    const chunk1 = manager.getOrCreateChunk(2, 3);
    const chunk2 = manager.getOrCreateChunk(2, 3);
    
    runner.assertTrue(chunk1 === chunk2, 'Should return same chunk instance');
    runner.assertEqual(manager.getChunkCount(), 1, 'Should still have one chunk');
});

runner.test('ChunkManager.getChunkAtWorldPos - gets correct chunk', () => {
    const manager = new ChunkManager();
    const chunk = manager.getChunkAtWorldPos(25, -10);
    
    runner.assertEqual(chunk.chunkX, 1, 'Should get chunk at correct X');
    runner.assertEqual(chunk.chunkZ, -1, 'Should get chunk at correct Z');
});

runner.test('ChunkManager.getBlock - gets block from correct chunk', () => {
    const manager = new ChunkManager();
    manager.setBlock(17, 64, 25, BlockType.STONE);
    
    const block = manager.getBlock(17, 64, 25);
    runner.assertEqual(block.type, BlockType.STONE, 'Should get correct block type');
    runner.assertDeepEqual(block.position, { x: 17, y: 64, z: 25 }, 'Should have correct position');
});

runner.test('ChunkManager.setBlock - sets block in correct chunk', () => {
    const manager = new ChunkManager();
    const success = manager.setBlock(17, 64, 25, BlockType.GRASS);
    
    runner.assertTrue(success, 'Should successfully set block');
    
    const block = manager.getBlock(17, 64, 25);
    runner.assertEqual(block.type, BlockType.GRASS, 'Should set correct block type');
});

runner.test('ChunkManager.isSolid - checks block solidity', () => {
    const manager = new ChunkManager();
    manager.setBlock(10, 10, 10, BlockType.STONE);
    
    runner.assertTrue(manager.isSolid(10, 10, 10), 'Stone block should be solid');
    runner.assertFalse(manager.isSolid(11, 10, 10), 'Air block should not be solid');
});

runner.test('ChunkManager.getChunksInRadius - gets chunks in radius', () => {
    const manager = new ChunkManager();
    const chunks = manager.getChunksInRadius(8, 8, 1);
    
    runner.assertEqual(chunks.length, 9, 'Should get 9 chunks in radius 1 (3x3 grid)');
    
    // Check that we have the expected chunks
    const chunkKeys = chunks.map(chunk => chunk.getKey()).sort();
    const expectedKeys = ['-1,-1', '-1,0', '-1,1', '0,-1', '0,0', '0,1', '1,-1', '1,0', '1,1'];
    runner.assertDeepEqual(chunkKeys, expectedKeys, 'Should get correct chunks in radius');
});

runner.test('ChunkManager.unloadChunk - unloads chunk correctly', () => {
    const manager = new ChunkManager();
    manager.getOrCreateChunk(5, 5);
    runner.assertEqual(manager.getChunkCount(), 1, 'Should have one chunk');
    
    const success = manager.unloadChunk(5, 5);
    runner.assertTrue(success, 'Should successfully unload chunk');
    runner.assertEqual(manager.getChunkCount(), 0, 'Should have no chunks after unload');
    
    const failedUnload = manager.unloadChunk(5, 5);
    runner.assertFalse(failedUnload, 'Should return false when unloading non-existent chunk');
});

runner.test('ChunkManager.clear - clears all chunks', () => {
    const manager = new ChunkManager();
    manager.getOrCreateChunk(1, 1);
    manager.getOrCreateChunk(2, 2);
    manager.getOrCreateChunk(3, 3);
    
    runner.assertEqual(manager.getChunkCount(), 3, 'Should have three chunks');
    
    manager.clear();
    runner.assertEqual(manager.getChunkCount(), 0, 'Should have no chunks after clear');
});

// Test coordinate edge cases
runner.test('Coordinate edge cases - chunk boundaries', () => {
    const manager = new ChunkManager();
    
    // Test blocks right at chunk boundaries
    manager.setBlock(15, 10, 15, BlockType.STONE);  // Last block in chunk (0,0)
    manager.setBlock(16, 10, 16, BlockType.GRASS);  // First block in chunk (1,1)
    manager.setBlock(-1, 10, -1, BlockType.DIRT);   // Last block in chunk (-1,-1)
    manager.setBlock(0, 10, 0, BlockType.WOOD);     // First block in chunk (0,0)
    
    const block1 = manager.getBlock(15, 10, 15);
    const block2 = manager.getBlock(16, 10, 16);
    const block3 = manager.getBlock(-1, 10, -1);
    const block4 = manager.getBlock(0, 10, 0);
    
    runner.assertEqual(block1.type, BlockType.STONE, 'Block at (15,10,15) should be stone');
    runner.assertEqual(block2.type, BlockType.GRASS, 'Block at (16,10,16) should be grass');
    runner.assertEqual(block3.type, BlockType.DIRT, 'Block at (-1,10,-1) should be dirt');
    runner.assertEqual(block4.type, BlockType.WOOD, 'Block at (0,10,0) should be wood');
});

runner.test('Large coordinate values', () => {
    const manager = new ChunkManager();
    
    // Test with large coordinates
    const largeX = 1000000;
    const largeZ = -1000000;
    
    manager.setBlock(largeX, 128, largeZ, BlockType.STONE);
    const block = manager.getBlock(largeX, 128, largeZ);
    
    runner.assertEqual(block.type, BlockType.STONE, 'Should handle large coordinates');
    runner.assertDeepEqual(block.position, { x: largeX, y: 128, z: largeZ }, 'Should maintain correct position');
});

// Run all tests
console.log('Starting test execution...');

runner.run().then(success => {
    if (success) {
        console.log('\n🎉 All chunk system tests passed!');
    } else {
        console.log('\n❌ Some tests failed. Check the output above.');
    }
}).catch(error => {
    console.error('Error running tests:', error);
});

if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = { runner, TestRunner, BlockType, Block, Chunk, ChunkManager };
}