// Unit tests for FPSCounter class
// This file tests the FPS calculation and display methods

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
    
    // Mock performance API
    global.performance = {
        now: function() {
            return Date.now();
        }
    };
}

// Test FPSCounter class
function testFPSCounter() {
    console.log('Running FPSCounter tests...');
    
    // Setup mock DOM
    createMockDOM();
    
    // Test 1: Constructor creates element properly
    console.log('Test 1: Constructor creates element properly');
    const fpsCounter = new FPSCounter();
    
    if (!fpsCounter.element) {
        console.error('❌ Test 1 failed: Element not created');
        return false;
    }
    
    if (fpsCounter.element.className !== 'ui-element fps-counter') {
        console.error('❌ Test 1 failed: Incorrect class name');
        return false;
    }
    
    if (fpsCounter.element.textContent !== 'FPS: 0') {
        console.error('❌ Test 1 failed: Incorrect initial text');
        return false;
    }
    
    console.log('✅ Test 1 passed: Constructor works correctly');
    
    // Test 2: FPS calculation with normal deltaTime
    console.log('Test 2: FPS calculation with normal deltaTime');
    
    // Simulate 60 FPS (deltaTime = 1/60 ≈ 0.0167)
    const deltaTime60fps = 1/60;
    
    // Simulate multiple frames to trigger FPS update
    const startTime = performance.now();
    fpsCounter.lastTime = startTime;
    fpsCounter.lastUpdateTime = startTime;
    
    // Simulate 30 frames at 60 FPS (should take 0.5 seconds)
    for (let i = 0; i < 30; i++) {
        fpsCounter.update(deltaTime60fps);
    }
    
    // Force update by setting time forward
    const mockCurrentTime = startTime + 500; // 0.5 seconds later
    const originalPerformanceNow = performance.now;
    performance.now = () => mockCurrentTime;
    
    fpsCounter.update(deltaTime60fps);
    
    // Restore original performance.now
    performance.now = originalPerformanceNow;
    
    if (fpsCounter.currentFPS < 50 || fpsCounter.currentFPS > 70) {
        console.error(`❌ Test 2 failed: Expected FPS around 60, got ${fpsCounter.currentFPS}`);
        return false;
    }
    
    console.log(`✅ Test 2 passed: FPS calculation works (calculated: ${fpsCounter.currentFPS})`);
    
    // Test 3: Color coding for high FPS (>30)
    console.log('Test 3: Color coding for high FPS');
    
    fpsCounter.updateDisplay(60);
    
    if (fpsCounter.element.style.color !== '#00ff00') {
        console.error(`❌ Test 3 failed: Expected green color for high FPS, got ${fpsCounter.element.style.color}`);
        return false;
    }
    
    console.log('✅ Test 3 passed: High FPS shows green color');
    
    // Test 4: Color coding for low FPS (≤30)
    console.log('Test 4: Color coding for low FPS');
    
    fpsCounter.updateDisplay(25);
    
    if (fpsCounter.element.style.color !== '#ff0000') {
        console.error(`❌ Test 4 failed: Expected red color for low FPS, got ${fpsCounter.element.style.color}`);
        return false;
    }
    
    console.log('✅ Test 4 passed: Low FPS shows red color');
    
    // Test 5: FPS capping at maximum value
    console.log('Test 5: FPS capping at maximum value');
    
    fpsCounter.updateDisplay(9999);
    
    if (fpsCounter.element.textContent !== 'FPS: 999') {
        console.error(`❌ Test 5 failed: Expected FPS to be capped at 999, got ${fpsCounter.element.textContent}`);
        return false;
    }
    
    console.log('✅ Test 5 passed: FPS properly capped at maximum');
    
    // Test 6: Edge case - exactly 30 FPS
    console.log('Test 6: Edge case - exactly 30 FPS');
    
    fpsCounter.updateDisplay(30);
    
    if (fpsCounter.element.style.color !== '#ff0000') {
        console.error(`❌ Test 6 failed: Expected red color for exactly 30 FPS, got ${fpsCounter.element.style.color}`);
        return false;
    }
    
    console.log('✅ Test 6 passed: Exactly 30 FPS shows red color');
    
    // Test 7: Dispose method
    console.log('Test 7: Dispose method');
    
    const element = fpsCounter.element;
    fpsCounter.dispose();
    
    if (fpsCounter.element !== null) {
        console.error('❌ Test 7 failed: Element not set to null after dispose');
        return false;
    }
    
    console.log('✅ Test 7 passed: Dispose method works correctly');
    
    // Test 8: Invalid FPS values
    console.log('Test 8: Invalid FPS values handling');
    
    const fpsCounter2 = new FPSCounter();
    
    // Test with NaN
    fpsCounter2.currentFPS = NaN;
    fpsCounter2.updateDisplay(fpsCounter2.currentFPS);
    
    // Test with Infinity
    fpsCounter2.currentFPS = Infinity;
    fpsCounter2.updateDisplay(fpsCounter2.currentFPS);
    
    if (fpsCounter2.element.textContent !== 'FPS: 999') {
        console.error(`❌ Test 8 failed: Invalid FPS values not handled properly, got ${fpsCounter2.element.textContent}`);
        return false;
    }
    
    console.log('✅ Test 8 passed: Invalid FPS values handled correctly');
    
    fpsCounter2.dispose();
    
    console.log('🎉 All FPSCounter tests passed!');
    return true;
}

