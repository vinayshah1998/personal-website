---
title: "Logins that work everywhere"
date: "2026-11-18"
tags: ["auth", "linux", "formal-methods", "kiro-cli"]
excerpt: "This week I chased the places where signing in to Kiro CLI quietly didn't work."
---

This week I chased the places where signing in to Kiro CLI quietly didn't work.

- **Headless Linux:** on a machine with no display, login still tried to open a browser and failed. It now uses the device flow, where you approve a code from another device.
- **Pro licenses:** `--license pro` dropped the region along the way and failed with "No region was given."
- **MCP pagination:** after the last page, the client reused the old cursor instead of stopping.

The bigger project underneath was state. A lot of these bugs came from two pieces of code each thinking they owned the same state. So I wrote TLA+ models of 12 state machines, small specs a model checker can explore exhaustively, to find those races before users do.

Two small treats: `/copy N` copies the Nth response, and the "Preparing V3..." line is gone.
