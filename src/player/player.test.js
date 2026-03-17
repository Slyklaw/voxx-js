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
