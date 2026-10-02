const FPS_SAMPLE_SIZE = 60;

let frameTimes = [];
let renderTimes = [];
let lastFrameTime = 0;
let fps = 0;
let estimatedFPS = 0;
let frameTime = 0;
let renderTime = 0;
let minFrameTime = Infinity;
let maxFrameTime = 0;
let minRenderTime = Infinity;
let maxRenderTime = 0;
let totalFrames = 0;
let fpsUpdateCounter = 0;
let fpsUpdateInterval = 60;
let renderStartTime = 0;

// Draw call tracking
let drawCalls = 0;

// Memory tracking
const MEMORY_SAMPLE_SIZE = 60;
let memorySamples = [];

export function initPerformance() {
  frameTimes = [];
  renderTimes = [];
  lastFrameTime = 0;
  fps = 0;
  estimatedFPS = 0;
  frameTime = 0;
  renderTime = 0;
  minFrameTime = Infinity;
  maxFrameTime = 0;
  minRenderTime = Infinity;
  maxRenderTime = 0;
  totalFrames = 0;
  fpsUpdateCounter = 0;
  drawCalls = 0;
  memorySamples = [];
}

export function beginRenderTiming() {
  renderStartTime = performance.now();
}

export function endRenderTiming() {
  const now = performance.now();
  renderTime = now - renderStartTime;
  
  renderTimes.push(renderTime);
  if (renderTimes.length > FPS_SAMPLE_SIZE) {
    renderTimes.shift();
  }
  
  if (renderTime < minRenderTime && renderTime > 0) {
    minRenderTime = renderTime;
  }
  if (renderTime > maxRenderTime) {
    maxRenderTime = renderTime;
  }
}

export function beginDrawCalls() {
  drawCalls = 0;
}

export function incrementDrawCalls(n = 1) {
  drawCalls += n;
}

export function getDrawCalls() {
  return drawCalls;
}

export function updateMemoryMetrics() {
  // performance.memory is Chrome-specific; undefined on Safari/Firefox
  if (typeof performance !== 'undefined' && performance.memory) {
    const usedMB = performance.memory.usedJSHeapSize / (1024 * 1024);
    memorySamples.push(usedMB);
    if (memorySamples.length > MEMORY_SAMPLE_SIZE) {
      memorySamples.shift();
    }
  }
}

export function getCurrentMemoryMB() {
  if (memorySamples.length > 0) {
    return memorySamples[memorySamples.length - 1];
  }
  return null;
}

export function getAverageMemoryMB() {
  if (memorySamples.length === 0) return null;
  const sum = memorySamples.reduce((a, b) => a + b, 0);
  return sum / memorySamples.length;
}

export function getPeakMemoryMB() {
  if (memorySamples.length === 0) return null;
  return Math.max(...memorySamples);
}

export function beginFrame(timestamp) {
  drawCalls = 0; // Reset draw call count at start of each frame
  updateMemoryMetrics(); // Track memory usage each frame
  if (lastFrameTime === 0) {
    lastFrameTime = timestamp;
    return 0;
  }
  
  const deltaTime = timestamp - lastFrameTime;
  lastFrameTime = timestamp;
  
  frameTime = deltaTime;
  
  frameTimes.push(deltaTime);
  if (frameTimes.length > FPS_SAMPLE_SIZE) {
    frameTimes.shift();
  }
  
  totalFrames++;
  fpsUpdateCounter++;
  
  if (fpsUpdateCounter >= fpsUpdateInterval) {
    fpsUpdateCounter = 0;
    updateFPS();
  }
  
  if (deltaTime < minFrameTime && deltaTime > 0) {
    minFrameTime = deltaTime;
  }
  if (deltaTime > maxFrameTime) {
    maxFrameTime = deltaTime;
  }
  
  return deltaTime;
}

function updateFPS() {
  if (frameTimes.length === 0) {
    fps = 0;
    estimatedFPS = 0;
    return;
  }
  
  let sum = 0;
  for (let i = 0; i < frameTimes.length; i++) {
    sum += frameTimes[i];
  }
  const averageFrameTime = sum / frameTimes.length;
  fps = Math.round(1000 / averageFrameTime);
  
  let renderSum = 0;
  for (let i = 0; i < renderTimes.length; i++) {
    renderSum += renderTimes[i];
  }
  const averageRenderTime = renderSum / renderTimes.length;
  estimatedFPS = Math.round(1000 / averageRenderTime);
}

export function getFPS() {
  return estimatedFPS;
}

export function getFPSDisplay() {
  return fps;
}

export function getRenderTime() {
  return renderTime;
}

export function getMetrics() {
  return {
    fps,
    estimatedFPS,
    frameTime,
    renderTime,
    drawCalls,
    currentMemoryMB: getCurrentMemoryMB(),
    averageMemoryMB: getAverageMemoryMB(),
    peakMemoryMB: getPeakMemoryMB(),
    minFrameTime: minFrameTime === Infinity ? 0 : minFrameTime,
    maxFrameTime,
    minRenderTime: minRenderTime === Infinity ? 0 : minRenderTime,
    maxRenderTime,
    totalFrames,
    averageFrameTime: frameTimes.length > 0 
      ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length 
      : 0,
    averageRenderTime: renderTimes.length > 0
      ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length
      : 0
  };
}

export function resetMetrics() {
  minFrameTime = Infinity;
  maxFrameTime = 0;
  minRenderTime = Infinity;
  maxRenderTime = 0;
  totalFrames = 0;
  frameTimes = [];
  renderTimes = [];
}

// FPS warning throttling - warn once per 5 seconds to avoid spam
let lastFPSWarningTime = 0;
const FPS_WARNING_INTERVAL = 5000; // 5 seconds in ms
const FPS_WARNING_THRESHOLD = 50;

export function checkFPSWarning() {
  const currentFPS = getFPS();
  
  // Skip warning if:
  // - FPS is 0 (context loss, initial load, or no frames yet)
  // - FPS is above threshold
  // - Already warned within the last 5 seconds
  if (currentFPS <= 0 || currentFPS >= FPS_WARNING_THRESHOLD) {
    return;
  }
  
  const now = performance.now();
  if (now - lastFPSWarningTime < FPS_WARNING_INTERVAL) {
    return;
  }
  
  lastFPSWarningTime = now;
  console.warn(`Low FPS detected: ${currentFPS} fps - consider reducing quality settings`);
}

import { DEBUG } from '../../config.js';

export function logPerformance() {
  if (!DEBUG) return;
  const metrics = getMetrics();
  let memStr = '';
  if (metrics.currentMemoryMB !== null) {
    memStr = ` | Mem: ${metrics.currentMemoryMB.toFixed(1)}MB (avg: ${metrics.averageMemoryMB.toFixed(1)}MB, peak: ${metrics.peakMemoryMB.toFixed(1)}MB)`;
  }
  console.log(`[Performance] FPS: ${metrics.fps} | Est: ${metrics.estimatedFPS} | Frame: ${metrics.frameTime.toFixed(2)}ms | Render: ${metrics.renderTime.toFixed(2)}ms | DrawCalls: ${metrics.drawCalls}${memStr} | Avg: ${metrics.averageFrameTime.toFixed(2)}ms`);
}
