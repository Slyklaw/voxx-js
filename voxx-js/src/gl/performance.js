const FPS_SAMPLE_SIZE = 60;

let frameTimes = [];
let lastFrameTime = 0;
let fps = 0;
let frameTime = 0;
let minFrameTime = Infinity;
let maxFrameTime = 0;
let totalFrames = 0;
let fpsUpdateCounter = 0;
let fpsUpdateInterval = 60;

export function initPerformance() {
  frameTimes = [];
  lastFrameTime = 0;
  fps = 0;
  frameTime = 0;
  minFrameTime = Infinity;
  maxFrameTime = 0;
  totalFrames = 0;
  fpsUpdateCounter = 0;
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
    return;
  }
  
  let sum = 0;
  for (let i = 0; i < frameTimes.length; i++) {
    sum += frameTimes[i];
  }
  const averageFrameTime = sum / frameTimes.length;
  fps = Math.round(1000 / averageFrameTime);
}

export function getFPS() {
  return fps;
}

export function getFrameTime() {
  return frameTime;
}

export function getMetrics() {
  return {
    fps,
    frameTime,
    minFrameTime: minFrameTime === Infinity ? 0 : minFrameTime,
    maxFrameTime,
    totalFrames,
    averageFrameTime: frameTimes.length > 0 
      ? frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length 
      : 0
  };
}

export function resetMetrics() {
  minFrameTime = Infinity;
  maxFrameTime = 0;
  totalFrames = 0;
  frameTimes = [];
}

export function logPerformance() {
  const metrics = getMetrics();
  console.log(`[Performance] FPS: ${metrics.fps} | Frame: ${metrics.frameTime.toFixed(2)}ms | Avg: ${metrics.averageFrameTime.toFixed(2)}ms | Min: ${metrics.minFrameTime.toFixed(2)}ms | Max: ${metrics.maxFrameTime.toFixed(2)}ms`);
}
