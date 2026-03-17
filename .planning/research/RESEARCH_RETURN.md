## RESEARCH COMPLETE

**Project:** Voxx-js Voxel Engine
**Mode:** Ecosystem (Stack dimension)
**Confidence:** MEDIUM

### Key Findings

- **Standard 2025 stack** for browser voxel engines: Three.js (rendering) + Cannon‑es (physics) + Simplex‑noise (terrain) + Dexie (persistence).
- **Alternatives:** Babylon.js is equally viable but less prevalent in voxel community; raw WebGL is possible but increases development effort.
- **Critical pitfall:** Using outdated libraries (original voxel‑engine, Cannon.js) leads to technical debt.
- **Recommended phased adoption:** Start with persistence and collision detection using these libraries; keep raw WebGL for now but plan migration to Three.js for future features (raycasting, lighting).

### Files Created

| File | Purpose |
|------|---------|
| .planning/research/SUMMARY.md | Executive summary with roadmap implications |
| .planning/research/STACK.md | Technology recommendations |
| .planning/research/FEATURES.md | Feature landscape (table stakes, differentiators) |
| .planning/research/ARCHITECTURE.md | Architecture patterns (chunk‑based, component‑oriented) |
| .planning/research/PITFALLS.md | Domain pitfalls (naive rendering, sync generation, etc.) |

### Confidence Assessment

| Area | Level | Reason |
|------|-------|--------|
| Stack | MEDIUM | Versions verified via npm registry; rationale based on ecosystem popularity but lacks official benchmarks. |
| Features | LOW | Not deeply researched in this pass; based on common expectations. |
| Architecture | MEDIUM | Based on existing codebase analysis and common voxel patterns. |
| Pitfalls | HIGH | Drawn from established game‑dev wisdom and community documentation. |

### Roadmap Implications

1. **Phase 1 (Foundation):** Add IndexedDB persistence (Dexie) and collision detection (Cannon‑es) – prerequisites for gameplay.
2. **Phase 2 (Core Gameplay):** Implement block placement/removal (raycasting) and inventory – builds on physics.
3. **Phase 3 (Polish):** Upgrade to Three.js/WebGL2, add greedy meshing, optimize chunk streaming – after core loop stable.

### Open Questions

- Should the project adopt Three.js now or later? (trade‑off: development speed vs. rewrite cost)
- Is WebGPU support needed for future‑proofing? (too early for 2025 stack)
- What is the exact integration pattern between raw WebGL and Cannon‑es? (needs prototype)