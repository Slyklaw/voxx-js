// Jest setup file - runs before test environment initialization
// Provides minimal browser globals for modules with browser dependencies

if (typeof global !== 'undefined') {
  global.window = global.window || {
    innerWidth: 1920,
    innerHeight: 1080,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  
  global.document = global.document || {
    getElementById: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
  };
  
  global.requestAnimationFrame = global.requestAnimationFrame || (() => {});
}
