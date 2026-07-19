import {
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  History,
  Moon,
  RotateCcw,
  Shield,
  Skull,
  Sunrise,
  Undo2,
  Users,
  Vote,
} from 'lucide-react';
import { useEffect, useMemo, useReducer, useState, type Dispatch, type ReactNode } from 'react';
import {
  MAFIA_PRESETS,
  MAFIA_ROLES,
  TEAM_LABELS,
  type MafiaPreset,
  type MafiaTeam,
} from '../../data/mafia';
import { createSeed } from '../../lib/rng';
import { clearStored, loadStored, saveStored } from '../../lib/storage';
import { feedback } from '../../lib/feedback';
import { MAFIA_STORAGE_KEY } from '../../lib/sessionKeys';
import type { GamePreferences } from '../../types';
import {
  Button,
  EmptyState,
  GameHeader,
  HoldToReveal,
  IconButton,
  Modal,
  ProgressRail,
  Segmented,
  Stepper,
  Timer,
  cx,
} from '../../components/ui';
import {
  getNightSteps,
  getRoleDeck,
  mafiaGameSchema,
  mafiaReducer,
  nightTargetKey,
  validTargets,
  type MafiaGameState,
  type NightStep,
} from './engine';

const TEAM_COPY: Record<MafiaTeam, { title: string; text: string }> = {
  city: { title: 'Город выстоял', text: 'Все угрозы устранены. Рассвет принадлежит городу.' },
  mafia: {
    title: 'Синдикат победил',
    text: 'Сопротивление сломлено. Город больше не контролирует улицы.',
  },
  solo: { title: 'Остался только Маньяк', text: 'В тишине пустого города больше некому спорить.' },
};

const NIGHT_META: Record<
  NightStep,
  { title: string; eyebrow: string; description: string; icon: typeof Moon }
> = {
  mafia: {
    title: 'Ход синдиката',
    eyebrow: 'Ночная улица',
    description: 'Выберите одну цель. Союзники синдиката недоступны для атаки.',
    icon: Moon,
  },
  don: {
    title: 'Поиск Комиссара',
    eyebrow: 'Чёрное досье',
    description: 'Дон проверяет одного игрока и узнаёт, является ли тот Комиссаром.',
    icon: Crown,
  },
  doctor: {
    title: 'Ход доктора',
    eyebrow: 'Дежурный свет',
    description: 'Защитите одного живого игрока от всех атак этой ночи.',
    icon: Shield,
  },
  detective: {
    title: 'Проверка комиссара',
    eyebrow: 'Закрытое досье',
    description: 'Ведущий увидит, связан ли выбранный игрок с синдикатом.',
    icon: Eye,
  },
  maniac: {
    title: 'Ход маньяка',
    eyebrow: 'Чужой маршрут',
    description: 'Выберите собственную цель. Маньяк не может атаковать себя.',
    icon: Skull,
  },
};

function PhaseFrame({
  eyebrow,
  title,
  copy,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  copy?: string;
  icon: typeof Moon;
  children: ReactNode;
}) {
  return (
    <section className="phase-card mafia-panel">
      <header className="phase-card__header">
        <div className="phase-symbol">
          <Icon aria-hidden="true" />
        </div>
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          {copy && <p>{copy}</p>}
        </div>
      </header>
      {children}
    </section>
  );
}

