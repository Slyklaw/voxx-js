# Milestones

## v1.0 WebGL Foundation (Shipped: 2026-04-01)

**Phases completed:** 3 phases, 9 plans

**Key accomplishments:**
1. WebGL memory leak prevention with resource registry lifecycle management
2. Automatic context loss detection and recovery without page reload
3. FPS warning system with console logging below 50fps threshold
4. Worker pool with graceful termination waiting for in-progress jobs
5. Chunk mesh state machine preventing race conditions between workers and main thread
6. Instanced rendering with shader-based transforms (matrix calculations in vertex shaders)
7. Grid-based visibility culling with spatial index O(1) lookup
8. Neighbor caching with dirty flags for incremental mesh rebuilds
9. Single drawElementsInstanced call replacing per-chunk render loop

**Known gaps (deferred):**
- Phase 4 (User Experience) — cancelled by user
- Phase 5 (Code Quality) — not started

---

## v2.0 Shadows (Shipped: 2026-04-02)

**Phases completed:** 3 phases, 4 plans

**Key accomplishments:**
1. Self-hosted simplex-noise (DEPS-01) — eliminated CDN dependency, offline-capable terrain generation
2. Hard shadow mapping — replaced PCF 3x3 soft filtering with single texture lookup for crisp shadow edges
3. Dynamic shadow frustum — orthographic size scales with render distance (320 units for RD=8)
4. Shadow frustum culling — per-chunk culling in shadow pass reduces unnecessary depth buffer writes
5. Shadow pass timing metrics — <2ms target displayed in debug HUD for 60fps monitoring
6. Sun tracking verification — shadow direction updates in real-time during day/night cycle
7. Shadow map at 4096 resolution with resource registry lifecycle management (context loss recovery)
8. Full render distance shadow coverage — all visible chunks cast and receive shadows

**Deferred requirements:**
- UX-01: Loading progress indicator during world generation
- UX-02: Graphics quality settings (render distance, SSAO toggle)
- QUAL-01: Encapsulate global state in modules
- QUAL-02: Centralized WebGL resource manager

---

