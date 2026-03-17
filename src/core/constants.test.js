/**
 * Tests for constants module
 * Validates all game constants are properly defined and follow conventions
 */

import {
  CHUNK_SIZE,
  VIEW_DISTANCE,
  WORLD_SEED_DEFAULT,
  GRAVITY,
  JUMP_STRENGTH,
  WALK_SPEED,
  MOUSE_SENSITIVITY
} from './constants.js';

describe('Game Constants', () => {
  describe('CHUNK_SIZE', () => {
    test('equals 32', () => {
      expect(CHUNK_SIZE).toBe(32);
    });

    test('is a number', () => {
      expect(typeof CHUNK_SIZE).toBe('number');
    });
  });

  describe('VIEW_DISTANCE', () => {
    test('equals 8', () => {
      expect(VIEW_DISTANCE).toBe(8);
    });

    test('is a number', () => {
      expect(typeof VIEW_DISTANCE).toBe('number');
    });
  });

  describe('WORLD_SEED_DEFAULT', () => {
    test('equals 42', () => {
      expect(WORLD_SEED_DEFAULT).toBe(42);
    });

    test('is a number', () => {
      expect(typeof WORLD_SEED_DEFAULT).toBe('number');
    });
  });

  describe('GRAVITY', () => {
    test('equals 20.0', () => {
      expect(GRAVITY).toBe(20.0);
    });

    test('is a positive number', () => {
      expect(typeof GRAVITY).toBe('number');
      expect(GRAVITY).toBeGreaterThan(0);
    });
  });

  describe('JUMP_STRENGTH', () => {
    test('equals 8.0', () => {
      expect(JUMP_STRENGTH).toBe(8.0);
    });

    test('is a positive number', () => {
      expect(typeof JUMP_STRENGTH).toBe('number');
      expect(JUMP_STRENGTH).toBeGreaterThan(0);
    });
  });

  describe('WALK_SPEED', () => {
    test('equals 5.0', () => {
      expect(WALK_SPEED).toBe(5.0);
    });

    test('is a positive number', () => {
      expect(typeof WALK_SPEED).toBe('number');
      expect(WALK_SPEED).toBeGreaterThan(0);
    });
  });

  describe('MOUSE_SENSITIVITY', () => {
    test('equals 0.002', () => {
      expect(MOUSE_SENSITIVITY).toBe(0.002);
    });

    test('is a small positive number', () => {
      expect(typeof MOUSE_SENSITIVITY).toBe('number');
      expect(MOUSE_SENSITIVITY).toBeGreaterThan(0);
      expect(MOUSE_SENSITIVITY).toBeLessThan(1);
    });
  });

  describe('Naming Convention', () => {
    test('all constants use UPPER_SNAKE_CASE', () => {
      const constantNames = [
        'CHUNK_SIZE',
        'VIEW_DISTANCE',
        'WORLD_SEED_DEFAULT',
        'GRAVITY',
        'JUMP_STRENGTH',
        'WALK_SPEED',
        'MOUSE_SENSITIVITY'
      ];

      constantNames.forEach(name => {
        expect(name).toMatch(/^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/);
      });
    });
  });

  describe('Immutability', () => {
    test('constants cannot be reassigned', () => {
      const originalValue = CHUNK_SIZE;
      try {
        // @ts-ignore - intentionally testing assignment
        CHUNK_SIZE = 64;
        expect(CHUNK_SIZE).toBe(originalValue);
      } catch (e) {
        // Assignment should throw in strict mode
        expect(e).toBeDefined();
      }
    });
  });

  describe('All expected constants exist', () => {
    test('exports all required constants', () => {
      expect(CHUNK_SIZE).toBeDefined();
      expect(VIEW_DISTANCE).toBeDefined();
      expect(WORLD_SEED_DEFAULT).toBeDefined();
      expect(GRAVITY).toBeDefined();
      expect(JUMP_STRENGTH).toBeDefined();
      expect(WALK_SPEED).toBeDefined();
      expect(MOUSE_SENSITIVITY).toBeDefined();
    });
  });
});
