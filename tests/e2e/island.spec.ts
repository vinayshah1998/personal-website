import { expect, test, type Locator, type Page } from '@playwright/test';
import { LINES } from '../../src/lib/island/dialogue';

const shots = process.env.ISLAND_SHOTS ?? '.audit/screens';

// Vercel serves /_vercel/* (Analytics, Speed Insights) only on its edge; a local `next start` answers 404.
test.beforeEach(async ({ page }) => {
  if (process.env.ISLAND_BASE_URL) return;
  await page.route('**/_vercel/**', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
});

async function openIsland(page: Page): Promise<Locator> {
  await page.goto('/');
  const world = page.getByTestId('island-world');
  await expect(page.locator('.island-stage')).toHaveAttribute('data-status', 'ready', { timeout: 30_000 });
  await expect(world).toHaveAttribute('data-phase', 'idle');
  return world;
}

function trackErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()} ${message.location().url}`);
  });
  return errors;
}

async function position(world: Locator): Promise<[number, number]> {
  return [Number(await world.getAttribute('data-x')), Number(await world.getAttribute('data-z'))];
}

async function settledPosition(page: Page, world: Locator): Promise<[number, number]> {
  let last = await position(world);
  await expect
    .poll(
      async () => {
        await page.waitForTimeout(700);
        const next = await position(world);
        const same = next[0] === last[0] && next[1] === last[1];
        last = next;
        return same;
      },
      { timeout: 10_000, message: 'penguin kept moving after input should have been released' },
    )
    .toBe(true);
  return last;
}

async function landmark(world: Locator, name: 'pond' | 'meadow' | 'sign' | 'campfire' | 'penguin'): Promise<{ x: number; y: number }> {
  return { x: Number(await world.getAttribute(`data-${name}-x`)), y: Number(await world.getAttribute(`data-${name}-y`)) };
}

async function tapWorld(page: Page, world: Locator, point: { x: number; y: number }, touch: boolean) {
  const box = await world.boundingBox();
  if (!box) throw new Error('island world has no box');
  if (touch) await page.touchscreen.tap(box.x + point.x, box.y + point.y);
  else await page.mouse.click(box.x + point.x, box.y + point.y);
}

test('portfolio content and routes stay reachable', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: "Hi, I'm Vinay." })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent Work' })).toBeVisible();
  const routes = [
    '/about/',
    '/projects/',
    '/blog/',
    '/blog/linux-server-revival/',
    '/blog/oauth-route-not-found/',
    '/blog/stripe-webhook-debugging/',
    '/stats/',
    '/foolish-enterprises/',
    '/foolish-enterprises/llm-time-blocker/privacy-policy/',
  ];
  for (const route of routes) {
    const response = await page.request.get(route);
    expect(response.status(), route).toBe(200);
    expect(response.headers()['content-type'], route).toContain('text/html');
  }
  await page.getByRole('navigation', { name: 'Explore the site' }).getByRole('link', { name: /Projects/ }).click();
  await expect(page).toHaveURL(/\/projects\/$/);
  await page.goto('/foolish-enterprises/llm-time-blocker/privacy-policy/');
  await expect(page.getByRole('heading', { level: 1 }).last()).toBeVisible();
  expect(errors).toEqual([]);
});

test('header nav fits narrow phones without horizontal overflow', async ({ page, isMobile }, testInfo) => {
  test.skip(!isMobile, 'narrow layout is checked on the mobile project');
  const errors = trackErrors(page);
  for (const width of [390, 412]) {
    await page.setViewportSize({ width, height: 860 });
    await openIsland(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(0);

    const links = page.getByRole('navigation', { name: 'Main' }).getByRole('link');
    await expect(links).toHaveCount(5);
    for (const link of await links.all()) {
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box, await link.innerText()).not.toBeNull();
      expect(box!.x, `${await link.innerText()} left edge at ${width}px`).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width, `${await link.innerText()} right edge at ${width}px`).toBeLessThanOrEqual(width);
      expect(box!.height, `${await link.innerText()} touch height`).toBeGreaterThanOrEqual(44);
    }
    await links.last().click();
    await expect(page).toHaveURL(/\/foolish-enterprises\/$/);

    await openIsland(page);
    for (const name of ['Walk up', 'Walk left', 'Walk right', 'Walk down']) {
      const box = await page.getByRole('button', { name }).boundingBox();
      expect(box!.width, `${name} width`).toBeGreaterThanOrEqual(44);
      expect(box!.height, `${name} height`).toBeGreaterThanOrEqual(44);
    }
    await page.screenshot({ path: `${shots}/${testInfo.project.name}-${width}-header.png` });
  }
  expect(errors).toEqual([]);
});

test('desktop header keeps brand and nav on one row', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop layout only');
  await page.goto('/');
  const brand = await page.getByRole('link', { name: 'Vinay Shah' }).first().boundingBox();
  const nav = await page.getByRole('navigation', { name: 'Main' }).boundingBox();
  expect(Math.abs(brand!.y + brand!.height / 2 - (nav!.y + nav!.height / 2))).toBeLessThan(4);
  expect(nav!.height).toBeLessThan(40);
});

test('the controls sit beside or below the island and never cover it', async ({ page, isMobile }) => {
  const sizes = isMobile ? [null, { width: 390, height: 844 }] : [null, { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 1920, height: 1080 }];
  for (const size of sizes) {
    if (size) await page.setViewportSize(size);
    await openIsland(page);
    const world = (await page.getByTestId('island-world').boundingBox())!;
    const controls = (await page.locator('.island-controls').boundingBox())!;
    const overlaps =
      controls.x < world.x + world.width && world.x < controls.x + controls.width && controls.y < world.y + world.height && world.y < controls.y + controls.height;
    expect(overlaps, `controls overlap the island at ${JSON.stringify(size ?? page.viewportSize())}`).toBe(false);
  }
});

test('penguin walks by tap or click and fishes a full cast, bite and catch', async ({ page, isMobile }, testInfo) => {
  const errors = trackErrors(page);
  const world = await openIsland(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${shots}/${testInfo.project.name}-home.png` });

  const start = await position(world);
  await tapWorld(page, world, await landmark(world, 'meadow'), isMobile);
  await expect.poll(async () => (await position(world))[1], { timeout: 10_000 }).toBeGreaterThan(start[1] + 1);
  await expect(world).toHaveAttribute('data-phase', 'idle');

  await tapWorld(page, world, await landmark(world, 'pond'), isMobile);
  await expect(world).toHaveAttribute('data-phase', /walking-to-pond|casting/);
  await expect(world).toHaveAttribute('data-phase', 'waiting', { timeout: 15_000 });
  await page.screenshot({ path: `${shots}/${testInfo.project.name}-waiting.png` });
  await expect(world).toHaveAttribute('data-phase', 'bite', { timeout: 6_000 });
  await expect(page.getByTestId('island-action')).toHaveText('Reel it in!');
  await page.waitForTimeout(1500);
  await expect(world).toHaveAttribute('data-phase', 'bite');
  await page.screenshot({ path: `${shots}/${testInfo.project.name}-bite.png` });

  await tapWorld(page, world, await landmark(world, 'pond'), isMobile);
  await expect(world).toHaveAttribute('data-phase', 'caught');
  await expect(page.getByTestId('island-basket')).toHaveText('Basket: 1 catch');
  await expect(page.getByTestId('island-status')).toContainText('You caught');
  // The catch lands in its own basket slot; the other five stay silhouettes.
  const slots = page.getByTestId('island-catches').getByRole('listitem');
  await expect(slots).toHaveCount(6);
  await expect(slots.and(page.locator('[data-count="1"]'))).toHaveCount(1);
  await expect(slots.and(page.locator('[data-count="0"]'))).toHaveCount(5);
  const caughtLabel = await slots.and(page.locator('[data-count="1"]')).getAttribute('title');
  expect(caughtLabel).toMatch(/× 1$/);
  expect(await page.getByTestId('island-status').textContent()).toContain(caughtLabel!.replace(' × 1', '').toLowerCase());
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${shots}/${testInfo.project.name}-caught.png` });
  expect(errors).toEqual([]);
});

test('keyboard walks only while the world has focus and Space casts and reels', async ({ page, isMobile }) => {
  test.skip(isMobile, 'keyboard path is desktop only');
  const world = await openIsland(page);

  const before = await position(world);
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(500);
  await page.keyboard.up('ArrowRight');
  expect((await position(world))[0]).toBe(before[0]);

  await world.focus();
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.keyboard.down('ArrowRight');
  await expect.poll(async () => (await position(world))[0], { timeout: 15_000 }).toBeGreaterThan(before[0] + 0.8);
  await page.keyboard.up('ArrowRight');
  await page.keyboard.press('ArrowDown');
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);

  await page.keyboard.press('Space');
  await expect(world).toHaveAttribute('data-phase', 'bite', { timeout: 25_000 });
  await page.keyboard.press('KeyF');
  await expect(world).toHaveAttribute('data-phase', 'caught');

  await page.keyboard.down('KeyS');
  await expect(world).toHaveAttribute('data-phase', 'idle', { timeout: 10_000 });
  await page.keyboard.up('KeyS');
});

for (const away of ['window blur', 'hidden tab'] as const) {
  test(`a key released during ${away} does not keep the penguin walking`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'keyboard path is desktop only');
    const errors = trackErrors(page);
    const world = await openIsland(page);
    await world.focus();
    const start = await position(world);
    await page.keyboard.down('ArrowDown');
    await expect.poll(async () => (await position(world))[1], { timeout: 15_000 }).toBeGreaterThan(start[1] + 0.3);

    await page.evaluate((mode) => {
      if (mode === 'window blur') {
        window.dispatchEvent(new Event('blur'));
        return;
      }
      const setHidden = (hidden: boolean) => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
        document.dispatchEvent(new Event('visibilitychange'));
      };
      setHidden(true);
      setHidden(false);
    }, away);

    const stopped = await settledPosition(page, world);
    expect(stopped[1]).toBeLessThan(7);
    await page.waitForTimeout(1500);
    expect(await position(world)).toEqual(stopped);
    await page.keyboard.up('ArrowDown');

    await page.keyboard.down('ArrowUp');
    await expect.poll(async () => (await position(world))[1], { timeout: 15_000 }).toBeLessThan(stopped[1] - 0.3);
    await page.keyboard.up('ArrowUp');
    expect(errors).toEqual([]);
  });
}

test('the penguin greets you, loves pats, and the sign and campfire answer back', async ({ page, isMobile }, testInfo) => {
  const errors = trackErrors(page);
  await page.addInitScript(() => {
    const Base = window.AudioContext;
    (window as unknown as { __contexts: number }).__contexts = 0;
    window.AudioContext = class extends Base {
      constructor(options?: AudioContextOptions) {
        super(options);
        (window as unknown as { __contexts: number }).__contexts++;
      }
    };
  });
  const world = await openIsland(page);
  const bubble = page.getByTestId('island-bubble');
  await expect(bubble).toBeVisible({ timeout: 5_000 });

  await tapWorld(page, world, await landmark(world, 'penguin'), isMobile);
  await expect(world).toHaveAttribute('data-interaction', /^pat:/);
  await expect.poll(async () => LINES.pat.includes((await bubble.locator('.sr-only').textContent()) ?? '')).toBe(true);
  expect(await position(world)).toEqual([-1.6, 2.4]);
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${shots}/${testInfo.project.name}-pat.png` });

  await tapWorld(page, world, await landmark(world, 'sign'), isMobile);
  await expect(bubble.locator('.sr-only')).toContainText('Population: one penguin');

  await tapWorld(page, world, await landmark(world, 'campfire'), isMobile);
  await expect(world).toHaveAttribute('data-interaction', /^fire:/);
  await page.screenshot({ path: `${shots}/${testInfo.project.name}-campfire.png` });

  await page.getByRole('button', { name: /Pat/ }).click();
  await expect(world).toHaveAttribute('data-interaction', /^pat:/);

  // Sound is opt-in: nothing is created until the visitor asks for it, and the choice is remembered.
  expect(await page.evaluate(() => (window as unknown as { __contexts: number }).__contexts)).toBe(0);
  const sound = page.getByTestId('island-sound');
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => (window as unknown as { __contexts: number }).__contexts)).toBe(1);
  expect(await page.evaluate(() => localStorage.getItem('island-sound'))).toBe('on');
  await sound.click();
  await expect(sound).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});

