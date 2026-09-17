import { useEffect, useState, useSyncExternalStore } from 'react';
import type { FarmProfile, UserRecord } from './types';
import { currentUser, logout, updateUser } from './services/auth';
import { emptySaleTemplate, loadData, replaceData } from './services/db';
import { getStorageWarning, subscribeStorageWarning } from './services/storage';
import { FarmProvider } from './context/FarmContext';
import { AuthScreen } from './components/AuthScreen';
import { Onboarding } from './components/Onboarding';
import { AppShell } from './components/AppShell';
import { Banner } from './components/ui';
export default function App() {
  const [user, setUser] = useState<UserRecord | null>(() => currentUser()),
    [survey, setSurvey] = useState(false);
  const warning = useSyncExternalStore(subscribeStorageWarning, getStorageWarning);
  useEffect(() => {
    const refresh = () =>
      setUser(previous => {
        const next = currentUser();
        return JSON.stringify(previous) === JSON.stringify(next) ? previous : next;
      });
    const storage = (event: StorageEvent) => {
      if (!event.key || event.key === 'chaparra:v2:session' || event.key === 'chaparra:v2:users')
        refresh();
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('storage', storage);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('storage', storage);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  function signOut() {
    logout();
    setUser(null);
    setSurvey(false);
  }
  function complete(farm: FarmProfile) {
    if (!user) return;
    const old = loadData(user.id);
    replaceData(user.id, {
      ...old,
      farm,
      saleTemplate: old.farm ? old.saleTemplate : { ...emptySaleTemplate(farm), email: user.email }
    });
    const updated = updateUser(user.id, {
      onboardingCompletedAt: user.onboardingCompletedAt ?? new Date().toISOString()
    });
    setUser(updated);
    setSurvey(false);
  }
  const farm = user ? loadData(user.id).farm : null;
  return (
    <>
      {warning && (
        <div className="sticky top-0 z-30 p-3">
          <Banner tone="error">{warning}</Banner>
        </div>
      )}
      {!user ? (
        <AuthScreen onAccess={setUser} />
      ) : !user.onboardingCompletedAt || !farm || survey ? (
        <Onboarding
          key={user.id + (survey ? '-edit' : '-new')}
          user={user}
          initial={farm ?? undefined}
          onComplete={complete}
          onCancel={user.onboardingCompletedAt ? () => setSurvey(false) : signOut}
        />
      ) : (
        <FarmProvider key={user.id} user={user}>
          <AppShell onLogout={signOut} onSurvey={() => setSurvey(true)} onUserChange={setUser} />
        </FarmProvider>
      )}
    </>
  );
}
