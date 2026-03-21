/**
 * Framebuffer Object (FBO) utilities for offscreen rendering
 * Provides G-buffer factory functions for deferred rendering and SSAO
 */

import { DEBUG } from '../../config.js';

/**
 * Check if float texture extensions are supported and test actual allocation
 * @param {WebGL2RenderingContext} gl
 * @returns {{ supported: boolean, format: number, internalFormat: number, type: number }}
 */
export function checkFloatTextureSupport(gl) {
  // Check for the extension
  const ext = gl.getExtension('EXT_color_buffer_float');
  if (!ext) {
    if (DEBUG) console.log('[FBO] EXT_color_buffer_float not available, using RGBA8 fallback');
    return {
      supported: false,
      format: gl.RGBA8,
      internalFormat: gl.RGBA8,
      type: gl.UNSIGNED_BYTE,
      normalFormat: gl.RG8,
      normalInternalFormat: gl.RG8
    };
  }

  // Test actual allocation by creating a small RGBA16F texture
  const testTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, testTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, 4, 4, 0, gl.RGBA, gl.HALF_FLOAT, null);
  
  const testFBO = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, testFBO);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, testTexture, 0);
  
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  const supported = status === gl.FRAMEBUFFER_COMPLETE;
  
  // Cleanup
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.deleteFramebuffer(testFBO);
  gl.deleteTexture(testTexture);
  
  if (DEBUG) {
    console.log(`[FBO] Float texture allocation test: ${supported ? 'PASSED' : 'FAILED'}`);
  }
  
  if (!supported) {
    return {
      supported: false,
      format: gl.RGBA8,
      internalFormat: gl.RGBA8,
      type: gl.UNSIGNED_BYTE,
      normalFormat: gl.RG8,
      normalInternalFormat: gl.RG8
    };
  }
  
  return {
    supported: true,
    format: gl.RGBA16F,
    internalFormat: gl.RGBA16F,
    type: gl.HALF_FLOAT,
    normalFormat: gl.RG16F,
    normalInternalFormat: gl.RG16F
  };
}

/**
 * Create a G-buffer FBO with multiple render targets
 * @param {WebGL2RenderingContext} gl
 * @param {number} width
 * @param {number} height
 * @param {{ supported: boolean, format: number, internalFormat: number, type: number, normalFormat: number, normalInternalFormat: number }} supportInfo
 * @returns {{ fbo: WebGLFramebuffer, color: WebGLTexture[], depth: WebGLTexture, width: number, height: number, isFloatFallback: boolean, dispose: () => void }}
 */
export function createGBufferFBO(gl, width, height, supportInfo) {
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  
  // Determine formats based on float support
  const isFloatFallback = !supportInfo.supported;
  const colorFormat = supportInfo.internalFormat;
  const colorType = supportInfo.type;
  const normalFormat = supportInfo.normalInternalFormat;
  const normalType = supportInfo.type;
  
  // Color attachment 0: RGBA for albedo.rgb + placeholder
  const color0 = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, color0);
  gl.texImage2D(gl.TEXTURE_2D, 0, colorFormat, width, height, 0, gl.RGBA, colorType, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, color0, 0);
  
  // Color attachment 1: RG for oct-encoded view-space normals
  const color1 = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, color1);
  gl.texImage2D(gl.TEXTURE_2D, 0, normalFormat, width, height, 0, gl.RG, normalType, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, color1, 0);
  
  // Color attachment 2: RGBA for view-space position (for SSAO)
  const color2 = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, color2);
  gl.texImage2D(gl.TEXTURE_2D, 0, colorFormat, width, height, 0, gl.RGBA, colorType, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT2, gl.TEXTURE_2D, color2, 0);
  
  // Depth attachment for depth testing
  const depth = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, depth);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0);
  
  // Enable MRT with 3 color attachments
  gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1, gl.COLOR_ATTACHMENT2]);
  
  // Validate FBO completeness
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    console.error(`[FBO] G-buffer FBO incomplete: ${status.toString(16)}`);
    disposeGBuffer(gl, { fbo, color: [color0, color1], depth });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    throw new Error(`G-buffer FBO incomplete: ${status.toString(16)}`);
  }
  
  if (DEBUG) {
    console.log(`[FBO] G-buffer created: ${width}x${height}, float=${!isFloatFallback}`);
  }
  
  // Unbind FBO
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  
  const gbuffer = {
    fbo,
    color: [color0, color1, color2],
    depth,
    width,
    height,
    isFloatFallback
  };
  
  gbuffer.dispose = () => disposeGBuffer(gl, gbuffer);
  
  return gbuffer;
}

/**
 * Recreate G-buffer textures at new resolution
 * @param {WebGL2RenderingContext} gl
 * @param {object} gbuffer - Current gbuffer object
 * @param {number} width - New width
 * @param {number} height - New height
 * @param {object} supportInfo - Float texture support info
 * @returns {object} New gbuffer object
 */
