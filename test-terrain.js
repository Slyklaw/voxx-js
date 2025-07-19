// Test terrain generation and visibility
// This file tests that terrain is properly generated and added to the scene

// Mock Three.js environment for testing
function createMockThreeJS() {
    global.THREE = {
        Scene: function() {
            this.objects = [];
            this.add = function(object) {
                this.objects.push(object);
            };
            this.remove = function(object) {
                const index = this.objects.indexOf(object);
                if (index > -1) {
                    this.objects.splice(index, 1);
                }
            };
            this.getObjectByName = function(name) {
                return this.objects.find(obj => obj.name === name);
            };
        },
        
        Vector3: function(x = 0, y = 0, z = 0) {
            this.x = x;
            this.y = y;
            this.z = z;
            this.set = function(x, y, z) {
                this.x = x;
                this.y = y;
                this.z = z;
                return this;
            };
            this.copy = function(v) {
                this.x = v.x;
                this.y = v.y;
                this.z = v.z;
                return this;
            };
            this.clone = function() {
                return new THREE.Vector3(this.x, this.y, this.z);
            };
        },
        
        BoxGeometry: function(w, h, d) {
            this.dispose = function() {};
        },
        
        MeshLambertMaterial: function(params) {
            this.color = params.color;
            this.dispose = function() {};
        },
        
        Mesh: function(geometry, material) {
            this.geometry = geometry;
            this.material = material;
            this.position = new THREE.Vector3();
            this.castShadow = false;
            this.receiveShadow = false;
            this.userData = {};
            this.name = '';
        },
        
        Color: function(color) {
            this.value = color;
        },
        
        Fog: function(color, near, far) {
            this.color = color;
            this.near = near;
            this.far = far;
        }
    };
}

// Test terrain generation and scene integration
function testTerrainGeneration() {
    console.log('Running terrain generation tests...');
    
    // Setup mock Three.js
    createMockThreeJS();
    
    // Test 1: World creation and terrain generation
    console.log('Test 1: World creation and terrain generation');
    
    const world = new World(12345); // Fixed seed for consistent results
    const scene = new THREE.Scene();
    
    // Generate terrain first
    world.generateInitialWorld(1); // Small radius for testing
    
    // Check that blocks were generated
    const allBlocks = world.getAllBlocks();
    if (allBlocks.length === 0) {
        console.error('❌ Test 1 failed: No blocks generated');
        return false;
    }
    
    console.log(`✅ Test 1 passed: Generated ${allBlocks.length} blocks`);
    
    // Test 2: Scene integration after terrain generation
    console.log('Test 2: Scene integration after terrain generation');
    
    const initialSceneObjects = scene.objects.length;
    
    // Set scene reference (should add blocks to scene)
    world.setScene(scene);
    
    const finalSceneObjects = scene.objects.length;
    const addedObjects = finalSceneObjects - initialSceneObjects;
    
    if (addedObjects === 0) {
        console.error('❌ Test 2 failed: No objects added to scene');
        return false;
    }
    
    if (addedObjects !== allBlocks.length) {
        console.error(`❌ Test 2 failed: Expected ${allBlocks.length} objects, got ${addedObjects}`);
        return false;
    }
    
    console.log(`✅ Test 2 passed: Added ${addedObjects} objects to scene`);
    
    // Test 3: Block types and positions
    console.log('Test 3: Block types and positions');
    
    let grassBlocks = 0;
    let dirtBlocks = 0;
    let stoneBlocks = 0;
    
    allBlocks.forEach(block => {
        switch(block.type) {
            case BlockType.GRASS:
                grassBlocks++;
                break;
            case BlockType.DIRT:
                dirtBlocks++;
                break;
            case BlockType.STONE:
                stoneBlocks++;
                break;
        }
    });
    
    if (grassBlocks === 0) {
        console.error('❌ Test 3 failed: No grass blocks generated');
        return false;
    }
    
    if (dirtBlocks === 0) {
        console.error('❌ Test 3 failed: No dirt blocks generated');
        return false;
    }
    
    if (stoneBlocks === 0) {
        console.error('❌ Test 3 failed: No stone blocks generated');
        return false;
    }
    
    console.log(`✅ Test 3 passed: Generated ${grassBlocks} grass, ${dirtBlocks} dirt, ${stoneBlocks} stone blocks`);
    
    // Test 4: Spawn point positioning
    console.log('Test 4: Spawn point positioning');
    
    const spawnPoint = world.getSpawnPoint();
    const terrainHeight = world.getTerrainHeight(spawnPoint.x, spawnPoint.z);
    
    if (spawnPoint.y <= terrainHeight) {
        console.error(`❌ Test 4 failed: Spawn point (${spawnPoint.y}) not above terrain (${terrainHeight})`);
        return false;
    }
    
    console.log(`✅ Test 4 passed: Spawn point at (${spawnPoint.x}, ${spawnPoint.y}, ${spawnPoint.z}), terrain height: ${terrainHeight}`);
    
    // Test 5: Block mesh creation
    console.log('Test 5: Block mesh creation');
    
    const testBlock = allBlocks[0];
    const mesh = world.blockRenderer.createBlockMesh(testBlock);
    
    if (!mesh) {
        console.error('❌ Test 5 failed: Block mesh not created');
        return false;
    }
    
    if (mesh.position.x !== testBlock.position.x || 
        mesh.position.y !== testBlock.position.y || 
        mesh.position.z !== testBlock.position.z) {
        console.error('❌ Test 5 failed: Mesh position does not match block position');
        return false;
    }
    
    console.log('✅ Test 5 passed: Block mesh created with correct position');
    
    world.dispose();
    
    console.log('🎉 All terrain generation tests passed!');
    return true;
}

