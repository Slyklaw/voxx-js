const puppeteer = require('puppeteer');
const path = require('path');

(async () => {
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
    
    // Load the index.html file
    const htmlPath = path.join(__dirname, 'index.html');
    await page.goto(`file://${htmlPath}`, { waitUntil: 'networkidle0' });
    
    // Wait a bit for initialization
    await page.waitForTimeout(2000);
    
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
})();