# Coding Conventions

**Analysis Date:** 2026-03-16

## Naming Patterns

**Files:**
- Lowercase with hyphens: `chunk-manager.js`, `engine.js`
- PascalCase for classes: `Chunk`, `ChunkManager`, `Engine`
- Directory names are lowercase: `chunks/`, `core/`, `player/`

**Functions:**
- camelCase: `generateChunk()`, `getVoxel()`, `setupInput()`
- Verbs for actions: `createBuffers()`, `loadShader()`, `handleMovement()`
- Boolean properties with `is`, `has`, `on` prefixes: `isOnGround()`, `isEmpty()`, `isModified()`

**Variables:**
- camelCase: `chunkSize`, `worldSeed`, `mouseSensitivity`
- Descriptive names: `playerChunkX`, `vertexBuffer`, `projectionMatrix`
- Constants in camelCase (no UPPER_CASE convention observed): `this.walkSpeed`, `this.jumpStrength`

**Types:**
- JSDoc annotations used: `@param {number}`, `@param {Object}`, `@param {boolean}`
- Object literals for simple data: `{ type: 'grass', id: 1 }`
- Map used for collections: `this.chunks = new Map()`

## Code Style

**Formatting:**
- 4-space indentation
- Opening braces on same line
- Semicolons used consistently
- Single quotes for strings
- Trailing commas in arrays/objects

**Linting:**
- No linting configuration detected (no `.eslintrc`, `biome.json`)
- No formatting tool configuration detected (no `.prettierrc`)
- Code appears manually formatted

## Import Organization

**Order:**
1. ES6 imports from relative paths
2. No third-party dependencies detected

**Import Pattern:**
```javascript
// Dynamic imports used for lazy loading
import('./world.js').then((module) => {
    this.world = new module.World();
});
```

**Export Pattern:**
- Named exports: `export class Engine {}`
- No default exports observed

## Error Handling

**Patterns:**
- Try-catch blocks with specific error handling
- Console.error for error logging
- Errors re-thrown after logging: `throw error;`

**Example:**
```javascript
try {
    this.gl = this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
    
    if (!this.gl) {
        throw new Error('Could not initialize WebGL');
    }
} catch (error) {
    console.error('Failed to initialize WebGL:', error);
    throw error;
}
```

## Logging

**Framework:** Console API only

**Patterns:**
- `console.log()` for initialization messages: `console.log('WebGL initialized successfully')`
- `console.error()` for errors: `console.error('Unable to initialize shader program: ' + ...)`
- Template literals for variable interpolation: ``console.log(`Generated chunk at (${x}, ${y}, ${z})`)``

## Comments

**When to Comment:**
- Class/module purpose at top of file
- Method descriptions with JSDoc
- Inline comments for complex logic

**JSDoc Pattern:**
```javascript
/**
 * Generate a chunk at the specified position
 * @param {number} x - Chunk X coordinate
 * @param {number} y - Chunk Y coordinate  
 * @param {number} z - Chunk Z coordinate
 */
```

## Function Design

**Size:**
- Functions focused on single responsibility
- Methods generally under 50 lines
- Complex operations broken into helper methods

**Parameters:**
- Primitive types for coordinates: `(x, y, z)`
- Objects for complex data: `(playerPos)`
- Delta time for time-based updates: `(deltaTime)`

**Return Values:**
- Objects for multiple values: `return { x: ..., y: ..., z: ... }`
- Boolean for state checks: `return this.modified;`
- Null for missing/invalid data: `return null;`

## Module Design

**Exports:**
- ES6 classes exported individually
- No barrel files (index.js) observed
- Each file exports one class

**Pattern:**
```javascript
export class ChunkManager {
    constructor(world) {
        this.world = world;
        // ...
    }
}
```

## Object Patterns

**State Management:**
- Instance properties for state: `this.position = { x: 0, y: 10, z: 0 }`
- Maps for collections: `this.chunks = new Map()`
- Arrays for sequential data: `this.data = new Array(32 * 32 * 32)`

**Data Structures:**
- Simple objects for coordinates: `{ x, y, z }`
- Objects with type and id for game objects: `{ type: 'grass', id: 1 }`

## Performance Considerations

**Optimizations Observed:**
- Lazy loading with dynamic imports
- Chunk-based world management
- Efficient coordinate calculations
- Use of typed arrays: `new Float32Array()`, `new Uint16Array()`

**Anti-patterns:**
- Math.random() used in terrain generation (non-deterministic)
- Console.log in frequently called methods (performance overhead)

---

*Convention analysis: 2026-03-16*