test('HTML controls fish and walk without the canvas', async ({ page }) => {
  const world = await openIsland(page);
  const before = await position(world);
  await page.getByRole('button', { name: 'Walk down' }).click();
  await expect.poll(async () => (await position(world))[1], { timeout: 15_000 }).toBeGreaterThan(before[1] + 1);

  await page.getByTestId('island-action').click();
  await expect(world).toHaveAttribute('data-phase', 'bite', { timeout: 25_000 });
  await page.getByTestId('island-action').click();
  await expect(world).toHaveAttribute('data-phase', 'caught');
});

test('reduced motion renders a still idle frame and still walks and fishes on command', async ({ page }, testInfo) => {
  const errors = trackErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const world = await openIsland(page);
  await expect(world).toHaveAttribute('data-motion', 'reduced');
  const canvas = page.locator('canvas.island-canvas');
  await canvas.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1000);
  // This compares the 3D frame only. Speech bubbles are DOM over the canvas and come and go on their own.
  const still = { style: '.island-speech { visibility: hidden !important; }' };
  const first = await canvas.screenshot(still);
  await page.waitForTimeout(2000);
  const second = await canvas.screenshot(still);
  expect(second.equals(first), 'idle frame changed under reduced motion').toBe(true);
  await page.screenshot({ path: `${shots}/${testInfo.project.name}-reduced-motion.png` });

  const before = await position(world);
  await page.getByRole('button', { name: 'Walk down' }).click();
  await expect.poll(async () => (await position(world))[1], { timeout: 15_000 }).toBeGreaterThan(before[1] + 1);
  await page.getByTestId('island-action').click();
  await expect(world).toHaveAttribute('data-phase', /walking-to-pond|casting|waiting/);
  expect(errors).toEqual([]);
});

