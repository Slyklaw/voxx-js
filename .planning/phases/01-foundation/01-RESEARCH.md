# Phase 1: Foundation - Research

**Researched:** 2026-03-17
**Domain:** JavaScript voxel engine architecture
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Logging implementation
  - Use console with log levels (DEBUG, INFO, WARN, ERROR)
  - Log levels controlled by environment variable or config flag
  - Structured JSON logs optional (via --json flag)
  - No external logging library — keep dependencies minimal

- Error handling strategy
  - Throw custom error classes (VoxelError, ChunkError, etc.) with meaningful messages
  - Catch errors at system boundaries (Engine.initSystems, World.loadChunk)
  - Log errors with stack traces for debugging
  - User-facing: show generic "Something went wrong" in console, details in logs

- Test framework and coverage
  - Use Jest as test runner (standard for JavaScript)
  - Target 80% code coverage for new/refactored code
  - Target 50% coverage for existing legacy code (incremental improvement)
  - Mock external dependencies (IndexedDB, WebGL context)
  - Tests located alongside source files (*.test.js)

- Constants module design
  - Single `src/core/constants.js` file for core constants (CHUNK_SIZE, WORLD_SEED, etc.)
  - Organize constants by category (CHUNK, WORLD, PLAYER, RENDERER)
  - Export as named constants, not default object
  - Use UPPER_SNAKE_CASE naming

### Claude's Discretion
- Exact logging format (timestamp format, colors)
- Custom error class hierarchy details
- Test file organization within src directories
- Event system implementation (EventEmitter vs custom)

### Deferred Ideas (OUT OF SCOPE)
- Advanced logging (remote logging, log rotation) — out of scope for foundation
- Performance monitoring — separate phase
- Error reporting to external service — not needed for local game
- Coverage reporting dashboards — basic coverage thresholds sufficient
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TECH-01 | Eliminate duplicate world data structures (World vs ChunkManager) | Consolidate chunk storage into ChunkManager as single source of truth; World delegates to ChunkManager |
| TECH-02 | Extract hardcoded constants to shared constants module | src/core/constants.js with CHUNK_SIZE, VIEW_DISTANCE, WORLD_SEED |
| TECH-03 | Add error handling to async module loading | Promise.allSettled with catch handlers in Engine.initSystems |
| TECH-05 | Fix event listener memory leaks in Player class | Add removeEventListeners() method, cleanup on destroy |
| TECH-06 | Implement logging levels | Logger utility with DEBUG/INFO/WARN/ERROR, controlled by LOG_LEVEL env |
| TECH-07 | Add package.json with dependencies | Jest for testing, no other runtime deps needed |
| BUG-01 | Fix non-deterministic world generation | Replace Math.random with seeded PRNG (mulberry32 or similar) |
| BUG-04 | Add input validation for voxel coordinates | Validate bounds before array access in World.getVoxel |
| SEC-01 | Add validation at World level for coordinate inputs | Validate coordinates in getVoxel, generateChunk |
| SEC-02 | Ensure event listeners are properly removed on cleanup | Player.destroy() removes all listeners |
| TEST-01 | Add test framework and basic test structure | Jest with *.test.js alongside source |
| TEST-02 | Write tests for world generation determinism | Test same seed produces same terrain |
| TEST-03 | Write tests for chunk coordinate calculations | Test getVoxelIndex, getChunkCoords edge cases |
</phase_requirements>

## Summary

The Voxx-js codebase has a fundamental architectural issue: duplicate chunk storage in both `World` and `ChunkManager` classes, each with their own `chunkSize = 32` hardcoded. Additionally, world generation uses `Math.random()` making it non-deterministic. The codebase lacks error handling for async imports, has event listener memory leaks, and has no test framework or package.json.

**Primary recommendation:** Consolidate chunk management into ChunkManager as single source of truth, extract constants to shared module, add seeded PRNG for deterministic generation, and establish Jest test framework.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Jest | 29.x | Test runner | Industry standard for JS testing, built-in mocking |
| Node.js | 18+ | Runtime | Required for Jest, native ES modules |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| seedrandom | 3.x | Seeded PRNG | Alternative: hand-rolled mulberry32 |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Jest | Vitest | Vitest faster but Jest more mature |
| seedrandom | mulberry32 | Hand-rolled simpler, seedrandom more tested |

**Installation:**
```bash
npm init -y
npm install --save-dev jest
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── core/
│   ├── constants.js      # Shared constants (CHUNK_SIZE, etc.)
│   ├── engine.js         # Main engine, system initialization
│   ├── logger.js         # Logging utility with levels
│   ├── errors.js         # Custom error classes
│   └── world.js          # World orchestration (delegates to ChunkManager)
├── chunks/
│   ├── chunk.js          # Chunk data structure
│   ├── chunk-manager.js  # Single source of truth for chunks
│   └── chunk-manager.test.js
├── player/
│   ├── player.js         # Player controller
│   └── player.test.js
└── core/
    └── renderer.js       # WebGL rendering
```

### Pattern 1: ChunkManager as Single Source of Truth
**What:** ChunkManager owns all chunk storage; World delegates chunk operations to it
**When to use:** When multiple classes need chunk access but you want one owner
**Example:**
```javascript
// In World.js
import { ChunkManager } from '../chunks/chunk-manager.js';

export class World {
    constructor() {
        this.chunkManager = new ChunkManager();
    }
    
    getChunk(x, y, z) {
        return this.chunkManager.getChunk(x, y, z);
    }
}
```

