import { jest } from '@jest/globals';
import { Player } from './player.js';

describe('Player cleanup', () => {
  let player;
  
  beforeEach(() => {
    // Mock document methods
    global.document = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      pointerLockElement: null,
      exitPointerLock: jest.fn(),
    };
    global.document.getElementById = jest.fn(() => ({}));
    
    player = new Player();
  });
  
  afterEach(() => {
    if (player && !player.isDestroyed()) {
      player.destroy();
    }
  });
  
  test('constructor registers event listeners', () => {
    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
    expect(document.addEventListener).toHaveBeenCalledWith('keyup', expect.any(Function));
    expect(document.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(document.addEventListener).toHaveBeenCalledWith('contextmenu', expect.any(Function));
  });
  
  test('destroy() removes event listeners', () => {
    // Capture references before destroy
    const keyDownHandler = player._handleKeyDown;
    const keyUpHandler = player._handleKeyUp;
    const mouseMoveHandler = player._handleMouseMove;
    const contextMenuHandler = player._handleContextMenu;
    
    player.destroy();
    
    expect(document.removeEventListener).toHaveBeenCalledWith('keydown', keyDownHandler);
    expect(document.removeEventListener).toHaveBeenCalledWith('keyup', keyUpHandler);
    expect(document.removeEventListener).toHaveBeenCalledWith('mousemove', mouseMoveHandler);
    expect(document.removeEventListener).toHaveBeenCalledWith('contextmenu', contextMenuHandler);
  });
  
  test('destroy() clears handler references', () => {
    player.destroy();
    
    expect(player._handleKeyDown).toBeNull();
    expect(player._handleKeyUp).toBeNull();
    expect(player._handleMouseMove).toBeNull();
    expect(player._handleContextMenu).toBeNull();
  });
  
  test('isDestroyed() returns false initially', () => {
    expect(player.isDestroyed()).toBe(false);
  });
  
  test('isDestroyed() returns true after destroy()', () => {
    player.destroy();
    expect(player.isDestroyed()).toBe(true);
  });
  
  test('uses constants from constants module', () => {
    expect(player.walkSpeed).toBe(5.0);
    expect(player.jumpStrength).toBe(8.0);
    expect(player.gravity).toBe(20.0);
    expect(player.mouseSensitivity).toBe(0.002);
  });
});

describe('Player movement normalization', () => {
  let player;
  
  beforeEach(() => {
    // Mock document methods
    global.document = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      pointerLockElement: null,
      exitPointerLock: jest.fn(),
    };
    global.document.getElementById = jest.fn(() => ({ requestPointerLock: jest.fn() }));
    
    player = new Player();
    // Reset movement keys
    player.movement = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sneak: false,
    };
  });
  
  afterEach(() => {
    if (player && !player.isDestroyed()) {
      player.destroy();
    }
  });
  
  test('forward movement has correct speed', () => {
    player.movement.forward = true;
    player.update(0.1);
    const speed = Math.sqrt(player.velocity.x ** 2 + player.velocity.z ** 2);
    expect(speed).toBeCloseTo(player.walkSpeed, 5);
  });
  
  test('diagonal movement equals straight movement speed', () => {
    player.movement.forward = true;
    player.movement.left = true;
    player.update(0.1);
    const diagonalSpeed = Math.sqrt(player.velocity.x ** 2 + player.velocity.z ** 2);
    
    // Reset and test straight
    player.velocity = { x: 0, y: 0, z: 0 };
    player.movement.left = false;
    player.update(0.1);
    const straightSpeed = Math.sqrt(player.velocity.x ** 2 + player.velocity.z ** 2);
    
    expect(diagonalSpeed).toBeCloseTo(straightSpeed, 5);
  });
  
  test('sneak halves speed', () => {
    player.movement.forward = true;
    player.movement.sneak = true;
    player.update(0.1);
    const speed = Math.sqrt(player.velocity.x ** 2 + player.velocity.z ** 2);
    expect(speed).toBeCloseTo(player.walkSpeed / 2, 5);
  });
  
  test('no movement when no keys pressed', () => {
    player.update(0.1);
    expect(player.velocity.x).toBe(0);
    expect(player.velocity.z).toBe(0);
  });
});

describe('Player physics', () => {
  let player;

  beforeEach(() => {
    // Mock document methods
    global.document = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      pointerLockElement: null,
      exitPointerLock: jest.fn(),
    };
    global.document.getElementById = jest.fn(() => ({}));

    player = new Player();
    player.movement = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sneak: false,
    };
  });

  afterEach(() => {
    if (player && !player.isDestroyed()) {
      player.destroy();
    }
  });

  test('gravity reduces y velocity when in air', () => {
    player.onGround = false;
    player.velocity.y = 0;
    player.update(0.1);
    expect(player.velocity.y).toBeLessThan(0);
  });

  test('jump sets positive y velocity', () => {
    player.onGround = true;
    player.movement.jump = true;
    player.update(0.1);
    expect(player.velocity.y).toBeGreaterThan(0);
  });
});

describe('Collision detection', () => {
  let player;
  let mockChunkManager;

  beforeEach(() => {
    // Mock document methods
    global.document = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      pointerLockElement: null,
      exitPointerLock: jest.fn(),
    };
    global.document.getElementById = jest.fn(() => ({}));

    player = new Player();
    player.movement = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      jump: false,
      sneak: false,
    };

    // Mock chunkManager with floor at y=0 and wall at x=5
    mockChunkManager = {
      getChunk: () => ({
        getVoxel: (x, y, z) => {
          // Floor at y=0
          if (y < 0) return 1;
          // Wall at x=5
          if (x >= 5 && x < 6) return 1;
          return null;
        }
      })
    };
  });

  afterEach(() => {
    if (player && !player.isDestroyed()) {
      player.destroy();
    }
  });

  test('player cannot fall through floor', () => {
    player.position.y = 0.5;
    player.velocity.y = -10;
    player.update(0.1, mockChunkManager);
    expect(player.position.y).toBeGreaterThanOrEqual(0);
  });

  test('player slides along wall when moving diagonally', () => {
    player.position = { x: 4.5, y: 1, z: 0 };
    player.movement.right = true; // Moving toward wall at x=5
    player.movement.forward = true;
    player.update(0.1, mockChunkManager);
    // X should be blocked, but Z should still move
    expect(player.position.x).toBeLessThanOrEqual(4.8);
    // Z should have moved (forward at yaw=0 = +z direction)
    expect(player.position.z).toBeGreaterThan(0);
  });
});