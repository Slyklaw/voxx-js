/**
 * Base Blocks Plugin
 * Contains all the original block definitions
 */

// Placeholder function to create texture data from RGBA values
function createTextureData(r, g, b, a = 255) {
  // Create a 16x16 texture with solid color
  const data = new Uint8Array(16 * 16 * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;     // R
    data[i + 1] = g; // G
    data[i + 2] = b; // B
    data[i + 3] = a; // A
  }
  return {
    data: Array.from(data),
    width: 16,
    height: 16
  };
}

// Create texture data for each block
const airTexture = createTextureData(0, 0, 0, 0);
const stoneTexture = createTextureData(128, 128, 128, 255);
const dirtTexture = createTextureData(139, 69, 19, 255);
const grassTopTexture = createTextureData(95, 159, 53, 255);
const grassSideTexture = createTextureData(139, 69, 19, 255); // Simplified - would be more complex in reality
const grassBottomTexture = createTextureData(139, 69, 19, 255);
const waterTexture = createTextureData(30, 144, 255, 200);
const snowTexture = createTextureData(255, 255, 255, 255);

export default {
  name: "Base Blocks",
  version: "1.0.0",
  blocks: [
    {
      id: "air",
      name: "Air",
      color: [0, 0, 0, 0],
      atlasPos: { top: [0, 0], sides: [0, 0], bottom: [0, 0] },
      textures: {
        top: airTexture,
        sides: airTexture,
        bottom: airTexture
      }
    },
    {
      id: "stone",
      name: "Stone",
      color: [128, 128, 128, 255],
      atlasPos: { top: [496, 208], sides: [496, 208], bottom: [496, 208] },
      textures: {
        top: stoneTexture,
        sides: stoneTexture,
        bottom: stoneTexture
      }
    },
    {
      id: "dirt",
      name: "Dirt",
      color: [139, 69, 19, 255],
      atlasPos: { top: [240, 192], sides: [240, 192], bottom: [240, 192] },
      textures: {
        top: dirtTexture,
        sides: dirtTexture,
        bottom: dirtTexture
      }
    },
    {
      id: "grass",
      name: "Grass",
      color: [95, 159, 53, 255],
      atlasPos: { top: [160, 256], sides: [176, 240], bottom: [240, 192] },
      textures: {
        top: grassTopTexture,
        sides: grassSideTexture,
        bottom: grassBottomTexture
      }
    },
    {
      id: "water",
      name: "Water",
      color: [30, 144, 255, 200],
      atlasPos: { top: [128, 112], sides: [128, 112], bottom: [128, 112] },
      textures: {
        top: waterTexture,
        sides: waterTexture,
        bottom: waterTexture
      }
    },
    {
      id: "snow",
      name: "Snow",
      color: [255, 255, 255, 255],
      atlasPos: { top: [496, 16], sides: [496, 16], bottom: [496, 16] },
      textures: {
        top: snowTexture,
        sides: snowTexture,
        bottom: snowTexture
      }
    }
  ]
};
