'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';

/** Kiro CLI's chat view, after its real terminal UI: one task, a file edit, and a shell approval to answer. */
const SCRIPT: [number, () => ReactNode][] = [
  [500, () => <div className="you">add retry with backoff to the uploader and make the tests pass</div>],
  [700, () => <div className="dim">• Thought for 2s...</div>],
  [450, () => <Tool name="Read" target="src/upload/client.ts" />],
  [400, () => <Tool name="Read" target="test/upload.test.ts" />],
  [600, () => <Tool name="Write" target="src/upload/client.ts" />],
  [
    350,
    () => (
      <div className="diff">
        <div>
          {'  '}
          <span className="add">added 3 lines</span>
          <span className="dim">, </span>
          <span className="del">removed 1 line</span>
          <span className="dim"> at L14 in client.ts</span>
        </div>
        <div className="dl del-row">{'  14 -  const res = await put(key, body);'}</div>
        <div className="dl add-row">{'  14 +  const res = await withRetry(() => put(key, body), {'}</div>
        <div className="dl add-row">{'  15 +    tries: 3, baseMs: 200, jitter: true,'}</div>
        <div className="dl add-row">{'  16 +  });'}</div>
      </div>
    ),
  ],
  [500, () => <Agent>Retry is in. Running the tests next.</Agent>],
];

const OPTIONS = [
  'Allow once',
  'Deny once',
  'Create allow rule to approve future similar actions',
  'Create deny rule to block future similar actions',
];

function Tool({ name, target, state = 'ok' }: { name: string; target: string; state?: 'ok' | 'run' | 'bad' }) {
  return (
    <div>
      <span className={state}>•</span> {name} <span className="tg">{target}</span>
    </div>
  );
}

function Agent({ children }: { children: ReactNode }) {
  return (
    <div>
      <span className="acc">•</span> {children}
    </div>
  );
}

export default function KiroCliMock() {
  const [shown, setShown] = useState(0);
  const [sel, setSel] = useState(0);
  const [answer, setAnswer] = useState<'allow' | 'deny' | null>(null);
  const [after, setAfter] = useState(0);
  const [run, setRun] = useState(0);
  const termRef = useRef<HTMLDivElement>(null);
  const asking = shown === SCRIPT.length && !answer;

  // Play the script line by line; under reduced motion it's all there at once.
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return setShown(SCRIPT.length);
    if (shown >= SCRIPT.length) return;
    const t = setTimeout(() => setShown((n) => n + 1), SCRIPT[shown][0]);
    return () => clearTimeout(t);
  }, [shown, run]);

  useEffect(() => {
    if (!answer || after >= 3) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setAfter((n) => n + 1), reduce ? 0 : [300, 1100, 600][after]);
    return () => clearTimeout(t);
  }, [answer, after]);

  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight });
  }, [shown, after]);

  const choose = (i: number) => setAnswer(i % 2 === 0 ? 'allow' : 'deny');
  const keys = (e: KeyboardEvent) => {
    if (!asking) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      setSel((s) => (s + (e.key === 'ArrowDown' ? 1 : OPTIONS.length - 1)) % OPTIONS.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(sel);
    }
  };
  const replay = () => {
    setShown(0);
    setSel(0);
    setAnswer(null);
    setAfter(0);
    setRun((n) => n + 1);
  };
  const working = shown < SCRIPT.length || (answer === 'allow' && after < 3);

  return (
    <div
      className="mock term cli"
      tabIndex={0}
      onKeyDown={keys}
      aria-label="kiro-cli chat mock: answer the approval with the arrow keys and Enter, or tap an option"
    >
      <div className="term-scroll" ref={termRef}>
        <div>
          <span className="acc brand">KIRO</span> <b>Welcome to Kiro CLI V3</b>
        </div>
        <div className="dim">
          Learn more: <span className="acc">https://kiro.dev/docs/cli/v3/</span>
        </div>
        <div className="rule" />
        {SCRIPT.slice(0, shown).map(([, line], i) => (
          <div key={`${run}-${i}`}>{line()}</div>
        ))}
        {answer === 'allow' && (
          <>
            {after >= 1 && <Tool name="Shell" target="npm test" state={after >= 2 ? 'ok' : 'run'} />}
            {after >= 2 && <div className="dim">{'  ╰ Tests  38 passed (38)'}</div>}
            {after >= 3 && (
              <>
                <Agent>Added retry with exponential backoff to put(): 3 tries from 200 ms, with jitter. All 38 tests pass.</Agent>
                <div className="dim">▸ Credits: turn 0.42 • session 0.42 | Time: 14s</div>
              </>
            )}
          </>
        )}
        {answer === 'deny' && (
          <>
            <Tool name="Rejected" target="npm test" state="bad" />
            <Agent>OK, I won&apos;t run them. The change is in src/upload/client.ts.</Agent>
          </>
        )}
        {asking && (
          <div className="ask" role="group" aria-label="Shell requires approval">
            <div>
              <b>Shell</b> requires approval
            </div>
            <Tool name="Shell" target="npm test" state="run" />
            <div className="dim">shell → npm test</div>
            <div className="opts">
              {OPTIONS.map((o, i) => (
                <button key={o} type="button" className={i === sel ? 'on' : ''} onClick={() => choose(i)} onPointerEnter={() => setSel(i)}>
                  {i === sel ? '❯ ' : '  '}
                  {o}
                </button>
              ))}
            </div>
            <div className="dim">esc to close · ↑↓ to navigate · ↵ to select</div>
          </div>
        )}
      </div>
      <div className="rule" />
      <div className="status">
        <span>
          <span className="acc">Default</span>
          <span className="dim"> · auto · high · ◔ 8%</span>
        </span>
        <span>
          <span className="acc">~/code/uploader</span>
          <span className="dim"> (</span>main<span className="dim">)</span>
        </span>
      </div>
      <div className="prompt">
        <span className="acc">›</span>{' '}
        <span className="dim">{working ? 'Kiro is working · Type to queue · ctrl+s to steer' : 'ask a question or describe a task ↵'}</span>
        {!working && (
          <button type="button" className="replay" onClick={replay}>
            replay
          </button>
        )}
      </div>
    </div>
  );
}
