/**
 * Example Plugin - Adds a wood block
 */

// Create texture data for wood block
function createWoodTexture() {
  // Create a 16x16 texture with wood-like pattern
  const data = new Uint8Array(16 * 16 * 4);
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const index = (y * 16 + x) * 4;
      // Create a wood-like pattern with brown colors
      const isDark = (x % 4 === 0 || y % 4 === 0) && Math.random() > 0.3;
      if (isDark) {
        // Dark brown
        data[index] = 101;     // R
        data[index + 1] = 67;  // G
        data[index + 2] = 33;  // B
        data[index + 3] = 255; // A
      } else {
        // Light brown
        data[index] = 140;     // R
        data[index + 1] = 97;  // G
        data[index + 2] = 46;  // B
        data[index + 3] = 255; // A
      }
    }
  }
  return {
    data: Array.from(data),
    width: 16,
    height: 16
  };
}

const woodTexture = createWoodTexture();

export default {
  name: "Example Plugin",
  version: "1.0.0",
  blocks: [
    {
      id: "wood",
      name: "Wood",
      color: [139, 69, 19, 255],
      atlasPos: { top: [0, 0], sides: [0, 0], bottom: [0, 0] },
      textures: {
        top: woodTexture,
        sides: woodTexture,
        bottom: woodTexture
      }
    }
  ]
};
