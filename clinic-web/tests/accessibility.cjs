const { chromium } = require('playwright');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const report = [];
  try {
    await page.goto(pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href);
    await page.addScriptTag({ path: require.resolve('axe-core/axe.min.js') });
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1000 });
      for (const view of [
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
      ]) {
        await page.evaluate(view => navigate(view, view.split('-')[0]), view);
        const results = await page.evaluate(() =>
          axe.run(document, {
            runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
          }),
        );
        report.push({
          width,
          view,
          violations: results.violations.map(v => ({
            id: v.id,
            impact: v.impact,
            nodes: v.nodes.map(n => ({ target: n.target, summary: n.failureSummary })),
          })),
        });
      }
      await page.evaluate(() => {
        navigate('doctor-examination', 'doctor');
        openAddMedicineModal();
      });
      const result = await page.evaluate(() =>
        axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } }),
      );
      report.push({
        width,
        view: 'medicine-dialog',
        violations: result.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })),
      });
      await page.keyboard.press('Escape');
    }
    const output = process.env.UI_ARTIFACTS || path.resolve(__dirname, '..', 'test-results');
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(
      path.join(output, 'accessibility-report.json'),
      JSON.stringify(report, null, 2),
    );
    console.log(
      JSON.stringify(
        report.filter(r => r.violations.length),
        null,
        2,
      ),
    );
    console.log(`Audited ${report.length} view/viewport combinations.`);
    if (report.some(r => r.violations.length)) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
