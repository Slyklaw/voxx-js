/**
 * Sky Renderer with Sun and Moon for WebGPU Voxel Engine
 */

export class SkyRenderer {
  constructor() {
    this.device = null;
    this.renderPipeline = null;
    this.vertexBuffer = null;
    this.uniformBuffer = null;
    this.sunTexture = null;
    this.moonTexture = null;
    this.sampler = null;
  }

  async init(device) {
    this.device = device;
    
    // Create sky geometry (full-screen quad)
    this.createSkyGeometry();
    
    // Create textures for sun and moon
    await this.createCelestialTextures();
    
    // Create uniform buffer
    this.createUniformBuffer();
    
    // Create render pipeline
    await this.createRenderPipeline();
    
    console.log('Sky renderer initialized');
  }

  createSkyGeometry() {
    // Full-screen quad vertices (position only, we'll generate sky in shader)
    const vertices = new Float32Array([
      -1, -1, 0.999999, // Bottom left (far plane)
      1, -1, 0.999999,  // Bottom right
      -1, 1, 0.999999,  // Top left
      1, 1, 0.999999    // Top right
    ]);

    this.vertexBuffer = this.device.createBuffer({
      size: vertices.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
    });
    this.device.queue.writeBuffer(this.vertexBuffer, 0, vertices);
  }

  async createCelestialTextures() {
    // Create simple procedural sun texture
    const sunSize = 64;
    const sunData = new Uint8Array(sunSize * sunSize * 4);
    
    for (let y = 0; y < sunSize; y++) {
      for (let x = 0; x < sunSize; x++) {
        const dx = x - sunSize / 2;
        const dy = y - sunSize / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radius = sunSize / 2;
        
        const i = (y * sunSize + x) * 4;
        
        if (distance < radius * 0.8) {
          // Sun core - bright yellow
          sunData[i] = 255;     // R
          sunData[i + 1] = 255; // G
          sunData[i + 2] = 100; // B
          sunData[i + 3] = 255; // A
        } else if (distance < radius) {
          // Sun corona - fade out
          const alpha = (radius - distance) / (radius * 0.2);
          sunData[i] = 255;
          sunData[i + 1] = 200;
          sunData[i + 2] = 50;
          sunData[i + 3] = Math.floor(alpha * 255);
        } else {
          // Transparent
          sunData[i] = 0;
          sunData[i + 1] = 0;
          sunData[i + 2] = 0;
          sunData[i + 3] = 0;
        }
      }
    }

    this.sunTexture = this.device.createTexture({
      size: [sunSize, sunSize],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });

    this.device.queue.writeTexture(
      { texture: this.sunTexture },
      sunData,
      { bytesPerRow: sunSize * 4 },
      [sunSize, sunSize]
    );

    // Create simple procedural moon texture
    const moonSize = 64;
    const moonData = new Uint8Array(moonSize * moonSize * 4);
    
    for (let y = 0; y < moonSize; y++) {
      for (let x = 0; x < moonSize; x++) {
        const dx = x - moonSize / 2;
        const dy = y - moonSize / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radius = moonSize / 2;
        
        const i = (y * moonSize + x) * 4;
        
        if (distance < radius * 0.9) {
          // Moon surface - pale gray with some variation
          const noise = Math.sin(x * 0.3) * Math.cos(y * 0.3) * 0.2 + 0.8;
          moonData[i] = Math.floor(200 * noise);     // R
          moonData[i + 1] = Math.floor(200 * noise); // G
          moonData[i + 2] = Math.floor(220 * noise); // B
          moonData[i + 3] = 255; // A
        } else if (distance < radius) {
          // Moon edge - fade out
          const alpha = (radius - distance) / (radius * 0.1);
          moonData[i] = 180;
          moonData[i + 1] = 180;
          moonData[i + 2] = 200;
          moonData[i + 3] = Math.floor(alpha * 255);
        } else {
          // Transparent
          moonData[i] = 0;
          moonData[i + 1] = 0;
          moonData[i + 2] = 0;
          moonData[i + 3] = 0;
        }
      }
    }

    this.moonTexture = this.device.createTexture({
      size: [moonSize, moonSize],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    });

    this.device.queue.writeTexture(
      { texture: this.moonTexture },
      moonData,
      { bytesPerRow: moonSize * 4 },
      [moonSize, moonSize]
    );

    // Create sampler
    this.sampler = this.device.createSampler({
      magFilter: 'linear',
      minFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge'
    });
  }

