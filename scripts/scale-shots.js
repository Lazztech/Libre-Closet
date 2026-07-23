const { chromium } = require('playwright');

const viewports = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
};

const pages = [
  { name: 'wardrobe', path: '/wardrobe' },
  { name: 'drawers-index', path: '/drawers' },
  { name: 'drawer-new-picker', path: '/drawers/new' },
];

async function main() {
  const n = process.argv[2];
  const browser = await chromium.launch();
  for (const [vpName, vp] of Object.entries(viewports)) {
    const context = await browser.newContext({ viewport: vp });
    const page = await context.newPage();
    for (const p of pages) {
      const start = Date.now();
      await page.goto(`http://localhost:3000${p.path}`, { waitUntil: 'load', timeout: 60000 });
      const loadMs = Date.now() - start;
      const domNodes = await page.evaluate(() => document.querySelectorAll('*').length);
      const imgCount = await page.evaluate(() => document.querySelectorAll('img').length);
      console.log(`n=${n} ${vpName} ${p.name}: load=${loadMs}ms domNodes=${domNodes} imgTags=${imgCount}`);
      await page.screenshot({ path: `/tmp/scale-test/screenshots/${p.name}-${vpName}-n${n}.png`, fullPage: p.name !== 'wardrobe' });
    }
    await context.close();
  }
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
