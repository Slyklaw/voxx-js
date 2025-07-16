// Unit tests for block system and world representation
// This file contains tests for BlockType, Block, BlockRenderer, and World classes

// Mock THREE.js components for testing
class MockBoxGeometry {
    constructor(width, height, depth) {
        this.width = width;
        this.height = height;
        this.depth = depth;
    }
    
    dispose() {
        // Mock dispose method
    }
}

class MockMeshLambertMaterial {
    constructor(options) {
        this.color = options.color;
    }
    
    dispose() {
        // Mock dispose method
    }
}

class MockMesh {
    constructor(geometry, material) {
        this.geometry = geometry;
        this.material = material;
        this.position = { x: 0, y: 0, z: 0, set: (x, y, z) => {
            this.position.x = x;
            this.position.y = y;
            this.position.z = z;
        }};
        this.castShadow = false;
        this.receiveShadow = false;
        this.userData = {};
        this.name = '';
    }
}

class MockScene {
    constructor() {
        this.objects = [];
    }
    
    add(object) {
        this.objects.push(object);
    }
    
    remove(object) {
        const index = this.objects.indexOf(object);
        if (index > -1) {
            this.objects.splice(index, 1);
        }
    }
    
    getObjectByName(name) {
        return this.objects.find(obj => obj.name === name);
    }
}

// Setup mock THREE.js for testing
global.THREE = {
    BoxGeometry: MockBoxGeometry,
    MeshLambertMaterial: MockMeshLambertMaterial,
    Mesh: MockMesh
};

// Block system definitions (copied from game.js for testing)
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

// Basic world representation
class World {
    constructor() {
        this.blocks = new Map(); // Store blocks using position key
        this.blockRenderer = new BlockRenderer();
        this.scene = null; // Will be set by the game
    }
    
    // Generate position key for block storage
    getPositionKey(x, y, z) {
        return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    }
    
    // Set a block at the given position
    setBlock(x, y, z, blockType) {
        const position = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
        const key = this.getPositionKey(position.x, position.y, position.z);
        
        // Remove existing block if present
        this.removeBlock(position.x, position.y, position.z);
        
        // Don't store air blocks
        if (blockType === BlockType.AIR) {
            return;
        }
        
        // Create and store new block
        const block = new Block(blockType, position);
        this.blocks.set(key, block);
        
        // Create and add mesh to scene if scene is available
        if (this.scene) {
            const mesh = this.blockRenderer.createBlockMesh(block);
            if (mesh) {
                mesh.name = `block_${key}`;
                this.scene.add(mesh);
            }
        }
        
        return block;
    }
    
    // Get block at the given position
    getBlock(x, y, z) {
        const key = this.getPositionKey(x, y, z);
        return this.blocks.get(key) || new Block(BlockType.AIR, { x, y, z });
    }
    
    // Remove block at the given position
    removeBlock(x, y, z) {
        const key = this.getPositionKey(x, y, z);
        const block = this.blocks.get(key);
        
        if (block && this.scene) {
            // Remove mesh from scene
            const mesh = this.scene.getObjectByName(`block_${key}`);
            if (mesh) {
                this.scene.remove(mesh);
            }
        }
        
        this.blocks.delete(key);
        return block;
    }
    
    // Check if position has a solid block
    isSolid(x, y, z) {
        const block = this.getBlock(x, y, z);
        return block.isSolid();
    }
    
    // Generate a simple test world
    generateTestWorld() {
        // Create a simple platform
        for (let x = -5; x <= 5; x++) {
            for (let z = -5; z <= 5; z++) {
                // Grass layer
                this.setBlock(x, 0, z, BlockType.GRASS);
                // Dirt layers
                this.setBlock(x, -1, z, BlockType.DIRT);
                this.setBlock(x, -2, z, BlockType.DIRT);
                // Stone base
                this.setBlock(x, -3, z, BlockType.STONE);
            }
        }
        
        // Add some test blocks
        this.setBlock(0, 1, 0, BlockType.WOOD);
        this.setBlock(1, 1, 0, BlockType.STONE);
        this.setBlock(-1, 1, 0, BlockType.LEAVES);
        this.setBlock(0, 2, 0, BlockType.LEAVES);
        
        console.log('Test world generated with', this.blocks.size, 'blocks');
    }
    
    // Set the scene reference for rendering
    setScene(scene) {
        this.scene = scene;
        
        // Add existing blocks to scene
        this.blocks.forEach((block, key) => {
            const mesh = this.blockRenderer.createBlockMesh(block);
            if (mesh) {
                mesh.name = `block_${key}`;
                this.scene.add(mesh);
            }
        });
    }
    
