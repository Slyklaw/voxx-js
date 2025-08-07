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

    // Create simple procedural moon texture (soft radial with subtle noise to avoid banding/checker)
    const moonSize = 128;
    const moonData = new Uint8Array(moonSize * moonSize * 4);

    // Simple hash-based value noise for subtle variation (deterministic, cheap)
    const hash = (n) => {
      n = (n << 13) ^ n;
      return 1.0 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824.0;
    };
    const valueNoise = (x, y) => {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = x - xi, yf = y - yi;
      const i00 = hash(xi * 374761393 + yi * 668265263);
      const i10 = hash((xi + 1) * 374761393 + yi * 668265263);
      const i01 = hash(xi * 374761393 + (yi + 1) * 668265263);
      const i11 = hash((xi + 1) * 374761393 + (yi + 1) * 668265263);
      const lerp = (a, b, t) => a + (b - a) * t;
      const nx0 = lerp(i00, i10, xf);
      const nx1 = lerp(i01, i11, xf);
      return lerp(nx0, nx1, yf) * 0.5 + 0.5; // normalize to [0,1]
    };

    for (let y = 0; y < moonSize; y++) {
      for (let x = 0; x < moonSize; x++) {
        const dx = x + 0.5 - moonSize / 2;
        const dy = y + 0.5 - moonSize / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radius = moonSize / 2;

        const i = (y * moonSize + x) * 4;

        if (distance < radius) {
          // Soft limb darkening: brighter center, gentle falloff toward edge
          const r = distance / radius;
          const limb = Math.pow(1.0 - r, 0.6); // softer edge

          // Subtle crater-like variation using low-frequency value noise
          const n = valueNoise(x * 0.15, y * 0.15) * 0.15 + valueNoise(x * 0.05 + 100, y * 0.05 + 100) * 0.1;
          const base = 0.82 + n; // ~0.82..1.07

          const R = Math.max(0, Math.min(1, base)) * 0.82 + 0.18 * limb;
          const G = Math.max(0, Math.min(1, base)) * 0.82 + 0.18 * limb;
          const B = Math.max(0, Math.min(1, base)) * 0.88 + 0.12 * limb;

          moonData[i] = Math.floor(R * 255);
          moonData[i + 1] = Math.floor(G * 255);
          moonData[i + 2] = Math.floor(B * 255);

          // Alpha: crisp disc with slight soft edge
          const edge = Math.min(1, Math.max(0, (radius - distance) / (radius * 0.06)));
          moonData[i + 3] = Math.floor(edge * 255);
        } else {
          // Transparent outside the disc
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
          @location(0) position: vec3<f32>
        }

        struct VertexOutput {
          @builtin(position) position: vec4<f32>,
          @location(0) worldDir: vec3<f32>
        }

        struct SkyUniforms {
          viewMatrix: mat4x4<f32>,
          projMatrix: mat4x4<f32>,
          sunDirection: vec4<f32>,
          moonDirection: vec4<f32>,
          timeOfDay: vec4<f32>,
          skyColors: mat4x4<f32>
        }

        @group(0) @binding(0) var<uniform> skyUniforms: SkyUniforms;

        @vertex
        fn vs_main(input: VertexInput) -> VertexOutput {
          var output: VertexOutput;
          output.position = vec4<f32>(input.position.xy, input.position.z, 1.0);
          
          // Extract camera basis vectors from view matrix
          // For a right-handed coordinate system with Y-up
          let right = vec3<f32>(skyUniforms.viewMatrix[0][0], skyUniforms.viewMatrix[1][0], skyUniforms.viewMatrix[2][0]);
          let up = vec3<f32>(skyUniforms.viewMatrix[0][1], skyUniforms.viewMatrix[1][1], skyUniforms.viewMatrix[2][1]);
          let forward = vec3<f32>(-skyUniforms.viewMatrix[0][2], -skyUniforms.viewMatrix[1][2], -skyUniforms.viewMatrix[2][2]);
          
          // More precise FOV calculation
          let tanHalfFovY = 1.0 / skyUniforms.projMatrix[1][1];
          let tanHalfFovX = 1.0 / skyUniforms.projMatrix[0][0];
          
          // Calculate ray direction in world space
          // Screen coordinates are in [-1, 1] range
          output.worldDir = normalize(
            forward + 
            right * input.position.x * tanHalfFovX + 
            up * input.position.y * tanHalfFovY
          );
          
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
          skyColors: mat4x4<f32>
        }

        @group(0) @binding(0) var<uniform> skyUniforms: SkyUniforms;
        @group(0) @binding(1) var sunTexture: texture_2d<f32>;
        @group(0) @binding(2) var moonTexture: texture_2d<f32>;
        @group(0) @binding(3) var celestialSampler: sampler;

        @fragment
        fn fs_main(@location(0) worldDir: vec3<f32>) -> @location(0) vec4<f32> {
          let dir = normalize(worldDir);
          
          let skyHeight = max(0.0, dir.y);
          let horizonBlend = 1.0 - skyHeight;
          
          let cycleProgress = skyUniforms.timeOfDay.x;
          var skyColor: vec3<f32>;
          
          let dayColor = vec3<f32>(0.53, 0.81, 0.92);
          let sunsetColor = vec3<f32>(1.0, 0.4, 0.2);
          let nightColor = vec3<f32>(0.1, 0.1, 0.4);
          let sunriseColor = vec3<f32>(1.0, 0.6, 0.3);
          
          // Map cycle progress to 24-hour time for better transitions
          // 0.0 = 00:00, 0.25 = 06:00 (sunrise), 0.5 = 12:00, 0.75 = 18:00 (sunset)
          if (cycleProgress < 0.25) {
            // Night to sunrise (00:00 to 06:00)
            let t = smoothstep(0.2, 0.25, cycleProgress); // Smooth transition near sunrise
            skyColor = mix(nightColor, sunriseColor, t);
          } else if (cycleProgress < 0.5) {
            // Sunrise to day (06:00 to 12:00)
            let t = (cycleProgress - 0.25) * 4.0;
            skyColor = mix(sunriseColor, dayColor, smoothstep(0.0, 1.0, t));
          } else if (cycleProgress < 0.75) {
            // Day to sunset (12:00 to 18:00)
            let t = smoothstep(0.7, 0.75, cycleProgress); // Smooth transition near sunset
            skyColor = mix(dayColor, sunsetColor, t);
          } else {
            // Sunset to night (18:00 to 00:00)
            let t = (cycleProgress - 0.75) * 4.0;
            skyColor = mix(sunsetColor, nightColor, smoothstep(0.0, 1.0, t));
          }
          
          let horizonColor = skyColor * 0.65;
          var finalColor = mix(skyColor, horizonColor, horizonBlend * horizonBlend) * 0.8;
          
          // Add sun - using angular distance and texture
          let sunDir = normalize(skyUniforms.sunDirection.xyz);
          let sunElevation = skyUniforms.timeOfDay.y;
          let viewDir = normalize(dir);
          
          if (sunElevation > 0.01) {
            let angularDistance = acos(clamp(dot(viewDir, sunDir), -1.0, 1.0));
            let sunRadius = 0.08; // Sun disc size
            
            if (angularDistance < sunRadius) {
              // Calculate UV coordinates for sun texture
              let sunRight = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), sunDir));
              let sunUp = cross(sunDir, sunRight);
              let localX = dot(viewDir, sunRight);
              let localY = dot(viewDir, sunUp);
              
              let sunUV = vec2<f32>(localX, localY) / (sunRadius * 2.0) + 0.5;
              
              if (sunUV.x >= 0.0 && sunUV.x <= 1.0 && sunUV.y >= 0.0 && sunUV.y <= 1.0) {
                let sunSample = textureSample(sunTexture, celestialSampler, sunUV);
                let sunColor = sunSample.xyz * 2.2 * sunElevation;
                // Additive blend to avoid dark halo or over-mixing with background
                finalColor += sunColor * sunSample.w * sunElevation;
              }
            }
            
            // Remove dark halo by switching to soft additive glow with tighter falloff
            if (angularDistance < sunRadius * 1.5) {
              let t = 1.0 - (angularDistance / (sunRadius * 1.5));
              let glowIntensity = smoothstep(0.0, 1.0, t) * 0.35;
              let glowColor = vec3<f32>(1.0, 0.95, 0.5) * glowIntensity * sunElevation;
              finalColor += glowColor;
            }
          }
          
          // Show cycle progress as blue in lower sky
          if (dir.y < -0.5) {
            let cycleProgress = skyUniforms.timeOfDay.x;
            finalColor = mix(finalColor, vec3<f32>(0.0, 0.0, cycleProgress), 0.3);
          }
          
          // Add moon - using angular distance and texture
          let moonDir = normalize(skyUniforms.moonDirection.xyz);
          let moonElevation = skyUniforms.timeOfDay.z;
          
          if (moonElevation > 0.01) {
            let moonAngularDistance = acos(clamp(dot(viewDir, moonDir), -1.0, 1.0));
            let moonRadius = 0.06; // Moon disc size
            
            if (moonAngularDistance < moonRadius) {
              // Calculate UV coordinates for moon texture
              let moonRight = normalize(cross(vec3<f32>(0.0, 1.0, 0.0), moonDir));
              let moonUp = cross(moonDir, moonRight);
              let moonLocalX = dot(viewDir, moonRight);
              let moonLocalY = dot(viewDir, moonUp);
              
              let moonUV = vec2<f32>(moonLocalX, moonLocalY) / (moonRadius * 2.0) + 0.5;
              
              if (moonUV.x >= 0.0 && moonUV.x <= 1.0 && moonUV.y >= 0.0 && moonUV.y <= 1.0) {
                let moonSample = textureSample(moonTexture, celestialSampler, moonUV);
                let moonColor = moonSample.xyz * 1.5 * moonElevation;
                finalColor = mix(finalColor, moonColor, moonSample.w * moonElevation);
              }
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
          binding:2,
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
