const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
    await page.goto('http://localhost:3000/dossier/repos', { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 2000));
    
    // check if spinner exists
    const hasSpinner = await page.evaluate(() => !!document.querySelector('.animate-spin'));
    console.log('Has spinner:', hasSpinner);
    
    // check if items list exists
    const itemsLen = await page.evaluate(() => {
        const d = document.querySelector('.bg-red-500');
        return d ? d.innerText : 'NotFound';
    });
    console.log('Debug text:', itemsLen);
    
    await browser.close();
})();