    // Get all blocks (for testing/debugging)
    getAllBlocks() {
        return Array.from(this.blocks.values());
    }
    
    // Dispose of resources
    dispose() {
        if (this.blockRenderer) {
            this.blockRenderer.dispose();
        }
        this.blocks.clear();
    }
}

// Test suite for BlockType enum
function testBlockType() {
    console.log('Testing BlockType enum...');
    
    // Test 1: BlockType constants exist
    console.log('Test 1: BlockType constants');
    if (BlockType.AIR === 0 && 
        BlockType.GRASS === 1 && 
        BlockType.DIRT === 2 && 
        BlockType.STONE === 3 && 
        BlockType.WOOD === 4 && 
        BlockType.LEAVES === 5) {
        console.log('✓ All BlockType constants are defined correctly');
    } else {
        console.log('✗ BlockType constants are incorrect');
    }
    
    // Test 2: BlockType values are unique
    console.log('Test 2: BlockType uniqueness');
    const values = Object.values(BlockType);
    const uniqueValues = [...new Set(values)];
    if (values.length === uniqueValues.length) {
        console.log('✓ All BlockType values are unique');
    } else {
        console.log('✗ BlockType values are not unique');
    }
    
    console.log('BlockType tests completed\n');
}

// Test suite for Block class
function testBlock() {
    console.log('Testing Block class...');
    
    // Test 1: Block creation with defaults
    console.log('Test 1: Block creation with defaults');
    const defaultBlock = new Block();
    if (defaultBlock.type === BlockType.AIR && 
        defaultBlock.position.x === 0 && 
        defaultBlock.position.y === 0 && 
        defaultBlock.position.z === 0 && 
        defaultBlock.metadata === null) {
        console.log('✓ Block creates with correct defaults');
    } else {
        console.log('✗ Block default creation failed');
    }
    
    // Test 2: Block creation with parameters
    console.log('Test 2: Block creation with parameters');
    const customBlock = new Block(BlockType.STONE, { x: 5, y: 10, z: -3 });
    if (customBlock.type === BlockType.STONE && 
        customBlock.position.x === 5 && 
        customBlock.position.y === 10 && 
        customBlock.position.z === -3) {
        console.log('✓ Block creates with custom parameters');
    } else {
        console.log('✗ Block custom creation failed');
    }
    
    // Test 3: getTypeName method
    console.log('Test 3: getTypeName method');
    const grassBlock = new Block(BlockType.GRASS);
    const stoneBlock = new Block(BlockType.STONE);
    if (grassBlock.getTypeName() === 'Grass' && stoneBlock.getTypeName() === 'Stone') {
        console.log('✓ getTypeName returns correct names');
    } else {
        console.log('✗ getTypeName failed');
    }
    
    // Test 4: isSolid method
    console.log('Test 4: isSolid method');
    const airBlock = new Block(BlockType.AIR);
    const dirtBlock = new Block(BlockType.DIRT);
    if (!airBlock.isSolid() && dirtBlock.isSolid()) {
        console.log('✓ isSolid works correctly');
    } else {
        console.log('✗ isSolid failed');
    }
    
    // Test 5: clone method
    console.log('Test 5: clone method');
    const originalBlock = new Block(BlockType.WOOD, { x: 1, y: 2, z: 3 });
    originalBlock.metadata = { test: 'data' };
    const clonedBlock = originalBlock.clone();
    
    if (clonedBlock.type === originalBlock.type && 
        clonedBlock.position.x === originalBlock.position.x && 
        clonedBlock.position.y === originalBlock.position.y && 
        clonedBlock.position.z === originalBlock.position.z && 
        clonedBlock.metadata.test === originalBlock.metadata.test && 
        clonedBlock !== originalBlock) {
        console.log('✓ clone creates correct copy');
    } else {
        console.log('✗ clone failed');
    }
    
    // Test 6: Position independence after cloning
    console.log('Test 6: Position independence after cloning');
    clonedBlock.position.x = 999;
    if (originalBlock.position.x === 1) {
        console.log('✓ Cloned block position is independent');
    } else {
        console.log('✗ Cloned block position is not independent');
    }
    
    console.log('Block tests completed\n');
}

