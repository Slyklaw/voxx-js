# voxx-js

Vanilla JS + WebGL2 voxel engine. No build step; ESM (`"type": "module"`).

## Commands

- Dev server: `npm run dev` (http-server on :8080, no cache). Open `index.html`.
- Tests (watch): `npm test`
- Tests (CI/once): `npm run test:run`
- Single file: `npx vitest run tests/unit/chunk.test.js`
- Single test: `npx vitest run -t "test name"`
- Coverage: `npx vitest run --coverage`
- `npm run build` is a no-op (`echo 'No build needed'`).

## Architecture

- Browser entrypoint: `index.html` -> `./src/main.js`.
- Core world/gen modules live under `src/core/`: `chunk.js`, `world.js`, `biomes.js`, `blocks.js`, `greedyMesh.js`, `config.js`. Tests import these.
- Rendering/input/camera/GL live under `src/` (`src/gl/*`, `src/camera/*`, `src/input/*`, `src/blockEditor/*`).
- World/chunks use `CHUNK_WIDTH/HEIGHT/DEPTH = 32/256/32` from `src/constants.js`.
- Vendored noise: `lib/simplex-noise.js` (the `.ts` twin is unused).

## Testing

- Vitest config includes only `tests/**/*.test.js`.
- Default environment is `node`; browser/DOM tests must add `/** @vitest-environment jsdom */` at the top (see `tests/integration/ssao-ui.test.js`).
- Globals are enabled (`describe`/`it`/`expect` without imports are OK, but existing tests import them explicitly).

## Gotchas

- Chunk model is unified on 32-wide chunks (`CHUNK_WIDTH`); render offsets use `CHUNK_WIDTH`. `src/chunk/chunkManager.js` was removed.
- `textures-atlas.png` must stay at repo root; runtime loads it by relative path.
- `DEBUG` in `config.js` is `false` by default and gates verbose logging.
- No lint/typecheck config exists; don't invent commands.