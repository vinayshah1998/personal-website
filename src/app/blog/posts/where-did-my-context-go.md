---
title: "Where did my context go?"
date: "2026-08-04"
tags: ["llm", "context", "kiro-cli"]
excerpt: "Every chat with an agent has a context window, and it fills up."
---

Every chat with an agent has a context window, and it fills up. This week I wanted you to see what was filling it.

`/context` now breaks your tokens down per tool, grouped into built-in tools, MCP tools, and agent tools. If one MCP server's tool descriptions are eating your context, you can see it. The percentage also recalculates when you switch models with `/model`, since different models have different limits.

It didn't land cleanly. The first version shipped with another change turned on by default, and I reverted it two days later. Then I landed the breakdown again on its own.

Shipping something twice in one week is a little embarrassing. Shipping the wrong default for longer would have been worse.
