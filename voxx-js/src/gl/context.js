const canvas = document.getElementById('canvas');

const gl = canvas.getContext('webgl2', {
  antialias: true,
  alpha: false,
  depth: true,
  stencil: false,
  premultipliedAlpha: false
});

let contextLost = false;
const contextLossListeners = [];

function isContextLost() {
  return contextLost;
}

function handleContextLost(event) {
  event.preventDefault();
  contextLost = true;
  contextLossListeners.forEach(callback => callback());
  return true;
}

function handleContextRestored() {
  contextLost = false;
  initWebGLResources();
}

function addContextLossListener(callback) {
  contextLossListeners.push(callback);
}

function removeContextLossListener(callback) {
  const index = contextLossListeners.indexOf(callback);
  if (index > -1) {
    contextLossListeners.splice(index, 1);
  }
}

function initWebGLResources() {
  // Re-initialize all WebGL resources (shaders, buffers, etc.)
  // This is called when context is restored
}

if (canvas) {
  canvas.addEventListener('webglcontextlost', handleContextLost);
  canvas.addEventListener('webglcontextrestored', handleContextRestored);
}

export {
  gl,
  canvas,
  isContextLost,
  addContextLossListener,
  removeContextLossListener
};
