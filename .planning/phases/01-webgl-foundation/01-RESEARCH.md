# Phase 1: WebGL Foundation - Research

**Researched:** 2026-03-27
**Domain:** WebGL memory management and context loss handling
**Confidence:** HIGH

## Summary

This phase addresses memory leaks and context loss handling for stable long-term rendering in a vanilla WebGL2 voxel renderer. The codebase already has foundational infrastructure (context loss handlers in `context.js`, BufferPool in `buffers.js`, dispose methods in `fbo.js` and `chunkManager.js`), but resources are not properly registered for lifecycle management. The key work involves completing the resource tracking system, ensuring all WebGL objects are disposed when no longer needed, and implementing complete context loss/recovery workflows.

**Primary recommendation:** Complete the resource registry by registering all WebGL resources (textures, shaders, programs, buffers, FBOs, VAOs) with the context module, implement a centralized resource manager, and ensure all disposal methods are called on context loss.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Context loss behavior:** Auto-recovery when WebGL context is lost, brief on-screen notification (e.g., "Reconnecting..." overlay), no user action required, resources recreated automatically after context restore event
- **Memory verification:** Manual testing approach - developer monitors browser's memory panel during extended sessions, no automated memory tracking in production, success criteria: 30+ minutes without memory growth
- **Performance handling:** No automatic quality adjustment, log warning to console if fps drops below 50, let user manually adjust quality in Phase 4, focus on fixing root causes
- **Testing scope:** 30-minute stability target sufficient, no need for longer stress tests in v1, focus on leak-free operation

### Claude's Discretion
- Standard approaches acceptable (no specific references requested)

### Deferred Ideas (OUT OF SCOPE)
- None - discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| GL-01 | User experiences no memory leaks during extended gameplay sessions | Resource disposal patterns, buffer pool management, chunk mesh cleanup |
| GL-02 | WebGL context loss is detected and handled automatically without page reload | Context loss event handling, resource recreation workflow, state restoration |
| GL-03 | Rendering pipeline maintains 60fps with default settings on mid-range hardware | Performance monitoring, frame timing verification |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| WebGL2 | Native | GPU rendering API | Browser standard, no library needed |
| Vitest | ^1.6.0 | Test framework | Already in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Browser DevTools | N/A | Memory profiling | Manual memory verification per user constraint |
| requestAnimationFrame | Native | Frame timing | Performance monitoring |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom resource manager | Three.js/PixiJS | Would require major rewrite; current vanilla approach is correct |
| Automated memory tracking | memwatch/npm packages | User explicitly chose manual verification |
| Automatic quality scaling | Dynamic resolution | Out of scope per user constraint |

**Installation:**
```bash
# No new dependencies needed - vanilla WebGL2
npm install vitest@^1.6.0 --save-dev  # Already in package.json
```

## Architecture Patterns

### Recommended Project Structure
```
src/gl/
├── context.js          # Context lifecycle management (EXISTS, needs enhancement)
├── buffers.js          # Buffer pool and WebGL buffers (EXISTS)
├── fbo.js              # Framebuffer management (EXISTS)
├── shaders.js          # Shader compilation (EXISTS)
├── render.js           # Main renderer (EXISTS)
├── resourceManager.js  # NEW - Centralized resource tracking
└── performance.js      # FPS monitoring (EXISTS)
```

### Pattern 1: Resource Registry with Lifecycle Callbacks
**What:** Register all WebGL resources with centralized registry that provides `dispose()` and `init()` callbacks for context loss/recovery
**When to use:** Required for GL-02 (context loss handling)
**Example:**
```javascript
// Current context.js has this structure - needs completion
function registerContextResources({ dispose, init }) {
  resourceRegistry.push({ dispose, init });
}

// Resources that need registration:
function createTexture(gl, source) {
  const texture = gl.createTexture();
  // ... configuration ...
  
  registerContextResources({
    dispose: () => gl.deleteTexture(texture),
    init: () => { /* recreate from source */ }
  });
  
  return texture;
}
```

