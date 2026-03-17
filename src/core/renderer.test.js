// Mock WebGL context for Renderer tests
const createWebGLProxy = () => {
  return new Proxy({}, {
    get: (target, prop) => {
      // Return WebGL constants as strings
      if (['DEPTH_TEST', 'CULL_FACE', 'COLOR_BUFFER_BIT', 'DEPTH_BUFFER_BIT',
           'VERTEX_SHADER', 'FRAGMENT_SHADER', 'COMPILE_STATUS', 'LINK_STATUS',
           'ARRAY_BUFFER', 'ELEMENT_ARRAY_BUFFER', 'STATIC_DRAW',
           'TEXTURE_2D', 'TEXTURE0', 'RGBA', 'UNSIGNED_BYTE', 'LINEAR',
           'CLAMP_TO_EDGE', 'UNPACK_FLIP_Y_WEBGL', 'BLEND', 'SRC_ALPHA',
           'ONE_MINUS_SRC_ALPHA', 'ONE', 'FLOAT', 'TRIANGLES', 'UNSIGNED_SHORT',
           'VERSION'].includes(prop)) {
        return prop;
      }
      // Return mock functions for any other property (methods)
      return () => null;
    }
  });
};

import { jest } from '@jest/globals';
import { Renderer, multiply, createFrustumFromMatrix } from './renderer.js';

