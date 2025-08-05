/**
 * WebGPU Renderer for Voxel Engine
 */

export class WebGPURenderer {
  constructor() {
    this.device = null;
    this.context = null;
    this.canvas = null;
    this.renderPipeline = null;
    this.computePipeline = null;
    this.uniformBuffer = null;
    this.depthTexture = null;
    this.format = 'bgra8unorm';
  }

  async init(canvas) {
    this.canvas = canvas;
    
    // Check WebGPU support
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported in this browser');
    }

    // Get adapter and device
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      throw new Error('No WebGPU adapter found');
    }

    this.device = await adapter.requestDevice();
    
    // Configure canvas context
    this.context = canvas.getContext('webgpu');
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied'
    });

    // Create depth texture
    this.createDepthTexture();
    
    // Create uniform buffer
    this.createUniformBuffer();
    
    // Create render pipeline
    await this.createRenderPipeline();
    
    // Create compute pipeline for chunk generation
    await this.createComputePipeline();

    console.log('WebGPU renderer initialized successfully');
  }

  createDepthTexture() {
    this.depthTexture = this.device.createTexture({
      size: [this.canvas.width, this.canvas.height],
      format: 'depth24plus',
      usage: GPUTextureUsage.RENDER_ATTACHMENT
    });
  }

  createUniformBuffer() {
    // Uniforms layout (floats):
    // view(16) + proj(16) + model(16) = 48
    // lightDir(4) = 52
    // lightColor(4) = 56
    // ambientColor(4) = 60
    const uniformData = new Float32Array(60);
    this.uniformBuffer = this.device.createBuffer({
      size: uniformData.byteLength,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    });
  }

  async createRenderPipeline() {
    const vertexShader = this.device.createShaderModule({
      code: `
        struct Uniforms {
          viewMatrix: mat4x4<f32>,
          projectionMatrix: mat4x4<f32>,
          modelMatrix: mat4x4<f32>,
          lightDirection: vec4<f32>,
          lightColor: vec4<f32>,
          ambientColor: vec4<f32>,
        }

        @group(0) @binding(0) var<uniform> uniforms: Uniforms;

        struct VertexInput {
          @location(0) position: vec3<f32>,
          @location(1) normal: vec3<f32>,
          @location(2) color: vec3<f32>,
        }

        struct VertexOutput {
          @builtin(position) position: vec4<f32>,
          @location(0) worldPos: vec3<f32>,
          @location(1) normal: vec3<f32>,
          @location(2) color: vec3<f32>,
        }

        @vertex
        fn vs_main(input: VertexInput) -> VertexOutput {
          var output: VertexOutput;
          let worldPos = uniforms.modelMatrix * vec4<f32>(input.position, 1.0);
          let vp = uniforms.projectionMatrix * uniforms.viewMatrix;
          output.position = vp * worldPos;
          output.worldPos = worldPos.xyz;
          output.normal = normalize((uniforms.modelMatrix * vec4<f32>(input.normal, 0.0)).xyz);
          output.color = input.color;
          return output;
        }
      `
    });

    const fragmentShader = this.device.createShaderModule({
      code: `
        struct Uniforms {
          viewMatrix: mat4x4<f32>,
          projectionMatrix: mat4x4<f32>,
          modelMatrix: mat4x4<f32>,
          lightDirection: vec4<f32>,
          lightColor: vec4<f32>,
          ambientColor: vec4<f32>,
        }

        @group(0) @binding(0) var<uniform> uniforms: Uniforms;

        @fragment
        fn fs_main(
          @location(0) worldPos: vec3<f32>,
          @location(1) normal: vec3<f32>,
          @location(2) color: vec3<f32>
        ) -> @location(0) vec4<f32> {
          let lightDir = normalize(-uniforms.lightDirection.xyz);
          let diffuse = max(dot(normal, lightDir), 0.0);
          let lighting = uniforms.ambientColor.xyz + uniforms.lightColor.xyz * diffuse;
          return vec4<f32>(color * lighting, 1.0);
        }
      `
    });

    this.renderPipeline = this.device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: vertexShader,
        entryPoint: 'vs_main',
        buffers: [{
          arrayStride: 9 * 4, // 3 floats position + 3 floats normal + 3 floats color
          attributes: [
            { format: 'float32x3', offset: 0, shaderLocation: 0 }, // position
            { format: 'float32x3', offset: 12, shaderLocation: 1 }, // normal
            { format: 'float32x3', offset: 24, shaderLocation: 2 }, // color
          ]
        }]
      },
      fragment: {
        module: fragmentShader,
        entryPoint: 'fs_main',
        targets: [{ format: this.format }]
      },
      primitive: {
        topology: 'triangle-list',
        cullMode: 'back'
      },
      depthStencil: {
        depthWriteEnabled: true,
        depthCompare: 'less',
        format: 'depth24plus'
      }
    });
  }

  async createComputePipeline() {
    const computeShader = this.device.createShaderModule({
      code: `
        @group(0) @binding(0) var<storage, read_write> voxelData: array<u32>;
        @group(0) @binding(1) var<uniform> chunkParams: vec4<f32>; // chunkX, chunkZ, seed, time

        @compute @workgroup_size(8, 8, 1)
        fn cs_main(@builtin(global_invocation_id) global_id: vec3<u32>) {
          let x = global_id.x;
          let z = global_id.y;
          
          if (x >= 32u || z >= 32u) {
            return;
          }
          
          // Simple height generation for now
          let worldX = f32(x) + chunkParams.x * 32.0;
          let worldZ = f32(z) + chunkParams.y * 32.0;
          
          // Basic noise-like height calculation
          let height = u32(64.0 + sin(worldX * 0.1) * 10.0 + cos(worldZ * 0.1) * 10.0);
          
          // Fill voxels up to height
          for (var y = 0u; y < min(height, 256u); y++) {
            let index = y * 32u * 32u + z * 32u + x;
            voxelData[index] = 1u; // Stone block
          }
        }
      `
    });

    this.computePipeline = this.device.createComputePipeline({
      layout: 'auto',
      compute: {
        module: computeShader,
        entryPoint: 'cs_main'
      }
    });
  }

  updateUniforms(viewMatrix, projectionMatrix, modelMatrix, lightDirection, lightColor, ambientColor) {
    const uniformData = new Float32Array(60);
    
    // View matrix (0..15)
    uniformData.set(viewMatrix, 0);
    // Projection matrix (16..31)
    uniformData.set(projectionMatrix, 16);
    // Model matrix (32..47)
    uniformData.set(modelMatrix, 32);

    // Light direction as vec4 (48..51)
    uniformData[48] = lightDirection[0];
    uniformData[49] = lightDirection[1];
    uniformData[50] = lightDirection[2];
    uniformData[51] = 0;

    // Light color as vec4 (52..55)
    uniformData[52] = lightColor[0];
    uniformData[53] = lightColor[1];
    uniformData[54] = lightColor[2];
    uniformData[55] = 0;

    // Ambient color as vec4 (56..59)
    uniformData[56] = ambientColor[0];
    uniformData[57] = ambientColor[1];
    uniformData[58] = ambientColor[2];
    uniformData[59] = 0;

    this.device.queue.writeBuffer(this.uniformBuffer, 0, uniformData);
  }

  render(chunks, camera) {
    const commandEncoder = this.device.createCommandEncoder();
    
    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 0.53, g: 0.81, b: 0.92, a: 1.0 },
        loadOp: 'clear',
        storeOp: 'store'
      }],
      depthStencilAttachment: {
        view: this.depthTexture.createView(),
        depthClearValue: 1.0,
        depthLoadOp: 'clear',
        depthStoreOp: 'store'
  }
    });

    renderPass.setPipeline(this.renderPipeline);
    
    // Create bind group for uniforms
    const bindGroup = this.device.createBindGroup({
      layout: this.renderPipeline.getBindGroupLayout(0),
      entries: [{
        binding: 0,
        resource: {
          buffer: this.uniformBuffer
        }
      }]
    });
    
    renderPass.setBindGroup(0, bindGroup);
    
    // Render each chunk
    let renderedChunks = 0;
    for (const chunk of chunks) {
      if (chunk.vertexBuffer && chunk.indexBuffer && chunk.indexCount > 0) {
        renderPass.setVertexBuffer(0, chunk.vertexBuffer);
        renderPass.setIndexBuffer(chunk.indexBuffer, 'uint32');
        renderPass.drawIndexed(chunk.indexCount);
        renderedChunks++;
      }
    }

    renderPass.end();
    this.device.queue.submit([commandEncoder.finish()]);
    
    // Debug output (only occasionally to avoid spam)
    if (Math.random() < 0.01 && renderedChunks > 0) {
      console.log(`Rendered ${renderedChunks} chunks out of ${chunks.length} total chunks`);
    }
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;

    // Reconfigure context for new size if needed
    this.context.configure({
      device: this.device,
      format: this.format,
      alphaMode: 'premultiplied'
    });
    
    // Recreate depth texture with new size
    if (this.depthTexture) {
      this.depthTexture.destroy();
    }
    this.createDepthTexture();
  }

  destroy() {
    if (this.depthTexture) {
      this.depthTexture.destroy();
    }
    if (this.uniformBuffer) {
      this.uniformBuffer.destroy();
    }
  }
}