// Test suite for BlockRenderer class
function testBlockRenderer() {
    console.log('Testing BlockRenderer class...');
    
    // Test 1: BlockRenderer initialization
    console.log('Test 1: BlockRenderer initialization');
    const renderer = new BlockRenderer();
    if (renderer.geometry && renderer.materials && 
        Object.keys(renderer.materials).length > 0) {
        console.log('✓ BlockRenderer initializes correctly');
    } else {
        console.log('✗ BlockRenderer initialization failed');
    }
    
    // Test 2: Material creation for all block types
    console.log('Test 2: Material creation');
    const expectedMaterials = [BlockType.GRASS, BlockType.DIRT, BlockType.STONE, BlockType.WOOD, BlockType.LEAVES];
    const hasAllMaterials = expectedMaterials.every(type => renderer.materials[type]);
    if (hasAllMaterials) {
        console.log('✓ All block type materials created');
    } else {
        console.log('✗ Missing materials for some block types');
    }
    
    // Test 3: createBlockMesh for solid block
    console.log('Test 3: createBlockMesh for solid block');
    const grassBlock = new Block(BlockType.GRASS, { x: 1, y: 2, z: 3 });
    const mesh = renderer.createBlockMesh(grassBlock);
    if (mesh && mesh.position.x === 1 && mesh.position.y === 2 && mesh.position.z === 3 && 
        mesh.userData.block === grassBlock && mesh.castShadow && mesh.receiveShadow) {
        console.log('✓ createBlockMesh works for solid blocks');
    } else {
        console.log('✗ createBlockMesh failed for solid blocks');
    }
    
    // Test 4: createBlockMesh for air block
    console.log('Test 4: createBlockMesh for air block');
    const airBlock = new Block(BlockType.AIR);
    const airMesh = renderer.createBlockMesh(airBlock);
    if (airMesh === null) {
        console.log('✓ createBlockMesh returns null for air blocks');
    } else {
        console.log('✗ createBlockMesh should return null for air blocks');
    }
    
    // Test 5: updateBlockMesh
    console.log('Test 5: updateBlockMesh');
    const newBlock = new Block(BlockType.STONE, { x: 10, y: 20, z: 30 });
    renderer.updateBlockMesh(mesh, newBlock);
    if (mesh.position.x === 10 && mesh.position.y === 20 && mesh.position.z === 30 && 
        mesh.userData.block === newBlock) {
        console.log('✓ updateBlockMesh works correctly');
    } else {
        console.log('✗ updateBlockMesh failed');
    }
    
    // Test 6: Material colors are correct
    console.log('Test 6: Material colors');
    const grassMaterial = renderer.materials[BlockType.GRASS];
    const stoneMaterial = renderer.materials[BlockType.STONE];
    if (grassMaterial.color === 0x228B22 && stoneMaterial.color === 0x696969) {
        console.log('✓ Material colors are correct');
    } else {
        console.log('✗ Material colors are incorrect');
    }
    
    console.log('BlockRenderer tests completed\n');
}