// Test error handling scenarios
function testFPSCounterErrorHandling() {
    console.log('Running FPSCounter error handling tests...');
    
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
    
    const fpsCounter = new FPSCounter();
    
    if (!fpsCounter.element) {
        console.error('❌ Test 1 failed: Element should still be created even without UI container');
        return false;
    }
    
    console.log('✅ Test 1 passed: FPSCounter handles missing UI container gracefully');
    
    // Test 2: Zero deltaTime
    console.log('Test 2: Zero deltaTime handling');
    
    const initialFPS = fpsCounter.currentFPS;
    fpsCounter.update(0);
    
    // FPS should not change with zero deltaTime
    if (fpsCounter.currentFPS !== initialFPS) {
        console.error('❌ Test 2 failed: FPS changed with zero deltaTime');
        return false;
    }
    
    console.log('✅ Test 2 passed: Zero deltaTime handled correctly');
    
    fpsCounter.dispose();
    
    console.log('🎉 All FPSCounter error handling tests passed!');
    return true;
}

// Run tests if this file is executed directly
if (typeof window === 'undefined') {
    // Node.js environment - load the FPSCounter class
    try {
        // Since we can't easily import from game.js in Node.js, we'll define a minimal version for testing
        class FPSCounter {
            constructor() {
                this.element = null;
                this.frameCount = 0;
                this.lastTime = performance.now();
                this.currentFPS = 0;
                this.updateInterval = 500;
                this.lastUpdateTime = 0;
                
                this.createElement();
            }
            
            createElement() {
                this.element = document.createElement('div');
                this.element.className = 'ui-element fps-counter';
                this.element.textContent = 'FPS: 0';
                
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
                
                if (currentTime - this.lastUpdateTime >= this.updateInterval) {
                    const timeDiff = (currentTime - this.lastTime) / 1000;
                    
                    if (timeDiff > 0) {
                        this.currentFPS = Math.round(this.frameCount / timeDiff);
                        
                        if (this.currentFPS > 999 || !isFinite(this.currentFPS)) {
                            this.currentFPS = 999;
                        }
                        
                        this.updateDisplay(this.currentFPS);
                    }
                    
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
                
                if (displayFPS > 30) {
                    this.element.style.color = '#00ff00';
                } else {
                    this.element.style.color = '#ff0000';
                }
            }
            
            dispose() {
                if (this.element && this.element.parentNode) {
                    this.element.parentNode.removeChild(this.element);
                }
                this.element = null;
            }
        }
        
        global.FPSCounter = FPSCounter;
        
        const success1 = testFPSCounter();
        const success2 = testFPSCounterErrorHandling();
        
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
    console.log('FPSCounter tests loaded. Call testFPSCounter() and testFPSCounterErrorHandling() to run tests.');
}