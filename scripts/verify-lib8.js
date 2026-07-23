const { chromium } = require('playwright');
const fs = require('fs');

const viewports = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
};

async function main() {
  fs.mkdirSync('/tmp/lib8-shots', { recursive: true });
  const browser = await chromium.launch();

  for (const [vpName, vp] of Object.entries(viewports)) {
    const context = await browser.newContext({ viewport: vp });
    const page = await context.newPage();

    // /wardrobe pagination
    await page.goto('http://localhost:3000/wardrobe', { waitUntil: 'load' });
    const wardrobeDom = await page.evaluate(() => document.querySelectorAll('*').length);
    console.log(`[${vpName}] /wardrobe page1 domNodes=${wardrobeDom}`);
    await page.screenshot({ path: `/tmp/lib8-shots/wardrobe-${vpName}.png` });

    // /drawers index (thumbnail cap)
    await page.goto('http://localhost:3000/drawers', { waitUntil: 'load' });
    const drawersDom = await page.evaluate(() => document.querySelectorAll('*').length);
    console.log(`[${vpName}] /drawers index domNodes=${drawersDom}`);
    await page.screenshot({ path: `/tmp/lib8-shots/drawers-index-${vpName}.png`, fullPage: true });

    // /drawers/2 (100-item drawer) pagination
    await page.goto('http://localhost:3000/drawers/2', { waitUntil: 'load' });
    const drawerShowDom = await page.evaluate(() => document.querySelectorAll('*').length);
    console.log(`[${vpName}] /drawers/2 domNodes=${drawerShowDom}`);
    await page.screenshot({ path: `/tmp/lib8-shots/drawer-show-${vpName}.png`, fullPage: true });

    // /drawers/new picker search
    await page.goto('http://localhost:3000/drawers/new', { waitUntil: 'load' });
    const pickerDomBefore = await page.evaluate(() => document.querySelectorAll('*').length);
    const cardsBefore = await page.locator('.garment-card:not(.hidden)').count();
    console.log(`[${vpName}] /drawers/new BEFORE search: domNodes=${pickerDomBefore} visibleCards=${cardsBefore}`);
    await page.screenshot({ path: `/tmp/lib8-shots/picker-before-${vpName}.png` });

    await page.fill('#picker-search', 'Denim');
    await page.waitForTimeout(400); // debounce
    const cardsAfterSearch = await page.locator('.garment-card:not(.hidden)').count();
    console.log(`[${vpName}] /drawers/new AFTER search "Denim": visibleCards=${cardsAfterSearch}`);
    await page.screenshot({ path: `/tmp/lib8-shots/picker-after-search-${vpName}.png` });

    await page.fill('#picker-search', 'zzzznomatch');
    await page.waitForTimeout(400);
    const emptyVisible = await page.locator('#picker-empty').isVisible();
    const cardsAfterNoMatch = await page.locator('.garment-card:not(.hidden)').count();
    console.log(`[${vpName}] /drawers/new AFTER no-match search: visibleCards=${cardsAfterNoMatch} emptyMessageVisible=${emptyVisible}`);

    await page.fill('#picker-search', '');
    await page.selectOption('#picker-category', 'outerwear');
    await page.waitForTimeout(400);
    const cardsAfterCategory = await page.locator('.garment-card:not(.hidden)').count();
    console.log(`[${vpName}] /drawers/new AFTER category=outerwear: visibleCards=${cardsAfterCategory}`);
    await page.screenshot({ path: `/tmp/lib8-shots/picker-after-category-${vpName}.png` });

    // checkbox selection persists through a filter change
    await page.selectOption('#picker-category', '');
    await page.waitForTimeout(200);
    await page.locator('.garment-card input[type=checkbox]').first().evaluate((el) => {
      el.checked = true;
    });
    await page.fill('#picker-search', 'Denim');
    await page.waitForTimeout(400);
    const checkedCount = await page.locator('.garment-card input[type=checkbox]:checked').count();
    console.log(`[${vpName}] /drawers/new checked garments still checked after filtering: ${checkedCount}`);

    await context.close();
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
