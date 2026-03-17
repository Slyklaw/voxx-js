import { createRNG } from './src/core/prng.js';

function getHeightAt(x, z, chunkX, chunkZ) {
    const worldX = chunkX * 32 + x;
    const worldZ = chunkZ * 32 + z;
    
    const seedX = createRNG(worldX * 1000 + worldZ);
    const seedZ = createRNG(worldZ * 1000 + worldZ);
    
    let height = 0;
    height += Math.sin(worldX * 0.02) * Math.sin(worldZ * 0.02) * 5;
    height += Math.sin(worldX * 0.01) * Math.sin(worldZ * 0.01) * 3;
    height += Math.sin(worldX * 0.005) * Math.sin(worldZ * 0.005) * 2;
    
    const sx = seedX();
    console.log(`seedX(${worldX * 1000 + worldZ}) =`, sx);
    height += sx * 2;
    
    height = Math.max(1, Math.min(31, 10 + height));
    return Math.floor(height);
}

// compute height at chunk (0,0) local (0,0)
console.log('Height at (0,0):', getHeightAt(0, 0, 0, 0));
// compute height at chunk (0,0) local (15,15) just to see variation
console.log('Height at (15,15):', getHeightAt(15, 15, 0, 0));