### Pattern 2: Buffer Pooling
**What:** Reuse WebGL buffer objects to reduce allocation overhead
**When to use:** Required for GL-01 (memory leak prevention)
**Example:**
```javascript
// Already implemented in buffers.js - BufferPool class
// Key: Release buffers back to pool, delete excess when pool is full
releaseVBO(vbo) {
  if (this.availableVBOs.length < this.maxSize) {
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, vbo);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(0), this.gl.STATIC_DRAW);
    this.availableVBOs.push(vbo);
  } else {
    this.gl.deleteBuffer(vbo);  // Prevent unbounded growth
  }
}
```

### Pattern 3: Context Loss State Machine
**What:** Track context state and handle transitions
**When to use:** Required for GL-02 (automatic context recovery)
**Example:**
```javascript
// context.js enhancement needed
let contextState = 'active'; // 'active' | 'lost' | 'restoring'

canvas.addEventListener('webglcontextlost', (event) => {
  event.preventDefault();  // Prevent default browser handling
  contextState = 'lost';
  
  // Dispose all GPU resources immediately
  resourceRegistry.forEach(({ dispose }) => dispose());
  
  // Notify UI
  showContextLostNotification();
});

canvas.addEventListener('webglcontextrestored', () => {
  contextState = 'restoring';
  
  // Recreate all GPU resources
  resourceRegistry.forEach(({ init }) => init());
  
  contextState = 'active';
  hideContextLostNotification();
});

// Check state before rendering
function render() {
  if (contextState === 'lost') return;  // Don't render
  // ... render ...
}
```

### Anti-Patterns to Avoid
- **Not deleting WebGL objects:** Simply dereferencing JavaScript objects does NOT free GPU memory. Must call `gl.deleteBuffer()`, `gl.deleteTexture()`, etc.
- **Leaking event listeners:** Context loss listeners accumulate. Use weak references or clean up on dispose.
- **Creating new buffers per frame:** Use buffer pool (already implemented) to avoid allocation churn.
- **Not handling context loss in render loop:** Check `isContextLost()` before each frame.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| WebGL context acquisition | Custom context creation | `canvas.getContext('webgl2')` | Standard API sufficient |
| Buffer creation | Per-chunk allocation | BufferPool class | Reduces allocation overhead |
| Frame timing | Custom implementation | `requestAnimationFrame` + delta time | Browser-optimized |
| Context loss detection | Polling approach | Native `webglcontextlost` event | Efficient, browser-managed |

**Key insight:** The WebGL2 API already provides context loss events. The implementation should use these native events rather than polling or custom solutions.

## Common Pitfalls

### Pitfall 1: Orphaned WebGL Resources
**What goes wrong:** Memory grows indefinitely during extended play sessions
**Why it happens:** Resources created but not deleted when chunks unload or are replaced
**How to avoid:** 
- Ensure `dispose()` called on chunk mesh when chunk is removed
- Use buffer pool with size limits
- Track all texture/shader/program resources in registry
**Warning signs:** Browser memory continuously growing, GPU memory not released

### Pitfall 2: Context Loss Not Handled in Render Loop
**What goes wrong:** App crashes or freezes when context lost during render
**Why it happens:** No check for context state before WebGL calls
**How to avoid:**
```javascript
function renderFrame() {
  if (gl.isContextLost()) {
    console.warn('Context lost, waiting for restore...');
    return;  // Exit early
  }
  // ... normal render ...
}
```
**Warning signs:** Console errors about WebGL calls on lost context

### Pitfall 3: Incomplete Resource Recreation
**What goes wrong:** App partially works after context restore, missing textures/shaders
**Why it happens:** Not all resources registered for recreation, or init functions don't have required data
**How to avoid:**
- Store source data needed for recreation (image URLs, shader sources, mesh data)
- Test context restore by manually triggering in browser dev tools
**Warning signs:** Black textures, missing rendering after context restore

