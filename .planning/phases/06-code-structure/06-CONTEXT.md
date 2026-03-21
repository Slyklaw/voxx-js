# Phase 6: Code Structure - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Restructure existing codebase into modular, maintainable architecture. Consolidate duplicate code, split monolithic files, and create reusable modules. This is code cleanup only — no new features or behavior changes.

</domain>

<decisions>
## Implementation Decisions

### Migration approach
- **Incremental import routing** — Update imports one module at a time, replacing old code with new modules
- **No compatibility layer** — Direct replacement, game must run correctly after each change
- **Git rollback available** — Use git to rollback if issues arise

### Validation strategy
- **Manual testing** — Run game after extracting each module
- **Verify functionality** — Game must load and run correctly before moving to next module
- **No automated tests during migration** — Tests will be added separately (Phase 6 covers structure, not coverage)

### Module structure
- **ES modules in `src/`** — Standard JS module structure
- **Clear index re-exports** — Each module directory has index.js for clean imports
- **Class-based for stateful components** — BlockEditor, InputHandler, Camera as classes
- **Functional utils for pure operations** — Math utilities as functions

### Extraction order
- **Any order acceptable** — Work through modules as makes sense
- **Priority: verify after each** — Ensure game runs before continuing

</decisions>

<specifics>
## Specific Ideas

- Use git for rollback capability
- No compatibility shims or wrappers needed
- Manual game testing is sufficient for validation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-code-structure*
*Context gathered: 2026-03-21*
