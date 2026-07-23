import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from 'playwright-core';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const executablePath =
  process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const outputDir = '.artifacts/design';
const viewports = [
  { width: 320, height: 568 },
  { width: 375, height: 812 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
];
const routes = [
  '/',
  '/about/',
  '/projects/',
  '/projects/llm-time-blocker/',
  '/projects/locus-hackathon/',
  '/projects/lucky-number/',
  '/blog/',
  '/blog/stripe-webhook-debugging/',
  '/stats/',
  '/foolish-enterprises/',
  '/foolish-enterprises/llm-time-blocker/privacy-policy/',
];

await fs.mkdir(outputDir, { recursive: true });
const browser = await chromium.launch({ executablePath, headless: true });
const report = { viewports: [], routes: [] };

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport,
      deviceScaleFactor: 1,
      colorScheme: 'light',
      reducedMotion: 'no-preference',
    });
    const response = await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    assert.equal(response?.status(), 200, `Home failed at ${viewport.width}px`);

    const metrics = await page.evaluate(() => {
      const visible = (element) => {
        const style = getComputedStyle(element);
        return style.display !== 'none' && style.visibility !== 'hidden';
      };
      const overflow = [...document.querySelectorAll('body *')]
        .filter(visible)
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            tag: element.tagName,
            className: element.className,
            left: rect.left,
            right: rect.right,
          };
        })
        .filter(({ left, right }) => left < -1 || right > document.documentElement.clientWidth + 1)
        .slice(0, 20);

      return {
        innerWidth,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        mobileBreakpoint: matchMedia('(max-width: 840px)').matches,
        mobileToggleDisplay: getComputedStyle(document.querySelector('.nav-toggle')).display,
        overflow,
      };
    });

    assert.equal(metrics.innerWidth, viewport.width);
    assert.equal(
      metrics.scrollWidth,
      metrics.clientWidth,
      `Horizontal overflow at ${viewport.width}px: ${JSON.stringify(metrics.overflow)}`,
    );
    assert.deepEqual(metrics.overflow, [], `Paint overflow at ${viewport.width}px`);

    await page.keyboard.press('Tab');
    assert.equal(
      await page.evaluate(() => document.activeElement?.textContent?.trim()),
      'Skip to content',
      'Skip link is not first in tab order',
    );

    if (viewport.width <= 840) {
      assert.equal(metrics.mobileBreakpoint, true);
      assert.notEqual(metrics.mobileToggleDisplay, 'none');
      const toggle = page.locator('.nav-toggle');
      const box = await toggle.boundingBox();
      assert.ok(box && box.width >= 44 && box.height >= 44, 'Mobile menu target is below 44px');
      await toggle.click();
      await assert.doesNotReject(() =>
        page.getByRole('navigation', { name: 'Mobile navigation' }).waitFor({ state: 'visible' }),
      );
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      const mobileTargets = await page.locator('.mobile-nav a').evaluateAll((links) =>
        links.map((link) => {
          const rect = link.getBoundingClientRect();
          return { text: link.textContent?.trim(), width: rect.width, height: rect.height };
        }),
      );
      assert.ok(
        mobileTargets.every(({ height }) => height >= 44),
        `Mobile navigation target below 44px: ${JSON.stringify(mobileTargets)}`,
      );
    }

    const screenshot = `${outputDir}/home-${viewport.width}x${viewport.height}.png`;
    await page.screenshot({ path: screenshot, fullPage: false });
    report.viewports.push({ viewport, metrics, screenshot });
    await page.close();
  }

  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    colorScheme: 'light',
  });
  for (const route of routes) {
    const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
    assert.equal(response?.status(), 200, `${route} returned ${response?.status()}`);
    assert.equal(await page.locator('main h1').count(), 1, `${route} must have one main h1`);
    const routeName = route === '/' ? 'home' : route.replace(/^\/|\/$/g, '').replaceAll('/', '--');
    const screenshot = `${outputDir}/route-${routeName}.png`;
    await page.screenshot({ path: screenshot, fullPage: false });
    report.routes.push({ route, title: await page.title(), screenshot });
  }

  await page.goto(`${baseUrl}/blog/stripe-webhook-debugging/`, { waitUntil: 'networkidle' });
  assert.equal(
    await page.getByRole('heading', {
      level: 1,
      name: 'Why My Stripe Webhooks Were Failing: A Production Debugging Story',
    }).count(),
    1,
  );
  assert.ok((await page.locator('time').first().textContent())?.includes('January 29, 2025'));

  await page.goto(`${baseUrl}/projects/lucky-number/`, { waitUntil: 'networkidle' });
  assert.equal(await page.getByText('Private repository', { exact: true }).count(), 1);

  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  const projectTargets = await page.locator('.project-card-action').evaluateAll((links) =>
    links.map((link) => {
      const rect = link.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }),
  );
  assert.ok(
    projectTargets.every(({ width, height }) => width >= 44 && height >= 44),
    `Project action target below 44px: ${JSON.stringify(projectTargets)}`,
  );

  const darkPage = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    colorScheme: 'dark',
  });
  const privacyResponse = await darkPage.goto(
    `${baseUrl}/foolish-enterprises/llm-time-blocker/privacy-policy/`,
    { waitUntil: 'networkidle' },
  );
  assert.equal(privacyResponse?.status(), 200);
  const privacyContrast = await darkPage.locator('.legal-page').evaluate((element) => {
    const rgb = (value) => value.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
    const luminance = (value) => {
      const channels = rgb(value).map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.03928
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    };
    const contrast = (foreground, background) => {
      const lighter = Math.max(luminance(foreground), luminance(background));
      const darker = Math.min(luminance(foreground), luminance(background));
      return (lighter + 0.05) / (darker + 0.05);
    };
    const background = getComputedStyle(document.body).backgroundColor;
    return {
      heading: contrast(getComputedStyle(element.querySelector('h1')).color, background),
      body: contrast(getComputedStyle(element.querySelector('.prose p')).color, background),
    };
  });
  assert.ok(
    privacyContrast.heading >= 4.5,
    `Privacy heading contrast is ${privacyContrast.heading.toFixed(2)}:1`,
  );
  assert.ok(
    privacyContrast.body >= 4.5,
    `Privacy body contrast is ${privacyContrast.body.toFixed(2)}:1`,
  );
  await darkPage.screenshot({
    path: `${outputDir}/route-privacy-policy-dark-preference.png`,
    fullPage: false,
  });
  await darkPage.close();

  await fs.writeFile(
    `${outputDir}/report.json`,
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(`Verified ${viewports.length} viewports and ${routes.length} routes.`);
} finally {
  await browser.close();
}
