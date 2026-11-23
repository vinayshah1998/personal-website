---
title: "Silent refusals and lost bytes"
date: "2026-09-10"
tags: ["debugging", "llm", "shell", "kiro-cli"]
excerpt: "Two bugs this week, both about information quietly disappearing."
---

Two bugs this week, both about information quietly disappearing.

**Refusals that looked like crashes.** Sometimes a model declines to answer and sends no text. One code path dropped the model's stop reason, so Kiro CLI couldn't tell a refusal from a glitch. It retried the same request, got the same refusal, and finally said "Kiro failed to generate a response." Now a refusal is shown as a refusal.

**Output lost after a command finished.** When the agent runs a shell command, the CLI waits 100 ms after the shell exits to catch any last output. Except it never actually awaited that timer. Anything written right at the end was gone. Now it waits.

I also started on model fallback this week, built but turned off for now, and made Enter do the same thing on every settings screen. More on that next week.
