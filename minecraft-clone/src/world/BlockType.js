export const BlockType = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    WOOD: 4,
    LEAVES: 5,
    SAND: 6,
    WATER: 7,
    BEDROCK: 8
};

export const BlockProperties = {
    [BlockType.AIR]: {
        name: 'Air',
        solid: false,
        transparent: true,
        color: 0x000000,
        texture: null
    },
    [BlockType.GRASS]: {
        name: 'Grass',
        solid: true,
        transparent: false,
        color: 0x4CAF50,
        texture: 'grass'
    },
    [BlockType.DIRT]: {
        name: 'Dirt',
        solid: true,
        transparent: false,
        color: 0x8B4513,
        texture: 'dirt'
    },
    [BlockType.STONE]: {
        name: 'Stone',
        solid: true,
        transparent: false,
        color: 0x808080,
        texture: 'stone'
    },
    [BlockType.WOOD]: {
        name: 'Wood',
        solid: true,
        transparent: false,
        color: 0x8B4513,
        texture: 'wood'
    },
    [BlockType.LEAVES]: {
        name: 'Leaves',
        solid: true,
        transparent: true,
        color: 0x228B22,
        texture: 'leaves'
    },
    [BlockType.SAND]: {
        name: 'Sand',
        solid: true,
        transparent: false,
        color: 0xF4A460,
        texture: 'sand'
    },
    [BlockType.WATER]: {
        name: 'Water',
        solid: false,
        transparent: true,
        color: 0x0077BE,
        texture: 'water'
    },
    [BlockType.BEDROCK]: {
        name: 'Bedrock',
        solid: true,
        transparent: false,
        color: 0x2F2F2F,
        texture: 'bedrock'
    }
};
