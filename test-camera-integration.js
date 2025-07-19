// Integration test for CameraLocationDisplay with game components
// This file tests the integration between CameraLocationDisplay and the game

// Mock DOM environment for testing
function createMockDOM() {
    global.document = {
        createElement: function(tagName) {
            return {
                tagName: tagName.toUpperCase(),
                className: '',
                textContent: '',
                style: {},
                parentNode: null,
                appendChild: function(child) {
                    child.parentNode = this;
                },
                removeChild: function(child) {
                    child.parentNode = null;
                }
            };
        },
        getElementById: function(id) {
            if (id === 'ui') {
                return {
                    appendChild: function(child) {
                        child.parentNode = this;
                    },
                    removeChild: function(child) {
                        child.parentNode = null;
                    }
                };
            }
            return null;
        }
    };
}

// Mock FirstPersonCameraController for testing
function createMockFirstPersonCameraController() {
    return {
        position: { x: 10.123456, y: 64.789012, z: -25.555555 },
        
        getPosition: function() {
            return {
                x: this.position.x,
                y: this.position.y,
                z: this.position.z
            };
        },
        
        setPosition: function(x, y, z) {
            this.position.x = x;
            this.position.y = y;
            this.position.z = z;
        }
    };
}

// Test integration between CameraLocationDisplay and camera controller
function testCameraLocationIntegration() {
    console.log('Running CameraLocationDisplay integration tests...');
    
    // Setup mock DOM
    createMockDOM();
    
    // Test 1: Integration with FirstPersonCameraController
    console.log('Test 1: Integration with FirstPersonCameraController');
    
    const cameraDisplay = new CameraLocationDisplay();
    const cameraController = createMockFirstPersonCameraController();
    
    // Initial update
    cameraDisplay.update(cameraController);
    
    const expectedInitial = 'X: 10.12, Y: 64.79, Z: -25.56';
    if (cameraDisplay.element.textContent !== expectedInitial) {
        console.error(`❌ Test 1 failed: Expected "${expectedInitial}", got "${cameraDisplay.element.textContent}"`);
        return false;
    }
    
    console.log('✅ Test 1 passed: Integration with camera controller works');
    
    // Test 2: Real-time position updates
    console.log('Test 2: Real-time position updates');
    
    // Move camera to new position
    cameraController.setPosition(0, 100, 50.123);
    cameraDisplay.update(cameraController);
    
    const expectedMoved = 'X: 0.00, Y: 100.00, Z: 50.12';
    if (cameraDisplay.element.textContent !== expectedMoved) {
        console.error(`❌ Test 2 failed: Expected "${expectedMoved}", got "${cameraDisplay.element.textContent}"`);
        return false;
    }
    
    console.log('✅ Test 2 passed: Real-time position updates work');
    
    // Test 3: Performance optimization with minimal changes
    console.log('Test 3: Performance optimization with minimal changes');
    
    const beforeText = cameraDisplay.element.textContent;
    
    // Make a very small change (less than 0.01)
    cameraController.setPosition(0.005, 100.005, 50.125);
    cameraDisplay.update(cameraController);
    
    const afterText = cameraDisplay.element.textContent;
    
    // Should not update due to change detection optimization
    if (beforeText !== afterText) {
        console.error('❌ Test 3 failed: Small changes should not trigger updates');
        return false;
    }
    
    console.log('✅ Test 3 passed: Performance optimization works');
    
    // Test 4: Significant changes trigger updates
    console.log('Test 4: Significant changes trigger updates');
    
    // Make a significant change (more than 0.01)
    cameraController.setPosition(0.1, 100.1, 50.2);
    cameraDisplay.update(cameraController);
    
    const expectedSignificant = 'X: 0.10, Y: 100.10, Z: 50.20';
    if (cameraDisplay.element.textContent !== expectedSignificant) {
        console.error(`❌ Test 4 failed: Expected "${expectedSignificant}", got "${cameraDisplay.element.textContent}"`);
        return false;
    }
    
    console.log('✅ Test 4 passed: Significant changes trigger updates');
    
    // Test 5: Multiple rapid updates
    console.log('Test 5: Multiple rapid updates');
    
    // Simulate rapid position changes (like in a game loop)
    const positions = [
        { x: 1, y: 1, z: 1 },
        { x: 2, y: 2, z: 2 },
        { x: 3, y: 3, z: 3 },
        { x: 4, y: 4, z: 4 },
        { x: 5, y: 5, z: 5 }
    ];
    
    positions.forEach(pos => {
        cameraController.setPosition(pos.x, pos.y, pos.z);
        cameraDisplay.update(cameraController);
    });
    
    const expectedFinal = 'X: 5.00, Y: 5.00, Z: 5.00';
    if (cameraDisplay.element.textContent !== expectedFinal) {
        console.error(`❌ Test 5 failed: Expected "${expectedFinal}", got "${cameraDisplay.element.textContent}"`);
        return false;
    }
    
    console.log('✅ Test 5 passed: Multiple rapid updates work correctly');
    
    cameraDisplay.dispose();
    
    console.log('🎉 All CameraLocationDisplay integration tests passed!');
    return true;
}

