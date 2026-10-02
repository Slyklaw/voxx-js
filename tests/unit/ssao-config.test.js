import { describe, it, expect } from 'vitest';
import { SSAO_CONFIG } from '../../config.js';

describe('SSAO Configuration', () => {
  it('should export SSAO_CONFIG', () => {
    expect(SSAO_CONFIG).toBeDefined();
    expect(typeof SSAO_CONFIG).toBe('object');
  });

  it('should have ENABLED boolean', () => {
    expect(typeof SSAO_CONFIG.ENABLED).toBe('boolean');
  });

  it('should have INTENSITY in valid range (0.5-2.0)', () => {
    expect(SSAO_CONFIG.INTENSITY).toBeGreaterThanOrEqual(0.5);
    expect(SSAO_CONFIG.INTENSITY).toBeLessThanOrEqual(2.0);
  });

  it('should have RADIUS in valid range (0.5-5.0)', () => {
    expect(SSAO_CONFIG.RADIUS).toBeGreaterThanOrEqual(0.5);
    expect(SSAO_CONFIG.RADIUS).toBeLessThanOrEqual(5.0);
  });

  it('should have BIAS as positive number', () => {
    expect(typeof SSAO_CONFIG.BIAS).toBe('number');
    expect(SSAO_CONFIG.BIAS).toBeGreaterThan(0);
  });

  it('should have KERNEL_SIZE as integer', () => {
    expect(Number.isInteger(SSAO_CONFIG.KERNEL_SIZE)).toBe(true);
  });
});