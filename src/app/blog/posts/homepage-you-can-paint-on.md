---
title: "A homepage you can paint on"
date: "2026-11-22"
tags: ["web", "canvas", "design", "personal-website"]
excerpt: "This week I tore down my website's island homepage and replaced it with a field of ASCII ink you can paint on."
---

This week I tore down my website's island homepage and replaced it with a field of ASCII ink you can paint on.

Your cursor, or your finger, leaves pigment that spreads and fades, drawn from a ramp of characters with ordered dithering. The colors follow your local time of day: cream and blue in the afternoon, deep purples at night. The type is Departure Mono. Most of the old text is gone; the homepage is my name, your clock, and four links.

Most of the work was on phones:

- **Touch:** dragging up and down scrolled the page instead of painting, so the homepage canvas now takes every touch.
- **Taps:** a tap stamps a blob, and the cursor waits two seconds before drifting again, so lifting your finger doesn't smear a streak across the screen.
- **Focus box:** Safari drew a white box around a nav link after every tap, because the site moved focus there by script. Focus now moves only for keyboard users.

The other pages fold the ink into a band at the top, and it carries over as you navigate. The stats page got dithered charts for my running, and now my coding.

It drops to 30 frames a second when idle and stops for reduced motion. It's the most fun I've had on this site in a while.

## How it works

It's a drop of dye in water, drawn with letters. The page is a grid of numbers that your cursor fills with ink. Every frame the ink spreads and fades, and each number becomes one of 12 characters, colored by the time of day where you are. Step through it below, and drag across the box to paint.

[[ink-steps]]

### 1. A grid of ink amounts

The screen is split into cells the size of one character, about 7 by 15 pixels. Each cell stores one number: how much ink is there, from 0 for empty to about 1.4 for soaked. Moving the cursor adds ink in a soft round blob under it. The faster you move, the more ink it adds.

### 2. Spread and fade

Every frame, about 60 times a second, each cell's new value becomes a weighted average of itself and its four neighbors, then loses 0.4%. Its own value counts four times, and each neighbor once.

- Averaging with neighbors makes ink spread out.
- Losing a little each frame makes it fade.

This is a simple diffusion, the same idea as heat spreading through metal or dye through water.

### 3. Dithering

A character can't be "37% dark". There are only 12 levels. Rounding every cell the same way would give flat bands with hard edges.

So before rounding, each cell is nudged up by a small amount from a fixed 4×4 grid of thresholds, called a Bayer matrix. Neighboring cells get different nudges, so a smooth gradient becomes a fine, even texture. Old printers and early video games used this to fake shades with few colors, which is why it looks retro.

### 4. Letters as pixels

Each of the 12 levels maps to a character, from lightest to darkest: a space, then `. , : ; - = + * # % @`. Small marks cover little of their cell and read as light; dense ones like `@` read as dark. Seen from a step back, the letters draw the shading.

### 5. Color from your clock

The site keeps eight color keyframes through the day: night, pre-dawn, dawn, morning, afternoon, golden hour, dusk, and late night. Your local time lands between two of them, and the colors blend smoothly between those two. Each character is colored with a mix of two inks, plus an accent where the ink is thickest. The background follows the same clock, so the whole page is lighter during the day and dark at night.

### The details that make it feel right

- **The cursor drifts on its own** when nobody is touching the page, so the homepage is never still.
- **Text stays readable.** Cells under your name and the links keep only 12% of their ink, which leaves faint dots instead of noise.
- **Taps don't streak.** The two-second hold after a tap is what keeps the drift from dragging ink from your finger back to wherever it was.
- **One canvas for the whole site.** The band on the other pages is the same ink, not a copy, which is why it doesn't reset.
- **It's a plain 2D canvas, not WebGL:** one character per cell and a few arrays of numbers. Drawing only the non-empty cells, and setting the color only when it changes, keeps it fast.
