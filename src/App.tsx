import { Suspense, lazy, useEffect, useState } from 'react';
import { classByName } from './lib/data';
import { formatDate, parseDate, serverDay } from './lib/compute';
import { isConfigured, useProfile } from './lib/profile';
import Dashboard from './views/Dashboard';
import Setup from './views/Setup';

// Views behind their own datasets load on first visit rather than up front.
const Schedule = lazy(() => import('./views/Schedule'));
const ClassGuide = lazy(() => import('./views/ClassGuide'));
const Dungeons = lazy(() => import('./views/Dungeons'));
const SeasonScore = lazy(() => import('./views/SeasonScore'));
const Reference = lazy(() => import('./views/Reference'));

const TABS = [
  { id: 'guide', label: 'My guide' },
  { id: 'schedule', label: 'Schedule' },
  { id: 'class', label: 'Class' },
  { id: 'dungeons', label: 'Dungeons' },
  { id: 'score', label: 'Season score' },
  { id: 'reference', label: 'Reference' },
  { id: 'setup', label: 'Setup' },
] as const;

type TabId = (typeof TABS)[number]['id'];

function currentTab(): TabId {
  const hash = window.location.hash.replace('#', '');
  return TABS.some((t) => t.id === hash) ? (hash as TabId) : 'guide';
}

export default function App() {
  const { profile, setProfile, update, reset } = useProfile();
  const [tab, setTab] = useState<TabId>(currentTab);

  // Keep the hash and the active tab in step, so reloads and the back button
  // land where the player left off.
  useEffect(() => {
    const onHashChange = () => setTab(currentTab());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  function go(next: TabId) {
    window.location.hash = next;
    setTab(next);
    window.scrollTo({ top: 0 });
  }

  // First run: send the player to Setup instead of an empty dashboard.
  useEffect(() => {
    if (!isConfigured(profile) && !window.location.hash) go('setup');
    // Only on mount; later edits should not yank the player back to Setup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = parseDate(profile.startDate);
  const klass = profile.className ? classByName(profile.className) : undefined;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <b>SxS Guide</b>
          <span>All In One Database</span>
        </div>
        <div className="whoami">
          {profile.serverName && (
            <span className="chip">{profile.nexus} · {profile.serverName}</span>
          )}
          {start && <span className="chip">Day {serverDay(start).toLocaleString()}</span>}
          {klass && <span className="chip">{klass.Class} T{klass.Tier}</span>}
          {profile.currentLevel !== null && <span className="chip">Lv {profile.currentLevel}</span>}
          {!isConfigured(profile) && <span>Not set up yet</span>}
        </div>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button key={t.id} aria-current={tab === t.id} onClick={() => go(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        <Suspense fallback={<p className="empty">Loading…</p>}>
          {tab === 'guide' && <Dashboard profile={profile} onSetup={() => go('setup')} />}
          {tab === 'schedule' && <Schedule profile={profile} onSetup={() => go('setup')} />}
          {tab === 'class' && <ClassGuide profile={profile} />}
          {tab === 'dungeons' && <Dungeons profile={profile} />}
          {tab === 'score' && <SeasonScore profile={profile} />}
          {tab === 'reference' && <Reference />}
          {tab === 'setup' && (
            <Setup
              profile={profile}
              update={update}
              setProfile={setProfile}
              reset={reset}
              onDone={() => go('guide')}
            />
          )}
        </Suspense>

        <p className="dim" style={{ marginTop: 28, textAlign: 'center' }}>
          Data mirrored from the SxS All In One Database
          {start ? ` · your server opened ${formatDate(start)}` : ''}
        </p>
      </main>
    </div>
  );
}
