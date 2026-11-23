'use client';

import { useEffect, useState, type KeyboardEvent } from 'react';

type Answer = 'allow' | 'always' | 'reject' | null;
const OUTCOME = { allow: 'Allowed once', always: 'Allowed always', reject: 'Rejected' };
const RESOLVED = { allow: 'Allow once', always: 'Always allow this exact command in this orb', reject: 'Reject' };

/**
 * Kiro Orbits, after its real terminal attach view and web thread: one thread in both, waiting on a permission.
 * Answering in either one resolves it in both.
 */
export default function OrbitsMock() {
  const [answer, setAnswer] = useState<Answer>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!answer || answer === 'reject') return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setDone(true), reduce ? 0 : 1200);
    return () => clearTimeout(t);
  }, [answer]);

  const keys = (e: KeyboardEvent) => {
    if (answer) return;
    if (e.key === '1') setAnswer('allow');
    if (e.key === '2') setAnswer('reject');
  };
  const reset = () => {
    setAnswer(null);
    setDone(false);
  };
  const allowed = answer === 'allow' || answer === 'always';
  const running = allowed && !done;
  const status = !answer ? '⋮ Waiting for permission' : running ? '⋮ Running tools' : '✓ Ready';
  const seq = !answer ? 41 : running ? 43 : 47;
  const chip = !answer ? 'Needs approval' : running ? 'Running' : 'Idle';

  return (
    <div className="mock orbits">
      <div className="pane" tabIndex={0} onKeyDown={keys} aria-label="orbits in the terminal: press 1 to allow, 2 to reject">
        <div className="bar dim">terminal · orbits</div>
        <div className="term">
          <div className="you">Add retry with backoff to the uploader and make the tests pass</div>
          <div className="dim">Thinking ▸</div>
          <div>
            <span className="ok">✓</span> Explored 2 files, 1 search <span className="dim">▸</span>
          </div>
          <div>
            <span className="ok">✓</span> Edited src/upload/client.ts <span className="add">+17</span> <span className="del">-11</span>{' '}
            <span className="dim">41 lines ▸</span>
          </div>
          {answer && (
            <div>
              <span className="ok">✓</span> {OUTCOME[answer]} · Run npm test
            </div>
          )}
          {allowed && (
            <div>
              <span className={done ? 'ok' : 'acc'}>{done ? '✓' : '⋮'}</span> $ npm test{' '}
              <span className="dim">{done ? '35 lines ▸' : ''}</span>
            </div>
          )}
          {done && <div>Added retry with backoff to the uploader. All 38 tests pass.</div>}
          {answer === 'reject' && <div>Skipped the test run. The change is in src/upload/client.ts.</div>}
          {!answer && (
            <fieldset className="box warn">
              <legend>Permission · Run npm test</legend>
              <button type="button" className="on" onClick={() => setAnswer('allow')}>
                ▸ [1] Allow once
              </button>
              <button type="button" onClick={() => setAnswer('reject')}>
                {'  '}[2] Reject
              </button>
              <div className="foot dim">1-2 choose · Esc dismiss</div>
            </fieldset>
          )}
          <fieldset className="box">
            <legend className="end">Medium</legend>
            <div>&nbsp;</div>
            <div className="foot">
              <span className="dim">
                {status} · live · #{seq}
              </span>
              <span className="dim">~/code/uploader</span>
            </div>
          </fieldset>
        </div>
      </div>
      <div className="pane web">
        <div className="bar">
          <span>Add retry with backoff to the uploader</span>
          <span className="chips">
            <span className={!answer ? 'chip warn' : 'chip'}>{chip}</span>
            <span className="chip">Supervised</span>
          </span>
        </div>
        <div className="term">
          <div className="dim">you · 9:41 AM</div>
          <div className="msg">Add retry with backoff to the uploader and make the tests pass</div>
          <div>
            <span className="ok">completed</span> Editing src/upload/client.ts <span className="dim">edit</span>
          </div>
          {!answer ? (
            <>
              <div className="dim">One permission request is waiting for you.</div>
              <div className="card">
                <b>npm test</b>
                <span className="dim">Always allow remembers exactly this command, byte for byte.</span>
                <code>npm test</code>
                <span className="btns">
                  <button type="button" className="pri" onClick={() => setAnswer('allow')}>
                    Allow once
                  </button>
                  <button type="button" onClick={() => setAnswer('always')}>
                    Always allow this exact command in this orb
                  </button>
                  <button type="button" onClick={() => setAnswer('reject')}>
                    Reject
                  </button>
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="card">
                <b>npm test</b>
                <span className="dim">resolved: {RESOLVED[answer]}</span>
              </div>
              {(done || answer === 'reject') && (
                <div>
                  <span className="dim">done</span>
                  <button type="button" className="replay" onClick={reset}>
                    replay
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
