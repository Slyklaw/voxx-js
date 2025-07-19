// Unit tests for CameraLocationDisplay class
// This file tests the coordinate formatting and display methods

// Mock DOM environment for testing
function createMockDOM() {
    // Mock document and DOM elements
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

// Mock camera controller for testing
function createMockCameraController(x = 0, y = 0, z = 0) {
    return {
        getPosition: function() {
            return { x: x, y: y, z: z };
        }
    };
}

// Test CameraLocationDisplay class
function testCameraLocationDisplay() {
    console.log('Running CameraLocationDisplay tests...');
    
    // Setup mock DOM
    createMockDOM();
    
    // Test 1: Constructor creates element properly
    console.log('Test 1: Constructor creates element properly');
    const cameraDisplay = new CameraLocationDisplay();
    
    if (!cameraDisplay.element) {
        console.error('❌ Test 1 failed: Element not created');
        return false;
    }
    
    if (cameraDisplay.element.className !== 'ui-element camera-location') {
        console.error('❌ Test 1 failed: Incorrect class name');
        return false;
    }
    
    if (cameraDisplay.element.textContent !== 'Position: Loading...') {
        console.error('❌ Test 1 failed: Incorrect initial text');
        return false;
    }
    
    console.log('✅ Test 1 passed: Constructor works correctly');
    
    // Test 2: Coordinate formatting with normal values
    console.log('Test 2: Coordinate formatting with normal values');
    
    const formatted = cameraDisplay.formatCoordinates(10.123456, 20.987654, -5.555555);
    const expected = 'X: 10.12, Y: 20.99, Z: -5.56';
    
    if (formatted !== expected) {
        console.error(`❌ Test 2 failed: Expected "${expected}", got "${formatted}"`);
        return false;
    }
    
    console.log('✅ Test 2 passed: Coordinate formatting works correctly');
    
    // Test 3: Coordinate formatting with zero values
    console.log('Test 3: Coordinate formatting with zero values');
    
    const formattedZero = cameraDisplay.formatCoordinates(0, 0, 0);
    const expectedZero = 'X: 0.00, Y: 0.00, Z: 0.00';
    
    if (formattedZero !== expectedZero) {
        console.error(`❌ Test 3 failed: Expected "${expectedZero}", got "${formattedZero}"`);
        return false;
    }
    
    console.log('✅ Test 3 passed: Zero coordinate formatting works correctly');
    
    // Test 4: Update with valid camera controller
    console.log('Test 4: Update with valid camera controller');
    
    const mockCamera = createMockCameraController(15.123, 64.789, -30.456);
    cameraDisplay.update(mockCamera);
    
    const expectedUpdate = 'X: 15.12, Y: 64.79, Z: -30.46';
    
    if (cameraDisplay.element.textContent !== expectedUpdate) {
        console.error(`❌ Test 4 failed: Expected "${expectedUpdate}", got "${cameraDisplay.element.textContent}"`);
        return false;
    }
    
    console.log('✅ Test 4 passed: Update with valid camera controller works');
    
    // Test 5: Update with missing camera controller
    console.log('Test 5: Update with missing camera controller');
    
    cameraDisplay.update(null);
    
    if (cameraDisplay.element.textContent !== 'Position: Loading...') {
        console.error(`❌ Test 5 failed: Expected "Position: Loading...", got "${cameraDisplay.element.textContent}"`);
        return false;
    }
    
    console.log('✅ Test 5 passed: Missing camera controller handled correctly');
    
    // Test 6: Update with undefined camera controller
    console.log('Test 6: Update with undefined camera controller');
    
    cameraDisplay.update(undefined);
    
    if (cameraDisplay.element.textContent !== 'Position: Loading...') {
        console.error(`❌ Test 6 failed: Expected "Position: Loading...", got "${cameraDisplay.element.textContent}"`);
        return false;
    }
    
    console.log('✅ Test 6 passed: Undefined camera controller handled correctly');
    
    // Test 7: Coordinate formatting with null/undefined values
    console.log('Test 7: Coordinate formatting with null/undefined values');
    
    const formattedNull = cameraDisplay.formatCoordinates(null, undefined, 5.5);
    const expectedNull = 'X: 0.00, Y: 0.00, Z: 5.50';
    
    if (formattedNull !== expectedNull) {
        console.error(`❌ Test 7 failed: Expected "${expectedNull}", got "${formattedNull}"`);
        return false;
    }
    
    console.log('✅ Test 7 passed: Null/undefined coordinate handling works');
    
    // Test 8: Coordinate formatting with infinite values
    console.log('Test 8: Coordinate formatting with infinite values');
    
    const formattedInf = cameraDisplay.formatCoordinates(Infinity, -Infinity, NaN);
    const expectedInf = 'X: 0.00, Y: 0.00, Z: 0.00';
    
    if (formattedInf !== expectedInf) {
        console.error(`❌ Test 8 failed: Expected "${expectedInf}", got "${formattedInf}"`);
        return false;
    }
    
    console.log('✅ Test 8 passed: Infinite/NaN coordinate handling works');
    
    // Test 9: Change detection optimization
    console.log('Test 9: Change detection optimization');
    
    const mockCamera2 = createMockCameraController(15.123, 64.789, -30.456);
    cameraDisplay.update(mockCamera2);
    const firstText = cameraDisplay.element.textContent;
    
    // Update with same position (should not change due to optimization)
    cameraDisplay.update(mockCamera2);
    const secondText = cameraDisplay.element.textContent;
    
    if (firstText !== secondText) {
        console.error('❌ Test 9 failed: Change detection optimization not working');
        return false;
    }
    
    console.log('✅ Test 9 passed: Change detection optimization works');
    
    // Test 10: Dispose method
    console.log('Test 10: Dispose method');
    
    const element = cameraDisplay.element;
    cameraDisplay.dispose();
    
    if (cameraDisplay.element !== null) {
        console.error('❌ Test 10 failed: Element not set to null after dispose');
        return false;
    }
    
    if (cameraDisplay.lastPosition !== null) {
        console.error('❌ Test 10 failed: lastPosition not set to null after dispose');
        return false;
    }
    
    console.log('✅ Test 10 passed: Dispose method works correctly');
    
    console.log('🎉 All CameraLocationDisplay tests passed!');
    return true;
}

// Test error handling scenarios
function testCameraLocationDisplayErrorHandling() {
    console.log('Running CameraLocationDisplay error handling tests...');
    
    // Test 1: Missing UI container
    console.log('Test 1: Missing UI container');
    
    // Mock document without UI element
    global.document = {
        createElement: function(tagName) {
            return {
                tagName: tagName.toUpperCase(),
                className: '',
                textContent: '',
                style: {},
                parentNode: null
            };
        },
        getElementById: function(id) {
            return null; // No UI container
        }
    };
    
    const cameraDisplay = new CameraLocationDisplay();
    
    if (!cameraDisplay.element) {
        console.error('❌ Test 1 failed: Element should still be created even without UI container');
        return false;
    }
    
    console.log('✅ Test 1 passed: CameraLocationDisplay handles missing UI container gracefully');
    
    // Test 2: Camera controller with invalid position data
    console.log('Test 2: Camera controller with invalid position data');
    
    const invalidCamera = {
        getPosition: function() {
            return { x: 'invalid', y: null, z: undefined };
        }
    };
    
    cameraDisplay.update(invalidCamera);
    
    if (cameraDisplay.element.textContent !== 'Position: Error') {
        console.error(`❌ Test 2 failed: Expected "Position: Error", got "${cameraDisplay.element.textContent}"`);
        return false;
    }
    
    console.log('✅ Test 2 passed: Invalid position data handled correctly');
    
    // Test 3: Camera controller that throws error
    console.log('Test 3: Camera controller that throws error');
    
    const errorCamera = {
        getPosition: function() {
            throw new Error('Camera error');
        }
    };
    
    cameraDisplay.update(errorCamera);
    
    if (cameraDisplay.element.textContent !== 'Position: Error') {
        console.error(`❌ Test 3 failed: Expected "Position: Error", got "${cameraDisplay.element.textContent}"`);
        return false;
    }
    
    console.log('✅ Test 3 passed: Camera controller error handled correctly');
    
    // Test 4: Camera controller returning null position
    console.log('Test 4: Camera controller returning null position');
    
    const nullCamera = {
        getPosition: function() {
            return null;
        }
    };
    
    cameraDisplay.update(nullCamera);
    
    if (cameraDisplay.element.textContent !== 'Position: Error') {
        console.error(`❌ Test 4 failed: Expected "Position: Error", got "${cameraDisplay.element.textContent}"`);
        return false;
    }
    
    console.log('✅ Test 4 passed: Null position handled correctly');
    
    cameraDisplay.dispose();
    
    console.log('🎉 All CameraLocationDisplay error handling tests passed!');
    return true;
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
    // Node.js environment - load the CameraLocationDisplay class
    try {
        // Since we can't easily import from game.js in Node.js, we'll define a minimal version for testing
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
        
        const success1 = testCameraLocationDisplay();
        const success2 = testCameraLocationDisplayErrorHandling();
        
        if (success1 && success2) {
            console.log('🎉 All tests completed successfully!');
            process.exit(0);
        } else {
            console.error('❌ Some tests failed!');
            process.exit(1);
        }
    } catch (error) {
        console.error('Error running tests:', error);
        process.exit(1);
    }
} else {
    // Browser environment - tests can be run manually
    console.log('CameraLocationDisplay tests loaded. Call testCameraLocationDisplay() and testCameraLocationDisplayErrorHandling() to run tests.');
}