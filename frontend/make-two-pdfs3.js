const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(`<html><body><h1>P1 A</h1><div style="page-break-after:always;"></div><h1>P2 A</h1><div style="page-break-after:always;"></div><h1>P3 A</h1></body></html>`);
  await page.pdf({ path: 'doc-a.pdf', format: 'A4' });
  await page.setContent(`<html><body>${Array.from({length:5},(_,i)=>`<h1>P${i+1} B</h1>${i<4?'<div style="page-break-after:always;"></div>':''}`).join('')}</body></html>`);
  await page.pdf({ path: 'doc-b.pdf', format: 'A4' });
  await browser.close();
})();
