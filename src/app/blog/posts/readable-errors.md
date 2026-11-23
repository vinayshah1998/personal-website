---
title: "Errors you can actually read"
date: "2026-07-23"
tags: ["ux", "errors", "kiro-cli"]
excerpt: "This week I read every error Kiro CLI can show you and asked whether it helps."
---

This week I read every error Kiro CLI can show you and asked whether it helps.

A lot didn't.

- **Throttling:** the throttle error only appeared as a toast for 5 seconds. Look away and you'd never know why your request failed. It now stays in the scrollback.
- **Three causes, one message:** an overloaded model, a hit monthly limit, and throttling all read the same. They now each say what happened and what to do. For example: "The model you've selected is temporarily unavailable. Please use '/model'…"
- **Windows registry noise:** on some Windows machines, registry errors flooded the terminal. They don't anymore.

An error message is the moment someone needs you most. It should tell them what happened and what to try next, and it shouldn't vanish while they're reading it.
