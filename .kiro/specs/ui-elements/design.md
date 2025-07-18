# Design Document

## Overview

This design outlines the implementation of two essential UI elements for the Minecraft clone: an FPS Counter and a Camera Location display. These elements will be implemented as HTML overlay components that sit on top of the game canvas, providing real-time performance and position information without interfering with the 3D game rendering.

The UI elements will be positioned in the top corners of the screen and will update continuously during the game loop. They will use a clean, readable design with semi-transparent backgrounds to ensure visibility against various game backgrounds.

## Architecture

### Component Structure
```
UIManager
├── FPSCounter
│   ├── HTML Element (top-left)
│   ├── FPS Calculation Logic
│   └── Color-coded Display
└── CameraLocationDisplay
    ├── HTML Element (top-right)
    ├── Position Tracking
    └── Coordinate Formatting
```

### Integration Points
- **Game Loop Integration**: UI updates will be called from the main game loop in `MinecraftClone.update()`
- **Camera Controller Integration**: Position data will be retrieved from `FirstPersonCameraController.getPosition()`
- **HTML Structure**: UI elements will be added to the existing `#ui` div in `index.html`

## Components and Interfaces

### UIManager Class
The main controller class that manages all UI elements.

**Properties:**
- `fpsCounter`: Instance of FPSCounter
- `cameraLocationDisplay`: Instance of CameraLocationDisplay
- `isInitialized`: Boolean flag for initialization state

**Methods:**
- `constructor()`: Initialize UI manager and create UI elements
- `init()`: Set up HTML elements and styling
- `update(deltaTime, cameraController)`: Update all UI elements
- `dispose()`: Clean up resources and remove elements

### FPSCounter Class
Handles FPS calculation and display.

**Properties:**
- `element`: HTML div element for display
- `frameCount`: Counter for frames
- `lastTime`: Timestamp for FPS calculation
- `currentFPS`: Current calculated FPS value

**Methods:**
- `constructor()`: Create and style the FPS counter element
- `update(deltaTime)`: Calculate and update FPS display
- `updateDisplay(fps)`: Update the visual display with color coding
- `dispose()`: Remove element from DOM

### CameraLocationDisplay Class
Handles camera position display.

**Properties:**
- `element`: HTML div element for display
- `lastPosition`: Previous position for change detection

**Methods:**
- `constructor()`: Create and style the location display element
- `update(cameraController)`: Get position and update display
- `formatCoordinates(x, y, z)`: Format coordinates to 2 decimal places
- `dispose()`: Remove element from DOM

## Data Models

### FPS Data Structure
```javascript
{
    currentFPS: number,        // Current frames per second
    frameCount: number,        // Frame counter
    lastUpdateTime: number,    // Last calculation timestamp
    displayColor: string       // Color for display ('green' or 'red')
}
```

### Position Data Structure
```javascript
{
    x: number,    // X coordinate (formatted to 2 decimals)
    y: number,    // Y coordinate (formatted to 2 decimals)
    z: number     // Z coordinate (formatted to 2 decimals)
}
```

## Error Handling

### FPS Counter Error Handling
- **Invalid deltaTime**: If deltaTime is 0 or negative, skip FPS calculation
- **NaN/Infinity FPS**: Cap FPS display at reasonable maximum (e.g., 999)
- **Missing Performance API**: Fallback to Date.now() for timing

### Camera Location Error Handling
- **Missing Camera Controller**: Display "Position: Loading..." message
- **Invalid Position Data**: Display "Position: Error" and log warning
- **Null/Undefined Coordinates**: Default to (0.00, 0.00, 0.00)

### General UI Error Handling
- **DOM Element Creation Failure**: Log error and continue without UI
- **CSS Styling Errors**: Use fallback inline styles
- **Update Loop Errors**: Catch and log errors without breaking game loop

## Testing Strategy

### Unit Testing
- **FPS Calculation**: Test FPS calculation with various deltaTime values
- **Coordinate Formatting**: Test coordinate formatting with edge cases
- **Color Coding**: Test FPS color changes at threshold values
- **Error Handling**: Test all error conditions and fallbacks

### Integration Testing
- **Game Loop Integration**: Verify UI updates don't impact game performance
- **Camera Integration**: Test position updates with camera movement
- **Responsive Design**: Test UI positioning with different window sizes
- **Performance Impact**: Measure UI update overhead

### Visual Testing
- **Positioning**: Verify elements appear in correct screen corners
- **Readability**: Test text visibility against various backgrounds
- **Color Coding**: Verify FPS color changes are visually distinct
- **Responsive Behavior**: Test with window resizing

## Implementation Details

### CSS Styling
```css
.ui-element {
    position: absolute;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    font-family: 'Courier New', monospace;
    font-size: 14px;
    pointer-events: none;
    z-index: 101;
}

.fps-counter {
    top: 10px;
    left: 10px;
}

.camera-location {
    top: 10px;
    right: 10px;
}
```

### Performance Considerations
- **Update Frequency**: FPS counter updates every 0.5 seconds to avoid flickering
- **DOM Manipulation**: Minimize DOM updates by checking for value changes
- **Memory Management**: Proper cleanup of event listeners and references
- **Rendering Impact**: UI updates scheduled after 3D rendering to avoid conflicts

### Browser Compatibility
- **Modern Browsers**: Full support for all features
- **Fallback Support**: Graceful degradation for older browsers
- **Mobile Considerations**: Responsive design for different screen sizes