'use client';

import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Picks } from './useDither';

const TABS = ['running', 'coding'] as const;
type Tab = (typeof TABS)[number];

/** Running and coding tabs on the stats page. Only the open tab is mounted, so its charts draw in each time. #coding opens coding. */
export default function StatsTabs(panels: Record<Tab, ReactNode>) {
  const [tab, setTab] = useState<Tab>('running');
  const [picks] = useState(() => new Map<string, number>());
  useEffect(() => {
    if (location.hash === '#coding') setTab('coding');
  }, []);

  const select = (t: Tab, focus = false) => {
    setTab(t);
    history.replaceState(history.state, '', t === 'coding' ? '#coding' : location.pathname);
    if (focus) document.getElementById(`tab-${t}`)?.focus();
  };
  const keys = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    select(tab === 'running' ? 'coding' : 'running', true);
  };

  return (
    <>
      <div className="tabs">
        <nav role="tablist" aria-label="Stats" onKeyDown={keys}>
          {TABS.map((id) => (
            <button
              key={id}
              id={`tab-${id}`}
              type="button"
              role="tab"
              aria-selected={tab === id}
              aria-controls="stats-panel"
              tabIndex={tab === id ? 0 : -1}
              onClick={() => select(id)}
            >
              {id}
            </button>
          ))}
        </nav>
        {tab === 'running' && <span className="dim">from strava</span>}
      </div>
      <div className="sec" id="stats-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        <Picks.Provider value={picks}>{panels[tab]}</Picks.Provider>
      </div>
    </>
  );
}
