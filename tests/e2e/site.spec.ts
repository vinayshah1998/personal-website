import { expect, test, type Page } from '@playwright/test';
import { contributionDays } from './github-mock.mjs';
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
  await expect(page.getByRole('link', { name: /^llm_time_blocker/ })).toHaveAttribute('href', 'https://github.com/vinayshah1998/llm_time_blocker');
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

test('projects: a quiet list in order, each opening inline with its links, posts, and demo', async ({ page, isMobile }) => {
  const errors = trackErrors(page);
  const press = (l: ReturnType<Page['locator']>) => (isMobile ? l.tap() : l.click());
  await page.goto('/projects/');
  const toggles = page.locator('button.ph .t');
  await expect(toggles).toHaveText(['kiro-cli', 'kiro orbits', 'this website', 'luckynumber', 'gita swipe']);
  const project = (name: string) => page.locator('section.proj').filter({ has: page.locator('.ph .t', { hasText: new RegExp(`^${name}$`) }) });

  // Every project shows its repo or site; private repos say so and still link.
  const repos: [string, string, string][] = [
    ['kiro-cli', 'kiro.dev/cli ↗', 'https://kiro.dev/cli'],
    ['kiro orbits', 'github (private) ↗', 'https://github.com/vinayshah1998/kiro-orbits'],
    ['this website', 'github ↗', 'https://github.com/vinayshah1998/personal-website'],
    ['luckynumber', 'github (private) ↗', 'https://github.com/vinayshah1998/LuckyNumber'],
    ['gita swipe', 'github (private) ↗', 'https://github.com/vinayshah1998/gita-swipe'],
  ];
  for (const [name, label, href] of repos) {
    await expect(project(name).locator('.links a')).toHaveText(label);
    await expect(project(name).locator('.links a')).toHaveAttribute('href', href);
  }
  await expect(page.locator('.more a')).toHaveText(['pstack-agent-plugin', 'opencode-provider-kiro', 'pi-provider-kiro', 'rust-harness-lab', 'llm_time_blocker', 'locus_hackathon'].map((r) => `${r} ↗`));

  // Every project starts closed; opening kiro-cli plays its run to the approval, and allowing it finishes the run.
  await expect(page.locator('button.ph[aria-expanded="true"]')).toHaveCount(0);
  await expect(page.locator('.pbody:visible')).toHaveCount(0);
  const cli = project('kiro-cli');
  await press(cli.locator('.ph'));
  await expect(cli.locator('.ph')).toHaveAttribute('aria-expanded', 'true');
  await expect(cli.getByRole('link', { name: 'Counting frames' })).toHaveAttribute('href', '/blog/counting-frames/');
  await expect(cli.locator('.pbody .lk')).toHaveCount(12);
  await press(cli.getByRole('button', { name: /Allow once/ }));
  await expect(cli.getByText('All 38 tests pass.')).toBeVisible();
  // The terminal fits its width: nothing in it scrolls or spills sideways.
  const wide = await cli.locator('.mock').evaluate((m) => {
    const box = m.getBoundingClientRect();
    return [m, ...m.querySelectorAll('*')].filter((el) => el.scrollWidth > el.clientWidth + 1 || el.getBoundingClientRect().right > box.right + 1).length;
  });
  expect(wide).toBe(0);

  // Opening another project closes the first; Orbits resolves the same permission in both panes.
  const orbits = project('kiro orbits');
  await press(orbits.locator('.ph'));
  await expect(cli.locator('.ph')).toHaveAttribute('aria-expanded', 'false');
  await expect(cli.locator('.pbody')).toBeHidden();
  await expect(orbits.locator('.pbody .lk')).toHaveText(['Polish you can test', 'Who gets to say yes', 'Making a terminal feel like an app']);
  await press(orbits.locator('.web').getByRole('button', { name: 'Reject' }));
  await expect(orbits.getByText('✓ Rejected · Run npm test')).toBeVisible();
  await expect(orbits.getByText('resolved: Reject')).toBeVisible();

  await press(project('this website').locator('.ph'));
  await expect(project('this website').locator('.mini canvas')).toBeVisible();
  await expect(project('this website').getByRole('link', { name: 'A homepage you can paint on' })).toBeVisible();

  // LuckyNumber has no demo and no posts, only its repo and a description.
  await press(project('luckynumber').locator('.ph'));
  await expect(project('luckynumber').locator('.mock')).toHaveCount(0);
  await expect(project('luckynumber').getByText(/^Roll picks someone from your contacts/)).toBeVisible();

  // Gita Swipe shows the app's real screens, dithered into the site's palette.
  const gita = project('gita swipe');
  await press(gita.locator('.ph'));
  await expect(gita.getByRole('img', { name: 'Gita Swipe showing verse 2.47' })).toHaveAttribute('data-drawn', '1');
  await expect(gita.getByRole('link', { name: 'Scroll the Gita instead of doom-scrolling' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
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

test('the paint-on post embeds the ink explainer: five steps, drags paint inside it, and the page still scrolls', async ({ page, isMobile }) => {
  const errors = trackErrors(page);
  await page.goto('/blog/homepage-you-can-paint-on/');
  await expect(page.getByRole('heading', { name: 'How it works' })).toBeVisible();
  const fig = page.locator('figure.steps');
  // The marker line is swapped for the component, not printed.
  await expect(page.getByText('[[ink-steps]]')).toHaveCount(0);
  await expect(fig.getByRole('button', { name: '5 color' })).toHaveAttribute('aria-pressed', 'true');
  await expect(fig.getByRole('slider', { name: 'time of day' })).toBeVisible();
  await fig.getByRole('button', { name: '3 dither' }).click();
  await expect(fig.locator('.bayer span')).toHaveText('0 8 2 10 12 4 14 6 3 11 1 9 15 7 13 5'.split(' '));
  await fig.getByRole('button', { name: '4 letters' }).click();
  await expect(fig.locator('.ramp')).toHaveText(' .,:;-=+*#%@');

  const stage = fig.locator('.steps-stage');
  await stage.scrollIntoViewIfNeeded();
  const drawn = () =>
    stage.locator('canvas').evaluate((cv: HTMLCanvasElement) => {
      const d = cv.getContext('2d')!.getImageData(0, 0, cv.width, cv.height).data;
      let n = 0;
      for (let i = 3; i < d.length; i += 4) if (d[i]) n++;
      return n;
    });
  // Clearing leaves only the faint baseline of dots, like the homepage; painting adds ink on top of it.
  const before = await drawn();
  await fig.getByRole('button', { name: 'clear' }).click();
  await expect.poll(drawn).toBeLessThan(before);
  const cleared = await drawn();
  const box = (await stage.boundingBox())!;
  const path = Array.from({ length: 14 }, (_, i) => [box.x + 30 + i * 18, box.y + box.height * (0.2 + (0.6 * i) / 13)] as [number, number]);
  if (isMobile) {
    // A vertical-ish drag inside the stage paints instead of scrolling; outside it, the page scrolls.
    const y = await page.evaluate(() => scrollY);
    await touchDrag(page, path);
    expect(await page.evaluate(() => scrollY)).toBe(y);
    await expect.poll(drawn).toBeGreaterThan(cleared + 500);
    const h = page.viewportSize()!.height;
    await touchDrag(page, [[10, h - 40], [10, h / 2], [10, 60]]);
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(y + 50);
  } else {
    await page.mouse.move(...path[0]);
    for (const p of path.slice(1)) await page.mouse.move(...p, { steps: 3 });
    await expect.poll(drawn).toBeGreaterThan(cleared + 500);
  }
  expect(errors).toEqual([]);
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

  // The nav is real links: a tap navigates, even straight after a fast swipe. Chrome starts a fling for one even
  // under touch-action none, and used to swallow the next tap's click to stop it.
  await touchDrag(page, diagonal);
  await page.getByRole('navigation', { name: 'Site' }).getByRole('link', { name: 'about' }).tap();
  await expect(page).toHaveURL(/\/about\/$/);
  await expect(page.getByText(/^I build products that are reliable underneath and delightful on top\. Lately: agentic developer tools at Kiro/)).toBeVisible();
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
  // The pointer leaving keeps that week selected.
  if (isMobile) await page.touchscreen.tap(bars.x + bars.width / 2, bars.y - 60);
  else await page.mouse.move(bars.x + bars.width / 2, bars.y - 60);
  await page.waitForTimeout(200);
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

test('a tap or click on a nav link leaves no focus ring on the new page; Enter from the keyboard does', async ({ page, isMobile }) => {
  const nav = page.getByRole('navigation', { name: 'Site' });
  const ringed = () => page.evaluate(() => document.querySelector(':focus-visible')?.textContent ?? null);
  const focused = () => page.evaluate(() => document.activeElement?.textContent ?? null);

  await page.goto('/');
  const projects = nav.getByRole('link', { name: 'projects' });
  if (isMobile) await projects.tap();
  else await projects.click();
  await expect(page).toHaveURL(/\/projects\/$/);
  await expect(nav.getByRole('link', { name: 'projects' })).toHaveAttribute('aria-current', 'page');
  await page.waitForTimeout(200);
  expect(await ringed()).toBeNull();
  expect(await focused()).not.toBe('projects');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('.lk')!).getPropertyValue('-webkit-tap-highlight-color'))).toBe('rgba(0, 0, 0, 0)');

  await page.goto('/');
  await nav.getByRole('link', { name: 'blog' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/blog\/$/);
  await expect.poll(ringed).toBe('blog');
});

test('the coding tab shows the GitHub calendar: total, heatmap, weekday averages, and streaks', async ({ page, isMobile }, testInfo) => {
  const errors = trackErrors(page);
  await page.goto('/stats/');
  const tabs = page.getByRole('tablist', { name: 'Stats' });
  await expect(page.getByText('from strava')).toBeVisible();
  const coding = tabs.getByRole('tab', { name: 'coding' });
  if (isMobile) await coding.tap();
  else await coding.click();
  await expect(coding).toHaveAttribute('aria-selected', 'true');
  await expect(page).toHaveURL(/#coding$/);
  await expect(page.getByText('from strava')).toBeHidden();
  await expect(page.getByText(/synced daily|every day|public and private/)).toHaveCount(0);

  const days = contributionDays();
  const total = days.reduce((s, d) => s + d.count, 0);
  await expect(page.locator('.big')).toHaveText(`${total.toLocaleString('en-US')} contributions`);
  await expect.poll(() => painted(page, '.chart.heat')).toBeGreaterThan(1000);
  await expect.poll(() => painted(page, '.chart.weekday')).toBeGreaterThan(1000);
  let longest = 0;
  days.reduce((run, d) => {
    const next = d.count ? run + 1 : 0;
    longest = Math.max(longest, next);
    return next;
  }, 0);
  await expect(page.getByText(new RegExp(`^current \\d+ days?, longest ${longest} days?$`))).toBeVisible();
  await page.screenshot({ path: `${shots}/${testInfo.project.name}-coding.png` });

  // The heatmap's first column starts on the first Monday; pointing at its top cell names that day.
  const monday = days.find((d) => (Math.floor(Date.parse(d.date) / 86_400_000) + 3) % 7 === 0)!;
  const [, mm, dd] = monday.date.split('-').map(Number);
  const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][mm - 1];
  const heat = (await page.locator('.chart.heat').boundingBox())!;
  if (isMobile) await page.touchscreen.tap(heat.x + 2, heat.y + 24);
  else await page.mouse.move(heat.x + 2, heat.y + 24);
  const heatTip = page.locator('.chart.heat .tip');
  const mondayLabel = `mon ${month} ${dd}, ${monday.count} contribution${monday.count === 1 ? '' : 's'}`;
  await expect(heatTip).toHaveText(mondayLabel);

  // Weekday bars start on today's weekday. The last bar pointed at stays selected after the pointer leaves, and
  // both selections survive switching tabs and back.
  const dow = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
  const todayDow = dow[(Math.floor(Date.parse(days.at(-1)!.date) / 86_400_000) + 3) % 7];
  const pick = dow[(dow.indexOf(todayDow) + 3) % 7];
  const wdTip = page.locator('.chart.weekday .tip');
  await expect(wdTip).toHaveText(new RegExp(`^${todayDow} `));
  const wd = (await page.locator('.chart.weekday').boundingBox())!;
  const at = [wd.x + (wd.width * (dow.indexOf(pick) + 0.5)) / 7, wd.y + wd.height - 6] as const;
  if (isMobile) await page.touchscreen.tap(...at);
  else await page.mouse.move(...at);
  await expect(wdTip).toHaveText(new RegExp(`^${pick} `));
  if (isMobile) await page.touchscreen.tap(wd.x + wd.width / 2, wd.y + wd.height + 60);
  else await page.mouse.move(wd.x + wd.width / 2, wd.y + wd.height + 60);
  await page.waitForTimeout(200);
  await expect(wdTip).toHaveText(new RegExp(`^${pick} `));
  await expect(heatTip).toHaveText(mondayLabel);
  const running = tabs.getByRole('tab', { name: 'running' });
  if (isMobile) await running.tap();
  else await running.click();
  await expect(page.locator('.chart.area')).toBeVisible();
  if (isMobile) await coding.tap();
  else await coding.click();
  await expect(wdTip).toHaveText(new RegExp(`^${pick} `));
  await expect(heatTip).toHaveText(mondayLabel);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

  // A link to #coding opens the tab, and the arrow keys move between tabs.
  await page.goto('/stats/#coding');
  await expect(coding).toHaveAttribute('aria-selected', 'true');
  await coding.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(tabs.getByRole('tab', { name: 'running' })).toBeFocused();
  await expect(page.locator('.chart.area')).toBeVisible();
  expect(errors).toEqual([]);
});

test('every page has its own title and description, and a link preview image', async ({ page }) => {
  const pages: [string, string, RegExp][] = [
    ['/', 'vinay shah', /^product-minded engineer building reliable, delightful tools\. Kiro CLI, Kiro Orbits, and a few apps of my own\.$/],
    ['/about/', 'about - vinay shah', /running, hiking/],
    ['/projects/', 'projects - vinay shah', /^kiro-cli, Kiro Orbits, this website, LuckyNumber, and Gita Swipe/],
    ['/blog/', 'blog - vinay shah', /Stripe webhooks/],
    ['/blog/stripe-webhook-debugging/', 'Why My Stripe Webhooks Were Failing: A Production Debugging Story - vinay shah', /^How I tracked down why Stripe/],
    ['/stats/', 'stats - vinay shah', /Strava .* GitHub/],
    ['/foolish-enterprises/', 'foolish enterprises - vinay shah', /mobile apps/],
    ['/foolish-enterprises/llm-time-blocker/privacy-policy/', 'llm time blocker privacy policy - vinay shah', /Privacy policy for the LLM Time Blocker/],
  ];
  const meta = (key: string) => page.locator(`meta[property="${key}"], meta[name="${key}"]`).getAttribute('content');
  for (const [path, title, description] of pages) {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    expect(await meta('description'), path).toMatch(description);
    expect(await meta('og:title'), path).toBe(title);
    expect(await meta('og:description'), path).toBe(await meta('description'));
    expect(await meta('twitter:description'), path).toBe(await meta('description'));
    expect(await meta('og:url'), path).toBe(`https://vinayshah.dev${path}`);
    expect(await meta('twitter:card'), path).toBe('summary_large_image');
    for (const key of ['og:image', 'twitter:image']) {
      const url = new URL((await meta(key))!);
      expect(url.origin, `${path} ${key}`).toBe('https://vinayshah.dev');
      const image = await page.request.get(url.pathname + url.search);
      expect(image.headers()['content-type'], `${path} ${key}`).toBe('image/png');
    }
  }
});