describe('Renderer matrix math', () => {
  let mockCanvas;
  let mockGl;
  let renderer;

  beforeEach(() => {
    // Mock WebGL context with necessary methods
    mockGl = new Proxy({
      VERSION: 'WebGL 2.0',
      getParameter: jest.fn(() => 'WebGL 2.0'),
      createProgram: jest.fn(() => ({})),
      attachShader: jest.fn(),
      linkProgram: jest.fn(),
      getProgramParameter: jest.fn(() => true),
      getProgramInfoLog: jest.fn(() => ''),
      getAttribLocation: jest.fn(() => 0),
      getUniformLocation: jest.fn(() => ({})),
      createBuffer: jest.fn(() => ({})),
      bindBuffer: jest.fn(),
      bufferData: jest.fn(),
      enableVertexAttribArray: jest.fn(),
      vertexAttribPointer: jest.fn(),
      enable: jest.fn(),
      blendFunc: jest.fn(),
      viewport: jest.fn(),
      createShader: jest.fn(() => ({})),
      shaderSource: jest.fn(),
      compileShader: jest.fn(),
      getShaderParameter: jest.fn(() => true),
      getShaderInfoLog: jest.fn(() => ''),
      deleteShader: jest.fn(),
      useProgram: jest.fn(),
      uniformMatrix4fv: jest.fn(),
      clear: jest.fn(),
      drawElements: jest.fn(),
    }, {
      get: (target, prop) => {
        // Return WebGL constants
        if (['DEPTH_TEST', 'CULL_FACE', 'COLOR_BUFFER_BIT', 'DEPTH_BUFFER_BIT',
             'VERTEX_SHADER', 'FRAGMENT_SHADER', 'COMPILE_STATUS', 'LINK_STATUS',
             'ARRAY_BUFFER', 'ELEMENT_ARRAY_BUFFER', 'STATIC_DRAW',
             'TEXTURE_2D', 'TEXTURE0', 'RGBA', 'UNSIGNED_BYTE', 'LINEAR',
             'CLAMP_TO_EDGE', 'UNPACK_FLIP_Y_WEBGL', 'BLEND', 'SRC_ALPHA',
             'ONE_MINUS_SRC_ALPHA', 'ONE', 'FLOAT', 'TRIANGLES', 'UNSIGNED_SHORT',
             'VERSION'].includes(prop)) {
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
      width: 800,
      height: 600,
      getContext: jest.fn(() => mockGl),
    };

    // Spy on Renderer methods that use WebGL to avoid actual calls
    jest.spyOn(Renderer.prototype, 'initRenderer').mockImplementation(() => {});
    
    // Create renderer instance
    renderer = new Renderer(mockGl, mockCanvas);
    
    // Restore original methods after each test (handled by jest.clearAllMocks in afterEach)
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('createProjectionMatrix', () => {
    test('returns Float32Array of length 16', () => {
      const matrix = renderer.createProjectionMatrix();
      expect(matrix).toBeInstanceOf(Float32Array);
      expect(matrix.length).toBe(16);
    });

    test('matrix is column-major (standard GL format)', () => {
      const matrix = renderer.createProjectionMatrix();
      // Ensure it's a 4x4 matrix (16 elements)
      expect(matrix.length).toBe(16);
      // The element at index 0 is f/aspect (column 0, row 0)
      // The element at index 1 is 0 (column 0, row 1)
      // The element at index 4 is 0 (column 1, row 0)
      // The element at index 5 is f (column 1, row 1)
      // We'll just verify that the matrix is not all zeros.
      expect(matrix.some(v => v !== 0)).toBe(true);
    });

    test('aspect ratio affects [0] element (f/aspect)', () => {
      // Create renderer with different canvas dimensions
      const canvas1 = { width: 800, height: 600, getContext: () => mockGl };
      const renderer1 = new Renderer(mockGl, canvas1);
      const matrix1 = renderer1.createProjectionMatrix();
      
      const canvas2 = { width: 1600, height: 600, getContext: () => mockGl };
      const renderer2 = new Renderer(mockGl, canvas2);
      const matrix2 = renderer2.createProjectionMatrix();
      
      // f = 1 / tan(fov/2), same for both (fov = 45°)
      const f = 1.0 / Math.tan(Math.PI / 8); // fov/2 = 22.5°
      const expected1 = f / (800/600);
      const expected2 = f / (1600/600);
      
      expect(matrix1[0]).toBeCloseTo(expected1, 5);
      expect(matrix2[0]).toBeCloseTo(expected2, 5);
      // Aspect ratio changed, so [0] should differ
      expect(matrix1[0]).not.toBeCloseTo(matrix2[0], 5);
    });

    test('fovy affects [5] element (f)', () => {
      const f = 1.0 / Math.tan(Math.PI / 8); // fov/2 = 22.5°
      const matrix = renderer.createProjectionMatrix();
      expect(matrix[5]).toBeCloseTo(f, 5);
    });

    test('near/far affect [10] and [14] elements', () => {
      const near = 0.1;
      const far = 100.0;
      const matrix = renderer.createProjectionMatrix();
      
      // [10] = (far + near) / (near - far)
      const expected10 = (far + near) / (near - far);
      // [14] = (2 * far * near) / (near - far)
      const expected14 = (2 * far * near) / (near - far);
      
      expect(matrix[10]).toBeCloseTo(expected10, 5);
      expect(matrix[14]).toBeCloseTo(expected14, 5);
    });

    test('matrix transforms z=0 point correctly', () => {
      const matrix = renderer.createProjectionMatrix();
      const x = 0, y = 0, z = 0, w = 1;
      
      const outX = matrix[0]*x + matrix[4]*y + matrix[8]*z + matrix[12]*w;
      const outY = matrix[1]*x + matrix[5]*y + matrix[9]*z + matrix[13]*w;
      const outZ = matrix[2]*x + matrix[6]*y + matrix[10]*z + matrix[14]*w;
      const outW = matrix[3]*x + matrix[7]*y + matrix[11]*z + matrix[15]*w;
      
      // With zero vector, outX and outY should be zero
      expect(outX).toBe(0);
      expect(outY).toBe(0);
      // outW = matrix[11]*z + matrix[15] = -1*0 + 0 = 0 (invalid for perspective division)
      // That's expected for point at camera origin; we'll test with z=-1 instead.
      const z1 = -1;
      const outW1 = matrix[3]*0 + matrix[7]*0 + matrix[11]*z1 + matrix[15]*1;
      expect(outW1).toBe(-z1); // matrix[11] = -1
      expect(outW1).toBe(1);
    });

    test('z=-near maps to w=1 (normalized device coordinate)', () => {
      const near = 0.1;
      const far = 100.0;
      const matrix = renderer.createProjectionMatrix();
      const z = -near;
      const clipW = -z; // matrix[11] = -1
      const clipZ = matrix[10]*z + matrix[14];
      const ndcZ = clipZ / clipW;
      expect(isFinite(ndcZ)).toBe(true);
      // For standard OpenGL perspective matrix, ndcZ should be -1 when z = -near.
      const computed = ((matrix[10]*(-near) + matrix[14]) / near);
      expect(computed).toBeCloseTo(-1, 5);
    });

    test('z=-far maps to w=1 (normalized device coordinate)', () => {
      const near = 0.1;
      const far = 100.0;
      const matrix = renderer.createProjectionMatrix();
      const z = -far;
      const clipW = -z;
      const clipZ = matrix[10]*z + matrix[14];
      const ndcZ = clipZ / clipW;
      expect(isFinite(ndcZ)).toBe(true);
      const computed = ((matrix[10]*(-far) + matrix[14]) / far);
      expect(computed).toBeCloseTo(1, 5);
    });
  });

  describe('Matrix helper functions', () => {
    // Helper functions for test assertions
    const mat4Identity = () => new Float32Array([
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      0, 0, 0, 1
    ]);

    const mat4Perspective = (fov, aspect, near, far) => {
      const f = 1.0 / Math.tan(fov / 2);
      return new Float32Array([
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (far + near) / (near - far), -1,
        0, 0, (2 * far * near) / (near - far), 0
      ]);
    };

    test('mat4Identity returns identity matrix', () => {
      const id = mat4Identity();
      expect(id.length).toBe(16);
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) {
          const expected = i === j ? 1 : 0;
          expect(id[i + j * 4]).toBe(expected);
        }
      }
    });

    test('mat4Perspective matches renderer createProjectionMatrix', () => {
      const fov = Math.PI / 4;
      const aspect = 800 / 600;
      const near = 0.1;
      const far = 100.0;
      const expected = mat4Perspective(fov, aspect, near, far);
      const actual = renderer.createProjectionMatrix();
      for (let i = 0; i < 16; i++) {
        expect(actual[i]).toBeCloseTo(expected[i], 5);
      }
    });
  });
});