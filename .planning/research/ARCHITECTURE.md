# Architecture Research: Beautiful Lighting Integration

**Domain:** WebGL2 Voxel Engine Lighting
**Researched:** 2026-03-19
**Confidence:** HIGH

## Existing Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│  config.js ─────────────────────────────────────────────────│
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ SUN_CYCLE_CONFIG│  │ LIGHTING_CONFIG │  │MESH_CONFIG  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Shader Programs                            │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │ voxel.js     │  │ sky.js        │  │ selection.js     │  │
│  │ (lighting)   │  │ (background)  │  │ (block highlight)│  │
│  └──────────────┘  └──────────────┘  └──────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    Render Pipeline                           │
├─────────────────────────────────────────────────────────────┤
│  render.js ──→ ubo.js ──→ buffers.js ──→ GL Buffers        │
│      ↓              ↓           ↓                            │
│  updateTimeOfDay  CameraUBO   createChunkMeshFromData      │
│                   GlobalUBO                                │
├─────────────────────────────────────────────────────────────┤
│                    Mesh Generation                           │
├─────────────────────────────────────────────────────────────┤
│  greedyMesh.js ──→ chunk.js ──→ chunkManager.js             │
│  (generates vertices from voxel data)                       │
└─────────────────────────────────────────────────────────────┘
```

### Current Component Responsibilities

| Component | Responsibility | Current State |
|-----------|---------------|---------------|
| `config.js` | Constants for lighting, sky colors, mesh format | Static configs only |
| `voxel.js` | Vertex/fragment shaders for blocks | Ambient + diffuse, static |
| `sky.js` | Sky dome rendering | Day/night color blending |
| `render.js` | Main render loop, uniform updates | Calls `updateTimeOfDay()` |
| `ubo.js` | Uniform buffer objects | Stores light direction, time |
| `buffers.js` | VAO/VBO/IBO creation | Fixed 14-float vertex format |
| `greedyMesh.js` | Mesh generation | No AO computation |

## Recommended Architecture

### New Feature Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                    NEW: Lighting Controller                     │
├────────────────────────────────────────────────────────────────┤
│  LightingManager                                                 │
│  ├─ getSunPosition(timeOfDay) → vec3                           │
│  ├─ getSunColor(timeOfDay) → vec3 (dawn/day/dusk/night)        │
│  ├─ getAOForVertex(neighbors) → vec4 (corner AO values)         │
│  └─ updateGlobalLighting(gl) → updates UBO uniforms             │
└────────────────────────────────────────────────────────────────┘
                              ↓
┌────────────────────────────────────────────────────────────────┐
│                    Modified Components                          │
├────────────────────────────────────────────────────────────────┤
│  voxel.js          │ sky.js           │ greedyMesh.js          │
│  ──────────────────┼──────────────────┼────────────────────── │
│  + uSunColor       │ + uDawnColors    │ + AO neighbor checks   │
│  + uSunIntensity   │ + uDuskColors    │ + 4 AO values/vertex   │
│  + uAOStrength     │ + uHorizonHaze   │ + Split quads by AO    │
│  + AO in frag shader│ + smooth phase  │                        │
└────────────────────────────────────────────────────────────────┘
```

## New/Modified Files

### 1. NEW: `src/lighting/lightingManager.js`
**Purpose:** Centralized lighting calculations, replaces scattered uniform logic
**Responsibilities:**
- Compute sun position from `timeOfDay`
- Calculate sun colors for 5 phases (night, dawn, sunrise, day, sunset, dusk)
- Compute AO values from neighbor occupancy
- Expose `updateVoxelUniforms()` and `updateSkyUniforms()`

### 2. MODIFY: `src/shaders/voxel.js`
**Changes:**
```glsl
// NEW uniforms
uniform vec3 uSunColor;        // Color tint from sun position
uniform float uSunIntensity;   // 0.0-1.0 based on sun height
uniform float uAOStrength;     // Global AO intensity multiplier

// NEW vertex attribute (location 6)
in vec4 aAO;                   // AO for each corner: [top-left, top-right, bot-left, bot-right]

// Fragment shader change
vec3 ao = mix(1.0, aAO[corner], uAOStrength);
vec3 sunLight = uSunColor * uSunIntensity * diffuse;
vec3 finalColor = baseColor * (ambient + sunLight) * ao;
```

### 3. MODIFY: `src/shaders/sky.js`
**Changes:**
```glsl
// NEW uniforms for 6-phase sky
uniform vec3 uDawnTopColor;    // Orange/pink
uniform vec3 uDawnBottomColor; // Yellow horizon
uniform vec3 uDuskTopColor;    // Purple/dark orange
uniform vec3 uDuskBottomColor; // Deep orange horizon

// Existing uniforms remain:
// uDayTopColor, uDayBottomColor, uNightTopColor, uNightBottomColor

// Fragment shader uses 5-way mix:
// night ---(dawn)---> day ---(dusk)---> night
// Interpolate between color pairs based on timeOfDay
```

### 4. MODIFY: `greedyMesh.js`
**Changes:**
- Add `calculateVertexAO(x, y, z, faceNormal)` function
- For each quad vertex, compute AO from 3 neighbor checks at corners
- Split quads when AO values vary across vertices (greedy algorithm adaptation)
- Return `ao: Float32Array` with 4 values per quad (12 total per quad face)

