const puppeteer = require('puppeteer');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Simple static file server
const server = http.createServer((req, res) => {
    let filePath = req.url === '/' ? '/index.html' : req.url;
    filePath = path.join(__dirname, filePath);
    
    const ext = path.extname(filePath);
    const contentType = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.ico': 'image/x-icon',
    }[ext] || 'text/plain';
    
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Not found');
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        }
    });
});

(async () => {
    // Start server
    await new Promise(resolve => server.listen(8080, resolve));
    console.log('Server started on http://localhost:8080');
    
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    
    // Capture console messages
    page.on('console', msg => {
        console.log(`[${msg.type()}] ${msg.text()}`);
    });
    
    // Capture errors
    page.on('pageerror', error => {
        console.error(`Page error: ${error}`);
    });
    
    // Load the page
    await page.goto('http://localhost:8080', { waitUntil: 'networkidle0' });
    
    // Wait a bit for initialization
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Take a screenshot
    await page.screenshot({ path: 'screenshot.png', fullPage: true });
    console.log('Screenshot saved to screenshot.png');
    
    // Evaluate debug info
    const debugInfo = await page.evaluate(() => {
        const debugEl = document.getElementById('debug');
        return debugEl ? debugEl.innerText : 'no debug element';
    });
    console.log('Debug info:', debugInfo);
    
    await browser.close();
    server.close();
})();