function Setup({
  onStart,
}: {
  onStart: (names: string[], preset: MafiaPreset, seed: string) => void;
}) {
  const [count, setCount] = useState(8);
  const [preset, setPreset] = useState<MafiaPreset>('noir');
  const [names, setNames] = useState(() =>
    Array.from({ length: 8 }, (_, index) => `Игрок ${index + 1}`),
  );
  const [seed, setSeed] = useState(() => createSeed('CITY'));

  const updateCount = (next: number) => {
    setCount(next);
    setNames((current) =>
      Array.from({ length: next }, (_, index) => current[index] ?? `Игрок ${index + 1}`),
    );
  };
  const duplicateNames = names
    .map((name) => name.trim().toLocaleLowerCase())
    .filter((name, index, items) => name && items.indexOf(name) !== index);
  const roleDeck = getRoleDeck(count, preset);
  const roleCounts = Object.entries(
    roleDeck.reduce<Record<string, number>>((result, role) => {
      result[role] = (result[role] ?? 0) + 1;
      return result;
    }, {}),
  );

  return (
    <main className="game-main setup-layout">
      <section className="setup-hero mafia-panel">
        <span className="eyebrow">Новая партия</span>
        <h1>
          Соберите
          <br />
          ночной город
        </h1>
        <p>Состав автоматически адаптируется к числу игроков и выбранному режиму.</p>
        <div className="setup-stats">
          <div>
            <strong>{count}</strong>
            <span>участников</span>
          </div>
          <div>
            <strong>{roleDeck.filter((role) => MAFIA_ROLES[role].team === 'mafia').length}</strong>
            <span>синдикат</span>
          </div>
          <div>
            <strong>{roleDeck.filter((role) => MAFIA_ROLES[role].team === 'city').length}</strong>
            <span>город</span>
          </div>
        </div>
      </section>

      <section className="setup-form mafia-panel">
        <Stepper label="Количество игроков" value={count} min={5} max={16} onChange={updateCount} />
        <Segmented
          label="Сценарий ролей"
          value={preset}
          options={(Object.keys(MAFIA_PRESETS) as MafiaPreset[]).map((value) => ({
            value,
            label: MAFIA_PRESETS[value].name,
            note: MAFIA_PRESETS[value].note,
          }))}
          onChange={setPreset}
        />
        <p className="field-note">{MAFIA_PRESETS[preset].description}</p>

        <div className="role-composition" aria-label="Состав ролей">
          {roleCounts.map(([role, amount]) => (
            <span
              key={role}
              className={`role-pill role-pill--${MAFIA_ROLES[role as keyof typeof MAFIA_ROLES].team}`}
            >
              {MAFIA_ROLES[role as keyof typeof MAFIA_ROLES].name} × {amount}
            </span>
          ))}
        </div>

        <div className="field-stack">
          <div className="field-heading">
            <span className="field-label">Имена за столом</span>
            <small>Можно оставить номера</small>
          </div>
          <div className="name-grid">
            {names.map((name, index) => (
              <label key={index} className="text-field compact-field">
                <span>{index + 1}</span>
                <input
                  value={name}
                  maxLength={24}
                  aria-label={`Имя игрока ${index + 1}`}
                  onChange={(event) =>
                    setNames((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? event.target.value : item,
                      ),
                    )
                  }
                />
              </label>
            ))}
          </div>
          {duplicateNames.length > 0 && (
            <p className="form-error">Имена должны отличаться друг от друга.</p>
          )}
        </div>

        <details className="advanced-settings">
          <summary>Код партии</summary>
          <div className="seed-row">
            <label className="text-field">
              <span className="field-label">Seed для повторения раздачи</span>
              <input
                value={seed}
                maxLength={48}
                onChange={(event) => setSeed(event.target.value.toUpperCase())}
              />
            </label>
            <IconButton label="Создать новый код" onClick={() => setSeed(createSeed('CITY'))}>
              <RotateCcw aria-hidden="true" />
            </IconButton>
          </div>
        </details>

        <Button
          variant="primary"
          block
          disabled={duplicateNames.length > 0 || !seed.trim()}
          onClick={() => onStart(names, preset, seed.trim())}
        >
          Запечатать роли
        </Button>
      </section>
    </main>
  );
}

