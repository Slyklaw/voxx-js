/**
 * Base Blocks Plugin
 * Contains all the original block definitions
 * Now uses individual texture data instead of texture atlas
 */

import { blockTextures } from './block-textures.js';

export default {
  name: "Base Blocks",
  version: "1.0.0",
  blocks: [
    {
      id: "air",
      name: "Air",
      color: [0, 0, 0, 0],
      textures: blockTextures.air
    },
    {
      id: "stone",
      name: "Stone",
      color: [128, 128, 128, 255],
      textures: blockTextures.stone
    },
    {
      id: "dirt",
      name: "Dirt",
      color: [139, 69, 19, 255],
      textures: blockTextures.dirt
    },
    {
      id: "grass",
      name: "Grass",
      color: [95, 159, 53, 255],
      textures: blockTextures.grass
    },
    {
      id: "water",
      name: "Water",
      color: [30, 144, 255, 200],
      textures: blockTextures.water
    },
    {
      id: "snow",
      name: "Snow",
      color: [255, 255, 255, 255],
      textures: blockTextures.snow
    }
  ]
};
