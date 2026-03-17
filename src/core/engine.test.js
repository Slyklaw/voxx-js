// Set up global window mock BEFORE importing Engine
// Use Proxy to handle any WebGL method call
const createWebGLProxy = () => {
  return new Proxy({}, {
    get: (target, prop) => {
      // Return WebGL constants as strings
      if (['DEPTH_TEST', 'CULL_FACE', 'COLOR_BUFFER_BIT', 'DEPTH_BUFFER_BIT',
           'VERTEX_SHADER', 'FRAGMENT_SHADER', 'COMPILE_STATUS', 'LINK_STATUS',
           'ARRAY_BUFFER', 'ELEMENT_ARRAY_BUFFER', 'STATIC_DRAW',
           'TEXTURE_2D', 'TEXTURE0', 'RGBA', 'UNSIGNED_BYTE', 'LINEAR',
           'CLAMP_TO_EDGE', 'UNPACK_FLIP_Y_WEBGL', 'BLEND', 'SRC_ALPHA',
           'ONE_MINUS_SRC_ALPHA', 'ONE', 'FLOAT'].includes(prop)) {
        return prop;
      }
      // Return mock functions for any other property (methods)
      return () => null;
    }
  });
};

global.window = {
  innerWidth: 1920,
  innerHeight: 1080,
  addEventListener: () => {},
  removeEventListener: () => {},
};
global.document = {
  getElementById: () => ({
    width: 1920,
    height: 1080,
    getContext: () => createWebGLProxy(),
  }),
  addEventListener: () => {},
};
global.requestAnimationFrame = () => {};

import { jest } from '@jest/globals';
import { Engine } from './engine.js';

describe('Engine initialization', () => {
  let mockCanvas;
  let mockGl;
  
  beforeEach(() => {
    // Mock WebGL context - use Proxy to handle all method calls
    mockGl = new Proxy({
      clearColor: jest.fn(),
      enable: jest.fn(),
      viewport: jest.fn(),
      clear: jest.fn(),
    }, {
      get: (target, prop) => {
        // Return WebGL constants
        if (['DEPTH_TEST', 'CULL_FACE', 'COLOR_BUFFER_BIT', 'DEPTH_BUFFER_BIT',
             'VERTEX_SHADER', 'FRAGMENT_SHADER', 'COMPILE_STATUS', 'LINK_STATUS',
             'ARRAY_BUFFER', 'ELEMENT_ARRAY_BUFFER', 'STATIC_DRAW',
             'TEXTURE_2D', 'TEXTURE0', 'RGBA', 'UNSIGNED_BYTE', 'LINEAR',
             'CLAMP_TO_EDGE', 'UNPACK_FLIP_Y_WEBGL', 'BLEND', 'SRC_ALPHA',
             'ONE_MINUS_SRC_ALPHA', 'ONE', 'FLOAT'].includes(prop)) {
          return prop;
        }
        // Return existing mock from target
        if (prop in target) {
          return target[prop];
        }
        // Return jest.fn() for any other method
        return jest.fn();
      }
    });
    
    mockCanvas = {
      width: 1920,
      height: 1080,
      getContext: jest.fn(() => mockGl),
    };
    
    global.document = {
      getElementById: jest.fn(() => mockCanvas),
      addEventListener: jest.fn(),
    };
    
    global.window = {
      innerWidth: 1920,
      innerHeight: 1080,
      addEventListener: jest.fn(),
    };
    
    global.requestAnimationFrame = jest.fn();
  });
  
  test('constructor initializes canvas reference', () => {
    const engine = new Engine();
    expect(engine.canvas).toBe(mockCanvas);
  });
  
  test('constructor sets canvas dimensions', () => {
    const engine = new Engine();
    expect(mockCanvas.width).toBe(1920);
    expect(mockCanvas.height).toBe(1080);
  });
  
  test('constructor gets WebGL context', () => {
    const engine = new Engine();
    // Engine tries webgl2 first, then falls back to webgl
    expect(mockCanvas.getContext).toHaveBeenCalledWith('webgl2');
    expect(engine.gl).toBe(mockGl);
  });
  
  test('constructor enables depth testing', () => {
    const engine = new Engine();
    expect(mockGl.enable).toHaveBeenCalledWith('DEPTH_TEST');
  });
  
  test('constructor enables culling', () => {
    const engine = new Engine();
    expect(mockGl.enable).toHaveBeenCalledWith('CULL_FACE');
  });
  
  test('onResize updates canvas dimensions', () => {
    global.window.innerWidth = 2560;
    global.window.innerHeight = 1440;
    
    const engine = new Engine();
    engine.onResize();
    
    expect(mockCanvas.width).toBe(2560);
    expect(mockCanvas.height).toBe(1440);
    expect(mockGl.viewport).toHaveBeenCalledWith(0, 0, 2560, 1440);
  });
  
  test('start sets running flag', () => {
    const engine = new Engine();
    engine.running = false;
    engine.start();
    expect(engine.running).toBe(true);
  });
  
  test('start does nothing if already running', () => {
    const engine = new Engine();
    engine.running = true;
    const initialRunning = engine.running;
    engine.start();
    expect(engine.running).toBe(initialRunning);
  });
});

describe('Engine initSystems error handling', () => {
  let mockCanvas;
  let mockGl;
  
  beforeEach(() => {
    mockGl = new Proxy({}, {
      get: (target, prop) => {
        if (['DEPTH_TEST', 'CULL_FACE', 'COLOR_BUFFER_BIT', 'DEPTH_BUFFER_BIT'].includes(prop)) {
          return prop;
        }
        return jest.fn();
      }
    });
    
    mockCanvas = {
      width: 1920,
      height: 1080,
      getContext: jest.fn(() => mockGl),
    };
    
    global.document = {
      getElementById: jest.fn(() => mockCanvas),
      addEventListener: jest.fn(),
    };
    
    global.window = {
      innerWidth: 1920,
      innerHeight: 1080,
      addEventListener: jest.fn(),
    };
    
    global.requestAnimationFrame = jest.fn();
  });
  
  test('constructor does not throw when initSystems fails', () => {
    // The catch handler in the constructor should prevent unhandled rejections
    // When modules fail to load, the error is caught and logged, not thrown
    expect(() => new Engine()).not.toThrow();
  });
  
  test('catch handler is attached to initSystems call', async () => {
    // Read the source to verify the catch handler pattern exists
    const fs = await import('fs');
    const engineSource = fs.readFileSync('./src/core/engine.js', 'utf8');
    
    // Verify the catch handler pattern exists after initSystems call
    expect(engineSource).toMatch(/initSystems\(\)\.catch\(/);
  });
});
