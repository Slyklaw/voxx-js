# Phase 7: Bug Fixes - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix 4 known defects: forced flat terrain hack, biome blending, mesh regeneration, and stale worker glitches. This phase makes terrain generation and block editing work correctly.

</domain>

<decisions>
## Implementation Decisions

### Stale Worker Cancellation
- Cancel outdated chunk requests immediately when camera moves
- Use `AbortController` for cancellation signaling (Web standard)
- Accept all completions regardless of order (race conditions acceptable)
- Log cancellations for diagnostic purposes

### Terrain Elevation
- Terrain should vary naturally — researcher to determine root cause of forced flat hack

### Biome Blending
- Transitions should be smooth and gradual — researcher to investigate blending approach

### Mesh Regeneration
- Block edits should appear immediately without manual refresh — researcher to trace update chain

### Claude's Discretion
- Exact cancellation frequency thresholds
- Worker pool size tuning
- Chunk request batching strategy
- Diagnostic log verbosity level

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for terrain, biome, and mesh fixes.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-bug-fixes*
*Context gathered: 2026-03-21*