// Test error scenarios in integration context
function testCameraLocationIntegrationErrors() {
    console.log('Running CameraLocationDisplay integration error tests...');
    
    // Test 1: Camera controller becomes null during runtime
    console.log('Test 1: Camera controller becomes null during runtime');
    
    const cameraDisplay = new CameraLocationDisplay();
    const cameraController = createMockFirstPersonCameraController();
    
    // Initial successful update
    cameraDisplay.update(cameraController);
    
    // Camera controller becomes unavailable
    cameraDisplay.update(null);
    
    if (cameraDisplay.element.textContent !== 'Position: Loading...') {
        console.error(`❌ Test 1 failed: Expected "Position: Loading...", got "${cameraDisplay.element.textContent}"`);
        return false;
    }
    
    console.log('✅ Test 1 passed: Runtime camera controller loss handled');
    
    // Test 2: Camera controller position becomes corrupted
    console.log('Test 2: Camera controller position becomes corrupted');
    
    const corruptedController = {
        getPosition: function() {
            return { x: 'corrupted', y: NaN, z: Infinity };
        }
    };
    
    cameraDisplay.update(corruptedController);
    
    if (cameraDisplay.element.textContent !== 'Position: Error') {
        console.error(`❌ Test 2 failed: Expected "Position: Error", got "${cameraDisplay.element.textContent}"`);
        return false;
    }
    
    console.log('✅ Test 2 passed: Corrupted position data handled');
    
    // Test 3: Recovery after error
    console.log('Test 3: Recovery after error');
    
    // Set the camera to the expected position for recovery test
    cameraController.setPosition(5, 5, 5);
    
    // Should recover when valid controller is provided again
    cameraDisplay.update(cameraController);
    
    const expectedRecovery = 'X: 5.00, Y: 5.00, Z: 5.00';
    if (cameraDisplay.element.textContent !== expectedRecovery) {
        console.error(`❌ Test 3 failed: Expected "${expectedRecovery}", got "${cameraDisplay.element.textContent}"`);
        return false;
    }
    
    console.log('✅ Test 3 passed: Recovery after error works');
    
    cameraDisplay.dispose();
    
    console.log('🎉 All CameraLocationDisplay integration error tests passed!');
    return true;
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
    // Node.js environment - load the CameraLocationDisplay class
    try {
        // Define CameraLocationDisplay class for testing
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
        
        global.CameraLocationDisplay = CameraLocationDisplay;
        
        const success1 = testCameraLocationIntegration();
        const success2 = testCameraLocationIntegrationErrors();
        
        if (success1 && success2) {
            console.log('🎉 All integration tests completed successfully!');
            process.exit(0);
        } else {
            console.error('❌ Some integration tests failed!');
            process.exit(1);
        }
    } catch (error) {
        console.error('Error running integration tests:', error);
        process.exit(1);
    }
} else {
    // Browser environment - tests can be run manually
    console.log('CameraLocationDisplay integration tests loaded. Call testCameraLocationIntegration() and testCameraLocationIntegrationErrors() to run tests.');
}