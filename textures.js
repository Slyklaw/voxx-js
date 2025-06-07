function createTextureAtlas() {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    
    // Water (blue)
    ctx.fillStyle = '#1E90FF';
    ctx.fillRect(0, 0, 16, 4);
    
    // Sand (yellow)
    ctx.fillStyle = '#F0E68C';
    ctx.fillRect(0, 4, 16, 4);
    
    // Grass (green)
    ctx.fillStyle = '#32CD32';
    ctx.fillRect(0, 8, 16, 4);
    
    // Rock (gray)
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 12, 16, 2);
    
    // Snow (white)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 14, 16, 2);
    
    return canvas;
}