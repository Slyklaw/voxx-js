/**
 * Base Blocks Plugin
 * Contains all the original block definitions
 * Uses the pre-installed texture atlas
 */

export default {
  name: "Base Blocks",
  version: "1.0.0",
  blocks: [
    {
      id: "air",
      name: "Air",
      color: [0, 0, 0, 0],
      atlasPos: { top: [0, 0], sides: [0, 0], bottom: [0, 0] },
      useAtlas: true // Flag to indicate this block uses the texture atlas
    },
    {
      id: "stone",
      name: "Stone",
      color: [128, 128, 128, 255],
      atlasPos: { top: [496, 208], sides: [496, 208], bottom: [496, 208] },
      useAtlas: true
    },
    {
      id: "dirt",
      name: "Dirt",
      color: [139, 69, 19, 255],
      atlasPos: { top: [240, 192], sides: [240, 192], bottom: [240, 192] },
      useAtlas: true
    },
    {
      id: "grass",
      name: "Grass",
      color: [95, 159, 53, 255],
      atlasPos: { top: [160, 256], sides: [176, 240], bottom: [240, 192] },
      useAtlas: true
    },
    {
      id: "water",
      name: "Water",
      color: [30, 144, 255, 200],
      atlasPos: { top: [128, 112], sides: [128, 112], bottom: [128, 112] },
      useAtlas: true
    },
    {
      id: "snow",
      name: "Snow",
      color: [255, 255, 255, 255],
      atlasPos: { top: [496, 16], sides: [496, 16], bottom: [496, 16] },
      useAtlas: true
    }
  ]
};