function Deal({
  state,
  dispatch,
  haptics,
}: {
  state: MafiaGameState;
  dispatch: Dispatch<Parameters<typeof mafiaReducer>[1]>;
  haptics: boolean;
}) {
  const player = state.players[state.dealIndex];
  if (!player) return null;
  const role = MAFIA_ROLES[player.role];
  const allies = state.players.filter(
    (candidate) => candidate.team === 'mafia' && candidate.id !== player.id,
  );
  return (
    <main className="game-main reveal-layout">
      <ProgressRail items={['Раздача', 'Ночь', 'День', 'Голосование']} current={0} />
      {!state.cardVisible ? (
        <section className="handoff-card mafia-handoff">
          <span className="deal-count">
            {state.dealIndex + 1} / {state.players.length}
          </span>
          <div className="handoff-mark" aria-hidden="true">
            <EyeOff />
          </div>
          <span className="eyebrow">Передайте телефон</span>
          <h1>{player.name}</h1>
          <p>Убедитесь, что экран видите только вы.</p>
          <HoldToReveal haptics={haptics} onReveal={() => dispatch({ type: 'REVEAL_CARD' })} />
        </section>
      ) : (
        <section className={`secret-card secret-card--${role.team}`}>
          <div className="secret-card__top">
            <span>{TEAM_LABELS[role.team]}</span>
            <small>
              {state.dealIndex + 1} / {state.players.length}
            </small>
          </div>
          <div className="secret-card__body">
            <span className="eyebrow">Личное досье • {player.name}</span>
            <h1>{role.name}</h1>
            <strong>{role.tagline}</strong>
            <p>{role.description}</p>
            {role.team === 'mafia' && (
              <div className="allies-box">
                <span className="field-label">Ваши союзники</span>
                <p>
                  {allies.length
                    ? allies.map((ally) => ally.name).join(', ')
                    : 'Вы действуете в одиночку.'}
                </p>
              </div>
            )}
          </div>
          <Button variant="secondary" block onClick={() => dispatch({ type: 'NEXT_CARD' })}>
            Скрыть и передать дальше
          </Button>
        </section>
      )}
    </main>
  );
}

function Night({
  state,
  dispatch,
}: {
  state: MafiaGameState;
  dispatch: Dispatch<Parameters<typeof mafiaReducer>[1]>;
}) {
  const steps = getNightSteps(state);
  const step = steps[state.nightStepIndex];
  if (!step) {
    return (
      <main className="game-main phase-layout">
        <ProgressRail items={['Раздача', 'Ночь', 'День', 'Голосование']} current={1} />
        <PhaseFrame
          eyebrow={`Ночь ${state.round}`}
          title="Все сделали выбор"
          copy="Проверьте цели и рассчитайте последствия."
          icon={Moon}
        >
          <div className="night-summary-list">
            {steps.map((item) => {
              const targetId = state.nightActions[nightTargetKey(item)];
              const target = state.players.find((player) => player.id === targetId);
              return (
                <div key={item}>
                  <span>{NIGHT_META[item].title}</span>
                  <strong>{target?.name ?? 'Пропуск'}</strong>
                </div>
              );
            })}
          </div>
          <Button variant="primary" block onClick={() => dispatch({ type: 'RESOLVE_NIGHT' })}>
            Встретить рассвет
          </Button>
        </PhaseFrame>
      </main>
    );
  }
  const meta = NIGHT_META[step];
  const key = nightTargetKey(step);
  const selected = state.nightActions[key];
  const Icon = meta.icon;
  const checkedPlayer = state.players.find(
    (player) => player.id === state.detectiveResult?.playerId,
  );
  const donCheckedPlayer = state.players.find((player) => player.id === state.donResult?.playerId);
  return (
    <main className="game-main phase-layout">
      <ProgressRail items={['Раздача', 'Ночь', 'День', 'Голосование']} current={1} />
      <PhaseFrame
        eyebrow={`${meta.eyebrow} • шаг ${state.nightStepIndex + 1} из ${steps.length}`}
        title={meta.title}
        copy={meta.description}
        icon={Icon}
      >
        <div className="target-grid" role="group" aria-label="Выберите цель">
          {validTargets(state, step).map((player) => (
            <button
              type="button"
              key={player.id}
              className={cx('target-chip', selected === player.id && 'target-chip--selected')}
              aria-pressed={selected === player.id}
              onClick={() => dispatch({ type: 'SET_NIGHT_TARGET', key, playerId: player.id })}
            >
              <span className="avatar-token">{player.name.slice(0, 1).toUpperCase()}</span>
              <strong>{player.name}</strong>
              {selected === player.id && <CheckCircle2 aria-hidden="true" />}
            </button>
          ))}
        </div>
        {step === 'detective' && checkedPlayer && state.detectiveResult && (
          <div
            className={cx(
              'investigation-result',
              state.detectiveResult.isMafia ? 'danger' : 'safe',
            )}
            role="status"
          >
            <Eye aria-hidden="true" />
            <div>
              <span>Результат проверки</span>
              <strong>
                {checkedPlayer.name}:{' '}
                {state.detectiveResult.isMafia ? 'связан с синдикатом' : 'не связан с синдикатом'}
              </strong>
            </div>
          </div>
        )}
        {step === 'don' && donCheckedPlayer && state.donResult && (
          <div
            className={cx('investigation-result', state.donResult.isDetective ? 'danger' : 'safe')}
            role="status"
          >
            <Crown aria-hidden="true" />
            <div>
              <span>Результат проверки</span>
              <strong>
                {donCheckedPlayer.name}:{' '}
                {state.donResult.isDetective ? 'это Комиссар' : 'не Комиссар'}
              </strong>
            </div>
          </div>
        )}
        <Button
          variant="primary"
          block
          disabled={!selected}
          onClick={() => dispatch({ type: 'NEXT_NIGHT_STEP' })}
        >
          Зафиксировать выбор
        </Button>
      </PhaseFrame>
    </main>
  );
}

