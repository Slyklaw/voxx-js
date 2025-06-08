window.ChunkManager = class ChunkManager {
    constructor(scene, noiseParams, chunkSize = 32, renderDistance = 3) {
        this.scene = scene;
        this.noiseParams = noiseParams;
        this.chunkSize = chunkSize;
        this.renderDistance = renderDistance;
        this.chunks = new Map();
        this.pendingChunks = new Map();
        this.previousChunkCoords = { x: null, z: null };
        
        // Create texture atlas
        this.textureAtlas = this.createTextureAtlas();
        
        // Create web worker using Blob URL to avoid file:// restrictions
        const workerCode = `
            // Simple Simplex Noise implementation
            class SimplexNoise {
                constructor(seed) {
                    this.seed = seed;
                    this.grad3 = [
                        [1,1,0], [-1,1,0], [1,-1,0], [-1,-1,0],
                        [1,0,1], [-1,0,1], [1,0,-1], [-1,0,-1],
                        [0,1,1], [0,-1,1], [0,1,-1], [0,-1,-1]
                    ];
                    this.p = [];
                    for (let i=0; i<256; i++) this.p[i] = Math.floor(seed * 256) % 256;
                    this.perm = new Array(512);
                    for (let i=0; i<512; i++) this.perm[i] = this.p[i & 255];
                }
                
                dot(g, x, y) {
                    return g[0]*x + g[1]*y;
                }
                
                noise2D(xin, yin) {
                    const F2 = 0.5*(Math.sqrt(3.0)-1.0);
                    const s = (xin+yin)*F2;
                    const i = Math.floor(xin+s);
                    const j = Math.floor(yin+s);
                    const G2 = (3.0-Math.sqrt(3.0))/6.0;
                    const t = (i+j)*G2;
                    const X0 = i-t;
                    const Y0 = j-t;
                    const x0 = xin-X0;
                    const y0 = yin-Y0;
                    
                    let i1, j1;
                    if(x0>y0) { i1=1; j1=0; }
                    else { i1=0; j1=1; }
                    
                    const x1 = x0 - i1 + G2;
                    const y1 = y0 - j1 + G2;
                    const x2 = x0 - 1.0 + 2.0*G2;
                    const y2 = y0 - 1.0 + 2.0*G2;
                    
                    const ii = i & 255;
                    const jj = j & 255;
                    const gi0 = this.perm[ii+this.perm[jj]] % 12;
                    const gi1 = this.perm[ii+i1+this.perm[jj+j1]] % 12;
                    const gi2 = this.perm[ii+1+this.perm[jj+1]] % 12;
                    
                    let n0, n1, n2;
                    let t0 = 0.5 - x0*x0 - y0*y0;
                    if(t0<0) n0 = 0.0;
                    else {
                        t0 *= t0;
                        n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
                    }
                    
                    let t1 = 0.5 - x1*x1 - y1*y1;
                    if(t1<0) n1 = 0.0;
                    else {
                        t1 *= t1;
                        n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
                    }
                    
                    let t2 = 0.5 - x2*x2 - y2*y2;
                    if(t2<0) n2 = 0.0;
                    else {
                        t2 *= t2;
                        n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
                    }
                    
                    return 70.0 * (n0 + n1 + n2);
                }
            }
            
            self.addEventListener('message', (e) => {
                const { chunkX, chunkZ, noiseParams, chunkSize } = e.data;
                const { positions, colors, indices } = generateVoxelTerrain(chunkX, chunkZ, noiseParams, chunkSize);
                self.postMessage({ chunkX, chunkZ, positions, colors, indices });
            });
            
            function generateVoxelTerrain(chunkX, chunkZ, noiseParams, chunkSize) {
                const simplex = new SimplexNoise(noiseParams.seed);
                const positions = [];
                const colors = [];
                const indices = [];
                let vertexCount = 0;
            
                // Helper function to add a voxel face
                const addFace = (vertices, color, offset) => {
                    positions.push(...vertices);
                    for (let i = 0; i < 4; i++) {
                        colors.push(color[0], color[1], color[2]);
                    }
                    indices.push(
                        offset, offset + 2, offset + 1,
                        offset, offset + 3, offset + 2
                    );
                };
            
                // Generate heightmap
                const heightMap = [];
                for (let x = 0; x < chunkSize; x++) {
                    heightMap[x] = [];
                    for (let z = 0; z < chunkSize; z++) {
                        const worldX = chunkX * chunkSize + x;
                        const worldZ = chunkZ * chunkSize + z;
                        
                        let noiseValue = 0;
                        let amplitude = 1;
                        let frequency = 1;
                        
                        for (let octave = 0; octave < noiseParams.octaves; octave++) {
                            const sampleX = worldX * noiseParams.scale * frequency;
                            const sampleZ = worldZ * noiseParams.scale * frequency;
                            noiseValue += simplex.noise2D(sampleX, sampleZ) * amplitude;
                            
                            amplitude *= noiseParams.persistence;
                            frequency *= noiseParams.lacunarity;
                        }
                        
                        heightMap[x][z] = Math.max(0, Math.floor(noiseValue * 20));
                    }
                }
            
                // Generate faces
                for (let x = 0; x < chunkSize; x++) {
                    for (let z = 0; z < chunkSize; z++) {
                        const height = heightMap[x][z];
                        
                        for (let y = 0; y <= height; y++) {
                            let color;
                            if (y === 0) color = [0, 0, 0.545]; // DarkBlue
                            else if (y < 5) color = [0.118, 0.565, 1]; // DodgerBlue
                            else if (y < 10) color = [0.941, 0.902, 0.549]; // Khaki
                            else if (y < 20) color = [0.196, 0.804, 0.196]; // LimeGreen
                            else if (y < 30) color = [0.502, 0.502, 0.502]; // Gray
                            else color = [1, 1, 1]; // White
            
                            const faces = [
                                // Top face (y+)
                                [
                                    x, y+1, z,
                                    x+1, y+1, z,
                                    x+1, y+1, z+1,
                                    x, y+1, z+1
                                ],
                                // Bottom face (y-)
                                [
                                    x, y, z,
                                    x, y, z+1,
                                    x+1, y, z+1,
                                    x+1, y, z
                                ],
                                // Front face (z+)
                                [
                                    x, y, z+1,
                                    x, y+1, z+1,
                                    x+1, y+1, z+1,
                                    x+1, y, z+1
                                ],
                                // Back face (z-)
                                [
                                    x, y, z,
                                    x+1, y, z,
                                    x+1, y+1, z,
                                    x, y+1, z
                                ],
                                // Right face (x+)
                                [
                                    x+1, y, z,
                                    x+1, y, z+1,
                                    x+1, y+1, z+1,
                                    x+1, y+1, z
                                ],
                                // Left face (x-)
                                [
                                    x, y, z,
                                    x, y+1, z,
                                    x, y+1, z+1,
                                    x, y, z+1
                                ]
                            ];
                            
                            for (const face of faces) {
                                addFace(face, color, vertexCount);
                                vertexCount += 4;
                            }
                        }
                    }
                }
            
                return { positions, colors, indices };
            }
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
        this.worker.onmessage = (e) => {
            const { chunkX, chunkZ, positions, colors, indices } = e.data;
            const key = this.getChunkKey(chunkX, chunkZ);
            const pending = this.pendingChunks.get(key);
            if (pending) {
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
                geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
                geometry.setIndex(indices);
                geometry.computeVertexNormals();
                
                const material = new THREE.MeshPhongMaterial({ vertexColors: true });
                const mesh = new THREE.Mesh(geometry, material);
                
                const chunk = new THREE.Group();
                chunk.position.set(chunkX * this.chunkSize, 0, chunkZ * this.chunkSize);
                chunk.add(mesh);
                
                this.scene.add(chunk);
                this.chunks.set(key, chunk);
                this.pendingChunks.delete(key);
            }
        };
    }

    getChunkKey(x, z) {
        return `${x},${z}`;
    }

    createTextureAtlas() {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 20;  // Increased height for sea block
        const ctx = canvas.getContext('2d');
        
        // Water (blue) - moved down 4px
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(0, 4, 16, 4);
        
        // Sand (yellow) - moved down 4px
        ctx.fillStyle = '#F0E68C';
        ctx.fillRect(0, 8, 16, 4);
        
        // Grass (green) - moved down 4px
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(0, 12, 16, 4);
        
        // Rock (gray) - moved down 4px
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 16, 16, 2);
        
        // Snow (white) - moved down 4px
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 18, 16, 2);
        
        // Sea (dark blue) - added at top
        ctx.fillStyle = '#00008B';
        ctx.fillRect(0, 0, 16, 4);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    createChunk(x, z) {
        const key = this.getChunkKey(x, z);
        if (this.chunks.has(key) || this.pendingChunks.has(key)) return;
        
        this.pendingChunks.set(key, true);
        this.worker.postMessage({
            chunkX: x,
            chunkZ: z,
            noiseParams: this.noiseParams,
            chunkSize: this.chunkSize
        });
    }

    unloadChunk(x, z) {
        const key = this.getChunkKey(x, z);
        
        // Remove pending chunk request if exists
        if (this.pendingChunks.has(key)) {
            this.pendingChunks.delete(key);
        }
        
        // Remove existing chunk if loaded
        const chunk = this.chunks.get(key);
        if (chunk) {
            this.scene.remove(chunk);
            // Traverse and dispose geometry/material
            chunk.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                }
            });
            this.chunks.delete(key);
        }
    }

    update(cameraPosition) {
        const chunkX = Math.round(cameraPosition.x / this.chunkSize);
        const chunkZ = Math.round(cameraPosition.z / this.chunkSize);
        
        // Only update if camera moved to a new chunk
        if (chunkX === this.previousChunkCoords.x && chunkZ === this.previousChunkCoords.z) return;
        
        this.previousChunkCoords = { x: chunkX, z: chunkZ };
        
        // Unload distant chunks
        for (const [key, chunk] of this.chunks) {
            const [x, z] = key.split(',').map(Number);
            if (Math.abs(x - chunkX) > this.renderDistance ||
                Math.abs(z - chunkZ) > this.renderDistance) {
                this.unloadChunk(x, z);
            }
        }
        
        // Load new chunks
        for (let x = chunkX - this.renderDistance; x <= chunkX + this.renderDistance; x++) {
            for (let z = chunkZ - this.renderDistance; z <= chunkZ + this.renderDistance; z++) {
                const key = this.getChunkKey(x, z);
                if (!this.chunks.has(key)) {
                    const chunk = this.createChunk(x, z);
                    this.chunks.set(key, chunk);
                }
            }
        }
    }
}