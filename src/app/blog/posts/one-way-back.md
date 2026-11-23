---
title: "One way back"
date: "2026-09-15"
tags: ["tui", "keyboard", "ux", "kiro-cli"]
excerpt: "Settings screens in a terminal have no mouse to save you, so the keys have to be predictable."
---

Settings screens in a terminal have no mouse to save you, so the keys have to be predictable. This week I made them predictable.

`/settings`, Display, Status line, Theme, and `/verbosity` now share one contract:

- Left and Right toggle a value.
- Enter selects.
- Esc is the only way back.

When you back out, you land on the row you left, not at the top. It touched 47 files to make five screens agree.

Consistency is boring to describe and great to use. Your fingers learn it once.
