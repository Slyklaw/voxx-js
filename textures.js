function createTextureAtlas() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 20;  // Increased height for sea block
    const ctx = canvas.getContext('2d');
    
    // Water (blue) - moved down 4px
    ctx.fillStyle = '#1E90FF';
    ctx.fillRect(0, 4, 16, 4);
    
    // Sand (yellow) - moved down 4px
    ctx.fillStyle = '#F0E68C';
    ctx.fillRect(0, 8, 16, 4);
    
    // Grass (green) - moved down 4px
    ctx.fillStyle = '#32CD32';
    ctx.fillRect(0, 12, 16, 4);
    
    // Rock (gray) - moved down 4px
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 16, 16, 2);
    
    // Snow (white) - moved down 4px
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 18, 16, 2);
    
    // Sea (dark blue) - added at top
    ctx.fillStyle = '#00008B';
    ctx.fillRect(0, 0, 16, 4);
    
    return canvas;
}