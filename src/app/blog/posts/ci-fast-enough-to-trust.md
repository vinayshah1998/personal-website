---
title: "Making CI fast enough to trust"
date: "2026-11-23"
tags: ["ci", "testing", "formal-methods", "kiro-cli"]
excerpt: "How a month of work on Kiro CLI's checks made them faster, stricter, and less flaky: a 33-second typecheck down to half a second, tests packed by time, TLA+ on every pull request, and a fuzzer that found real bugs."
---

Most of what I shipped to Kiro CLI this fall wasn't a feature. It was the stuff around the features: the checks every change has to pass before it lands. When those are slow or flaky, everyone works slower and trusts the results less. I wanted them fast, strict, and boring.

## Faster checks

- **Typechecking:** every package now typechecks with `bun check` instead of `tsc --noEmit`. It reports the same errors as tsc on all 11 TUI projects, and the TUI package takes about 0.5 seconds instead of 33.
- **Linting:** one oxlint config replaced 14 ESLint configs and runs 330 rules instead of 76. It caught 8 unsafe optional chains that ESLint had missed. Its autofixes needed watching, though: one renamed a variable and silently dropped an error's cause, and another turned a `Uint8Array` copy into a plain array.
- **Shards packed by time:** test shards used to be split by guessing every file took 2 seconds, so one worker ran 13 minutes while another ran 4. Now shards are planned from each file's recent run times and packed toward an 8-minute target. Each platform's tests wait only for that platform's build, so Linux no longer waits on macOS.
- **cargo-nextest:** the Rust tests on Linux and macOS moved to nextest, and the jobs now install the Rust version the repo actually pins.
- **Caching that works:** our old compile cache got between 0 and 3 hits out of about 1,400 compiles. It's gone, replaced by one cache per OS that only main writes and pull requests read.
- **Only the tests a change can reach:** a pull request can now run just the tests its changes can affect, worked out from the import graph. Any time that would give a different answer than a full run, it turns itself off. It's behind a switch while it proves itself.

Not everything I tried helped. A faster linker saved under a second per binary, so I didn't adopt it. A step that freed disk space took 210 seconds on runners that never came close to filling up, so I removed it.

## Proving it with TLA+

Plenty of my bugs this year came from two pieces of code each believing they owned the same state. Tests are bad at those, because the timing has to line up just wrong.

So I wrote TLA+ models of Kiro CLI's state machines: sign-in, chat turns, session switching, MCP connections, auto-update, voice push-to-talk, approvals, and the terminal renderer. A model checker explores every ordering of events, not just the ones a test happens to hit.

It found real bugs:

- Cancelling one voice recording could throw away another recording's transcript.
- A finished `/goal` could clear the status of the goal that replaced it.
- Switching sessions could lose the newer session's panels.
- An approval that arrived while you were typing painted before the pause. It now waits until you stop.

A model is only useful if it still describes the code. So the models now run on every pull request, with thousands of anchors pinning each model to the source it describes. When the code drifts from its model, the check fails. Building the gate also turned up a bug in the checker itself: in one mode it reported "holds" for a property that was violated.

## Tests that tell the truth

- **Frames, counted:** a harness runs the real TUI in a pseudo-terminal and timestamps every byte it writes. It's how I found streaming painting at 31 frames a second, and how I know the fix doubled it.
- **A fuzzer:** Bombadil throws random keys, pastes, slash commands, and resizes at the TUI and checks the screen after every step. It runs on every TUI pull request and longer each night. It found two bugs. Pressing Esc at the wrong moment could type a stray "[6~" into the prompt. And Backspace or the arrow keys next to an emoji could leave half of it behind.
- **Flaky tests, fixed at the cause:** some UI tests used a fixed 160 ms wait and needed retries to pass. The retries were hiding a real bug: a key pressed between a render and its effects was lost. With that fixed, the TUI suites run without retries. Other flakes had dull, real causes too: a socket that inherited non-blocking mode on macOS (20 failures in 200 runs, then 0 in 300), a hard-coded process ID that sometimes matched the test's own, and Windows cleanup capped at 5 seconds when it can take 17.

My teammates had already set up quality gates for file size, duplication, and maintainability that may only get stricter. They caught me more than once, and I paid some of that debt down along the way.

## Why bother

None of this ships to users directly. But every change to Kiro CLI now gets an answer sooner, and the answer means more. A check you can trust is one you stop arguing with.
