# Phase 1: Foundation - Context

**Gathered:** 2026-03-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish a clean, deterministic codebase architecture with proper error handling and event management. This includes:
- Consolidating duplicate world data structures
- Extracting hardcoded constants to shared module
- Adding error handling to async module loading
- Implementing stub methods for persistence
- Adding seeded RNG for deterministic world generation
- Adding input validation for voxel coordinates
- Implementing logging levels
- Cleaning up event listeners
- Adding package.json and test framework
</domain>

<decisions>
## Implementation Decisions

### Logging implementation
- Use console with log levels (DEBUG, INFO, WARN, ERROR)
- Log levels controlled by environment variable or config flag
- Structured JSON logs optional (via --json flag)
- No external logging library — keep dependencies minimal

### Error handling strategy
- Throw custom error classes (VoxelError, ChunkError, etc.) with meaningful messages
- Catch errors at system boundaries (Engine.initSystems, World.loadChunk)
- Log errors with stack traces for debugging
- User-facing: show generic "Something went wrong" in console, details in logs

### Test framework and coverage
- Use Jest as test runner (standard for JavaScript)
- Target 80% code coverage for new/refactored code
- Target 50% coverage for existing legacy code (incremental improvement)
- Mock external dependencies (IndexedDB, WebGL context)
- Tests located alongside source files (*.test.js)

### Constants module design
- Single `src/core/constants.js` file for core constants (CHUNK_SIZE, WORLD_SEED, etc.)
- Organize constants by category (CHUNK, WORLD, PLAYER, RENDERER)
- Export as named constants, not default object
- Use UPPER_SNAKE_CASE naming

### Claude's Discretion
- Exact logging format (timestamp format, colors)
- Custom error class hierarchy details
- Test file organization within src directories
- Event system implementation (EventEmitter vs custom)
</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for logging, error handling, and testing in JavaScript codebases.

</specifics>

<deferred>
## Deferred Ideas

- Advanced logging (remote logging, log rotation) — out of scope for foundation
- Performance monitoring — separate phase
- Error reporting to external service — not needed for local game
- Coverage reporting dashboards — basic coverage thresholds sufficient

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-16*