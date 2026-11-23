---
title: "Scroll the Gita instead of doom-scrolling"
date: "2026-11-05"
tags: ["ios", "expo", "side-project", "gita-swipe"]
excerpt: "I wanted one app on my phone that felt like scrolling but left me better off."
---

I wanted one app on my phone that felt like scrolling but left me better off. So this week I built Gita Swipe: the Bhagavad Gita, one verse per page, in a vertical swipe feed.

Most of the time went into the text, not the app.

- The Sanskrit comes from an Unlicense dataset, the transliteration is generated, and the English is Annie Besant's 1922 translation, which is in the public domain. I read it from proofread Wikisource pages pinned to exact revisions.
- The 1922 print has gaps. I found 8 places that needed a correction, and checked 7 of them against the 1896 second edition.
- Chapter 13 needed renumbering to reach the standard count of 700 verses.
- A line-splitting bug broke verses after any word ending in "-vāca" (said). Only a real opening speaker line is split now, with a regression test for each verse it used to break.

Then the app: chapter jump, favorites, search by verse number or by words in any of the three scripts, a journal of notes per verse, share cards, a home-screen widget, and an opt-in daily verse. The daily verse is a fixed shuffle of all 700, so none repeats for 700 days.

My favorite rule is in the streak. A day counts once a verse has stayed on screen for 5 seconds. And the tests run in Los Angeles time, so local-versus-UTC day bugs fail loudly instead of quietly.
