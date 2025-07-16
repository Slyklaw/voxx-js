// Verification script for chunk-based world structure integration
// This script tests that the chunk system integrates properly with the existing game

console.log('🔍 Verifying chunk-based world structure integration...\n');

// Test that the game can be loaded and the chunk system works
function verifyChunkIntegration() {
    try {
        // Test that BlockType is available
        if (typeof BlockType === 'undefined') {
            throw new Error('BlockType is not defined');
        }
        console.log('✓ BlockType enum is available');

        // Test that Block class works
        const testBlock = new Block(BlockType.STONE, { x: 5, y: 10, z: 15 });
        if (testBlock.type !== BlockType.STONE || !testBlock.isSolid()) {
            throw new Error('Block class not working correctly');
        }
        console.log('✓ Block class is working correctly');

        // Test that Chunk class works
        const testChunk = new Chunk(1, 2);
        if (testChunk.chunkX !== 1 || testChunk.chunkZ !== 2) {
            throw new Error('Chunk constructor not working correctly');
        }
        
        testChunk.setBlock(5, 10, 7, BlockType.GRASS);
        const retrievedBlock = testChunk.getBlock(5, 10, 7);
        if (retrievedBlock.type !== BlockType.GRASS) {
            throw new Error('Chunk block storage not working correctly');
        }
        console.log('✓ Chunk class is working correctly');

        // Test that ChunkManager works
        const manager = new ChunkManager();
        manager.setBlock(25, 64, 30, BlockType.WOOD);
        const block = manager.getBlock(25, 64, 30);
        if (block.type !== BlockType.WOOD) {
            throw new Error('ChunkManager not working correctly');
        }
        console.log('✓ ChunkManager is working correctly');

        // Test coordinate conversion functions
        const chunkCoords = ChunkManager.worldToChunkCoords(25, 30);
        if (chunkCoords.chunkX !== 1 || chunkCoords.chunkZ !== 1) {
            throw new Error('Coordinate conversion not working correctly');
        }
        console.log('✓ Coordinate conversion functions are working correctly');

        // Test that World class works with chunk system
        const world = new World();
        world.setBlock(10, 5, 15, BlockType.STONE);
        const worldBlock = world.getBlock(10, 5, 15);
        if (worldBlock.type !== BlockType.STONE) {
            throw new Error('World class integration with chunks not working');
        }
        console.log('✓ World class integration with chunk system is working correctly');

        // Test chunk boundaries
        manager.setBlock(15, 10, 15, BlockType.DIRT);  // Last block in chunk (0,0)
        manager.setBlock(16, 10, 16, BlockType.GRASS); // First block in chunk (1,1)
        
        const boundaryBlock1 = manager.getBlock(15, 10, 15);
        const boundaryBlock2 = manager.getBlock(16, 10, 16);
        
        if (boundaryBlock1.type !== BlockType.DIRT || boundaryBlock2.type !== BlockType.GRASS) {
            throw new Error('Chunk boundary handling not working correctly');
        }
        console.log('✓ Chunk boundary handling is working correctly');

        // Test chunk loading and unloading
        const initialChunkCount = manager.getChunkCount();
        manager.getChunksInRadius(0, 0, 2); // This should create several chunks
        const newChunkCount = manager.getChunkCount();
        
        if (newChunkCount <= initialChunkCount) {
            throw new Error('Chunk loading not working correctly');
        }
        console.log('✓ Chunk loading is working correctly');

        manager.clear();
        if (manager.getChunkCount() !== 0) {
            throw new Error('Chunk clearing not working correctly');
        }
        console.log('✓ Chunk clearing is working correctly');

        console.log('\n🎉 All chunk integration tests passed!');
        console.log('✅ The chunk-based world structure is properly integrated and ready to use.');
        
        return true;
    } catch (error) {
        console.error('❌ Chunk integration test failed:', error.message);
        return false;
    }
}

// Test performance with larger datasets
function verifyChunkPerformance() {
    console.log('\n🚀 Testing chunk system performance...');
    
    const manager = new ChunkManager();
    const startTime = performance.now();
    
    // Create a 10x10 area of blocks (spanning multiple chunks)
    for (let x = 0; x < 100; x++) {
        for (let z = 0; z < 100; z++) {
            manager.setBlock(x, 64, z, BlockType.GRASS);
        }
    }
    
    const setTime = performance.now() - startTime;
    console.log(`✓ Set 10,000 blocks in ${setTime.toFixed(2)}ms`);
    
    // Test retrieval performance
    const retrieveStartTime = performance.now();
    let retrievedCount = 0;
    
    for (let x = 0; x < 100; x++) {
        for (let z = 0; z < 100; z++) {
            const block = manager.getBlock(x, 64, z);
            if (block.type === BlockType.GRASS) {
                retrievedCount++;
            }
        }
    }
    
    const retrieveTime = performance.now() - retrieveStartTime;
    console.log(`✓ Retrieved 10,000 blocks in ${retrieveTime.toFixed(2)}ms`);
    console.log(`✓ Created ${manager.getChunkCount()} chunks for the test area`);
    
    if (retrievedCount !== 10000) {
        throw new Error(`Expected 10000 blocks, got ${retrievedCount}`);
    }
    
    console.log('✅ Chunk system performance is acceptable');
}

// Run verification if in browser environment
if (typeof window !== 'undefined') {
    // Wait for the game to load
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            const success = verifyChunkIntegration();
            if (success) {
                verifyChunkPerformance();
            }
        }, 1000); // Wait 1 second for game initialization
    });
} else {
    console.log('This verification script is designed to run in the browser with the game loaded.');
    console.log('Please open index.html and include this script to run the verification.');
}