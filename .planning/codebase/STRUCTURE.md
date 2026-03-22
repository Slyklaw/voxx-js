# Codebase Structure

**Analysis Date:** 2026-03-22

## Directory Layout

```
voxx-js/
├── src/                  # Main source code
│   ├── gl/               # WebGL2 rendering subsystem
│   ├── input/            # Input handling system
│   ├── blockEditor/      # Block placement/removal logic
│   ├── camera/           # Camera controls and matrices
│   ├── chunk/            # Chunk management utilities
│   ├── math/             # Mathematical utilities
│   ├── shaders/          # GLSL shader programs
│   ├── main.js           # Application entry point
│   ├── world.js          # Voxel world management
│   ├── biomes.js         # Biome generation
│   ├── config.js         # Configuration constants
│   └── constants.js      # Shared constants
├── tests/                # Test suite
│   ├── unit/             # Unit tests
│   └── integration/      # Integration tests
├── index.html            # Application entry point
├── textures-atlas.png    # Texture atlas for voxel rendering
├── style.css             # UI styling
├── package.json          # NPM configuration
├── vitest.config.js      # Test runner configuration
└── chunkWorker.js        # Web worker for chunk processing
```

## Directory Purposes

**src/gl/:**
- Purpose: WebGL2 rendering infrastructure and pipeline
- Contains: Context management, shader programs, buffer objects, framebuffers, rendering functions, performance monitoring
- Key files: `context.js` (WebGL context), `render.js` (main renderer), `shaders.js` (shader management), `buffers.js` (mesh creation), `performance.js` (FPS tracking)

**src/input/:**
- Purpose: Captures and processes user input from keyboard, mouse, and UI
- Contains: Input state tracking, event handling, callback systems
- Key files: `InputHandler.js` (main input processor), `index.js` (exports)

**src/blockEditor/:**
- Purpose: Handles block placement and destruction logic with raycasting
- Contains: Block editing algorithms, targeted block detection, voxel modification
- Key files: `BlockEditor.js` (main editor logic), `index.js` (exports)

**src/camera/:**
- Purpose: First-person camera with movement, rotation, and matrix generation
- Contains: Camera state, view/projection matrix creation, input response
- Key files: `Camera.js` (camera implementation), `index.js` (exports)

**src/chunk/:**
- Purpose: Utilities for chunk management and processing
- Contains: Chunk manager for generation and LOD, worker interface
- Key files: `chunkManager.js` (chunk lifecycle), `chunkWorker.js` (WebWorker for mesh generation)

**src/math/:**
- Purpose: Mathematical utilities for 3D graphics and noise generation
- Contains: Vector/matrix operations, noise functions, math helpers
- Key files: `utils.js` (math helpers), `index.js` (exports)

**src/shaders/:**
- Purpose: GLSL shader programs for various rendering effects
- Contains: Vertex and fragment shaders for voxels, sky, SSAO, blur, composite, selection, shadow
- Key files: `voxel.js` (main voxel shader), `sky.js` (sky rendering), `ssao.js` (ambient occlusion), `composite.js` (final post-processing)

**tests/:**
- Purpose: Automated test suite for verifying functionality
- Contains: Unit tests for individual components, integration tests for system interactions
- Structure: Mirrors src/ directory structure for test organization

## Key File Locations

**Entry Points:**
- `voxx-js/index.html`: Browser entry point that loads the application
- `voxx-js/src/main.js`: JavaScript entry point that initializes all systems
- `voxx-js/src/chunkWorker.js`: Web Worker entry point for off-thread chunk processing

**Configuration:**
- `voxx-js/src/config.js`: Central configuration constants (render distances, colors, timing)
- `voxx-js/src/constants.js`: Shared constants like chunk dimensions
- `voxx-js/package.json`: NPM dependencies and scripts
- `voxx-js/vitest.config.js`: Vitest test configuration

**Core Logic:**
- `voxx-js/src/world.js`: Voxel world generation and chunk management
- `voxx-js/src/biomes.js`: Procedural biome generation using noise functions
- `voxx-js/src/gl/render.js`: Main rendering loop and voxel rendering pipeline
- `voxx-js/src/gl/context.js`: WebGL2 context creation and management

**Testing:**
- `voxx-js/tests/unit/`: Unit tests for individual modules
- `voxx-js/tests/integration/`: Tests for component interactions

## Naming Conventions

**Files:**
- CamelCase for class files: `InputHandler.js`, `BlockEditor.js`, `Camera.js`
- lowercase for utility/files: `utils.js`, `constants.js`, `context.js`
- index.js files used for directory exports: `src/input/index.js`, `src/camera/index.js`

**Directories:**
- lowercase singular: `src/gl/`, `src/input/`, `src/blockEditor/`, `src/camera/`, `src/chunk/`, `src/math/`, `src/shaders/`
- tests mirror source structure: `tests/unit/`, `tests/integration/`

**Classes and Constructors:**
- PascalCase: `World`, `BiomeCalculator`, `Camera`, `InputHandler`, `BlockEditor`
- Examples: `new World(seed, gl)`, `new Camera(position, rotation)`

**Functions and Variables:**
- camelCase for functions and variables: `initWebGLResources()`, `renderDistance`, `chunkMeshes`
- UPPERCASE for constants: `CHUNK_WIDTH`, `RENDER_CONFIG`, `DEBUG`

**CSS and HTML:**
- kebab-case for CSS classes and IDs: `wireframe-toggle`, `time-display`, `compass-needle`
- kebab-case for HTML element IDs and classes

## Where to Add New Code

**New Feature (Major System):**
- Primary code: `src/[feature-name]/` (new directory)
- Tests: `tests/unit/[feature-name]/` or `tests/integration/[feature-name]/`

**New Component/Module:**
- Implementation: `src/[category]/[ComponentName].js` (e.g., `src/glass/WaterRenderer.js`)
- Export via index: Add to `src/[category]/index.js`
- Tests: `tests/unit/[category]/[ComponentName].test.js`

**Utilities:**
- Shared helpers: `src/math/[utilityName].js` (math-related) or `src/utils/[utilityName].js` (general)
- Rendering utilities: `src/gl/[utilityName].js` (WebGL-specific)
- Export via appropriate index file

**Shader Addition:**
- Implementation: `src/shaders/[effectName].js` (containing vertex/fragment shader strings)
- Integration: Import and use in `src/gl/render.js` or relevant renderer file

**Configuration:**
- Rendering/tuning parameters: Add to `src/config.js`
- Fixed constants: Add to `src/constants.js`
- Feature flags: Add to `src/config.js` DEBUG section

## Special Directories

**src/chunk/:**
- Purpose: Contains chunk processing utilities including WebWorker for mesh generation
- Generated: `chunkWorker.js` is a WebWorker file (not generated at runtime)
- Committed: Yes, all files are source-controlled

**tests/:**
- Purpose: Test files, not part of production bundle
- Generated: No (but may generate coverage reports)
- Committed: Yes, test source is committed

**WebWorker Files:**
- Purpose: Off-thread processing to prevent blocking main thread
- Location: `chunkWorker.js` (in project root)
- Generated: No
- Committed: Yes

**Asset Files:**
- Purpose: Textures, stylesheets, HTML markup
- Location: Project root (`textures-atlas.png`, `style.css`, `index.html`)
- Generated: No (textures may be generated externally)
- Committed: Yes (except potentially large generated assets)