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

export function beginFrame(timestamp) {
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

import { DEBUG } from '../../config.js';

export function logPerformance() {
  if (!DEBUG) return;
  const metrics = getMetrics();
  console.log(`[Performance] FPS: ${metrics.fps} | Est: ${metrics.estimatedFPS} | Frame: ${metrics.frameTime.toFixed(2)}ms | Render: ${metrics.renderTime.toFixed(2)}ms | Avg: ${metrics.averageFrameTime.toFixed(2)}ms`);
}
