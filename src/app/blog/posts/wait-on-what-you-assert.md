---
title: "Wait on what you assert"
date: "2026-11-26"
tags: ["testing", "tui", "debugging", "ci", "kiro-cli"]
excerpt: "This week I fixed about a dozen flaky terminal UI tests, and almost every fix was the same move: stop waiting on time and wait on the exact thing the test checks."
---

This week I fixed about a dozen flaky terminal UI tests, and almost every fix was the same move: stop waiting on time and wait on the exact thing the test checks. A flaky test is one that passes and fails on the same code. Ours mostly failed on loaded CI runners and passed on my laptop, which is the worst kind, because it teaches people to click "re-run".

Some of our suites even ran with an automatic retry of two. That kept CI green and hid every one of these bugs. Part of the work was turning the retries off and fixing what showed up.

## Fixed sleeps lose under load

The most common pattern was a short sleep before the next step.

- **A 20 ms flush:** a theme test rendered a component, slept 20 ms, then read the result. With four test files running in parallel, the first render sometimes took longer, and the read threw.
- **A 30 ms wait before a drag:** a copy-on-select test slept, then dragged across text. The listener that hears the copy is registered after the first paint. On a slow run the drag selected text and nobody heard it.
- **A 160 ms flush between keys:** a dashboard test pressed a key, slept, pressed the next. On a busy runner the screen had not painted yet.

The fix each time was to wait for the condition the next step needs, with a deadline that names what stalled.

```ts
async function waitUntil(what: string, check: () => boolean, ms = 2000) {
  const end = Date.now() + ms;
  while (!check()) {
    if (Date.now() > end) throw new Error(`timed out waiting for ${what}`);
    await new Promise((r) => setTimeout(r, 10));
  }
}

await waitUntil("theme probe to mount", () => probe.ready);
```

The named deadline matters. A bare five second test timeout tells you nothing. "Timed out waiting for theme probe to mount" tells you the step.

## Half-drawn screens

Terminal apps that redraw the whole screen often wrap each frame in a synchronized output bracket (DEC private mode 2026): "begin frame", the drawing, "end frame". The terminal is meant to show the frame only once it is complete.

A test that reads a virtual terminal does not get that for free. A large frame reaches the test in several reads. If you poll between two reads, the top rows show the new frame and the bottom rows still show the old one. One test saw a placeholder's text and a chat row at the same time, two things that never appear together on a real screen.

The fix was to judge a wait only when every byte has been parsed and no frame is open.

```ts
const BEGIN = "\x1b[?2026h";
const END = "\x1b[?2026l";

function midFrame(output: string): boolean {
  return output.lastIndexOf(BEGIN) > output.lastIndexOf(END);
}
```

A wait skips any poll where `midFrame` is true. If the timeout hits while a frame is still open, the error says so.

## Half-written log lines

A test stub wrote one JSON line per request to a log file, and the test parsed it while the stub was still appending. Now and then the last line was cut off and the parse threw.

My first fix dropped the incomplete last line. That was wrong. Tests used the number of entries as a bookmark: "everything after entry 12 belongs to the next action". Dropping a half-written line made the bookmark one short, so an entry got blamed on the wrong step. The second fix waits up to one second for the line to finish, and still throws if it never does.

## Two channels with no order

One test sent arrow keys through the terminal, then told the app over a separate control channel to show a prompt. Nothing kept those in order. On Windows the prompt sometimes opened first and swallowed the arrows.

On Linux the test waited on the cursor position, which happened to order things. The Windows console does not report the cursor that way, so it ran with no barrier at all. The fix was a barrier on the same channel as the keys: type a few more characters after the arrows and wait until they show up. Keys arrive in order, so the arrows have landed too.

## What didn't work

One Windows test timed out because a shell escape was slow. I guessed the slow part was PowerShell starting, so I pinned a lighter shell. That run took 16.5 seconds with the lighter shell, while the next PowerShell test took 2.65. The guess was wrong. I reverted it and printed each step's time as it finished instead, so the next slow run names the slow step. That one is still open.

## The lesson

A sleep is a guess about how fast the machine is. A wait on the condition is a fact about the program. Whenever a test waits, ask what the next line actually depends on, then wait for exactly that. And turn off the retries: two of these flakes turned out to be real bugs in the app, where a key pressed at the wrong moment was simply lost.
