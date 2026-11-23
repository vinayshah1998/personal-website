---
title: "When the model says no"
date: "2026-10-06"
tags: ["llm", "reliability", "kiro-cli"]
excerpt: "If a model refuses a turn or is over capacity, Kiro CLI now retries that turn on another model instead of stopping."
---

Model fallback in Kiro CLI went from turned off to on for everyone this week.

If a model refuses a turn or is over capacity, Kiro CLI now retries that turn on another model instead of stopping. `/model fallback` lets you pick which model it falls back to.

A few fixes rode along:

- `-r` resumes your local session again, instead of a newer cloud session.
- A non-interactive run that names a missing agent exits with code 4. Before, it quietly answered with the default agent, which is worse than failing.
- `agent list` shows agents in the newer config format.

Turning something on for everyone is the scariest commit in a project. It's usually also the smallest.
