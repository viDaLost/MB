import { Download, Settings2, ShieldCheck, Users, WifiOff } from 'lucide-react';
import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Button, IconButton, Modal } from './components/ui';
import { BUNKER_STORAGE_KEY, MAFIA_STORAGE_KEY } from './lib/sessionKeys';
import { hasStored, loadStored, saveStored } from './lib/storage';
import type { GamePreferences, GameRoute } from './types';
import { z } from 'zod';

const MafiaGame = lazy(() =>
  import('./games/mafia/MafiaGame').then((module) => ({ default: module.MafiaGame })),
);
const BunkerGame = lazy(() =>
  import('./games/bunker/BunkerGame').then((module) => ({ default: module.BunkerGame })),
);

const preferencesSchema = z.object({
  haptics: z.boolean(),
  sound: z.boolean(),
  reducedMotion: z.boolean(),
});

const DEFAULT_PREFERENCES: GamePreferences = {
  haptics: true,
  sound: false,
  reducedMotion: false,
};

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function routeFromHash(): GameRoute {
  const value = window.location.hash.replace('#/', '');
  return value === 'mafia' || value === 'bunker' ? value : 'home';
}

function Toggle({
  label,
  note,
  checked,
  onChange,
}: {
  label: string;
  note: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>
        <strong>{label}</strong>
        <small>{note}</small>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="toggle" aria-hidden="true" />
    </label>
  );
}

export function App() {
  const [route, setRoute] = useState<GameRoute>(routeFromHash);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [preferences, setPreferences] = useState<GamePreferences>(
    () => loadStored('gameHubPreferencesV1', preferencesSchema) ?? DEFAULT_PREFERENCES,
  );

  useEffect(() => {
    const onHash = () => setRoute(routeFromHash());
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener('hashchange', onHash);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('beforeinstallprompt', onInstall);
    return () => {
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('beforeinstallprompt', onInstall);
    };
  }, []);

  useEffect(() => {
    document.body.dataset.route = route;
    document.documentElement.classList.toggle('reduce-motion', preferences.reducedMotion);
    saveStored('gameHubPreferencesV1', preferences);
  }, [preferences, route]);

  const navigate = useCallback((next: GameRoute) => {
    window.location.hash = next === 'home' ? '#/' : `#/${next}`;
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, []);

  const sessionFlags = {
    mafia: hasStored(MAFIA_STORAGE_KEY),
    bunker: hasStored(BUNKER_STORAGE_KEY),
  };

  if (route === 'mafia') {
    return (
      <Suspense
        fallback={
          <div className="route-loader" role="status">
            Город просыпается…
          </div>
        }
      >
        <MafiaGame onExit={() => navigate('home')} preferences={preferences} />
      </Suspense>
    );
  }
  if (route === 'bunker') {
    return (
      <Suspense
        fallback={
          <div className="route-loader" role="status">
            Гермодверь открывается…
          </div>
        }
      >
        <BunkerGame onExit={() => navigate('home')} preferences={preferences} />
      </Suspense>
    );
  }

  return (
    <div className="home-page">
      {!online && (
        <div className="offline-banner" role="status">
          <WifiOff aria-hidden="true" /> Офлайн-режим: партии сохраняются на устройстве
        </div>
      )}
      <header className="home-header">
        <a className="wordmark" href="#/" aria-label="Главная">
          <span>NOCTURNE</span>
          <strong>&amp; SHELTER</strong>
        </a>
        <div className="home-header__actions">
          {installPrompt && (
            <IconButton
              label="Установить приложение"
              onClick={async () => {
                await installPrompt.prompt();
                await installPrompt.userChoice;
                setInstallPrompt(null);
              }}
            >
              <Download aria-hidden="true" />
            </IconButton>
          )}
          <IconButton label="Настройки" onClick={() => setSettingsOpen(true)}>
            <Settings2 aria-hidden="true" />
          </IconButton>
        </div>
      </header>

      <main className="home-main home-main--minimal">
        <section className="home-intro home-intro--minimal">
          <span className="eyebrow">Игры для компании • один телефон</span>
          <h1>Выберите игру</h1>
        </section>

        <section className="game-portals game-portals--minimal" aria-label="Выбор игры">
          <article className="game-portal game-portal--mafia">
            <div className="portal-copy">
              <span className="portal-number">Социальная дедукция</span>
              <h2>Мафия</h2>
              <p>Роли, ночь, обсуждение и голосование.</p>
              <span className="portal-meta">
                <Users aria-hidden="true" /> 5–30 игроков
              </span>
              <Button variant="primary" onClick={() => navigate('mafia')}>
                {sessionFlags.mafia ? 'Продолжить мафию' : 'Начать мафию'}
              </Button>
            </div>
          </article>

          <article className="game-portal game-portal--bunker">
            <div className="portal-copy">
              <span className="portal-number">Выживание и дебаты</span>
              <h2>Бункер</h2>
              <p>Персонажи, раскрытие характеристик и отбор.</p>
              <span className="portal-meta">
                <ShieldCheck aria-hidden="true" /> 4–16 игроков
              </span>
              <Button variant="primary" onClick={() => navigate('bunker')}>
                {sessionFlags.bunker ? 'Продолжить бункер' : 'Начать бункер'}
              </Button>
            </div>
          </article>
        </section>
      </main>

      <Modal
        open={settingsOpen}
        title="Настройки приложения"
        onClose={() => setSettingsOpen(false)}
      >
        <div className="settings-list">
          <Toggle
            label="Тактильный отклик"
            note="Короткая вибрация при раскрытии и конце таймера"
            checked={preferences.haptics}
            onChange={(haptics) => setPreferences((value) => ({ ...value, haptics }))}
          />
          <Toggle
            label="Звуковые сигналы"
            note="Сигнал окончания таймера и запуска новой партии"
            checked={preferences.sound}
            onChange={(sound) => setPreferences((value) => ({ ...value, sound }))}
          />
          <Toggle
            label="Минимум анимации"
            note="Отключает переходы, зерно и декоративное движение"
            checked={preferences.reducedMotion}
            onChange={(reducedMotion) => setPreferences((value) => ({ ...value, reducedMotion }))}
          />
        </div>
        <Button variant="primary" block onClick={() => setSettingsOpen(false)}>
          Готово
        </Button>
      </Modal>
    </div>
  );
}
