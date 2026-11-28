---
title: "A read is not a keypress"
date: "2026-11-28"
tags: ["tui", "terminal", "debugging", "testing", "kiro-cli"]
excerpt: "This week I fixed a handful of Kiro CLI input bugs that all came from one wrong assumption: that each read from the terminal holds exactly one key."
---

This week I fixed a handful of Kiro CLI input bugs that all came from one wrong assumption: that each read from the terminal holds exactly one key. A terminal app gets its input as bytes on stdin. When you type slowly on a fast laptop, every read really is one key, so the assumption survives every test you write by hand. It breaks when someone types fast, pastes, presses Esc at the wrong moment, or uses a machine that is busy.

The fuzzer I wrote about last week found two of these. The rest turned up once I knew what to look for.

## Many keys in one read

A list panel with a search box ignored any input longer than one character. The check was meant to keep escape sequences out of the search. It also threw away a paste, and any burst of keys that arrived together. The search never opened.

Removing the guard was the easy part. The harder question was what a burst means. If someone holds `j` to move down a list, the terminal can deliver `jjj` in one read, and that should move three rows. If someone pastes `jjj`, it is text and belongs in the search box.

Terminals can tell you which is which. With bracketed paste turned on (`\x1b[?2004h`), the terminal wraps pasted text in `\x1b[200~` and `\x1b[201~`. Anything inside those markers is text, never a command.

```ts
const PASTE_START = "\x1b[200~";
const PASTE_END = "\x1b[201~";

function route(chunk: string, onText: (t: string) => void, onKey: (k: string) => void) {
  if (chunk.startsWith(PASTE_START) && chunk.endsWith(PASTE_END)) {
    onText(chunk.slice(PASTE_START.length, -PASTE_END.length));
    return;
  }
  for (const key of splitKeys(chunk).keys) onKey(key);
}
```

This matters for more than search. The same panel had single-key shortcuts for actions on the selected item, including one you confirm by pressing `x`. Before the fix, a pasted `x` could confirm it. A paste should never press a button.

## Esc is ambiguous

Esc is a key on its own, and also the first byte of every arrow key, function key, and terminal reply. Page Down is `\x1b[6~`. So when a read starts with `\x1b`, the parser has to decide: is this Esc, or the start of something longer?

Two bugs lived here. When Esc shared a read with the next key, the parser took the rest as text, and `[6~` showed up in the prompt. And when a sequence was cut off, the parser kept reading and swallowed the next Esc into it.

The rules that fixed both:

- **A CSI sequence ends at its final byte.** After `\x1b[`, parameter bytes run until a byte between `@` and `~`.
- **A new Esc ends a broken sequence.** Real sequences never contain a raw Esc, so one in the middle means the earlier sequence was never finished.
- **Esc followed by anything else is just Esc.** Including an emoji, which must reach the prompt whole.
- **A lone Esc at the end of a read waits briefly.** If nothing follows within a few milliseconds, it was the Esc key.

```ts
const isFinal = (c: string) => c >= "\x40" && c <= "\x7e";

function splitKeys(buf: string): { keys: string[]; rest: string } {
  const keys: string[] = [];
  let i = 0;
  while (i < buf.length) {
    if (buf[i] !== "\x1b") {
      const ch = String.fromCodePoint(buf.codePointAt(i)!);
      keys.push(ch);
      i += ch.length;
      continue;
    }
    if (i + 1 === buf.length) break; // lone Esc: wait for more or a timeout
    if (buf[i + 1] !== "[") {
      keys.push("\x1b"); // not CSI, so Esc stands alone
      i += 1;
      continue;
    }
    let j = i + 2;
    while (j < buf.length && buf[j] !== "\x1b" && !isFinal(buf[j])) j++;
    if (j === buf.length) break; // unfinished: keep it for the next read
    const end = buf[j] === "\x1b" ? j : j + 1; // a new Esc ends a broken one
    keys.push(buf.slice(i, end));
    i = end;
  }
  return { keys, rest: buf.slice(i) };
}
```

This sketch skips Alt+key and the `\x1bO` keys to stay short. The `rest` it returns is the important part: an unfinished sequence waits for the next read instead of being typed as text.

## The terminal talks on the same wire

To pick a light or dark theme, Kiro CLI asks the terminal for its background color. That is an OSC 11 query: write `\x1b]11;?\x07`, and the terminal answers with something like `\x1b]11;rgb:1e1e/1e1e/1e1e\x07` on stdin.

The old code ran `dd` on `/dev/tty` in a child shell to read the answer. `dd` read a whole block of whatever was waiting. If you started typing while the app launched, your first keys went to `dd` and never reached the prompt. A cut in the middle of a multibyte character painted a `�`.

The fix was one rule: one reader owns the input. Queries go out, and that reader picks replies out of the stream and passes every other byte on as keys.

```ts
const BG_REPLY = /\x1b\]11;([^\x07\x1b]*)(?:\x07|\x1b\\)/;

function takeBackground(input: string): { color?: string; keys: string } {
  const m = BG_REPLY.exec(input);
  if (!m) return { keys: input };
  const keys = input.slice(0, m.index) + input.slice(m.index + m[0].length);
  return { color: m[1], keys };
}
```

The reply can be split across reads too, so the reader buffers until the terminator or a short timeout. The first frame waits for the answer, so the app opens in the right theme instead of flashing the wrong one.

## Characters are not code units

The other fuzzer bug: Backspace and the arrow keys moved one UTF-16 code unit at a time. An emoji is two, so deleting next to one left half of it behind. Even code points are not enough, because a flag or a skin-tone emoji is several. Move by grapheme instead:

```ts
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function backspace(text: string, cursor: number): [string, number] {
  let start = 0;
  for (const { index } of graphemes.segment(text.slice(0, cursor))) start = index;
  return [text.slice(0, start) + text.slice(cursor), start];
}
```

And decode bytes with `new TextDecoder().decode(chunk, { stream: true })`, so a character split across two reads is held until its last byte arrives.

## The lesson

Every one of these bugs passed when I typed by hand. The tests that caught them did what people do: type while the app starts, paste, hold a key, press Esc mid-sequence, use emoji. Each fix started with a test that failed on main, such as "every key typed during startup reaches the prompt".

If your app reads a terminal, treat input as a stream. Keep leftovers between reads, give one reader the whole stream, and decide what a burst of bytes means before you act on any of it.
