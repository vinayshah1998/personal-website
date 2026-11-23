---
title: "Who gets to say yes"
date: "2026-10-29"
tags: ["agents", "permissions", "security", "kiro-orbits", "kiro-cli"]
excerpt: "An agent that edits your code keeps asking you for permission."
---

An agent that edits your code keeps asking you for permission. This week was about making those questions fewer, clearer, and harder to get wrong.

Orbits now has three answers to "can the agent run this?": Supervised, Trust All Tools, and a new middle mode called Approve for me. In that mode a trust classifier answers the requests it judges routine and shows you a card for the rest. Duplicate requests from the agent collapse into one card and one decision. Trust All now also covers the "review changes" check after a turn that edited files, which used to sit there waiting for a click nobody was going to give.

Kiro CLI got the same treatment for plan approvals. The approval card focuses the first option, respects trust-all, accepts edits you type, and asks again after a restart instead of assuming yes.

The other half of trust was the machine itself. Node shipped a security release, 26.12.1, and I made the Orbits CLI refuse anything older. 26.12.0 is refused too. On the cloud side, the server now holds back new turns until a runner proves it's on that exact Node build, with a matching receipt.

The theme, if there is one: saying yes should be easy for the right things and impossible for the wrong ones.