  createUniformBuffer() {
    // Sky uniforms: viewMatrix(16) + projMatrix(16) + sunDir(4) + moonDir(4) + timeOfDay(4) + skyColors(16)
    const uniformData = new Float32Array(60);
    this.uniformBuffer = this.device.createBuffer({
      size: uniformData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
  }

  async createRenderPipeline() {
    const vertexShader = this.device.createShaderModule({
      code: `
        struct VertexInput {
          @location(0) position: vec3<f32>,
        }

        struct VertexOutput {
          @builtin(position) position: vec4<f32>,
          @location(0) worldDir: vec3<f32>,
        }

        struct SkyUniforms {
          viewMatrix: mat4x4<f32>,
          projMatrix: mat4x4<f32>,
          sunDirection: vec4<f32>,
          moonDirection: vec4<f32>,
          timeOfDay: vec4<f32>, // x: cycle progress, y: sun elevation, z: moon elevation, w: unused
          skyColors: mat4x4<f32>, // day, sunset, night, sunrise colors
        }

        @group(0) @binding(0) var<uniform> skyUniforms: SkyUniforms;

        @vertex
        fn vs_main(input: VertexInput) -> VertexOutput {
          var output: VertexOutput;
          output.position = vec4<f32>(input.position.xy, input.position.z, 1.0);
          
          // Convert screen position to world direction
          // Remove translation from view matrix for sky rendering
          var viewNoTranslation = skyUniforms.viewMatrix;
          viewNoTranslation[3][0] = 0.0;
          viewNoTranslation[3][1] = 0.0;
          viewNoTranslation[3][2] = 0.0;
          
          let invProj = mat4x4<f32>(
            1.0 / skyUniforms.projMatrix[0][0], 0.0, 0.0, 0.0,
            0.0, 1.0 / skyUniforms.projMatrix[1][1], 0.0, 0.0,
            0.0, 0.0, 0.0, -1.0,
            0.0, 0.0, 1.0 / skyUniforms.projMatrix[2][3], skyUniforms.projMatrix[2][2] / skyUniforms.projMatrix[2][3]
          );
          
          let viewDir = invProj * vec4<f32>(input.position.xy, 1.0, 1.0);
          output.worldDir = normalize((transpose(viewNoTranslation) * vec4<f32>(viewDir.xyz, 0.0)).xyz);
          
          return output;
        }
      `
    });

    const fragmentShader = this.device.createShaderModule({
      code: `
        struct SkyUniforms {
          viewMatrix: mat4x4<f32>,
          projMatrix: mat4x4<f32>,
          sunDirection: vec4<f32>,
          moonDirection: vec4<f32>,
          timeOfDay: vec4<f32>,
          skyColors: mat4x4<f32>,
        }

        @group(0) @binding(0) var<uniform> skyUniforms: SkyUniforms;
        @group(0) @binding(1) var sunTexture: texture_2d<f32>;
        @group(0) @binding(2) var moonTexture: texture_2d<f32>;
        @group(0) @binding(3) var celestialSampler: sampler;

        @fragment
        fn fs_main(@location(0) worldDir: vec3<f32>) -> @location(0) vec4<f32> {
          let dir = normalize(worldDir);
          
          // Sky gradient based on Y coordinate
          let skyHeight = max(0.0, dir.y);
          let horizonBlend = 1.0 - skyHeight;
          
          // Time-based sky color interpolation
          let cycleProgress = skyUniforms.timeOfDay.x;
          var skyColor: vec3<f32>;
          
          if (cycleProgress < 0.25) {
            // Night to sunrise
            let t = cycleProgress * 4.0;
            skyColor = mix(skyUniforms.skyColors[2].xyz, skyUniforms.skyColors[3].xyz, t);
          } else if (cycleProgress < 0.5) {
            // Sunrise to day
            let t = (cycleProgress - 0.25) * 4.0;
            skyColor = mix(skyUniforms.skyColors[3].xyz, skyUniforms.skyColors[0].xyz, t);
          } else if (cycleProgress < 0.75) {
            // Day to sunset
            let t = (cycleProgress - 0.5) * 4.0;
            skyColor = mix(skyUniforms.skyColors[0].xyz, skyUniforms.skyColors[1].xyz, t);
          } else {
            // Sunset to night
            let t = (cycleProgress - 0.75) * 4.0;
            skyColor = mix(skyUniforms.skyColors[1].xyz, skyUniforms.skyColors[2].xyz, t);
          }
          
          // Apply horizon gradient
          let horizonColor = skyColor * 0.8;
          let finalSkyColor = mix(skyColor, horizonColor, horizonBlend * horizonBlend);
          
          var finalColor = finalSkyColor;
          
          // Add sun
          let sunDir = normalize(skyUniforms.sunDirection.xyz);
          let sunDot = dot(dir, -sunDir);
          if (sunDot > 0.999 && skyUniforms.timeOfDay.y > 0.0) {
            // Calculate UV coordinates for sun texture
            let sunRight = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), -sunDir));
            let sunUp = cross(-sunDir, sunRight);
            let sunLocal = vec3<f32>(dot(dir, sunRight), dot(dir, sunUp), sunDot);
            
            let sunSize = 0.02;
            let sunUV = vec2<f32>(sunLocal.x, sunLocal.y) / sunSize + 0.5;
            
            if (sunUV.x >= 0.0 && sunUV.x <= 1.0 && sunUV.y >= 0.0 && sunUV.y <= 1.0) {
              let sunSample = textureSample(sunTexture, celestialSampler, sunUV);
              finalColor = mix(finalColor, sunSample.xyz, sunSample.w * skyUniforms.timeOfDay.y);
            }
          }
          
          // Add moon
          let moonDir = normalize(skyUniforms.moonDirection.xyz);
          let moonDot = dot(dir, -moonDir);
          if (moonDot > 0.999 && skyUniforms.timeOfDay.z > 0.0) {
            // Calculate UV coordinates for moon texture
            let moonRight = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), -moonDir));
            let moonUp = cross(-moonDir, moonRight);
            let moonLocal = vec3<f32>(dot(dir, moonRight), dot(dir, moonUp), moonDot);
            
            let moonSize = 0.015;
            let moonUV = vec2<f32>(moonLocal.x, moonLocal.y) / moonSize + 0.5;
            
            if (moonUV.x >= 0.0 && moonUV.x <= 1.0 && moonUV.y >= 0.0 && moonUV.y <= 1.0) {
              let moonSample = textureSample(moonTexture, celestialSampler, moonUV);
              finalColor = mix(finalColor, moonSample.xyz, moonSample.w * skyUniforms.timeOfDay.z);
            }
          }
          
          return vec4<f32>(finalColor, 1.0);
        }
      `
    });

    this.renderPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: vertexShader,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 3 * 4, // 3 floats for position
          attributes: [
            { format: 'float32x3', offset: 0, shaderLocation: 0 }
          ]
        }]
      },
      fragment: {
        module: fragmentShader,
        entryPoint: 'fs_main',
        targets: [{ format: 'bgra8unorm' }]
      },
      primitive: {
        topology: 'triangle-strip',
        cullMode: 'none'
      },
      depthStencil: {
        depthWriteEnabled: false,
        depthCompare: 'less-equal',
        format: 'depth24plus'
      }
    });
  }

  updateUniforms(viewMatrix, projMatrix, sunDirection, moonDirection, cycleProgress, sunElevation, moonElevation) {
    const uniformData = new Float32Array(60);
    
    // View matrix (0-15)
    uniformData.set(viewMatrix, 0);
    
    // Projection matrix (16-31)
    uniformData.set(projMatrix, 16);
    
    // Sun direction (32-35)
    uniformData[32] = sunDirection[0];
    uniformData[33] = sunDirection[1];
    uniformData[34] = sunDirection[2];
    uniformData[35] = 0;
    
    // Moon direction (36-39)
    uniformData[36] = moonDirection[0];
    uniformData[37] = moonDirection[1];
    uniformData[38] = moonDirection[2];
    uniformData[39] = 0;
    
    // Time of day (40-43)
    uniformData[40] = cycleProgress;
    uniformData[41] = sunElevation;
    uniformData[42] = moonElevation;
    uniformData[43] = 0;
    
    // Sky colors (44-59) - day, sunset, night, sunrise
    const skyColors = [
      [0.53, 0.81, 0.92], // Day - sky blue
      [1.0, 0.4, 0.2],    // Sunset - orange
      [0.1, 0.1, 0.4],    // Night - dark blue
      [1.0, 0.6, 0.3]     // Sunrise - warm orange
    ];
    
    for (let i = 0; i < 4; i++) {
      uniformData[44 + i * 4] = skyColors[i][0];
      uniformData[44 + i * 4 + 1] = skyColors[i][1];
      uniformData[44 + i * 4 + 2] = skyColors[i][2];
      uniformData[44 + i * 4 + 3] = 1.0;
    }
    
    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);
  }

  render(renderPass) {
    renderPass.setPipeline(this.renderPipeline);
    
    const bindGroup = this.device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [
        {
          binding: 0,
          resource: { buffer: this.uniformBuffer }
        },
        {
          binding: 1,
          resource: this.sunTexture.createView()
        },
        {
          binding: 2,
          resource: this.moonTexture.createView()
        },
        {
          binding: 3,
          resource: this.sampler
        }
      ]
    });
    
    renderPass.setBindGroup(0, bindGroup);
    renderPass.setVertexBuffer(0, this.vertexBuffer);
    renderPass.draw(4); // Draw full-screen quad as triangle strip
  }

  destroy() {
    if (this.vertexBuffer) this.vertexBuffer.destroy();
    if (this.uniformBuffer) this.uniformBuffer.destroy();
    if (this.sunTexture) this.sunTexture.destroy();
    if (this.moonTexture) this.moonTexture.destroy();
  }
}