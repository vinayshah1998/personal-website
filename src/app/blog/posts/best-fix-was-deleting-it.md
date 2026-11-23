---
title: "The best fix was deleting it"
date: "2026-07-15"
tags: ["rust", "concurrency", "kiro-cli"]
excerpt: "The feature wasn't worth a class of bug where the fix is \"be careful about ordering, forever.\""
---

This week I shipped a feature and then deleted it.

Kiro CLI briefly remembered your model and effort settings per agent. Switch into an agent that carried its own model, and the CLI would apply it for you. It sounded small. It came to 2,538 lines.

Then it deadlocked. Two parts of the app each waited for the other to finish before applying the switch. Neither ever did, and the session froze.

I could have untangled it. Instead I reverted the whole thing. The feature wasn't worth a class of bug where the fix is "be careful about ordering, forever." Deleting 2,538 lines took one commit and removed the deadlock completely.

The lesson I keep relearning: when a feature needs two things to agree on timing, the cheapest fix is often to not need it at all.