### Pattern 2: Seeded PRNG for Determinism
**What:** Use seeded random number generator instead of Math.random
**When to use:** Any time you need reproducible results (world generation, procedural content)
**Example:**
```javascript
// Simple mulberry32 PRNG
function mulberry32(seed) {
    return function() {
        let t = seed += 0x6D2B79F5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
```

### Anti-Patterns to Avoid
- **Duplicate storage:** Having World and ChunkManager both store chunks
- **Hardcoded magic numbers:** Constants like 32 scattered through code
- **Missing bounds checks:** Array access without validation
- **Event listener leaks:** Adding listeners without cleanup

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Test framework | Custom test runner | Jest | Coverage, mocking, parallel execution |
| PRNG | Math.random with offset | Seeded PRNG (mulberry32) | Determinism guarantees |

**Key insight:** For PRNG, mulberry32 is simple enough to hand-roll (~10 lines) and avoids dependency. For testing, Jest provides too much value to replace.

## Common Pitfalls

### Pitfall 1: Duplicate Chunk State
**What goes wrong:** World and ChunkManager both store chunks, causing desync
**Why it happens:** Evolved separately without coordination
**How to avoid:** ChunkManager owns storage, World delegates
**Warning signs:** Chunks in one but not other, inconsistent chunk data

### Pitfall 2: Non-Deterministic Generation
**What goes wrong:** World looks different on reload with same seed
**Why it happens:** Using Math.random() in getHeightAt()
**How to avoid:** Use seeded PRNG throughout generation pipeline
**Warning signs:** Math.random() in world generation code

### Pitfall 3: Missing Bounds Validation
**What goes wrong:** Array index out of bounds errors
**Why it happens:** Trusting input coordinates without validation
**How to avoid:** Validate in World.getVoxel before array access
**Warning signs:** getVoxelIndex used without prior bounds check

### Pitfall 4: Event Listener Leaks
**What goes wrong:** Memory grows over time, callbacks fire on destroyed objects
**Why it happens:** addEventListener without corresponding removeEventListener
**How to avoid:** Add destroy()/cleanup methods that remove listeners
**Warning signs:** Player/Chunk classes with setupXxx() but no cleanup

## Code Examples

### Custom Error Classes
```javascript
// src/core/errors.js
export class VoxelError extends Error {
    constructor(message, coordinates) {
        super(message);
        this.name = 'VoxelError';
        this.coordinates = coordinates;
    }
}

export class ChunkError extends Error {
    constructor(message, chunkKey) {
        super(message);
        this.name = 'ChunkError';
        this.chunkKey = chunkKey;
    }
}
```

### Logger Utility
```javascript
// src/core/logger.js
const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL] || LOG_LEVELS.INFO;

export const logger = {
    debug: (msg, ...args) => currentLevel <= 0 && console.debug(`[DEBUG] ${msg}`, ...args),
    info: (msg, ...args) => currentLevel <= 1 && console.info(`[INFO] ${msg}`, ...args),
    warn: (msg, ...args) => currentLevel <= 2 && console.warn(`[WARN] ${msg}`, ...args),
    error: (msg, ...args) => currentLevel <= 3 && console.error(`[ERROR] ${msg}`, ...args),
};
```

### Event Cleanup Pattern
```javascript
// In Player.js
setupInput() {
    this._handleKeyDown = this.handleKeyDown.bind(this);
    this._handleKeyUp = this.handleKeyUp.bind(this);
    document.addEventListener('keydown', this._handleKeyDown);
    document.addEventListener('keyup', this._handleKeyUp);
}

destroy() {
    document.removeEventListener('keydown', this._handleKeyDown);
    document.removeEventListener('keyup', this._handleKeyUp);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Math.random() for seeds | Seeded PRNG (mulberry32) | Phase 1 | Deterministic worlds |
| console.log everywhere | Logger with levels | Phase 1 | Cleaner production output |
| No tests | Jest with coverage | Phase 1 | Regression safety |

**Deprecated/outdated:**
- Math.random() for world generation — replaced with seeded PRNG
- Raw console.log — replaced with logger utility

## Open Questions

1. **Should World still exist after consolidation?**
   - What we know: World currently handles generation logic
   - What's unclear: Should generation move to ChunkManager or stay in World?
   - Recommendation: Keep World as facade that delegates to ChunkManager, owns generation

2. **Test file organization?**
   - What we know: Context.md says "alongside source files"
   - What's unclear: Co-located (*.test.js) vs __tests__ directory?
   - Recommendation: Co-located for small codebase, easier to find

## Sources

### Primary (HIGH confidence)
- Jest documentation — testing framework patterns
- mulberry32 PRNG — Bob Jenkins' seeded generator (public domain)

### Secondary (MEDIUM confidence)
- JavaScript ES modules — import/export patterns
- Event listener cleanup patterns — MDN Web Docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Jest is well-established, simple setup
- Architecture: HIGH - Patterns derived from codebase analysis
- Pitfalls: HIGH - Issues directly observable in current code

**Research date:** 2026-03-17
**Valid until:** 2026-04-17 (30 days)
