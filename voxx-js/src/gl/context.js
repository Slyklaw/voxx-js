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
const resourceRegistry = [];

function isContextLost() {
  return contextLost;
}

function handleContextLost(event) {
  event.preventDefault();
  contextLost = true;
  resourceRegistry.forEach(({ dispose }) => dispose());
  contextLossListeners.forEach(callback => callback());
  return true;
}

function handleContextRestored() {
  contextLost = false;
  resourceRegistry.forEach(({ init }) => init());
  contextLossListeners.forEach(callback => callback());
}

function registerContextResources({ dispose, init }) {
  resourceRegistry.push({ dispose, init });
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
  resourceRegistry.forEach(({ init }) => init());
}

if (canvas) {
  canvas.addEventListener('webglcontextlost', handleContextLost);
  canvas.addEventListener('webglcontextrestored', handleContextRestored);
}

export {
  gl,
  canvas,
  isContextLost,
  registerContextResources,
  addContextLossListener,
  removeContextLossListener
};
