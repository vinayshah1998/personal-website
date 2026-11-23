---
title: "The chunk that disappeared"
date: "2026-10-14"
tags: ["search", "rust", "debugging", "kiro-cli"]
excerpt: "Kiro CLI can search knowledge bases you add, and this week I found it was sometimes missing things."
---

Kiro CLI can search knowledge bases you add, and this week I found it was sometimes missing things.

Two problems:

- **Limits were per base.** If you asked for 10 results across three knowledge bases, you could get 30. The limit now applies across all of them together.
- **A library bug hid data.** The approximate nearest-neighbor index we used, hnsw\_rs 0.3.4, left about 1 in 16 points unreachable. In a big knowledge base you'd never notice. In a small one, a chunk of your notes silently never showed up in search. Small knowledge bases now use an exact scan instead.

Also, fallback setting changes now apply without a restart.

Approximate search is a great trade until the approximation is "sometimes your data isn't there." For small data, exact is cheap.
