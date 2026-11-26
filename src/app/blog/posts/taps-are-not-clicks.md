---
title: "Taps are not clicks"
date: "2026-11-26"
tags: ["touch", "testing", "ux", "personal-website"]
excerpt: "Most people who visit this site do it on a phone, and this week two bugs reminded me that a tap is not a click with a smaller pointer."
---

Most people who visit this site do it on a phone, and this week two bugs reminded me that a tap is not a click with a smaller pointer. Both looked fine with a mouse. Both only showed up once a finger was involved, and both now have a test that drives a real touch.

## The tap that went missing

The homepage is a canvas you paint on. To stop a paint stroke from scrolling the page, the homepage sets `touch-action: none`. That part worked: drags painted and nothing moved.

But a nav link tapped right after a fast swipe did nothing. The browser saw the finger go down and come up, and never fired a click.

- **The cause:** Chrome still starts a fling for a fast swipe, even under `touch-action: none`. The fling moves nothing, so you can't see it. The next touch stops the fling, and Chrome treats a touch that stops a fling as "stop scrolling", not as a tap. So it drops the click.
- **The fix:** consume `touchmove` inside the homepage, so no scroll gesture or fling starts at all. The listener has to be registered with `passive: false`, or `preventDefault()` is ignored.

```ts
const onTouchMove = (e: TouchEvent) => {
  if (e.cancelable && (e.target as Element).closest?.('.home')) e.preventDefault();
};
document.addEventListener('touchmove', onTouchMove, { passive: false });
```

- **What didn't work:** `touch-action` on its own. I assumed it turned the browser's scrolling off. It turns off the scrolling you can see, which is not quite the same thing.

## Hover doesn't exist on a phone

The stats page has dithered charts: weekly miles, a year-to-date line, a contribution heatmap, and weekday bars. Point at a bar and a tooltip shows its number. Move away and the chart snapped back to today.

With a mouse, that felt tidy. On a phone, there is no "move away". A tap fires the pointer events and then the finger is gone, so the chart could snap back before you'd read the tooltip.

- **The fix was deleting code:** each chart had a `leave` handler whose only job was to reset the selection. I removed it. A chart starts on today until you hover or tap something, then keeps that selection and its tooltip.
- **Keep it for the visit:** the selections live in one map for the whole page visit, so switching from the running tab to coding and back still shows what you picked.

A mouse user loses nothing. The selection just stays where they left it, which is what a finger needed all along.

## Testing a real finger

A desktop test with `click()` passes for both bugs, so the tests had to touch the page for real.

- **A mobile project:** the end-to-end suite runs twice, once as desktop Chrome and once as an emulated Pixel 7 with touch. Tests pick `tap()` or `click()` based on which one they're in.
- **Real drags:** Playwright's touchscreen can tap, but I didn't find a built-in way to drag a finger. So a small helper sends touch events through the Chrome DevTools Protocol, one move per frame:

```ts
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
```

- **Reproduce first:** the nav test now swipes diagonally and then taps "about". Without the fix it failed 4 of 5 runs. With it, it passes. A test that can't fail before the fix doesn't prove the fix.

## The lesson

Every bug here came from treating touch as a mouse with worse aim. A mouse hovers, leaves, and clicks. A finger lands, maybe drags, and lifts, and the browser makes guesses about what you meant in between. When something works with a mouse and not on a phone, I now look for the guess the browser is making, and I write a test that makes the same gesture a thumb would.