// Test suite for World class
function testWorld() {
    console.log('Testing World class...');
    
    // Test 1: World initialization
    console.log('Test 1: World initialization');
    const world = new World();
    if (world.blocks instanceof Map && world.blocks.size === 0 && 
        world.blockRenderer && world.scene === null) {
        console.log('✓ World initializes correctly');
    } else {
        console.log('✗ World initialization failed');
    }
    
    // Test 2: getPositionKey method
    console.log('Test 2: getPositionKey method');
    const key1 = world.getPositionKey(1.7, 2.3, -3.9);
    const key2 = world.getPositionKey(1, 2, -3);
    if (key1 === '1,2,-4' && key2 === '1,2,-3') {
        console.log('✓ getPositionKey works correctly with flooring');
    } else {
        console.log(`✗ getPositionKey failed: key1="${key1}", key2="${key2}"`);
    }
    
    // Test 3: setBlock method
    console.log('Test 3: setBlock method');
    const block = world.setBlock(5, 10, -2, BlockType.STONE);
    if (block && block.type === BlockType.STONE && 
        block.position.x === 5 && block.position.y === 10 && block.position.z === -2 && 
        world.blocks.size === 1) {
        console.log('✓ setBlock creates and stores blocks correctly');
    } else {
        console.log('✗ setBlock failed');
    }
    
    // Test 4: getBlock method
    console.log('Test 4: getBlock method');
    const retrievedBlock = world.getBlock(5, 10, -2);
    const emptyBlock = world.getBlock(100, 100, 100);
    if (retrievedBlock.type === BlockType.STONE && emptyBlock.type === BlockType.AIR) {
        console.log('✓ getBlock retrieves existing blocks and returns air for empty positions');
    } else {
        console.log('✗ getBlock failed');
    }
    
    // Test 5: removeBlock method
    console.log('Test 5: removeBlock method');
    const removedBlock = world.removeBlock(5, 10, -2);
    const afterRemoval = world.getBlock(5, 10, -2);
    if (removedBlock && removedBlock.type === BlockType.STONE && 
        afterRemoval.type === BlockType.AIR && world.blocks.size === 0) {
        console.log('✓ removeBlock works correctly');
    } else {
        console.log('✗ removeBlock failed');
    }
    
    // Test 6: isSolid method
    console.log('Test 6: isSolid method');
    world.setBlock(0, 0, 0, BlockType.DIRT);
    if (world.isSolid(0, 0, 0) && !world.isSolid(1, 1, 1)) {
        console.log('✓ isSolid works correctly');
    } else {
        console.log('✗ isSolid failed');
    }
    
    // Test 7: Air blocks are not stored
    console.log('Test 7: Air blocks are not stored');
    world.setBlock(10, 10, 10, BlockType.AIR);
    if (world.blocks.size === 1) { // Only the dirt block from test 6
        console.log('✓ Air blocks are not stored in the world');
    } else {
        console.log('✗ Air blocks are being stored incorrectly');
    }
    
    // Test 8: Block replacement
    console.log('Test 8: Block replacement');
    world.setBlock(0, 0, 0, BlockType.STONE); // Replace dirt with stone
    const replacedBlock = world.getBlock(0, 0, 0);
    if (replacedBlock.type === BlockType.STONE && world.blocks.size === 1) {
        console.log('✓ Block replacement works correctly');
    } else {
        console.log('✗ Block replacement failed');
    }
    
    // Test 9: setScene method
    console.log('Test 9: setScene method');
    const mockScene = new MockScene();
    world.setScene(mockScene);
    if (world.scene === mockScene && mockScene.objects.length === 1) {
        console.log('✓ setScene adds existing blocks to scene');
    } else {
        console.log('✗ setScene failed');
    }
    
    // Test 10: generateTestWorld method
    console.log('Test 10: generateTestWorld method');
    const newWorld = new World();
    newWorld.generateTestWorld();
    const blockCount = newWorld.blocks.size;
    // Should have 11x11x4 = 484 blocks for the platform plus 4 test blocks = 488 total
    if (blockCount === 488) {
        console.log('✓ generateTestWorld creates correct number of blocks');
    } else {
        console.log(`✗ generateTestWorld created ${blockCount} blocks, expected 488`);
    }
    
    // Test 11: getAllBlocks method
    console.log('Test 11: getAllBlocks method');
    const allBlocks = newWorld.getAllBlocks();
    if (Array.isArray(allBlocks) && allBlocks.length === newWorld.blocks.size) {
        console.log('✓ getAllBlocks returns correct array');
    } else {
        console.log('✗ getAllBlocks failed');
    }
    
    console.log('World tests completed\n');
}

// Test suite for integration between components
function testIntegration() {
    console.log('Testing integration between components...');
    
    // Test 1: World with scene integration
    console.log('Test 1: World with scene integration');
    const world = new World();
    const mockScene = new MockScene();
    world.setScene(mockScene);
    
    // Add blocks and verify they appear in scene
    world.setBlock(1, 2, 3, BlockType.GRASS);
    world.setBlock(4, 5, 6, BlockType.STONE);
    
    if (mockScene.objects.length === 2) {
        console.log('✓ Blocks are automatically added to scene');
    } else {
        console.log('✗ Scene integration failed');
    }
    
    // Test 2: Block removal from scene
    console.log('Test 2: Block removal from scene');
    world.removeBlock(1, 2, 3);
    if (mockScene.objects.length === 1) {
        console.log('✓ Blocks are automatically removed from scene');
    } else {
        console.log('✗ Block removal from scene failed');
    }
    
    // Test 3: Block replacement in scene
    console.log('Test 3: Block replacement in scene');
    world.setBlock(4, 5, 6, BlockType.WOOD); // Replace stone with wood
    const mesh = mockScene.getObjectByName('block_4,5,6');
    if (mesh && mesh.userData.block.type === BlockType.WOOD) {
        console.log('✓ Block replacement updates scene correctly');
    } else {
        console.log('✗ Block replacement in scene failed');
    }
    
    console.log('Integration tests completed\n');
}

// Run all tests
function runAllTests() {
    console.log('=== Block System Unit Tests ===\n');
    
    testBlockType();
    testBlock();
    testBlockRenderer();
    testWorld();
    testIntegration();
    
    console.log('=== All block system tests completed ===');
}

// Export for Node.js or run directly in browser
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        runAllTests, 
        testBlockType, 
        testBlock, 
        testBlockRenderer, 
        testWorld, 
        testIntegration,
        BlockType,
        Block,
        BlockRenderer,
        World
    };
    // Also run tests when required in Node.js
    runAllTests();
} else {
    // Run tests immediately if in browser
    runAllTests();
}