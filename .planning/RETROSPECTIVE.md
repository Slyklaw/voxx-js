# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v2.0 — Shadows

**Shipped:** 2026-11-03
**Phases:** 6 | **Plans:** 13 | **Sessions:** (n/a)

### What Was Built
- Self-hosted simplex-noise (removed CDN dependency, offline-capable terrain generation)
- Directional shadow map from sun position with hard edges
- Full render distance shadow coverage integrated into deferred GBuffer pipeline
- Real-time shadow updates as sun moves during day/night cycle
- Shadow performance monitoring with <2ms target

### What Worked
- Milestone audit + verification workflow surfaced human-needed gaps early
- Phase verification reports (VERIFICATION.md) gave clear evidence trails

### What Was Inefficient
- Phase 04 verification left runtime checks (offline/visual) as human_needed; required acknowledgment at close
- REQUIREMENTS.md traceability not updated during execution (4 Phase 6 reqs left Pending until close)

### Patterns Established
- Archive requirements/roadmap per milestone under `.planning/milestones/`
- Deferred items recorded in STATE.md at milestone close

### Key Lessons
1. Update REQUIREMENTS.md traceability status during phase execution, not at close.
2. Runtime-only verification gaps should be acknowledged explicitly rather than blocking close.

### Cost Observations
- Model mix: (n/a)
- Sessions: (n/a)
- Notable: (n/a)

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | (n/a) | 3 | Initial WebGL foundation, workers, performance |
| v2.0 | (n/a) | 6 | Shadows + dependency self-hosting |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v2.0 | 45 | (n/a) | simplex-noise self-hosted |

### Top Lessons (Verified Across Milestones)

1. Keep REQUIREMENTS.md traceability in sync with phase completion.
2. Acknowledge human-needed verification gaps explicitly at milestone close.