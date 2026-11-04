import { gl, registerContextResources } from './context.js';
import { createProgram as createShaderProgram } from './shaders.js';

/**
 * Centralized WebGL resource manager.
 * Owns creation and disposal of WebGL resources (buffers, textures,
 * framebuffers, programs, VAOs) and tracks them for bulk disposal on
 * context loss.
 */
export class ResourceManager {
  constructor(glContext, options = {}) {
    this.gl = glContext;
    this.tracked = new Set();
    this.types = new Map(); // resource -> type string

    const shouldRegister = options.register !== false;
    if (shouldRegister && typeof registerContextResources === 'function' && this.gl) {
      try {
        registerContextResources({
          dispose: () => this.disposeAll(),
          init: () => {
            // Resources are recreated by their owners; nothing to do here.
          }
        });
      } catch (e) {
        // Ignore registration failures (e.g. missing context registry)
      }
    }
  }

  _track(resource, type) {
    if (resource == null) return resource;
    this.tracked.add(resource);
    this.types.set(resource, type);
    return resource;
  }

  createBuffer(data = null, usage = this.gl ? this.gl.STATIC_DRAW : null, target = this.gl ? this.gl.ARRAY_BUFFER : null) {
    const gl = this.gl;
    const buffer = gl.createBuffer();
    if (data !== null && data !== undefined && typeof gl.bindBuffer === 'function') {
      gl.bindBuffer(target, buffer);
      if (typeof gl.bufferData === 'function') gl.bufferData(target, data, usage);
      gl.bindBuffer(target, null);
    }
    return this._track(buffer, 'buffer');
  }

  createTexture() {
    const gl = this.gl;
    const texture = gl.createTexture();
    return this._track(texture, 'texture');
  }

  createFramebuffer() {
    const gl = this.gl;
    const fbo = gl.createFramebuffer();
    return this._track(fbo, 'framebuffer');
  }

  createVAO() {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    return this._track(vao, 'vao');
  }

  createProgram(vertexSource, fragmentSource) {
    const program = createShaderProgram(this.gl, vertexSource, fragmentSource);
    return this._track(program, 'program');
  }

  dispose(resource) {
    if (resource == null) return;
    const gl = this.gl;
    const type = this.types.get(resource);

    // Handle objects exposing a dispose method
    if (resource && typeof resource.dispose === 'function' && type === undefined) {
      try { resource.dispose(); } catch (e) { /* ignore */ }
      this.tracked.delete(resource);
      return;
    }

    try {
      switch (type) {
        case 'buffer':
          gl.deleteBuffer(resource);
          break;
        case 'texture':
          gl.deleteTexture(resource);
          break;
        case 'framebuffer':
          gl.deleteFramebuffer(resource);
          break;
        case 'vao':
          gl.deleteVertexArray(resource);
          break;
        case 'program':
          gl.deleteProgram(resource);
          break;
        default:
          // Best-effort deletion for untracked resources
          try { gl.deleteBuffer(resource); } catch (e) {}
          try { gl.deleteTexture(resource); } catch (e) {}
          try { gl.deleteFramebuffer(resource); } catch (e) {}
          try { gl.deleteVertexArray(resource); } catch (e) {}
          try { gl.deleteProgram(resource); } catch (e) {}
          break;
      }
    } catch (e) {
      // Ignore disposal errors
    }

    this.tracked.delete(resource);
    this.types.delete(resource);
  }

  disposeAll() {
    const snapshot = Array.from(this.tracked);
    for (const resource of snapshot) {
      this.dispose(resource);
    }
    this.tracked.clear();
    this.types.clear();
  }
}

// Factory helper
export function createResourceManager(glContext, options) {
  return new ResourceManager(glContext, options);
}

// Singleton bound to shared gl from context.js
export const resourceManager = gl ? new ResourceManager(gl) : null;

// Lazy integration with shaders createProgram: patch createProgram to track programs if used.
// We expose a helper to register a program created externally.
export function trackProgram(resource) {
  if (resourceManager) {
    return resourceManager._track(resource, 'program');
  }
  return resource;
}