export function resizeGBuffer(gl, gbuffer, width, height, supportInfo) {
  if (gbuffer.width === width && gbuffer.height === height) {
    return gbuffer;
  }
  
  // Dispose old resources
  disposeGBuffer(gl, gbuffer);
  
  // Create new gbuffer at new resolution
  return createGBufferFBO(gl, width, height, supportInfo);
}

/**
 * Cleanup all GPU resources associated with a G-buffer
 * @param {WebGL2RenderingContext} gl
 * @param {object} gbuffer - G-buffer object to dispose
 */
export function disposeGBuffer(gl, gbuffer) {
  if (!gbuffer) return;
  
  if (gbuffer.fbo) {
    gl.deleteFramebuffer(gbuffer.fbo);
    gbuffer.fbo = null;
  }
  
  if (gbuffer.color) {
    gbuffer.color.forEach(texture => {
      if (texture) gl.deleteTexture(texture);
    });
    gbuffer.color = [];
  }
  
  if (gbuffer.depth) {
    gl.deleteTexture(gbuffer.depth);
    gbuffer.depth = null;
  }
  
  if (DEBUG) console.log('[FBO] G-buffer disposed');
}

/**
 * Create a half-resolution SSAO buffer (single color attachment)
 * @param {WebGL2RenderingContext} gl
 * @param {number} width - Full resolution width
 * @param {number} height - Full resolution height
 * @param {{ supported: boolean, format: number, internalFormat: number, type: number }} supportInfo
 * @returns {{ fbo: WebGLFramebuffer, texture: WebGLTexture, width: number, height: number, dispose: () => void }}
 */
export function createSSAOBuffer(gl, width, height, supportInfo) {
  const fullWidth = Math.max(1, Math.floor(width));
  const fullHeight = Math.max(1, Math.floor(height));
  
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  // RGBA8 for compatibility; AO only needs one channel
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, fullWidth, fullHeight, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    console.error(`[FBO] SSAO buffer incomplete: ${status.toString(16)}`);
    disposeSSAOBuffer(gl, { fbo, texture });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    throw new Error(`SSAO buffer incomplete: ${status.toString(16)}`);
  }
  
  if (DEBUG) {
    console.log(`[FBO] SSAO buffer created: ${fullWidth}x${fullHeight}`);
  }
  
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  
  const ssaoBuffer = {
    fbo,
    texture,
    width: fullWidth,
    height: fullHeight
  };
  
  ssaoBuffer.dispose = () => disposeSSAOBuffer(gl, ssaoBuffer);
  
  return ssaoBuffer;
}

/**
 * Resize SSAO buffer to new dimensions
 * @param {WebGL2RenderingContext} gl
 * @param {object} ssaoBuffer - Current SSAO buffer
 * @param {number} width - New full resolution width
 * @param {number} height - New full resolution height
 * @param {object} supportInfo - Float texture support info
 * @returns {object} New SSAO buffer
 */
export function resizeSSAOBuffer(gl, ssaoBuffer, width, height, supportInfo) {
  const halfWidth = Math.max(1, Math.floor(width / 2));
  const halfHeight = Math.max(1, Math.floor(height / 2));
  if (ssaoBuffer.width === halfWidth && ssaoBuffer.height === halfHeight) {
    return ssaoBuffer;
  }
  
  disposeSSAOBuffer(gl, ssaoBuffer);
  return createSSAOBuffer(gl, width, height, supportInfo);
}

/**
 * Dispose SSAO buffer resources
 * @param {WebGL2RenderingContext} gl
 * @param {object} ssaoBuffer - SSAO buffer to dispose
 */
export function disposeSSAOBuffer(gl, ssaoBuffer) {
  if (!ssaoBuffer) return;
  
  if (ssaoBuffer.fbo) {
    gl.deleteFramebuffer(ssaoBuffer.fbo);
    ssaoBuffer.fbo = null;
  }
  
  if (ssaoBuffer.texture) {
    gl.deleteTexture(ssaoBuffer.texture);
    ssaoBuffer.texture = null;
  }
  
  if (DEBUG) console.log('[FBO] SSAO buffer disposed');
}

export function createShadowMapFBO(gl, size = 2048) {
  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, size, size, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
  
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // Important for shadow2D lookups later if activated:
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, texture, 0);

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    console.error(`[FBO] Shadow map FBO incomplete: ${status.toString(16)}`);
  }
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  const shadowFBO = { fbo, texture, size, dispose: null };
  shadowFBO.dispose = () => disposeShadowMapFBO(gl, shadowFBO);
  return shadowFBO;
}

export function disposeShadowMapFBO(gl, fboObj) {
  if (!fboObj) return;
  if (fboObj.fbo) gl.deleteFramebuffer(fboObj.fbo);
  if (fboObj.texture) gl.deleteTexture(fboObj.texture);
}
