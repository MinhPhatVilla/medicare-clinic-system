const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');

const artifacts = process.env.UI_ARTIFACTS || path.join(__dirname, '..', 'test-results');
const url = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
const views = [
  'landing',
  'login',
  'patient-dashboard',
  'patient-booking',
  'patient-appointments',
  'doctor-dashboard',
  'doctor-examination',
  'receptionist-dashboard',
  'receptionist-billing',
  'admin-dashboard',
];

(async () => {
  fs.mkdirSync(artifacts, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const results = [];
  try {
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    for (const width of [1920, 1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: width > 800 ? 1000 : 844 });
      for (const view of views) {
        await page.evaluate(view => navigate(view, view.split('-')[0]), view);
        const issues = await page.evaluate(() => {
          const ids = [...document.querySelectorAll('[id]')].map(el => el.id);
          return {
            overflow: document.documentElement.scrollWidth > innerWidth + 1,
            duplicates: ids.filter((id, i) => ids.indexOf(id) !== i),
            brokenImages: [...document.images]
              .filter(img => img.complete && !img.naturalWidth && !img.hidden)
              .map(img => img.src),
            clippedControls: [...document.querySelectorAll('button, input, textarea, select')]
              .filter(el => {
                const rect = el.getBoundingClientRect();
                return (
                  rect.width &&
                  rect.height &&
                  (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2)
                );
              })
              .map(el => (el.textContent || el.id).trim().slice(0, 70)),
          };
        });
        results.push({ width, view, ...issues });
        await page.screenshot({
          path: path.join(artifacts, `${view}-${width}.png`),
          fullPage: true,
        });
        if (view === 'landing')
          await page.screenshot({ path: path.join(artifacts, `landing-viewport-${width}.png`) });
      }
    }
    const report = { errors, results };
    fs.writeFileSync(path.join(artifacts, 'visual-report.json'), JSON.stringify(report, null, 2));
    console.log(
      JSON.stringify(
        {
          errors,
          failures: results.filter(
            r =>
              r.overflow ||
              r.duplicates.length ||
              r.brokenImages.length ||
              r.clippedControls.length,
          ),
          combinations: results.length,
        },
        null,
        2,
      ),
    );
    if (
      errors.length ||
      results.some(
        r => r.overflow || r.duplicates.length || r.brokenImages.length || r.clippedControls.length,
      )
    )
      process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
