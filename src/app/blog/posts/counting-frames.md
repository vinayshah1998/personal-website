---
title: "Counting frames"
date: "2026-09-24"
tags: ["performance", "tui", "terminal", "kiro-cli"]
excerpt: "I built a harness that runs the CLI in a pseudo-terminal and counts frames from the terminal's own byte stream."
---

Streaming responses in Kiro CLI felt a bit choppy, and I wanted to stop guessing why.

So I built a harness that runs the CLI in a pseudo-terminal and counts frames from the terminal's own byte stream. No instrumentation inside the app, just what a real terminal receives.

It found the problem fast. A trailing debounce meant a stream arriving every 15 ms only painted about every 32 ms, roughly 31 frames a second. After the fix:

- The median gap between frames went from 32.3 ms to 16.2 ms.
- The same response painted 135 frames instead of 70.
- One scroll-wheel notch paints 1 frame instead of 2.

Along the way the transcript stopped being copied on every chunk, code blocks get highlighted once instead of over and over, and the sideways part of a trackpad swipe no longer scrolls you down. I also added a spinner in the terminal tab's title while a response streams.

You can't fix what you can't count.
