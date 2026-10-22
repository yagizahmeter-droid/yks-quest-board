const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');

(async () => {
  let server, browser;
  const errors = [], remote = [], results = [];
  try {
    process.env.PORT = '0';
    server = require('../scripts/server.cjs');
    if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
    browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
    await context.route('**/config.js', route => route.fulfill({ contentType: 'text/javascript', body: "window.YKS_CONFIG={supabaseUrl:'https://fixture.supabase.co',supabaseAnonKey:'local-fixture'};" }));
    await context.route('**/vendor/supabase.js', route => route.fulfill({ contentType: 'text/javascript', body: "document.currentScript.dataset.role='student';\n" + fs.readFileSync(path.join(root, 'admin-preview.js'), 'utf8') }));
    await context.route('**/*.supabase.co/**', route => { remote.push(route.request().url()); return route.abort(); });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(process.env.DERS_CLOUD_URL || `http://127.0.0.1:${server.address().port}/`);
    await page.waitForFunction(() => window.DersBoard?.user && window.DersStudy?.loaded);
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all(['dark', 'light'].map(async theme => {
        const image = new Image(); image.src = './assets/theme-cloud-' + theme + '.svg';
        await image.decode();
      }));
    });
    await page.evaluate(async () => {
      const state = DersBoard.state, week = DersBoard.week();
      state.categories = ['Turkce', 'Fizik'].map((name, i) => ({ id: 'cloud-' + i, name, color: '#63d6d6', sortOrder: i }));
      week.quests = state.categories.flatMap((category, i) => Array.from({ length: i ? 5 : 2 }, (_, j) => ({
        id: 'cloud-' + i + '-' + j, categoryId: category.id, subject: category.id,
        title: 'Long subject title with multiple words and additional study steps',
        detail: '40 questions and analysis, with additional explanations and practice.',
        xp: 200, done: false, lockedForStudent: true, assignedQuestId: 'fixture-' + i + '-' + j
      })));
      await DersBoard.client.rpc('ders_action', { p_action: 'sync_board', p_payload: { state: structuredClone(state) } });
      DersBoard.render(); DersUI.navigate('program');
    });
    for (const width of [360, 390, 430, 768, 1440, 1920]) for (const theme of ['dark', 'light']) {
      await page.setViewportSize({ width, height: 1000 });
      await page.evaluate(theme => { DersTheme.setStyle('cloud'); DersTheme.set(theme); scrollTo(0, 0); }, theme);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
      if ([390, 1440].includes(width)) await page.screenshot({ path: path.join(root, 'test-results', `cloud-containment-${width}-${theme}.png`), fullPage: true });
      for (const card of await page.locator('#board > .card').all()) {
        await card.scrollIntoViewIfNeeded();
        const geometry = await card.evaluate(card => {
          const bounds = card.getBoundingClientRect();
          const color = document.createElement('span');
          color.style.color = 'var(--panel)'; card.append(color);
          const fill = getComputedStyle(color).color.match(/\d+/g).slice(0, 3).map(Number); color.remove();
          const boxes = [...card.querySelectorAll('.card-head,.subject-title,.subject-xp,.check,.quest-title,.quest-meta,.xp,.quest-action')].map(el => {
            const r = el.getBoundingClientRect();
            return { label: el.className, x: r.x - bounds.x, y: r.y - bounds.y, width: r.width, height: r.height };
          }).filter(r => r.width && r.height);
          return { fill, boxes };
        });
        // Inspect the painted cloud, not just the rectangular CSS border box.
        const chrome = await page.addStyleTag({ content: '.sidebar,.workspace-header,.app-footer { visibility:hidden !important; }' });
        await card.evaluate(card => { for (const child of card.children) child.style.visibility = 'hidden'; });
        const png = await card.screenshot();
        await card.evaluate(card => { for (const child of card.children) child.style.removeProperty('visibility'); });
        await chrome.evaluate(el => el.remove());
        const outside = await page.evaluate(async ({ png, geometry }) => {
          const image = new Image(); image.src = 'data:image/png;base64,' + png; await image.decode();
          const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
          const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
          const outside = [];
          for (const box of geometry.boxes) {
            for (const x of [box.x + 3, box.x + box.width / 2, box.x + box.width - 3]) {
              for (const y of [box.y + 3, box.y + box.height / 2, box.y + box.height - 3]) {
                const pixel = ctx.getImageData(Math.floor(x), Math.floor(y), 1, 1).data;
                if (geometry.fill.some((value, i) => Math.abs(value - pixel[i]) > 4)) outside.push({ label: box.label, x, y, pixel: [...pixel] });
              }
            }
          }
          return outside;
        }, { png: png.toString('base64'), geometry });
        if (outside.length) {
          fs.writeFileSync(path.join(root, 'test-results/cloud-containment-failed.png'), png);
          console.log('CLOUD_GEOMETRY', JSON.stringify(geometry));
        }
        assert.deepEqual(outside, [], `${width}/${theme}: content must sit on the painted cloud`);
      }
      results.push({ width, theme });
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(remote, []);
    fs.writeFileSync(path.join(root, 'test-results/cloud-containment.json'), JSON.stringify({ results, productionTouched: false }, null, 2));
    console.log('PASS cloud silhouette containment: headers, XP, long tasks and controls in 12 desktop/mobile theme combinations; no remote data access');
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