function Dawn({
  state,
  dispatch,
}: {
  state: MafiaGameState;
  dispatch: Dispatch<Parameters<typeof mafiaReducer>[1]>;
}) {
  return (
    <main className="game-main phase-layout dawn-scene">
      <ProgressRail items={['Раздача', 'Ночь', 'День', 'Голосование']} current={2} />
      <PhaseFrame
        eyebrow={`Рассвет • день ${state.round}`}
        title="Город просыпается"
        icon={Sunrise}
      >
        <div className="dawn-report">
          {state.lastNightSummary.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <Button variant="primary" block onClick={() => dispatch({ type: 'START_DAY' })}>
          Начать обсуждение
        </Button>
      </PhaseFrame>
    </main>
  );
}

function Day({
  state,
  dispatch,
  preferences,
}: {
  state: MafiaGameState;
  dispatch: Dispatch<Parameters<typeof mafiaReducer>[1]>;
  preferences: GamePreferences;
}) {
  const alive = state.players.filter((player) => player.alive);
  return (
    <main className="game-main phase-layout">
      <ProgressRail items={['Раздача', 'Ночь', 'День', 'Голосование']} current={2} />
      <PhaseFrame
        eyebrow={`День ${state.round}`}
        title="Город говорит"
        copy="Обсудите ночь и отметьте всех номинированных игроков."
        icon={Users}
      >
        <Timer initialSeconds={180} preferences={preferences} />
        <div className="section-label">
          <span>Номинации</span>
          <small>можно выбрать несколько</small>
        </div>
        <div className="nomination-grid">
          {alive.map((player) => (
            <button
              type="button"
              key={player.id}
              className={cx(
                'nomination-card',
                state.nominations.includes(player.id) && 'nomination-card--active',
              )}
              aria-pressed={state.nominations.includes(player.id)}
              onClick={() => dispatch({ type: 'TOGGLE_NOMINATION', playerId: player.id })}
            >
              <span className="avatar-token">{player.name.slice(0, 1).toUpperCase()}</span>
              <strong>{player.name}</strong>
              <span>{state.nominations.includes(player.id) ? 'Номинирован' : 'Добавить'}</span>
            </button>
          ))}
        </div>
        <Button
          variant="primary"
          block
          disabled={state.nominations.length === 0}
          onClick={() => dispatch({ type: 'START_VOTE' })}
        >
          Перейти к голосованию
        </Button>
        <Button variant="ghost" block onClick={() => dispatch({ type: 'SKIP_VOTE' })}>
          Завершить день без исключения
        </Button>
      </PhaseFrame>
    </main>
  );
}

function Voting({
  state,
  dispatch,
}: {
  state: MafiaGameState;
  dispatch: Dispatch<Parameters<typeof mafiaReducer>[1]>;
}) {
  const aliveCount = state.players.filter((player) => player.alive).length;
  const assignedVotes = Object.values(state.votes).reduce((sum, votes) => sum + votes, 0);
  return (
    <main className="game-main phase-layout">
      <ProgressRail items={['Раздача', 'Ночь', 'День', 'Голосование']} current={3} />
      <PhaseFrame
        eyebrow={`День ${state.round} • финальный выбор`}
        title="Голосование"
        copy="Ведущий переносит итоговые голоса со стола. При равенстве можно скорректировать результат или никого не исключать."
        icon={Vote}
      >
        <div className="vote-budget">
          <span>Распределено голосов</span>
          <strong>
            {assignedVotes} / {aliveCount}
          </strong>
        </div>
        <div className="vote-list">
          {state.nominations.map((playerId) => {
            const player = state.players.find((candidate) => candidate.id === playerId)!;
            return (
              <Stepper
                key={playerId}
                label={player.name}
                value={state.votes[playerId] ?? 0}
                min={0}
                max={aliveCount - (assignedVotes - (state.votes[playerId] ?? 0))}
                onChange={(votes) => dispatch({ type: 'SET_VOTES', playerId, votes })}
              />
            );
          })}
        </div>
        {state.voteMessage && (
          <p className="form-message" role="status">
            {state.voteMessage}
          </p>
        )}
        <Button variant="primary" block onClick={() => dispatch({ type: 'RESOLVE_VOTE' })}>
          Подтвердить решение города
        </Button>
        <Button variant="ghost" block onClick={() => dispatch({ type: 'SKIP_VOTE' })}>
          Никого не исключать
        </Button>
      </PhaseFrame>
    </main>
  );
}

function EndGame({ state, onReset }: { state: MafiaGameState; onReset: () => void }) {
  const winner = state.winner ?? 'city';
  const copy = TEAM_COPY[winner];
  return (
    <main className="game-main end-layout">
      <section className={`ending-card ending-card--${winner}`}>
        <span className="eyebrow">Партия завершена • {state.round} раундов</span>
        <h1>{copy.title}</h1>
        <p>{copy.text}</p>
        <div className="final-roster">
          {state.players.map((player) => (
            <div key={player.id} className={cx(!player.alive && 'eliminated')}>
              <span>{player.name}</span>
              <strong>{MAFIA_ROLES[player.role].name}</strong>
            </div>
          ))}
        </div>
        <Button variant="primary" block onClick={onReset}>
          Новая история
        </Button>
      </section>
    </main>
  );
}

export function MafiaGame({
  onExit,
  preferences,
}: {
  onExit: () => void;
  preferences: GamePreferences;
}) {
  const [state, dispatch] = useReducer(mafiaReducer, undefined, () =>
    loadStored(MAFIA_STORAGE_KEY, mafiaGameSchema),
  );
  const [resetOpen, setResetOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);

  useEffect(() => {
    // Never restore a private role or investigation result directly onto the screen.
    if (state)
      saveStored(MAFIA_STORAGE_KEY, {
        ...state,
        cardVisible: false,
        detectiveResult: undefined,
        donResult: undefined,
      });
    else clearStored(MAFIA_STORAGE_KEY);
  }, [state]);

  useEffect(() => {
    const hide = () => {
      if (document.hidden && state?.stage === 'deal' && state.cardVisible)
        dispatch({ type: 'HIDE_CARD' });
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [state?.cardVisible, state?.stage]);

  const aliveCount = useMemo(
    () => state?.players.filter((player) => player.alive).length ?? 0,
    [state],
  );
  const reset = () => {
    dispatch({ type: 'RESET' });
    setResetOpen(false);
    feedback(preferences, 'soft');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  return (
    <div className="game-page mafia-page">
      <GameHeader
        eyebrow={state ? `Раунд ${state.round} • живы ${aliveCount}` : 'Социальная дедукция'}
        title="Ночной город"
        onBack={onExit}
        onSettings={() => setRosterOpen(true)}
      />

      {state && (
        <nav className="session-tools" aria-label="Инструменты партии">
          <Button
            variant="ghost"
            icon={<Users aria-hidden="true" />}
            onClick={() => setRosterOpen(true)}
          >
            Состав
          </Button>
          <Button
            variant="ghost"
            icon={<History aria-hidden="true" />}
            onClick={() => setHistoryOpen(true)}
          >
            Журнал
          </Button>
          {state.checkpoint && (
            <Button
              variant="ghost"
              icon={<Undo2 aria-hidden="true" />}
              onClick={() => dispatch({ type: 'UNDO' })}
            >
              Отменить
            </Button>
          )}
          <Button
            variant="danger"
            icon={<RotateCcw aria-hidden="true" />}
            onClick={() => setResetOpen(true)}
          >
            Сброс
          </Button>
        </nav>
      )}

      {!state && (
        <Setup
          onStart={(names, preset, seed) => {
            dispatch({ type: 'START', names, preset, seed });
            feedback(preferences, 'success');
          }}
        />
      )}
      {state?.stage === 'deal' && (
        <Deal state={state} dispatch={dispatch} haptics={preferences.haptics} />
      )}
      {state?.stage === 'night' && <Night state={state} dispatch={dispatch} />}
      {state?.stage === 'dawn' && <Dawn state={state} dispatch={dispatch} />}
      {state?.stage === 'day' && (
        <Day state={state} dispatch={dispatch} preferences={preferences} />
      )}
      {state?.stage === 'vote' && <Voting state={state} dispatch={dispatch} />}
      {state?.stage === 'ended' && <EndGame state={state} onReset={() => setResetOpen(true)} />}

      <Modal open={resetOpen} title="Начать новую партию?" onClose={() => setResetOpen(false)}>
        <p className="modal-copy">
          Текущая история и скрытые роли будут удалены с этого устройства.
        </p>
        <div className="sheet-actions">
          <Button variant="danger" block onClick={reset}>
            Удалить и начать заново
          </Button>
          <Button variant="ghost" block onClick={() => setResetOpen(false)}>
            Продолжить текущую
          </Button>
        </div>
      </Modal>

      <Modal
        open={rosterOpen}
        title="Состав города"
        onClose={() => {
          setRosterOpen(false);
          setShowSecrets(false);
        }}
      >
        {!state ? (
          <EmptyState title="Партия ещё не началась" text="Настройте состав и запечатайте роли." />
        ) : (
          <>
            <div className="roster-list">
              {state.players.map((player) => (
                <div
                  className={cx('roster-row', !player.alive && 'roster-row--out')}
                  key={player.id}
                >
                  <span className="avatar-token">{player.name.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <strong>{player.name}</strong>
                    <small>{player.alive ? 'В игре' : 'Выбыл'}</small>
                  </div>
                  <span className={cx('role-mask', showSecrets && `role-mask--${player.team}`)}>
                    {showSecrets ? MAFIA_ROLES[player.role].name : '••••••'}
                  </span>
                </div>
              ))}
            </div>
            {showSecrets ? (
              <Button
                variant="secondary"
                block
                icon={<EyeOff />}
                onClick={() => setShowSecrets(false)}
              >
                Скрыть роли
              </Button>
            ) : (
              <HoldToReveal
                haptics={preferences.haptics}
                label="Удерживайте, чтобы показать роли ведущему"
                onReveal={() => setShowSecrets(true)}
              />
            )}
          </>
        )}
      </Modal>

      <Modal open={historyOpen} title="Журнал партии" onClose={() => setHistoryOpen(false)}>
        {state?.history.length ? (
          <ol className="history-list">
            {[...state.history].reverse().map((entry) => (
              <li key={entry.id}>
                <span>Раунд {entry.round}</span>
                <p>{entry.text}</p>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState title="Журнал пуст" text="Здесь появятся только публичные итоги раундов." />
        )}
      </Modal>
    </div>
  );
}