// Test the order of operations issue
function testOperationOrder() {
    console.log('Running operation order tests...');
    
    // Test 1: Correct order (terrain first, then scene)
    console.log('Test 1: Correct order (terrain first, then scene)');
    
    const world1 = new World(12345);
    const scene1 = new THREE.Scene();
    
    // Generate terrain first
    world1.generateInitialWorld(1);
    const blocksGenerated = world1.getAllBlocks().length;
    
    // Then set scene
    world1.setScene(scene1);
    const objectsInScene = scene1.objects.length;
    
    if (objectsInScene !== blocksGenerated) {
        console.error(`❌ Test 1 failed: Expected ${blocksGenerated} objects in scene, got ${objectsInScene}`);
        return false;
    }
    
    console.log(`✅ Test 1 passed: Correct order results in ${objectsInScene} objects in scene`);
    
    // Test 2: Wrong order (scene first, then terrain) - should still work now
    console.log('Test 2: Scene set before terrain generation');
    
    const world2 = new World(12345);
    const scene2 = new THREE.Scene();
    
    // Set scene first (no blocks yet)
    world2.setScene(scene2);
    const initialObjects = scene2.objects.length;
    
    // Then generate terrain
    world2.generateInitialWorld(1);
    const finalObjects = scene2.objects.length;
    
    // Objects should still be 0 because setScene was called before terrain generation
    if (finalObjects !== 0) {
        console.error(`❌ Test 2 failed: Expected 0 objects when scene set before terrain, got ${finalObjects}`);
        return false;
    }
    
    console.log(`✅ Test 2 passed: Scene set before terrain results in ${finalObjects} objects (as expected)`);
    
    // Test 3: Manual re-sync after wrong order
    console.log('Test 3: Manual re-sync after wrong order');
    
    // Call setScene again to add the generated blocks
    world2.setScene(scene2);
    const resynced = scene2.objects.length;
    const expectedBlocks = world2.getAllBlocks().length;
    
    if (resynced !== expectedBlocks) {
        console.error(`❌ Test 3 failed: Expected ${expectedBlocks} objects after re-sync, got ${resynced}`);
        return false;
    }
    
    console.log(`✅ Test 3 passed: Manual re-sync results in ${resynced} objects in scene`);
    
    world1.dispose();
    world2.dispose();
    
    console.log('🎉 All operation order tests passed!');
    return true;
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
    // Node.js environment - load the required classes
    try {
        // Load the game classes (simplified versions for testing)
        eval(`
            ${require('fs').readFileSync('game.js', 'utf8')}
        `);
        
        const success1 = testTerrainGeneration();
        const success2 = testOperationOrder();
        
        if (success1 && success2) {
            console.log('🎉 All terrain tests completed successfully!');
            process.exit(0);
        } else {
            console.error('❌ Some terrain tests failed!');
            process.exit(1);
        }
    } catch (error) {
        console.error('Error running terrain tests:', error);
        process.exit(1);
    }
} else {
    // Browser environment - tests can be run manually
    console.log('Terrain tests loaded. Call testTerrainGeneration() and testOperationOrder() to run tests.');
}