test('full motion idle scene keeps gently animating', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const world = await openIsland(page);
  await expect(world).toHaveAttribute('data-motion', 'full');
  const canvas = page.locator('canvas.island-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const first = await canvas.screenshot();
  await page.waitForTimeout(2000);
  expect((await canvas.screenshot()).equals(first)).toBe(false);
});

test('portrait swipe over the island scrolls the page without moving the penguin', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'touch swipe is mobile only');
  const world = await openIsland(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  const box = await world.boundingBox();
  const viewport = page.viewportSize()!;
  const y = Math.min(box!.y + box!.height / 2, viewport.height - 120);
  expect(y).toBeGreaterThan(box!.y);
  const start = await position(world);
  const cdp = await page.context().newCDPSession(page);
  const x = Math.round(box!.x + box!.width / 2);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - i * 30 }] });
    await page.waitForTimeout(16);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5_000 }).toBeGreaterThan(150);
  await page.waitForTimeout(800);
  expect(await position(world)).toEqual(start);
  await expect(world).toHaveAttribute('data-phase', 'idle');
});

test('losing the WebGL context swaps to the postcard and stops the game', async ({ page }, testInfo) => {
  const errors = trackErrors(page);
  const world = await openIsland(page);
  const lost = await page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>('canvas.island-canvas');
    const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
    const extension = gl?.getExtension('WEBGL_lose_context');
    extension?.loseContext();
    return Boolean(extension);
  });
  expect(lost, 'WEBGL_lose_context available').toBe(true);

  await expect(page.locator('.island-stage')).toHaveAttribute('data-status', 'fallback', { timeout: 10_000 });
  await expect(page.locator('canvas.island-canvas')).toHaveCount(0);
  await expect(page.locator('.island-poster svg')).toBeVisible();
  await expect(page.getByTestId('island-status')).toContainText('postcard');
  await expect(page.getByTestId('island-action')).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Walk down' })).toBeDisabled();
  await expect(world).toHaveAttribute('tabindex', '-1');

  const frozen = await position(world);
  await world.dispatchEvent('keydown', { code: 'ArrowDown', key: 'ArrowDown' });
  await page.waitForTimeout(1000);
  expect(await position(world)).toEqual(frozen);
  await expect(page.getByRole('link', { name: /About me/ })).toBeVisible();
  await page.screenshot({ path: `${shots}/${testInfo.project.name}-context-lost.png` });
  expect(errors).toEqual([]);
});

test('without WebGL the postcard and links remain', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type.startsWith('webgl')) return null;
      return (original as (...a: unknown[]) => RenderingContext | null).call(this, type, ...args);
    } as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('/');
  await expect(page.locator('.island-stage')).toHaveAttribute('data-status', 'fallback', { timeout: 20_000 });
  await expect(page.locator('.island-poster svg')).toBeVisible();
  await expect(page.getByTestId('island-status')).toContainText('postcard');
  await expect(page.getByRole('link', { name: /About me/ })).toBeVisible();
  await page.screenshot({ path: `${shots}/${testInfo.project.name}-fallback.png` });
});
