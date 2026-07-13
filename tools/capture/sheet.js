// Build contact sheets: one PNG grid per capture group, for visual review.
const { chromium } = require('playwright');
const fs = require('fs');

const DIR = __dirname + '/shots';
const files = fs.readdirSync(DIR).filter(f => f.endsWith('.png') && !f.startsWith('sheet-'));
const groups = {};
for (const f of files) {
  const g = f.replace(/-\d+\.png$/, '').replace(/\.png$/, '');
  (groups[g] = groups[g] || []).push(f);
}
// UI shots go on one combined sheet
const sheets = { ui: [] };
for (const [g, list] of Object.entries(groups)) {
  if (g.startsWith('ui-')) sheets.ui.push(...list);
  else sheets[g] = list.sort();
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1740, height: 1000 } });
  for (const [name, list] of Object.entries(sheets)) {
    if (!list.length) continue;
    const html = `<body style="margin:0;background:#222;display:flex;flex-wrap:wrap">` +
      list.map(f => `<div style="margin:4px;text-align:center">
        <img src="${f}" style="width:330px;display:block">
        <span style="color:#eee;font:11px monospace">${f}</span></div>`).join('');
    fs.writeFileSync(`${DIR}/sheet.html`, html);
    await page.goto(`file://${DIR}/sheet.html`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${DIR}/sheet-${name}.png`, fullPage: true });
    console.log(`sheet-${name}.png (${list.length} frames)`);
  }
  await browser.close();
})();
