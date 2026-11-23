---
title: "Polish you can test"
date: "2026-11-12"
tags: ["design", "rendering", "accessibility", "kiro-orbits", "kiro-cli"]
excerpt: "A rule you can't test is a suggestion."
---

This week was polish in two places, and both times the question was the same: how do I keep it from sliding back?

**In the Orbits web app**, I moved to graphite paper and ink with a copper accent. Visual systems rot one "just this once" color at a time, so I wrote the rules down as tests. Every control boundary has to keep at least 3:1 contrast in light and dark. The accent and the error color have to stay far enough apart in hue that an error never reads as a highlight. And no `var()` may point to a token that doesn't exist.

**In Kiro CLI**, resizing the terminal flashed a blank pane every time. The clear was being written outside a synchronized update, so the terminal showed it before the new frame arrived. Repaints now anchor to absolute rows, and the flash is gone. Notifications also stopped stacking up: they queue into one row with "+N waiting".

A rule you can't test is a suggestion. I'd rather my taste fail a build than drift.
