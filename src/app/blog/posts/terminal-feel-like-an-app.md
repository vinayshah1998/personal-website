---
title: "Making a terminal feel like an app"
date: "2026-10-21"
tags: ["tui", "terminal", "kiro-orbits", "kiro-cli"]
excerpt: "This week I couldn't stop fiddling with how the Orbits CLI feels."
---

This week I couldn't stop fiddling with how the Orbits CLI feels. Not what it does, how it feels.

It started with the attach view. I rebuilt it as "TUI v2" so it reads like a real app: a bordered composer, a quiet welcome block, a window title capped at 120 cells with an ellipsis. Then I kept finding small things. Pressing Left twice on an empty composer now opens your recent threads. Pasting a file path offers to attach it.

Two fixes I'm oddly proud of:

- **First-frame timing was bimodal.** Builds drew their first frame at about 210 ms or about 270 ms, seemingly at random. It turned out to be Nagle's algorithm holding back the second TCP segment until a delayed ACK. One `TCP_NODELAY` later, 8 of 8 runs landed between 217 and 232 ms.
- **Edit counts now tell the truth.** The diff counter used to give up on files with scattered edits and count the whole rest of the file as replaced. Running Myers only on the lines both sides share fixed it: a 20,000-line file with every sixth line changed now counts +3,334 −3,334 in about 31 ms.

The same itch showed up in Kiro CLI. It now reports its status to terminals that support it (OSC 7501), and an MCP server's sign-in link disappears once that server connects.

And yes, the first time you run `orbits` it now plays a 3D planetary system drawn in terminal cells. You can drag it, zoom it, and click a planet to learn what it stands for. Nobody asked for this. I regret nothing.
