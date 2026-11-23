---
title: "The 60-second ghost"
date: "2026-08-20"
tags: ["networking", "rust", "debugging", "kiro-cli"]
excerpt: "Some people saw \"dispatch failure\" errors in Kiro CLI, but only after a long tool run."
---

Some people saw "dispatch failure" errors in Kiro CLI, but only after a long tool run. Short runs were fine.

The cause was a mismatch between two timers:

- The HTTP client keeps idle connections in a pool for 90 seconds by default, so it can reuse them.
- Many NAT gateways and firewalls quietly drop idle connections after about 60 seconds.

So after a tool ran for more than a minute, the client grabbed a pooled connection that the network had already killed, and the next request failed. The fix was to evict idle connections at 30 seconds, well before any middlebox gives up on them.

I also fixed a smaller one that week: cancelling a hook no longer affects the next run of the same hook.

My favorite kind of bug is one where every part is behaving correctly and the problem lives in the gap between them.
