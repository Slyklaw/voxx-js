# Summary: 07-01 State Encapsulation - render.js

Encapsulated module-level mutable renderer state in `src/gl/render.js` into a single
`renderState` object. Non-exported loose `let` bindings (sky/selection/shadow/SSAO
programs, uniforms, VAOs/VBOs, gbuffer, texture atlas, camera/global UBOs, render
loop state, etc.) were migrated to `renderState.*` with all internal references
updated. Exported public API (`voxelProgram`, `voxelUniforms`, `voxelAttribs`,
`shadowMapObj`, `ssaoSettings`, `getShadowPassDuration`, etc.) retained as
`export let` for backward compatibility with `main.js`.

- Tests: 45/45 passing (`npx vitest run`).
- Commit: refactor(07-01): encapsulate render.js state
