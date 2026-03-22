# Coding Conventions

**Analysis Date:** 2026-03-22

## Naming Patterns

**Files:**
- JavaScript files use `.js` extension with camelCase naming (e.g., `chunkManager.js`, `InputHandler.js`)
- Test files follow `[filename].test.js` pattern (e.g., `biomes.test.js`)
- Configuration files use lowercase with hyphens (e.g., `vitest.config.js`)

**Functions:**
- Functions use camelCase naming (e.g., `generateBiomeHeight`, `createProjectionMatrix`)
- Constructor functions use PascalCase (e.g., `BiomeCalculator`, `Camera`)
- Utility functions are descriptive and verb-noun oriented (e.g., `normalize`, `cross`, `dot`)

**Variables:**
- Constants use UPPER_SNAKE_CASE (e.g., `CHUNK_WIDTH`, `SEA_LEVEL`, `DEBUG`)
- Regular variables use camelCase (e.g., `renderDistance`, `wireframeMode`, `targetedBlock`)
- Instance variables use camelCase with descriptive names (e.g., `chunkMeshes`, `biomeCalculator`)

**Types/Classes:**
- Classes use PascalCase (e.g., `World`, `BiomeCalculator`, `Camera`)
- Type definitions in JSDoc comments use descriptive names

## Code Style

**Formatting:**
- Prettier is used for code formatting (inferred from consistent spacing and indentation)
- 2-space indentation consistently applied
- Semicolons are used to terminate statements
- Maximum line length around 100 characters (observed in longer lines)

**Linting:**
- ESLint configuration not detected in repository
- Code quality maintained through consistent patterns and code reviews

## Import Organization

**Order:**
1. External dependencies (from CDN or npm)
2. Relative imports from same directory or subdirectories
3. Parent directory imports (using `../`)
4. Absolute imports from project root

**Path Aliases:**
- No path aliases detected - relative paths used consistently
- Examples: `import { World } from '../world.js';`, `import { BLOCK_TYPES } from './blocks.js';`

## Error Handling

**Patterns:**
- Try/catch blocks used for WebGL resource creation (seen in `syncChunkToWebGL` function)
- Console.error() used for error logging with descriptive messages
- Early returns and null checks used throughout (e.g., `if (!targetedBlock || !outlineProgram) return;`)
- Defensive programming with existence checks before accessing properties

## Logging

**Framework:** 
- Console API used directly (console.log, console.error, console.warn)
- Conditional logging based on `DEBUG` flag from config

**Patterns:**
- Debug logs prefixed with module tags: `[WebGL]`, `[Debug]`, `[SSAO]`, `[Performance]`
- Feature-specific logging: `[BlockEdit]`, `[Renderer]`
- Performance monitoring: FPS, draw calls, timing measurements
- Error logging includes context: `console.error('[WebGL2] Error creating mesh for chunk ${key}:', e);`

## Comments

**When to Comment:**
- File headers describe purpose and extraction notes (e.g., "Math utilities for matrix and vector operations")
- Function documentation using JSDoc format for complex utilities
- Section comments for logical groupings (e.g., "// Chunk dimension constants")
- Inline comments for complex calculations and non-obvious logic

**JSDoc/TSDoc:**
- Used extensively for utility functions in `src/math/utils.js`
- Includes parameter descriptions, return types, and function purpose
- Example format:
  ```javascript
  /**
   * Multiply two 4x4 matrices
   * @param {Float32Array} a - First 4x4 matrix
   * @param {Float32Array} b - Second 4x4 matrix
   * @returns {Float32Array} Result 4x4 matrix
   */
  ```

## Function Design

**Size:** 
- Functions vary in size based on complexity
- Utility functions tend to be small and focused (e.g., math operations)
- Main rendering and update functions are longer due to complexity
- No strict line limits observed, but functions are generally cohesive

**Parameters:** 
- Functions use descriptive parameter names
- Object destructuring used for options (e.g., `new Camera({ x: 50, y: 200, z: 50 }, { x: 0.5, y: 0 })`)
- Default parameters not frequently used
- Callback pattern used for event handling (seen in InputHandler initialization)

**Return Values:** 
- Functions return meaningful values or objects
- Consistent return patterns (e.g., math utilities return new arrays/matrices)
- Early returns for error conditions
- Void functions explicitly return nothing or use early returns

## Module Design

**Exports:** 
- Named exports using `export const` and `export function` syntax
- Default exports not used (ES modules with named exports preferred)
- Related functionality grouped in files (e.g., all math utilities in `src/math/utils.js`)

**Barrel Files:** 
- Index.js files used as barrel exports in directories (e.g., `src/math/index.js`, `src/input/index.js`)
- These export specific named functions/classes from the directory
- Pattern: `export { FunctionName } from './filename.js';`

---
*Convention analysis: 2026-03-22*