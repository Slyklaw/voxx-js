# Design Document

## Overview

The voxel ambient occlusion system enhances the visual quality of the voxel world by calculating per-vertex lighting based on neighboring voxel occlusion. This system integrates with the existing greedy meshing algorithm to add vertex colors that simulate ambient occlusion effects, creating more realistic depth and shadowing.

The implementation follows the vertex-based ambient occlusion technique where each vertex of a voxel face is assigned a light or shadow value based on the occupancy of its three adjacent neighboring voxels. The system uses optimal diagonal triangulation to minimize visual artifacts and integrates seamlessly with the existing Three.js rendering pipeline.

## Architecture

### Core Components

1. **AmbientOcclusionCalculator**: Core logic for calculating ambient occlusion values
2. **VertexColorManager**: Manages vertex color assignment and interpolation
3. **DiagonalOptimizer**: Determines optimal triangulation for quad faces
4. **ChunkMeshEnhancer**: Extends existing chunk mesh generation with ambient occlusion

### Integration Points

- **Chunk.createMesh()**: Enhanced to include ambient occlusion calculations
- **Greedy Meshing Algorithm**: Extended to preserve and interpolate vertex colors
- **Three.js Material System**: Configured to use vertex colors alongside existing lighting

## Components and Interfaces

### AmbientOcclusionCalculator

```javascript
class AmbientOcclusionCalculator {
  /**
   * Calculate ambient occlusion for a face vertex
   * @param {Chunk} chunk - The chunk containing the voxel
   * @param {number} x, y, z - Voxel coordinates
   * @param {string} face - Face direction ('top', 'bottom', 'north', 'south', 'east', 'west')
   * @param {number} cornerIndex - Corner index (0-3) for the face
   * @returns {number} Ambient occlusion value (0 = shadow, 1 = light)
   */
  calculateVertexAO(chunk, x, y, z, face, cornerIndex) {}
  
  /**
   * Get the three neighboring voxel positions for a vertex
   * @param {number} x, y, z - Base voxel coordinates
   * @param {string} face - Face direction
   * @param {number} cornerIndex - Corner index
   * @returns {Array<{x, y, z}>} Array of three neighbor positions
   */
  getVertexNeighbors(x, y, z, face, cornerIndex) {}
  
  /**
   * Check if a voxel position is solid (contributes to occlusion)
   * @param {Chunk} chunk - The chunk to check
   * @param {number} x, y, z - Voxel coordinates
   * @returns {boolean} True if voxel is solid
   */
  isVoxelSolid(chunk, x, y, z) {}
}
```

### VertexColorManager

```javascript
class VertexColorManager {
  /**
   * Convert ambient occlusion value to vertex color
   * @param {number} aoValue - AO value (0-1)
   * @returns {THREE.Color} Vertex color
   */
  aoToColor(aoValue) {}
  
  /**
   * Interpolate vertex colors for merged faces
   * @param {Array<THREE.Color>} colors - Array of vertex colors
   * @param {number} width, height - Face dimensions
   * @returns {Array<THREE.Color>} Interpolated colors
   */
  interpolateColors(colors, width, height) {}
  
  /**
   * Apply vertex colors to geometry
   * @param {THREE.BufferGeometry} geometry - Target geometry
   * @param {Array<THREE.Color>} colors - Vertex colors
   */
  applyVertexColors(geometry, colors) {}
}
```

### DiagonalOptimizer

```javascript
class DiagonalOptimizer {
  /**
   * Determine optimal diagonal for quad triangulation
   * @param {Array<number>} aoValues - AO values for 4 corners [a, b, c, d]
   * @returns {boolean} True for diagonal a-c, false for diagonal b-d
   */
  chooseOptimalDiagonal(aoValues) {}
  
  /**
   * Generate triangle indices based on diagonal choice
   * @param {number} vertexOffset - Starting vertex index
   * @param {boolean} useACDiagonal - Diagonal choice
   * @returns {Array<number>} Triangle indices
   */
  generateTriangleIndices(vertexOffset, useACDiagonal) {}
}
```

### ChunkMeshEnhancer

```javascript
class ChunkMeshEnhancer {
  /**
   * Enhance existing chunk mesh generation with ambient occlusion
   * @param {Chunk} chunk - The chunk to process
   * @returns {THREE.Mesh} Enhanced mesh with vertex colors
   */
  createEnhancedMesh(chunk) {}
  
  /**
   * Process a single face with ambient occlusion
   * @param {Chunk} chunk - Source chunk
   * @param {Object} faceData - Face geometry data
   * @returns {Object} Enhanced face data with vertex colors
   */
  processFaceWithAO(chunk, faceData) {}
}
```

## Data Models

### Face Vertex Layout

For each face, vertices are ordered consistently:
- **Top/Bottom faces**: Corners ordered clockwise from top-left
- **Side faces**: Corners ordered clockwise when viewed from outside

### Vertex Neighbor Mapping

Each vertex has three adjacent neighbors that influence its ambient occlusion:
- **Corner neighbors**: Two voxels sharing edges with the vertex
- **Diagonal neighbor**: One voxel sharing only the vertex point

### Color Interpolation Model

For merged faces in greedy meshing:
- **Bilinear interpolation**: Smooth color transitions across large faces
- **Edge preservation**: Maintain sharp transitions at voxel boundaries
- **Corner weighting**: Proper influence distribution for corner vertices

## Error Handling

### Boundary Conditions

1. **Chunk boundaries**: Handle voxel lookups that cross chunk boundaries
2. **World edges**: Treat out-of-world positions as air (no occlusion)
3. **Invalid coordinates**: Graceful handling of negative or excessive coordinates

### Performance Safeguards

1. **Calculation limits**: Prevent excessive computation time for large faces
2. **Memory bounds**: Limit vertex color array sizes
3. **Fallback rendering**: Revert to non-AO rendering if calculations fail

### Integration Failures

1. **Material compatibility**: Handle cases where vertex colors conflict with materials
2. **Geometry validation**: Ensure vertex color arrays match geometry vertex counts
3. **Rendering fallbacks**: Maintain visual quality if AO system fails

## Testing Strategy

### Unit Tests

1. **AO Calculation**: Test ambient occlusion values for various neighbor configurations
2. **Vertex Mapping**: Verify correct neighbor identification for all face orientations
3. **Color Conversion**: Test AO value to color conversion accuracy
4. **Diagonal Selection**: Verify optimal triangulation choices

### Integration Tests

1. **Mesh Generation**: Test enhanced mesh creation with various voxel patterns
2. **Performance**: Measure mesh generation time with AO enabled
3. **Visual Quality**: Compare rendered output with and without ambient occlusion
4. **Memory Usage**: Monitor memory consumption during mesh generation

### Visual Tests

1. **Corner Cases**: Test AO appearance in various geometric configurations
2. **Transition Smoothness**: Verify smooth color transitions across faces
3. **Artifact Detection**: Check for visual artifacts in triangulation
4. **Lighting Integration**: Test interaction with existing lighting systems

## Performance Considerations

### Optimization Strategies

1. **Neighbor Caching**: Cache voxel lookups to avoid redundant chunk access
2. **Batch Processing**: Process multiple faces together for better cache locality
3. **Early Termination**: Skip AO calculation for faces that won't benefit
4. **Memory Pooling**: Reuse color arrays and temporary objects

### Scalability Measures

1. **Chunk-level Processing**: Process chunks independently for parallelization
2. **Progressive Enhancement**: Allow AO to be disabled for performance-critical scenarios
3. **LOD Integration**: Reduce AO quality at distance for better performance
4. **Worker Thread Support**: Enable AO calculation in worker threads if needed