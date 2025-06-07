window.ChunkManager = class ChunkManager {
    constructor(scene, noiseParams, chunkSize = 32, renderDistance = 3) {
        this.scene = scene;
        this.noiseParams = noiseParams;
        this.chunkSize = chunkSize;
        this.renderDistance = renderDistance;
        this.chunks = new Map();
        this.previousChunkCoords = { x: null, z: null };
        
        // Create texture atlas
        this.textureAtlas = this.createTextureAtlas();
    }

    getChunkKey(x, z) {
        return `${x},${z}`;
    }

    createTextureAtlas() {
        const canvas = document.createElement('canvas');
        canvas.width = 16;
        canvas.height = 16;
        const ctx = canvas.getContext('2d');
        
        // Water (blue)
        ctx.fillStyle = '#1E90FF';
        ctx.fillRect(0, 0, 16, 4);
        
        // Sand (yellow)
        ctx.fillStyle = '#F0E68C';
        ctx.fillRect(0, 4, 16, 4);
        
        // Grass (green)
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(0, 8, 16, 4);
        
        // Rock (gray)
        ctx.fillStyle = '#808080';
        ctx.fillRect(0, 12, 16, 2);
        
        // Snow (white)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 14, 16, 2);
        
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;
        return texture;
    }

    createChunk(x, z) {
        const chunk = new THREE.Group();
        chunk.position.set(x * this.chunkSize, 0, z * this.chunkSize);
        
        // Create voxel geometry (shared)
        const voxelGeometry = new THREE.BoxGeometry(1, 1, 1);
        
        // Create materials for different block types
        const materials = {
            water: new THREE.MeshPhongMaterial({ color: 0x1E90FF }),
            sand: new THREE.MeshPhongMaterial({ color: 0xF0E68C }),
            grass: new THREE.MeshPhongMaterial({ color: 0x32CD32 }),
            rock: new THREE.MeshPhongMaterial({ color: 0x808080 }),
            snow: new THREE.MeshPhongMaterial({ color: 0xFFFFFF })
        };
        
        // Generate terrain
        this.generateVoxelTerrain(chunk, voxelGeometry, materials, x, z);
        this.scene.add(chunk);
        
        return chunk;
    }

    generateVoxelTerrain(chunk, voxelGeometry, materials, chunkX, chunkZ) {
        const simplex = new SimplexNoise(this.noiseParams.seed);
        
        for (let x = 0; x < this.chunkSize; x++) {
            for (let z = 0; z < this.chunkSize; z++) {
                const worldX = chunkX * this.chunkSize + x;
                const worldZ = chunkZ * this.chunkSize + z;
                
                let noiseValue = 0;
                let amplitude = 1;
                let frequency = 1;
                
                for (let octave = 0; octave < this.noiseParams.octaves; octave++) {
                    const sampleX = worldX * this.noiseParams.scale * frequency;
                    const sampleZ = worldZ * this.noiseParams.scale * frequency;
                    noiseValue += simplex.noise2D(sampleX, sampleZ) * amplitude;
                    
                    amplitude *= this.noiseParams.persistence;
                    frequency *= this.noiseParams.lacunarity;
                }
                
                const height = Math.floor(noiseValue * 20);
                
                // Create voxel based on height
                for (let y = 0; y <= height; y++) {
                    let material;
                    if (y < 5) {
                        material = materials.water;
                    } else if (y < 10) {
                        material = materials.sand;
                    } else if (y < 20) {
                        material = materials.grass;
                    } else if (y < 30) {
                        material = materials.rock;
                    } else {
                        material = materials.snow;
                    }
                    
                    const voxel = new THREE.Mesh(voxelGeometry, material);
                    voxel.position.set(x, y, z);
                    chunk.add(voxel);
                }
            }
        }
    }

    unloadChunk(x, z) {
        const key = this.getChunkKey(x, z);
        const chunk = this.chunks.get(key);
        if (chunk) {
            this.scene.remove(chunk);
            chunk.geometry.dispose();
            chunk.material.dispose();
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