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
