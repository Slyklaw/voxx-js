# Voxel Modification System

The Voxel Modification System provides a comprehensive solution for interactive terrain modification in the voxx-js engine. It consists of two main components: the `VoxelModifier` component and the `VoxelInteractionSystem`.

## Overview

This system allows entities to modify voxel terrain through placement and destruction operations while maintaining performance through efficient chunk mesh updates and batch processing capabilities.

## Components

### VoxelModifier Component

The `VoxelModifier` component defines the capabilities and properties for entities that can modify terrain.

#### Features

- **Placement and Destruction Control**: Configure whether an entity can place or destroy voxels
- **Block Type Management**: Define available block types and current selection
- **Range Constraints**: Set minimum and maximum modification ranges
- **Cooldown System**: Prevent rapid-fire modifications with configurable cooldowns
- **Batch Processing**: Support for batch modifications with configurable batch sizes and delays
- **Serialization**: Full serialize/deserialize support for saving/loading

#### Usage

```javascript
import { VoxelModifier } from './voxelModifier.js';

// Create a modifier with default settings
const modifier = new VoxelModifier();

// Create a modifier with custom settings
const customModifier = new VoxelModifier({
  canPlace: true,
  canDestroy: true,
  availableBlocks: [1, 2, 3, 5], // stone, dirt, grass, snow
  currentBlockType: 1,
  maxRange: 15,
  minRange: 2,
  modificationCooldown: 200, // ms
  batchSize: 5,
  batchDelay: 100 // ms
});

// Check if modification is allowed
if (modifier.canModify('place', 1)) {
  // Perform modification
}

// Cycle through available block types
const nextBlock = modifier.getNextBlockType();
modifier.setCurrentBlockType(nextBlock);

// Serialize for saving
const data = modifier.serialize();
localStorage.setItem('modifierState', JSON.stringify(data));

// Deserialize for loading
const savedData = JSON.parse(localStorage.getItem('modifierState'));
modifier.deserialize(savedData);
```

### VoxelInteractionSystem

The `VoxelInteractionSystem` handles the actual voxel modification operations and integrates with the existing World and Chunk systems.

#### Features

- **Screen-based Interaction**: Handle mouse clicks and convert to world coordinates
- **Raycasting Integration**: Uses the existing VoxelRaycaster for accurate targeting
- **Efficient Mesh Updates**: Batches chunk mesh regeneration to avoid frame drops
- **Cross-chunk Boundary Handling**: Automatically updates adjacent chunks when needed
- **Batch Modifications**: Support for modifying multiple voxels efficiently
- **Event System**: Callbacks for modification and chunk update events
- **Performance Monitoring**: Statistics and performance tracking

#### Usage

```javascript
import { VoxelInteractionSystem } from './voxelInteractionSystem.js';
import { VoxelModifier } from './voxelModifier.js';

// Initialize the system
const system = new VoxelInteractionSystem(world, scene);
const modifier = new VoxelModifier();

// Set up event callbacks
system.onVoxelModified = (event) => {
  console.log(`Voxel ${event.action}d at:`, event.position);
};

system.onChunkUpdated = (chunkKeys) => {
  console.log(`Updated chunks:`, chunkKeys);
};

// Handle mouse clicks
document.addEventListener('click', (event) => {
  const mouse = new THREE.Vector2(
    (event.clientX / window.innerWidth) * 2 - 1,
    -(event.clientY / window.innerHeight) * 2 + 1
  );
  
  const success = system.handleVoxelClick(mouse, camera, modifier, 'place');
  if (!success) {
    console.log('Modification failed');
  }
});

// Batch modify multiple voxels
const modifications = [
  { position: new THREE.Vector3(10, 65, 10), blockType: 1 },
  { position: new THREE.Vector3(11, 65, 10), blockType: 2 },
  { position: new THREE.Vector3(12, 65, 10), blockType: 3 }
];

const successCount = await system.batchModifyVoxels(modifications, modifier);
console.log(`Successfully modified ${successCount} voxels`);

// Get system statistics
const stats = system.getStatistics();
console.log('Dirty chunks:', stats.dirtyChunksCount);
console.log('Processing batch:', stats.isProcessingBatch);
```

## Integration with Existing Systems

### World and Chunk Integration

The system seamlessly integrates with the existing World and Chunk classes:

- Uses existing chunk-based coordinate system
- Maintains compatibility with current voxel data format (Uint8Array)
- Preserves existing greedy meshing algorithm
- Works with current block types (air, stone, dirt, grass, water, snow)

### VoxelRaycaster Integration

- Leverages existing raycasting system for accurate voxel targeting
- Supports face detection for proper voxel placement
- Maintains performance through efficient ray marching

### Three.js Integration

- Automatically updates Three.js scene when chunks are modified
- Properly disposes of old geometries and materials
- Maintains existing mesh positioning and rendering

## Performance Considerations

### Chunk Update Batching

The system batches chunk mesh updates to prevent frame drops:

- Configurable delay before mesh regeneration (default: 100ms)
- Multiple modifications within the delay period are batched together
- Cross-chunk boundary updates are handled automatically

### Memory Management

- Proper disposal of old Three.js geometries and materials
- Efficient dirty chunk tracking using Sets
- Automatic cleanup of pending operations

### Worker Thread Compatibility

The system is designed to work with the existing worker thread architecture:

- Mesh regeneration can be moved to worker threads in the future
- Batch processing prevents main thread blocking
- Compatible with existing WorkerPool system

## Error Handling

The system includes comprehensive error handling:

- Bounds checking for all voxel coordinates
- Validation of modification permissions
- Graceful handling of missing chunks or invalid positions
- Range validation for modification attempts

## Testing

The system includes comprehensive unit tests covering:

- VoxelModifier component functionality
- VoxelInteractionSystem operations
- Integration with existing systems
- Error conditions and edge cases
- Performance characteristics

Run tests with:
```bash
npm test -- --run src/__tests__/voxelModifier.test.js
npm test -- --run src/__tests__/voxelInteractionSystem.test.js
```

## Example Implementation

See `src/examples/voxelModificationExample.js` for a complete example showing:

- Basic setup and initialization
- Mouse click handling
- Keyboard controls for block type switching
- UI integration
- Batch modification examples
- State serialization/deserialization

## Future Enhancements

The system is designed to be easily extended with:

- Integration with the full ECS system when implemented
- Physics integration for realistic voxel behavior
- Networking support for multiplayer modifications
- Advanced modification tools (brushes, shapes, etc.)
- Undo/redo functionality
- Permission systems for multiplayer environments

## Requirements Satisfied

This implementation satisfies the following requirements from the specification:

- **3.2**: Voxel modification with place/destroy operations
- **3.3**: Integration with existing Chunk class and voxel data structures  
- **3.6**: Support for all existing block types
- **11.3**: Maintains compatibility with existing architecture

The system provides a solid foundation for interactive voxel terrain modification while maintaining the performance and architectural principles of the existing voxx-js engine.