const { chromium } = require('playwright');
const fs = require('fs');

const viewports = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
};

async function main() {
  fs.mkdirSync('/tmp/lib10-shots', { recursive: true });
  const browser = await chromium.launch();

  for (const [vpName, vp] of Object.entries(viewports)) {
    const context = await browser.newContext({ viewport: vp });
    const page = await context.newPage();

    await page.goto('http://localhost:3000/drawers/new', { waitUntil: 'load' });
    const domNodes = await page.evaluate(() => document.querySelectorAll('*').length);
    const cardCount = await page.locator('.garment-card').count();
    const searchBox = await page.locator('#picker-search').boundingBox();
    const categoryBox = await page.locator('#picker-category').boundingBox();
    console.log(
      `[${vpName}] /drawers/new domNodes=${domNodes} renderedCards=${cardCount} searchInputWidth=${searchBox.width}px categorySelectWidth=${categoryBox.width}px`,
    );
    await page.screenshot({ path: `/tmp/lib10-shots/picker-initial-${vpName}.png` });

    // type into search, expect an htmx-driven server round trip that shrinks the grid
    await page.fill('#picker-search', 'Denim');
    await page.waitForTimeout(500); // debounce + request
    const cardsAfterSearch = await page.locator('.garment-card').count();
    const searchBoxAfterType = await page.locator('#picker-search').boundingBox();
    console.log(
      `[${vpName}] AFTER search "Denim": renderedCards=${cardsAfterSearch} searchInputWidthWhileTyping=${searchBoxAfterType.width}px`,
    );
    await page.screenshot({ path: `/tmp/lib10-shots/picker-after-search-${vpName}.png` });

    // select a garment, then change the search so it's no longer in the grid
    await page.locator('.picker-checkbox').first().evaluate((el) => {
      el.checked = true;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    const selectedCountAfterCheck = await page.locator('#selected-inputs .selected-hidden').count();
    await page.fill('#picker-search', 'zzzznomatch');
    await page.waitForTimeout(500);
    const emptyVisible = await page.locator('text=' + (await page.locator('#garment-picker-grid p').textContent().catch(() => '')));
    const cardsAfterNoMatch = await page.locator('.garment-card').count();
    const selectedCountAfterFilter = await page.locator('#selected-inputs .selected-hidden').count();
    console.log(
      `[${vpName}] selected after check=${selectedCountAfterCheck}, cards after no-match search=${cardsAfterNoMatch}, selected still tracked=${selectedCountAfterFilter}`,
    );

    // category filter
    await page.fill('#picker-search', '');
    await page.selectOption('#picker-category', 'outerwear');
    await page.waitForTimeout(500);
    const cardsAfterCategory = await page.locator('.garment-card').count();
    console.log(`[${vpName}] AFTER category=outerwear: renderedCards=${cardsAfterCategory}`);
    await page.screenshot({ path: `/tmp/lib10-shots/picker-after-category-${vpName}.png` });

    // lazy loading check
    const lazyImgCount = await page.locator('.garment-card img[loading="lazy"]').count();
    const totalImgCount = await page.locator('.garment-card img').count();
    console.log(`[${vpName}] lazy-loaded images: ${lazyImgCount}/${totalImgCount}`);

    await context.close();
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
