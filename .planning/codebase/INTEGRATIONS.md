# External Integrations

**Analysis Date:** 2026-03-22

## APIs & External Services

**[CDN Dependencies]:**
- Simplex Noise - Procedural noise generation for terrain and biomes
  - SDK/Client: Direct ES module import from CDN: `https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/dist/esm/simplex-noise.js`
  - Auth: None (public CDN)
  - Used in: `biomes.js`, `world.js`, `chunkWorker.js`

**[Category]: None detected**
- No REST APIs, GraphQL, or external service integrations found
- No API keys or authentication tokens in codebase

## Data Storage

**Databases:**
- None (All data stored in-memory)
- No database connections, ORMs, or storage adapters

**File Storage:**
- Local filesystem only (texture assets loaded via relative paths)
- Texture atlas: `textures-atlas.png`
- No cloud storage (S3, etc.)

**Caching:**
- None (No Redis, Memcached, or similar)
- In-memory caching via worker pools and chunk caching implemented internally

## Authentication & Identity

**Auth Provider:**
- None (No authentication system)
- Implementation: Not applicable (single-user local experience)

## Monitoring & Observability

**Error Tracking:**
- None (No Sentry, Rollbar, or similar)

**Logs:**
- Console logging only (via `console.log` in debug mode)
- No external log aggregation

## CI/CD & Deployment

**Hosting:**
- Static site (GitHub Pages or similar static hosting)
- No server-side components

**CI Pipeline:**
- None detected (No GitHub Actions, GitLab CI, or similar configuration files)
- Local testing only via `npm test`

## Environment Configuration

**Required env vars:**
- None (No `.env` file or environment variable usage)

**Secrets location:**
- Not applicable (No secrets or API keys used)

## Webhooks & Callbacks

**Incoming:**
- None (No webhook endpoints)

**Outgoing:**
- None (No outbound webhooks or callbacks)

---

*Integration audit: 2026-03-22*