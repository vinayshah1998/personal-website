import { expect, test, type Page } from '@playwright/test';
import { activities } from './strava-mock.mjs';

const shots = process.env.E2E_SHOTS ?? '.audit/screens';
const PAGES = ['about', 'projects', 'blog', 'stats'];

// Vercel serves /_vercel/* (Analytics, Speed Insights) only on its edge; a local `next start` answers 404.
test.beforeEach(async ({ page }) => {
  if (process.env.E2E_BASE_URL) return;
  await page.route('**/_vercel/**', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
});

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()} ${message.location().url}`);
  });
  return errors;
}

/** Canvas pixels in a CSS-pixel box that differ clearly from the ground, i.e. drawn ink. */
async function inkIn(page: Page, box: { x: number; y: number; w: number; h: number }) {
  return page.evaluate(({ x, y, w, h }) => {
    const cv = document.querySelector<HTMLCanvasElement>('canvas.ink')!;
    const s = cv.width / cv.getBoundingClientRect().width;
    const data = cv.getContext('2d')!.getImageData(Math.round(x * s), Math.round(y * s), Math.round(w * s), Math.round(h * s)).data;
    const bg = cv.getContext('2d')!.getImageData(0, cv.height - 1, 1, 1).data;
    let n = 0;
    for (let i = 0; i < data.length; i += 4) if (Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) > 90) n++;
    return n;
  }, box);
}

async function touchDrag(page: Page, points: [number, number][]) {
  const cdp = await page.context().newCDPSession(page);
  const [x0, y0] = points[0];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x0, y: y0 }] });
  for (const [x, y] of points.slice(1)) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('every page renders, and the nav moves between them without resetting the ink', async ({ page }, testInfo) => {
  const errors = trackErrors(page);
  const routes = ['/', '/about/', '/projects/', '/blog/', '/blog/linux-server-revival/', '/blog/oauth-route-not-found/', '/blog/stripe-webhook-debugging/', '/stats/', '/foolish-enterprises/', '/foolish-enterprises/llm-time-blocker/privacy-policy/'];
  for (const route of routes) {
    const response = await page.request.get(route);
    expect(response.status(), route).toBe(200);
    expect(response.headers()['content-type'], route).toContain('text/html');
  }

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'vinay shah' })).toBeVisible();
  await expect(page.locator('.home-clock')).toHaveText(/^\d{1,2}:\d{2} (am|pm)$/);
  const nav = page.getByRole('navigation', { name: 'Site' });
  await expect(nav.getByRole('link')).toHaveText(PAGES);
  await page.screenshot({ path: `${shots}/${testInfo.project.name}-home.png` });

  await page.evaluate(() => ((window as unknown as { ink: Element }).ink = document.querySelector('canvas.ink')!));
  await nav.getByRole('link', { name: 'projects' }).click();
  await expect(page).toHaveURL(/\/projects\/$/);
  await expect(page.getByRole('link', { name: 'llm time blocker' })).toHaveAttribute('href', 'https://github.com/vinayshah1998/llm_time_blocker');
  await expect(page.getByText('swift, swiftui, ios 18')).toBeVisible();
  await expect(nav.getByRole('link', { name: 'projects' })).toHaveAttribute('aria-current', 'page');

  await nav.getByRole('link', { name: 'blog' }).click();
  await page.getByRole('link', { name: /Reviving a MacBook Pro/ }).click();
  await expect(page).toHaveURL(/\/blog\/linux-server-revival\/$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Reviving a MacBook Pro: From Dusty Junk to Personal Media Server');
  await expect(page.getByRole('heading', { name: 'Phase 2: The Hardware Gauntlet' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'blog' })).toHaveAttribute('aria-current', 'page');
  await page.screenshot({ path: `${shots}/${testInfo.project.name}-post.png` });

  await page.getByRole('link', { name: 'vinay shah' }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => (window as unknown as { ink: Element }).ink === document.querySelector('canvas.ink'))).toBe(true);
  expect(errors).toEqual([]);
});

test('Foolish Enterprises pages stay, outside the nav', async ({ page }) => {
  await page.goto('/foolish-enterprises/');
  await expect(page.getByRole('heading', { name: 'foolish enterprises' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Site' }).getByRole('link')).toHaveText(PAGES);
  await page.goto('/foolish-enterprises/llm-time-blocker/privacy-policy/');
  await expect(page.getByRole('heading', { name: 'privacy policy' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '10. Contact Us' })).toBeVisible();
});

test('the homepage fills the first screen and its links fit with 44px targets', async ({ page, isMobile }) => {
  const widths = isMobile ? [360, 393, 430] : [1440];
  for (const width of widths) {
    const height = isMobile ? 800 : 900;
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const canvas = (await page.locator('canvas.ink').boundingBox())!;
    expect(canvas.height).toBe(height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(height);
    expect(await page.evaluate(() => getComputedStyle(document.body).fontSize)).toBe(width < 480 ? '11px' : '12px');
    for (const link of await page.getByRole('navigation', { name: 'Site' }).getByRole('link').all()) {
      const box = (await link.boundingBox())!;
      expect(box.height, `${await link.innerText()} at ${width}px`).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(box.y + box.height).toBeLessThanOrEqual(height);
    }
  }
});

test('the cursor drifts and paints on its own, and stops under reduced motion', async ({ page }) => {
  const all = { x: 0, y: 0, w: page.viewportSize()!.width, h: page.viewportSize()!.height };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForTimeout(3000);
  const still = await inkIn(page, all);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await page.waitForTimeout(3000);
  expect(await inkIn(page, all)).toBeGreaterThan(still * 1.15);
});

test('the longest post scrolls to its end by touch, and pinching does not zoom', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch input is checked on the mobile project');
  await page.goto('/blog/linux-server-revival/');
  const { width, height } = page.viewportSize()!;
  const cdp = await page.context().newCDPSession(page);
  const atEnd = () => page.evaluate(() => scrollY >= document.documentElement.scrollHeight - innerHeight - 1);
  for (let i = 0; i < 120 && !(await atEnd()); i++) {
    await touchDrag(page, [[width / 2, height - 80], [width / 2, height / 2], [width / 2, 120]]);
    await page.waitForTimeout(50);
  }
  expect(await atEnd()).toBe(true);
  await expect(page.getByText('Difficulty Level:')).toBeInViewport();

  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: width / 2 - 20, y: 300, id: 0 }, { x: width / 2 + 20, y: 300, id: 1 }] });
  for (let i = 1; i <= 10; i++)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: width / 2 - 20 - i * 12, y: 300, id: 0 }, { x: width / 2 + 20 + i * 12, y: 300, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(300);
  expect(await page.evaluate(() => visualViewport!.scale)).toBe(1);
});

test('a 200% browser font size reflows every page without sideways scroll or overlap', async ({ page }) => {
  // Stands in for the browser's default font size setting, which sets the root font size.
  await page.route(/\/[^_.]*\/?$/, async (route) => {
    const response = await route.fetch();
    await route.fulfill({ response, body: (await response.text()).replace('<head>', '<head><style>html{font-size:32px}</style>') });
  });
  for (const path of ['/', '/projects/', '/blog/linux-server-revival/', '/foolish-enterprises/llm-time-blocker/privacy-policy/']) {
    await page.goto(path);
    expect(await page.evaluate(() => parseFloat(getComputedStyle(document.body).fontSize))).toBeGreaterThanOrEqual(22);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), path).toBeLessThanOrEqual(0);
    if (path === '/') continue;
    const header = (await page.locator('header.hd').boundingBox())!;
    const first = (await page.locator('main .bd > *').first().boundingBox())!;
    expect(first.y, path).toBeGreaterThanOrEqual(header.y + header.height);
  }
});

test('touch: drags paint in every direction, taps stamp ink, and nothing scrolls', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch input is checked on the mobile project');
  const errors = trackErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.waitForTimeout(500);
  const { width } = page.viewportSize()!;

  // A tap stamps a blob where it lands.
  const tap = { x: width / 2 - 40, y: 160, w: 80, h: 50 };
  const before = await inkIn(page, tap);
  await page.touchscreen.tap(width / 2, 185);
  await page.waitForTimeout(150);
  expect(await inkIn(page, tap)).toBeGreaterThan(before + 200);

  // A vertical drag and a diagonal one both paint along their whole path.
  const x = Math.round(width * 0.25);
  const vertical = Array.from({ length: 16 }, (_, i) => [x, 260 + i * 20] as [number, number]);
  const diagonal = Array.from({ length: 16 }, (_, i) => [Math.round(width * 0.55) + i * 8, 600 - i * 18] as [number, number]);
  const lower = { x: x - 20, y: 480, w: 40, h: 60 };
  const upperRight = { x: Math.round(width * 0.55) + 100, y: 340, w: 40, h: 40 };
  const [lowerBefore, upperBefore] = [await inkIn(page, lower), await inkIn(page, upperRight)];
  await touchDrag(page, vertical);
  await touchDrag(page, diagonal);
  await page.waitForTimeout(150);
  expect(await inkIn(page, lower)).toBeGreaterThan(lowerBefore + 100);
  expect(await inkIn(page, upperRight)).toBeGreaterThan(upperBefore + 100);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);

  // The nav is real links: a tap navigates.
  await page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'about' }).tap();
  await expect(page).toHaveURL(/\/about\/$/);
  await expect(page.getByText('software engineer.')).toBeVisible();
  expect(errors).toEqual([]);
});

/** Painted pixels on a chart's main canvas. */
const painted = (page: Page, chart: string) =>
  page.locator(`${chart} canvas:not(.glow)`).evaluate((cv: HTMLCanvasElement) => {
    const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
    let n = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
    return n;
  });

test('stats charts every run this year and last, from every page of activities', async ({ page, isMobile }, testInfo) => {
  const errors = trackErrors(page);
  await page.goto('/stats/');
  // The mock serves about 600 activities, three pages' worth; this year's total only comes out right with all of them.
  const year = activities().at(-1)!.start_date_local.slice(0, 4);
  const miles = (y: string) =>
    activities()
      .filter((a) => a.type === 'Run' && a.start_date_local.startsWith(y))
      .reduce((s, a) => s + a.distance * 0.000621371, 0);
  const area = page.locator('.chart.area');
  const label = (await area.getAttribute('aria-label'))!;
  const [thisYear, lastYear] = label.split('. In ').map((part) => part.split(': ')[1].split(', ').map(Number));
  expect(thisYear.at(-1)).toBeCloseTo(miles(year), 1);
  expect(lastYear).toHaveLength(12);
  expect(lastYear.at(-1)).toBeCloseTo(miles(String(Number(year) - 1)), 1);

  // The headline counts up to this year's miles, and both charts draw in.
  await expect(page.locator('.big')).toHaveText(`${miles(year).toFixed(1)} mi`);
  await expect.poll(() => painted(page, '.chart:not(.area)')).toBeGreaterThan(2000);
  await expect.poll(() => painted(page, '.chart.area')).toBeGreaterThan(2000);
  await page.screenshot({ path: `${shots}/${testInfo.project.name}-stats.png` });

  // Hover or tap the first bar: the tooltip moves to that week.
  const first = (await page.locator('.ax span').first().textContent())!.replace('week of ', '');
  const bars = (await page.locator('.chart:not(.area)').boundingBox())!;
  const tip = page.locator('.chart:not(.area) .tip');
  await expect(tip).toHaveText(/ mi$/);
  await expect(tip).not.toHaveText(new RegExp(`^${first} `));
  if (isMobile) await page.touchscreen.tap(bars.x + 10, bars.y + bars.height / 2);
  else await page.mouse.move(bars.x + 10, bars.y + bars.height / 2);
  await expect(tip).toHaveText(new RegExp(`^${first} `));
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  expect(errors).toEqual([]);
});

test('under reduced motion the stats charts and headline appear at once', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/stats/');
  const final = await page.locator('.big').textContent();
  await page.waitForTimeout(50);
  expect(await page.locator('.big').textContent()).toBe(final);
  expect(await painted(page, '.chart.area')).toBeGreaterThan(2000);
});
