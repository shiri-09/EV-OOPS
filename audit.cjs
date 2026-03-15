const puppeteer = require('puppeteer');
const fs = require('fs');

async function audit() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const errors = [];
    page.on('console', msg => {
        errors.push(`${msg.type()}: ${msg.text()}`);
    });
    page.on('requestfailed', request => {
        if (!request.url().includes('raspberrypi')) {
            errors.push(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
        }
    });
    page.on('pageerror', err => {
        errors.push(`Page Error: ${err.message}`);
    });

    try {
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
        await new Promise(r => setTimeout(r, 6000));
        await page.screenshot({ path: 'dashboard.png', fullPage: true });

        // Check if charts are rendered by checking the SVG inside plotly-chart
        const chartRendered = await page.$$eval('.plotly-chart .js-plotly-plot', els => {
            return els.map(e => e.id);
        });

        const chartDetails = await page.$$eval('.plotly-chart', els => {
            return els.map(e => {
                const rect = e.getBoundingClientRect();
                const hasSvg = e.querySelector('svg') !== null;
                return `${e.id}: ${rect.width}x${rect.height} (Has SVG: ${hasSvg})`;
            });
        });

        fs.writeFileSync('dom_dump.txt', chartDetails.join('\n'));
        console.log("Charts Check Complete!");
    } catch (e) {
        console.error("Failed to load page:", e);
    } finally {
        await browser.close();
    }
}

audit();
