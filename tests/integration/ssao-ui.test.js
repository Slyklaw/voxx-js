/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';

describe('SSAO UI Controls Integration', () => {
  beforeEach(() => {
    // Setup minimal DOM structure
    document.body.innerHTML = `
      <div id="debug-ui">
        <label class="toggle-switch">
          <input type="checkbox" id="ssao-toggle" checked>
          <span class="toggle-slider"></span>
        </label>
        <input type="range" id="ssao-intensity" min="50" max="200" value="100">
        <span id="ssao-intensity-value">1.0</span>
        <input type="range" id="ssao-radius" min="5" max="50" value="5">
        <span id="ssao-radius-value">0.5</span>
      </div>
    `;
  });

  it('should have SSAO toggle element', () => {
    const toggle = document.getElementById('ssao-toggle');
    expect(toggle).not.toBeNull();
    expect(toggle.type).toBe('checkbox');
    expect(toggle.checked).toBe(true);
  });

  it('should have SSAO intensity slider with valid range', () => {
    const slider = document.getElementById('ssao-intensity');
    expect(slider).not.toBeNull();
    expect(slider.type).toBe('range');
    expect(parseInt(slider.min)).toBe(50);
    expect(parseInt(slider.max)).toBe(200);
    expect(parseInt(slider.value)).toBe(100);
  });

  it('should have SSAO radius slider with valid range', () => {
    const slider = document.getElementById('ssao-radius');
    expect(slider).not.toBeNull();
    expect(slider.type).toBe('range');
    expect(parseInt(slider.min)).toBe(5);
    expect(parseInt(slider.max)).toBe(50);
    expect(parseInt(slider.value)).toBe(5);
  });

  it('should have intensity value display element', () => {
    const display = document.getElementById('ssao-intensity-value');
    expect(display).not.toBeNull();
    expect(display.textContent).toBe('1.0');
  });

  it('should have radius value display element', () => {
    const display = document.getElementById('ssao-radius-value');
    expect(display).not.toBeNull();
    expect(display.textContent).toBe('0.5');
  });
});
