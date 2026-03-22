# Technology Stack

**Analysis Date:** 2026-03-22

## Languages

**Primary:**
- JavaScript (ES2020) - Used throughout the codebase for voxel engine logic, rendering, and game mechanics

**Secondary:**
- HTML5 - Structure and UI elements in index.html
- CSS3 - Styling in style.css
- GLSL - Shader programs in src/shaders/ directory

## Runtime

**Environment:**
- Web Browser (ES2020 module support)

**Package Manager:**
- npm [Version from package-lock]
- Lockfile: present (package-lock.json)

## Frameworks

**Core:**
- None (Vanilla JavaScript) - Direct DOM manipulation and WebGL API usage

**Testing:**
- Vitest ^1.6.0 - Unit and integration testing framework
- JS DOM ^29.0.1 - DOM simulation for testing

**Build/Dev:**
- None (No build step required) - Raw ES modules served directly
- HTTP Server - Development server via npx http-server

## Key Dependencies

**Critical:**
- simplex-noise ^4.0.3 - Procedural terrain and biome generation
- jsdom ^29.0.1 - Testing environment for DOM-dependent code

**Infrastructure:**
- None (Browser-native APIs only)

## Configuration

**Environment:**
- No environment variables used
- Configuration via JavaScript constants in config.js

**Build:**
- No build configuration (direct ES module serving)
- Package.json scripts for development and testing

## Platform Requirements

**Development:**
- Modern web browser with ES2020 module support
- Node.js >=18 for vitest and http-server

**Production:**
- Any modern web browser (Chrome, Firefox, Safari, Edge)
- No server-side requirements (static site)

---

*Stack analysis: 2026-03-22*