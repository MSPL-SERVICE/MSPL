const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const sampleEmployee = {
    id: 'MSPL-EMP-TEST',
    role: 'employee',
    name: 'Automated Tester',
    status: 'approved',
    registeredAt: '2026-05-26',
    phoneNumber: '0000000000',
    password: 'test',
    leaveBalance: { casual: 0, sick: 0, annual: 0 },
    uploadedFilesList: [
      {
        key: 'test-doc-1',
        name: 'sample-image.png',
        type: 'image/png',
        data: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII='
      }
    ]
  };

  // set localStorage before navigation so app reads it on startup
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });
  await page.evaluate((emp) => {
    localStorage.setItem('mspl_current_employee', JSON.stringify(emp));
  }, sampleEmployee);

  await page.reload({ waitUntil: 'networkidle2' });

  // scroll to portal section to ensure EmployeePortal is visible
  await page.evaluate(() => {
    const el = document.getElementById('portal');
    if (el) el.scrollIntoView();
  });

  // Wait for preview button to appear
  await page.waitForSelector('button[title="Preview File"]', { timeout: 5000 });
  await page.click('button[title="Preview File"]');

  // Wait for DocumentViewer overlay
  await page.waitForSelector('div.fixed.inset-0', { timeout: 5000 });

  // Take screenshot
  await page.screenshot({ path: 'document-viewer-screenshot.png', fullPage: false });

  console.log('Screenshot saved: document-viewer-screenshot.png');
  await browser.close();
})();
