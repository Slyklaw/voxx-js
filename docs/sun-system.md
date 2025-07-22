# Sun System Documentation

The Sun System provides a day/night cycle with dynamic lighting and shadows for the voxx-js voxel engine.

## Features

### Day/Night Cycle
- **Day Duration**: 60 seconds (dusk to dawn)
- **Night Duration**: 60 seconds (no sun)
- **Total Cycle**: 120 seconds (2 minutes)
- **Automatic Progression**: Seamlessly transitions between day and night

### Dynamic Lighting
- **Sun Movement**: Follows realistic arc from east to west during day
- **Light Intensity**: Varies based on sun position (brightest at noon)
- **Light Color**: Changes throughout the day:
  - Dawn/Dusk: Orange (#ffa500)
  - Morning/Evening: Warm white (#ffddaa)
  - Midday: Pure white (#ffffff)
  - Night: Cool blue (#4444ff)

### Dynamic Sky Brightness
- **Day Sky**: Bright sky blue (#87ceeb) at midday
- **Night Sky**: Very dark blue/black (#0a0a1a) for full darkness
- **Twilight**: Purple-ish twilight color (#4a4a6a) during dawn/dusk
- **Smooth Transitions**: Gradual color interpolation between phases
- **Realistic Progression**: Sky brightness follows sun position

### Ambient Lighting
- **Day**: Gradually increases with sun height
- **Night**: Reduced to 40% of original intensity (0.4 vs 0.7)
- **Smooth Transitions**: No abrupt lighting changes

### Shadow System
- **Real-time Shadows**: Blocks cast shadows on other blocks
- **Shadow Quality**: PCF Soft Shadows for smooth edges
- **Shadow Map Size**: 2048x2048 for high quality
- **Shadow Distance**: 200 units coverage area
- **Automatic Updates**: New voxel modifications include shadow support

## Usage

### Basic Integration
```javascript
import { SunSystem } from './sunSystem.js';

// Initialize with existing lights
const sunSystem = new SunSystem(scene, renderer, ambientLight, directionalLight);

// Update in animation loop
function animate() {
  const delta = clock.getDelta();
  sunSystem.update(delta);
  // ... rest of animation loop
}
```

### Manual Controls
```javascript
// Skip to specific times
sunSystem.skipTo(true);  // Skip to day (noon)
sunSystem.skipTo(false); // Skip to night (midnight)

// Set specific time (0-120 seconds)
sunSystem.setTime(30); // 30 seconds into cycle

// Get current time information
const timeInfo = sunSystem.getTimeInfo();
console.log(`Day: ${timeInfo.isDay}, Progress: ${timeInfo.dayProgress}`);
```

### Keyboard Controls (in game)
- **1 Key**: Skip to day
- **2 Key**: Skip to night

## Technical Details

### Shadow Configuration
- **Shadow Map Type**: PCFSoftShadowMap
- **Shadow Camera**: Orthographic with 200 unit coverage
- **Shadow Bias**: -0.0001 to prevent shadow acne
- **Mesh Support**: Automatically enabled on all chunk meshes

### Performance Considerations
- **Efficient Updates**: Only updates lighting when time changes
- **Optimized Shadows**: Reasonable shadow map size for performance
- **Minimal Overhead**: Lightweight time tracking system
- **Throttled UI Updates**: UI refreshes every 100ms to balance responsiveness and performance

### Integration with Existing Systems
- **Chunk Meshes**: Automatically configured for shadows
- **Voxel Modifications**: New meshes include shadow support
- **Three.js Compatibility**: Works with existing renderer and scene

## Time Information

The `getTimeInfo()` method returns:
```javascript
{
  isDay: boolean,           // True during day, false during night
  currentTime: number,      // Current time in cycle (0-120 seconds)
  totalCycleDuration: number, // Total cycle duration (120 seconds)
  dayProgress: number,      // Progress through day (0-1, 0 during night)
  nightProgress: number,    // Progress through night (0-1, 0 during day)
  sunIntensity: number,     // Current sun light intensity
  ambientIntensity: number, // Current ambient light intensity
  skyBrightness: number     // Current sky brightness (0-1, 0 = dark, 1 = bright)
}
```

## Visual Feedback

The UI displays (updated in real-time):
- Current time phase (Day/Night with percentage)
- Sun intensity percentage
- Ambient light intensity percentage
- Sky brightness percentage

## Testing

Comprehensive test suite covers:
- Day/night cycle transitions
- Light intensity and color changes
- Sky brightness variations
- Manual time controls
- Shadow configuration
- Time information accuracy

Run tests with: `npm run test:run -- sunSystem`