### Pitfall 4: Buffer Pool Unbounded Growth
**What goes wrong:** Pool accumulates more buffers than released, memory leak
**Why it happens:** Pool size limit not enforced, always adding new buffers
**How to avoid:**
```javascript
// Already in buffers.js - ensure maxSize is respected
if (this.availableVBOs.length < this.maxSize) {
  this.availableVBOs.push(vbo);
} else {
  this.gl.deleteBuffer(vbo);  // Delete excess
}
```
**Warning signs:** Buffer pool count hitting maxSize repeatedly

## Code Examples

### Complete Resource Registration Pattern
```javascript
// src/gl/resourceManager.js - NEW
const resources = [];

export function registerResource({ id, dispose, init, getState }) {
  resources.push({ id, dispose, init, getState });
}

export function disposeAllResources(gl) {
  resources.forEach(r => {
    if (r.dispose) r.dispose();
  });
}

export function restoreAllResources(gl) {
  resources.forEach(r => {
    if (r.init) r.init();
  });
}
```

### Context Loss Handler Enhancement
```javascript
// src/gl/context.js - enhancement needed
let isRecovering = false;

function handleContextLost(event) {
  event.preventDefault();
  contextLost = true;
  isRecovering = true;
  
  // Clear WebGL resources
  disposeAllResources(gl);
  
  // Notify listeners
  contextLossListeners.forEach(callback => callback({ type: 'lost' }));
}

function handleContextRestored() {
  isRecovering = true;
  
  // Recreate all resources
  restoreAllResources(gl);
  
  contextLost = false;
  isRecovering = false;
  
  // Notify listeners
  contextLossListeners.forEach(callback => callback({ type: 'restored' }));
}
```

### Performance Warning Implementation (for GL-03)
```javascript
// Already partially in performance.js - ensure FPS warning
export function checkFPSWarning() {
  const fps = getFPS();
  if (fps < 50 && fps > 0) {
    console.warn(`Low FPS detected: ${fps.toFixed(1)} fps - consider reducing quality settings`);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual resource tracking | Centralized registry | Industry standard since ~2015 | Simplifies context loss handling |
| Polling for context loss | Native events | WebGL spec | More efficient, reliable |
| Per-frame buffer allocation | Buffer pooling | Standard practice | Reduces GC pressure |
| No resource disposal | Explicit dispose() | Required for long-running apps | Prevents memory leaks |

**Deprecated/outdated:**
- `gl.getExtension('OES_vertex_array_object')` — WebGL2 has VAOs built-in
- Manual memory management via `delete*` — Resource management via registry is cleaner
- Polling `gl.isContextLost()` — Event-driven is preferred

## Open Questions

1. **Texture atlas recreation after context loss**
   - What we know: `loadTextureAtlas()` creates texture from image URL
   - What's unclear: Whether image source is preserved for recreation
   - Recommendation: Store original URL and reload on context restore

2. **Chunk mesh data preservation**
   - What we know: Mesh data generated in workers, uploaded to GPU
   - What's unclear: Whether raw mesh data (positions, colors) retained for recreation
   - Recommendation: Store or regenerate mesh data for recreation

3. **UI notification implementation**
   - What we know: User wants brief on-screen notification
   - What's unclear: No existing UI system in vanilla JS
   - Recommendation: Simple overlay div added/removed by context handlers

## Sources

### Primary (HIGH confidence)
- Khronos WebGL Wiki - HandlingContextLost (authoritative WebGL spec source)
- MDN WebGLRenderingContext.isContextLost() - Official Web API docs
- three.js manual on cleanup - Industry reference for WebGL resource patterns

### Secondary (MEDIUM confidence)
- Stack Overflow: WebGL context loss patterns - Verified by multiple answers
- webgl-operate ResourceManager - Open source reference implementation

### Tertiary (LOW confidence)
- WebSearch: WebGL memory leak detection - Various blog posts, some outdated

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Vanilla WebGL2 is well-documented standard
- Architecture: HIGH - Resource registry pattern is industry standard
- Pitfalls: HIGH - Common WebGL issues well-documented

**Research date:** 2026-03-27
**Valid until:** 2026-04-24 (WebGL API is stable, 30 days appropriate)
