// Quick script to check how many chunks the current test world uses

// Simple coordinate analysis
console.log('Analyzing test world chunk distribution...\n');

// Simulate the ChunkManager coordinate conversion
function worldToChunkCoords(worldX, worldZ) {
    return {
        chunkX: Math.floor(worldX / 16),
        chunkZ: Math.floor(worldZ / 16)
    };
}

// Test world coordinates: -5 to 5 in both X and Z
console.log('Test world spans: X(-5 to 5), Z(-5 to 5)');
console.log('Coordinate analysis:');

const testCoords = [
    [-5, -5], [-1, -1], [0, 0], [5, 5]
];

const chunkSet = new Set();

testCoords.forEach(([x, z]) => {
    const chunkCoords = worldToChunkCoords(x, z);
    const chunkKey = `${chunkCoords.chunkX},${chunkCoords.chunkZ}`;
    chunkSet.add(chunkKey);
    console.log(`World (${x}, ${z}) -> Chunk (${chunkCoords.chunkX}, ${chunkCoords.chunkZ})`);
});

console.log(`\nUnique chunks needed: ${chunkSet.size}`);
console.log('Chunks:', Array.from(chunkSet));

// More detailed analysis
console.log('\nDetailed chunk boundary analysis:');
for (let x = -5; x <= 5; x++) {
    for (let z = -5; z <= 5; z++) {
        const chunkCoords = worldToChunkCoords(x, z);
        const chunkKey = `${chunkCoords.chunkX},${chunkCoords.chunkZ}`;
        chunkSet.add(chunkKey);
    }
}

console.log(`Total chunks for entire test world: ${chunkSet.size}`);
console.log('All chunks:', Array.from(chunkSet).sort());