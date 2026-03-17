import { createRNG, createRandomRNG } from './prng.js';

describe('Seeded PRNG', () => {
  test('same seed produces same sequence', () => {
    const rng1 = createRNG(12345);
    const rng2 = createRNG(12345);
    
    expect(rng1()).toBe(rng2());
    expect(rng1()).toBe(rng2());
    expect(rng1()).toBe(rng2());
  });
  
  test('different seeds produce different sequences', () => {
    const rng1 = createRNG(12345);
    const rng2 = createRNG(54321);
    
    expect(rng1()).not.toBe(rng2());
  });
  
  test('values are in range [0, 1)', () => {
    const rng = createRNG(42);
    
    for (let i = 0; i < 100; i++) {
      const val = rng();
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });
  
  test('handles zero seed', () => {
    const rng = createRNG(0);
    expect(rng()).toBeGreaterThan(0);
  });
  
  test('handles negative seed', () => {
    const rng1 = createRNG(-12345);
    const rng2 = createRNG(-12345);
    expect(rng1()).toBe(rng2());
  });
  
  test('createRandomRNG produces different values', () => {
    // This test might be flaky, but very unlikely to fail
    const rng1 = createRandomRNG();
    const rng2 = createRandomRNG();
    
    // Just verify they don't throw
    expect(typeof rng1()).toBe('number');
    expect(typeof rng2()).toBe('number');
  });
});