### 5. MODIFY: `config.js`
**Changes:**
```javascript
// NEW: Extended sun cycle colors
export const SKY_COLORS = {
  // ... existing ...
  DAWN_TOP: [0.4, 0.3, 0.5],     // Purple
  DAWN_BOTTOM: [1.0, 0.6, 0.3], // Orange
  DUSK_TOP: [0.3, 0.15, 0.4],   // Dark purple
  DUSK_BOTTOM: [0.9, 0.4, 0.2], // Deep orange
  HORIZON_HAZE: [1.0, 0.7, 0.5] // Haze color near horizon
};

// MODIFY: Vertex format expansion
export const MESH_CONFIG = {
  // ... existing ...
  VERTEX_SIZE: 18,    // was 14, adds 4 floats for AO
  STRIDE_BYTES: 72    // was 56
};
```

### 6. MODIFY: `src/gl/buffers.js`
**Changes:**
```javascript
// Add to VERTEX_FORMAT
export const VERTEX_FORMAT = {
  // ... existing offsets ...
  AO_OFFSET: 56,  // New: 4 floats for ambient occlusion
  FLOATS_PER_VERTEX: 18  // was 14
};

// Add new VAO attribute binding
gl.enableVertexAttribArray(6);  // aAO location
gl.vertexAttribPointer(6, 4, gl.FLOAT, false, STRIDE, 56);
```

### 7. MODIFY: `src/gl/render.js`
**Changes:**
```javascript
// Import new lighting manager
import { LightingManager } from '../lighting/lightingManager.js';

let lightingManager = null;

// In initRenderer():
lightingManager = new LightingManager();

// In renderLoop() or per-frame:
function updateLighting(gl, timeOfDay) {
  lightingManager.updateVoxelUniforms(gl, voxelUniforms, timeOfDay);
  lightingManager.updateSkyUniforms(gl, skyUniforms, timeOfDay);
}

// Remove/update direct calls to:
// - gl.uniform3fv(voxelUniforms.uLightDirection, ...)
// - gl.uniform1f(voxelUniforms.uAmbient, ...)
// These move to LightingManager
```

### 8. MODIFY: `src/gl/ubo.js`
**Changes:**
```javascript
// Expand GLOBAL_UBO_SIZE to include sun color
const GLOBAL_UBO_SIZE = 32;  // was 16
// Data: lightDir(3) + timeOfDay(1) + sunColor(3) + sunIntensity(1) + padding(8)

export function updateGlobalUBO(gl, ubo, lightDir, timeOfDay, sunColor, sunIntensity) {
  // ... pack all values into buffer
}
```

## Data Flow

### Lighting Update Flow (Per Frame)

```
timeOfDay (0.0-1.0)
      ↓
LightingManager.getSunPosition()
      ↓
LightingManager.getSunColor()
      ↓
┌─────────────────────────────────────┐
│ updateVoxelUniforms()               │
│ ├─ uLightDirection = sunPos (normal)│
│ ├─ uSunColor = interpolated phase   │
│ ├─ uSunIntensity = sunHeight       │
│ └─ uAOStrength = 0.8 (constant)     │
├─────────────────────────────────────┤
│ updateSkyUniforms()                 │
│ ├─ uDayTopColor = lerp(...)        │
│ ├─ uDawnTopColor = lerp(...)       │
│ ├─ uDuskTopColor = lerp(...)        │
│ └─ uNightTopColor = lerp(...)      │
└─────────────────────────────────────┘
```

### Ambient Occlusion Flow

```
For each quad in greedyMesh:
      ↓
Get face normal direction
      ↓
For each of 4 quad vertices:
  ├─ Check 3 neighbor directions (tangents)
  ├─ Sample occupancy at corner offsets
  └─ Compute AO = sum of occlusion factors
      ↓
If any vertex AO differs from others:
  Split quad into smaller quads (greedy adaptation)
      ↓
Assign AO array to meshData
      ↓
In fragment shader:
  Interpolate AO across face using vertex AO values
```

## Build Order

### Phase 1: Sky Gradients (Lowest Risk)
1. Add dawn/dusk colors to `config.js`
2. Extend `sky.js` uniforms and fragment shader
3. Add phase interpolation to sky shader
4. Test with day/night cycle

### Phase 2: Dynamic Sunlight (Medium Risk)
1. Create `lightingManager.js`
2. Implement sun position/color calculation
3. Add `uSunColor`, `uSunIntensity` to `voxel.js`
4. Modify fragment shader to use sun color
5. Update `render.js` to use LightingManager
6. Test light changes at different times

### Phase 3: Ambient Occlusion (Highest Risk)
1. Update `MESH_CONFIG` (vertex size change = format break)
2. Add AO calculation to `greedyMesh.js`
3. Modify quad splitting for AO variation
4. Add `aAO` attribute to `voxel.js` vertex shader
5. Update `buffers.js` VAO bindings
6. Modify fragment shader for AO application
7. Test AO in complex terrain

## Vertex Format Change Summary

| Offset | Size | Field | Location | New? |
|--------|------|-------|----------|------|
| 0 | 3 | position | 0 | No |
| 12 | 3 | color | 1 | No |
| 24 | 3 | normal | 2 | No |
| 36 | 2 | uv | 3 | No |
| 44 | 2 | tileBase | 4 | No |
| 52 | 1 | triangleVariant | 5 | No |
| 56 | 4 | ao | 6 | **YES** |

## Sources

- Minecraft (Bukkit/Cuberite) AO algorithm reference
- GL-Sky Shaders blog post on time-of-day color interpolation
- Crafting.Net greedy mesh AO implementation
