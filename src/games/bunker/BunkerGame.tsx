import {
  Activity,
  Archive,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  CircleGauge,
  Droplets,
  Eye,
  EyeOff,
  Gauge,
  History,
  PackageOpen,
  Radio,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Undo2,
  Users,
  Vote,
  Wheat,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useReducer, useState, type Dispatch } from 'react';
import {
  BUNKER_TONES,
  RESOURCE_LABELS,
  TAG_LABELS,
  type BunkerTone,
  type ResourceKey,
} from '../../data/bunker';
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
import { feedback } from '../../lib/feedback';
import { createSeed } from '../../lib/rng';
import { BUNKER_STORAGE_KEY } from '../../lib/sessionKeys';
import { clearStored, loadStored, saveStored } from '../../lib/storage';
import type { GamePreferences } from '../../types';
import {
  bunkerGameSchema,
  bunkerReducer,
  finalScore,
  getActiveTags,
  roundFields,
  type BunkerAction,
  type BunkerCharacter,
  type BunkerGameState,
  type RevealField,
  type RerollField,
} from './engine';

const FIELD_META: Record<RevealField, { label: string; icon: typeof Activity }> = {
  profession: { label: 'Профессия', icon: BriefcaseBusiness },
  health: { label: 'Здоровье', icon: Activity },
  hobby: { label: 'Увлечение', icon: BookOpen },
  phobia: { label: 'Фобия', icon: Brain },
  trait: { label: 'Черта', icon: Sparkles },
  inventory: { label: 'Предмет', icon: PackageOpen },
  secret: { label: 'Секрет', icon: Eye },
};

const RESOURCE_ICONS: Record<ResourceKey, typeof Wind> = {
  air: Wind,
  water: Droplets,
  food: Wheat,
  energy: Zap,
  morale: Brain,
};

function valueFor(character: BunkerCharacter, field: RevealField) {
  if (field === 'profession')
    return `${character.profession.title} — ${character.profession.description}`;
  if (field === 'health') return `${character.health.name} — ${character.health.description}`;
  if (field === 'hobby') return character.hobby;
  if (field === 'phobia') return character.phobia;
  if (field === 'trait') return character.trait;
  if (field === 'inventory') return character.inventory.name;
  return character.secret;
}

function Setup({
  onStart,
}: {
  onStart: (names: string[], capacity: number, tone: BunkerTone, seed: string) => void;
}) {
  const [count, setCount] = useState(8);
  const [capacity, setCapacity] = useState(4);
  const [tone, setTone] = useState<BunkerTone>('cinematic');
  const [seed, setSeed] = useState(() => createSeed('SHELTER'));
  const [names, setNames] = useState(() =>
    Array.from({ length: 8 }, (_, index) => `Игрок ${index + 1}`),
  );

  const updateCount = (next: number) => {
    setCount(next);
    setCapacity((value) => Math.min(value, Math.min(10, next - 1)));
    setNames((current) =>
      Array.from({ length: next }, (_, index) => current[index] ?? `Игрок ${index + 1}`),
    );
  };
  const duplicateNames = names
    .map((name) => name.trim().toLocaleLowerCase())
    .filter((name, index, all) => name && all.indexOf(name) !== index);
  return (
    <main className="game-main setup-layout">
      <section className="setup-hero bunker-panel">
        <span className="eyebrow">Новая экспедиция</span>
        <h1>
          Кого закроет
          <br />
          гермодверь?
        </h1>
        <p>Сценарий, убежище и персонажи будут связаны единым кодом партии.</p>
        <div className="setup-stats">
          <div>
            <strong>{count}</strong>
            <span>кандидатов</span>
          </div>
          <div>
            <strong>{capacity}</strong>
            <span>мест</span>
          </div>
          <div>
            <strong>{count - capacity}</strong>
            <span>решений</span>
          </div>
        </div>
      </section>
      <section className="setup-form bunker-panel">
        <div className="two-column-fields">
          <Stepper label="Участники" value={count} min={4} max={16} onChange={updateCount} />
          <Stepper
            label="Мест в бункере"
            value={capacity}
            min={2}
            max={Math.min(10, count - 1)}
            onChange={setCapacity}
          />
        </div>
        <Segmented
          label="Тон истории"
          value={tone}
          options={(Object.keys(BUNKER_TONES) as BunkerTone[]).map((value) => ({
            value,
            label: BUNKER_TONES[value].name,
            note: BUNKER_TONES[value].note,
          }))}
          onChange={setTone}
        />
        <p className="field-note">{BUNKER_TONES[tone].description}</p>
        <div className="field-stack">
          <div className="field-heading">
            <span className="field-label">Кандидаты</span>
            <small>18+; имена можно заменить</small>
          </div>
          <div className="name-grid">
            {names.map((name, index) => (
              <label key={index} className="text-field compact-field">
                <span>{index + 1}</span>
                <input
                  value={name}
                  maxLength={24}
                  aria-label={`Имя кандидата ${index + 1}`}
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
            <p className="form-error">Имена кандидатов должны отличаться.</p>
          )}
        </div>
        <details className="advanced-settings">
          <summary>Код сценария</summary>
          <div className="seed-row">
            <label className="text-field">
              <span className="field-label">Seed партии</span>
              <input
                value={seed}
                maxLength={48}
                onChange={(event) => setSeed(event.target.value.toUpperCase())}
              />
            </label>
            <IconButton label="Создать новый код" onClick={() => setSeed(createSeed('SHELTER'))}>
              <RefreshCw aria-hidden="true" />
            </IconButton>
          </div>
        </details>
        <Button
          variant="primary"
          block
          disabled={duplicateNames.length > 0 || !seed.trim()}
          onClick={() => onStart(names, capacity, tone, seed.trim())}
        >
          Сгенерировать убежище
        </Button>
      </section>
    </main>
  );
}

function ResourceStrip({ state }: { state: BunkerGameState }) {
  return (
    <div className="resource-strip" aria-label="Ресурсы убежища" tabIndex={0}>
      {(Object.keys(state.resources) as ResourceKey[]).map((key) => {
        const Icon = RESOURCE_ICONS[key];
        const value = state.resources[key];
        return (
          <div
            className={cx(value <= 25 && 'resource-critical')}
            key={key}
            title={`${RESOURCE_LABELS[key]}: ${value}%`}
          >
            <Icon aria-hidden="true" />
            <span>{RESOURCE_LABELS[key]}</span>
            <strong>{value}</strong>
            <i>
              <b style={{ width: `${value}%` }} />
            </i>
          </div>
        );
      })}
    </div>
  );
}

function Scenario({
  state,
  dispatch,
}: {
  state: BunkerGameState;
  dispatch: Dispatch<BunkerAction>;
}) {
  const { scenario } = state;
  return (
    <main className="game-main scenario-layout">
      <ProgressRail items={['Сценарий', 'Карточки', 'Отбор', 'Финал']} current={0} />
      <section className="disaster-hero bunker-panel">
        <span className="hazard-code">УРОВЕНЬ УГРОЗЫ / 0{scenario.disaster.severity}</span>
        <span className="eyebrow">Катастрофа</span>
        <h1>{scenario.disaster.name}</h1>
        <p className="disaster-lead">{scenario.disaster.description}</p>
        <div className="surface-report">
          <Radio aria-hidden="true" />
          <div>
            <span>Снаружи</span>
            <p>{scenario.disaster.surface}</p>
          </div>
        </div>
      </section>
      <section className="scenario-grid">
        <article className="scenario-card bunker-panel">
          <Archive aria-hidden="true" />
          <span className="eyebrow">Объект</span>
          <h2>{scenario.shelter.name}</h2>
          <div className="scenario-metrics">
            <div>
              <strong>{scenario.shelter.area} м²</strong>
              <span>площадь</span>
            </div>
            <div>
              <strong>{scenario.capacity}</strong>
              <span>мест</span>
            </div>
            <div>
              <strong>{scenario.durationYears} лет</strong>
              <span>изоляция</span>
            </div>
            <div>
              <strong>{scenario.shelter.integrity}%</strong>
              <span>целостность</span>
            </div>
          </div>
          <p className="limitation">
            <ShieldAlert aria-hidden="true" />
            {scenario.shelter.limitation}
          </p>
        </article>
        <article className="scenario-card bunker-panel">
          <Wrench aria-hidden="true" />
          <span className="eyebrow">Инфраструктура</span>
          <ul className="feature-list">
            {scenario.shelter.rooms.map((room) => (
              <li key={room}>{room}</li>
            ))}
          </ul>
          <span className="field-label">Стартовые припасы</span>
          <div className="supply-tags">
            {scenario.supplies.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
        </article>
      </section>
      <ResourceStrip state={state} />
      <div className="sticky-actions">
        <Button
          variant="ghost"
          icon={<RefreshCw />}
          onClick={() => dispatch({ type: 'REROLL_SCENARIO' })}
        >
          Другой сценарий
        </Button>
        <Button variant="primary" onClick={() => dispatch({ type: 'LOCK_SCENARIO' })}>
          Зафиксировать
        </Button>
      </div>
    </main>
  );
}

function PrivateField({
  character,
  field,
  canReroll,
  onReroll,
}: {
  character: BunkerCharacter;
  field: RevealField;
  canReroll: boolean;
  onReroll: (field: RerollField) => void;
}) {
  const meta = FIELD_META[field];
  const Icon = meta.icon;
  const rerollable = ['profession', 'health', 'inventory', 'secret'].includes(field);
  return (
    <div className="private-field">
      <Icon aria-hidden="true" />
      <div>
        <span>{meta.label}</span>
        <strong>{valueFor(character, field)}</strong>
      </div>
      {canReroll && rerollable && (
        <IconButton
          label={`Заменить: ${meta.label}`}
          onClick={() => onReroll(field as RerollField)}
        >
          <RefreshCw aria-hidden="true" />
        </IconButton>
      )}
    </div>
  );
}

function Deal({
  state,
  dispatch,
  haptics,
}: {
  state: BunkerGameState;
  dispatch: Dispatch<BunkerAction>;
  haptics: boolean;
}) {
  const character = state.characters[state.dealIndex];
  if (!character) return null;
  const fields = Object.keys(FIELD_META) as RevealField[];
  return (
    <main className="game-main reveal-layout bunker-reveal-layout">
      <ProgressRail items={['Сценарий', 'Карточки', 'Отбор', 'Финал']} current={1} />
      {!state.cardVisible ? (
        <section className="handoff-card bunker-handoff">
          <span className="deal-count">
            {state.dealIndex + 1} / {state.characters.length}
          </span>
          <div className="handoff-mark">
            <ShieldAlert aria-hidden="true" />
          </div>
          <span className="eyebrow">Личная анкета</span>
          <h1>{character.name}</h1>
          <p>Все свойства видит только владелец карточки.</p>
          <HoldToReveal haptics={haptics} onReveal={() => dispatch({ type: 'REVEAL_CARD' })} />
        </section>
      ) : (
        <section className="dossier-card bunker-panel">
          <header className="dossier-header">
            <div>
              <span className="eyebrow">Кандидат {state.dealIndex + 1}</span>
              <h1>{character.name}</h1>
              <p>
                {character.age} лет • {character.sex}
              </p>
            </div>
            <span className="dossier-stamp">B-{String(state.dealIndex + 1).padStart(2, '0')}</span>
          </header>
          <div className="private-fields">
            {fields.map((field) => (
              <PrivateField
                key={field}
                character={character}
                field={field}
                canReroll={character.rerollsRemaining > 0}
                onReroll={(nextField) =>
                  dispatch({ type: 'REROLL_FIELD', characterId: character.id, field: nextField })
                }
              />
            ))}
          </div>
          <div className="action-card-private">
            <Sparkles aria-hidden="true" />
            <div>
              <span>Одноразовая карта</span>
              <strong>{character.actionCard.name}</strong>
              <p>{character.actionCard.description}</p>
            </div>
          </div>
          {character.rerollsRemaining > 0 && (
            <p className="field-note centered">
              Можно заменить одно спорное свойство до передачи телефона.
            </p>
          )}
          <Button variant="primary" block onClick={() => dispatch({ type: 'NEXT_CARD' })}>
            Скрыть анкету и передать дальше
          </Button>
        </section>
      )}
    </main>
  );
}

function PublicCharacterCard({
  character,
  state,
  dispatch,
  onPrivate,
}: {
  character: BunkerCharacter;
  state: BunkerGameState;
  dispatch: Dispatch<BunkerAction>;
  onPrivate: (characterId: string) => void;
}) {
  const currentFields = roundFields(state.round);
  const revealed = currentFields.every((field) => character.revealed.includes(field));
  return (
    <article
      className={cx('candidate-card bunker-panel', !character.active && 'candidate-card--out')}
    >
      <header>
        <span className="avatar-token">{character.name.slice(0, 1).toUpperCase()}</span>
        <div>
          <h3>{character.name}</h3>
          <p>
            {character.age} лет • {character.sex}
          </p>
        </div>
        <span className={cx('status-dot', character.active ? 'active' : 'out')}>
          {character.active ? 'в отборе' : 'исключён'}
        </span>
      </header>
      <div className="public-facts">
        {character.revealed.length === 0 && (
          <span className="masked-fact">Данные ещё не раскрыты</span>
        )}
        {character.revealed.map((field) => (
          <div key={field}>
            <span>{FIELD_META[field].label}</span>
            <strong>{valueFor(character, field)}</strong>
          </div>
        ))}
      </div>
      {character.active && !revealed && (
        <Button
          variant="secondary"
          block
          icon={<Eye />}
          onClick={() => dispatch({ type: 'REVEAL_ROUND', characterId: character.id })}
        >
          Раскрыть текущие данные
        </Button>
      )}
      {character.active && (
        <Button variant="ghost" block icon={<EyeOff />} onClick={() => onPrivate(character.id)}>
          Личная карта
        </Button>
      )}
      {character.shielded && <span className="shield-badge">Право вето активно</span>}
    </article>
  );
}

function Round({
  state,
  dispatch,
  preferences,
  onPrivate,
}: {
  state: BunkerGameState;
  dispatch: Dispatch<BunkerAction>;
  preferences: GamePreferences;
  onPrivate: (characterId: string) => void;
}) {
  const fields = roundFields(state.round);
  const active = state.characters.filter((character) => character.active);
  const allRevealed = active.every((character) =>
    fields.every((field) => character.revealed.includes(field)),
  );
  return (
    <main className="game-main round-layout">
      <ProgressRail items={['Сценарий', 'Карточки', 'Отбор', 'Финал']} current={2} />
      <section className="round-header bunker-panel">
        <div>
          <span className="eyebrow">
            Раунд {state.round} • осталось {active.length}, мест {state.scenario.capacity}
          </span>
          <h1>{state.round <= 3 ? 'Раскрытие данных' : 'Последний аргумент'}</h1>
          <p>
            Каждый кандидат раскрывает:{' '}
            {fields.map((field) => FIELD_META[field].label.toLocaleLowerCase()).join(' и ')}.
          </p>
        </div>
        <Timer initialSeconds={Math.max(120, active.length * 30)} preferences={preferences} />
      </section>
      <ResourceStrip state={state} />
      <section className="candidate-grid">
        {state.characters.map((character) => (
          <PublicCharacterCard
            key={character.id}
            character={character}
            state={state}
            dispatch={dispatch}
            onPrivate={onPrivate}
          />
        ))}
      </section>
      <div className="sticky-actions">
        <Button
          variant="primary"
          block
          disabled={!allRevealed && state.round <= 3}
          icon={<Vote />}
          onClick={() => dispatch({ type: 'START_VOTE' })}
        >
          Перейти к голосованию
        </Button>
      </div>
    </main>
  );
}

function Voting({ state, dispatch }: { state: BunkerGameState; dispatch: Dispatch<BunkerAction> }) {
  const active = state.characters.filter((character) => character.active);
  const assignedVotes = Object.values(state.votes).reduce((sum, votes) => sum + votes, 0);
  return (
    <main className="game-main phase-layout">
      <ProgressRail items={['Сценарий', 'Карточки', 'Отбор', 'Финал']} current={2} />
      <section className="phase-card bunker-panel">
        <header className="phase-card__header">
          <div className="phase-symbol">
            <Vote aria-hidden="true" />
          </div>
          <div>
            <span className="eyebrow">Раунд {state.round}</span>
            <h1>Решение группы</h1>
            <p>
              Перенесите итоговые голоса. Защищённый картой кандидат потратит её вместо исключения.
            </p>
          </div>
        </header>
        <div className="vote-budget">
          <span>Распределено голосов</span>
          <strong>
            {assignedVotes} / {active.length}
          </strong>
        </div>
        <div className="vote-list">
          {active.map((character) => (
            <Stepper
              key={character.id}
              label={character.name}
              value={state.votes[character.id] ?? 0}
              min={0}
              max={active.length - (assignedVotes - (state.votes[character.id] ?? 0))}
              onChange={(votes) =>
                dispatch({ type: 'SET_VOTES', characterId: character.id, votes })
              }
            />
          ))}
        </div>
        {state.voteMessage && (
          <p className="form-message" role="status">
            {state.voteMessage}
          </p>
        )}
        <Button variant="primary" block onClick={() => dispatch({ type: 'RESOLVE_VOTE' })}>
          Зафиксировать исключение
        </Button>
      </section>
    </main>
  );
}

function Crisis({ state, dispatch }: { state: BunkerGameState; dispatch: Dispatch<BunkerAction> }) {
  const crisis = state.currentCrisis;
  if (!crisis) return null;
  const activeTags = getActiveTags(state);
  return (
    <main className="game-main crisis-layout">
      <ProgressRail items={['Сценарий', 'Карточки', 'Отбор', 'Финал']} current={2} />
      <section className="crisis-card bunker-panel">
        <span className="alarm-light" aria-hidden="true" />
        <span className="eyebrow">Аварийное событие • после раунда {state.round}</span>
        <h1>{crisis.title}</h1>
        <p>{crisis.description}</p>
        {!state.crisisResolution ? (
          <div className="crisis-options">
            {crisis.options.map((option, index) => {
              const missing = option.required.filter((tag) => !activeTags.has(tag));
              return (
                <button
                  type="button"
                  key={option.title}
                  onClick={() => dispatch({ type: 'RESOLVE_CRISIS', optionIndex: index })}
                >
                  <span>Вариант {index + 1}</span>
                  <strong>{option.title}</strong>
                  <p>{option.text}</p>
                  <div className="capability-tags">
                    {option.required.map((tag) => (
                      <i key={tag} className={cx(!missing.includes(tag) && 'available')}>
                        {TAG_LABELS[tag]}
                      </i>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div
            className={cx('crisis-result', state.crisisResolution.success ? 'success' : 'failure')}
          >
            <CircleGauge aria-hidden="true" />
            <span>
              {state.crisisResolution.success
                ? 'Система стабилизирована'
                : 'Цена решения оказалась высокой'}
            </span>
            <h2>{state.crisisResolution.optionTitle}</h2>
            <p>{state.crisisResolution.text}</p>
            {state.crisisResolution.missingTags.length > 0 && (
              <p>
                Не хватило:{' '}
                {state.crisisResolution.missingTags.map((tag) => TAG_LABELS[tag]).join(', ')}.
              </p>
            )}
          </div>
        )}
      </section>
      <ResourceStrip state={state} />
      {state.crisisResolution && (
        <div className="sticky-actions">
          <Button
            variant="primary"
            block
            onClick={() => dispatch({ type: 'CONTINUE_AFTER_CRISIS' })}
          >
            Продолжить отбор
          </Button>
        </div>
      )}
    </main>
  );
}

function Final({ state, onReset }: { state: BunkerGameState; onReset: () => void }) {
  const survivors = state.characters.filter((character) => character.active);
  const score = finalScore(state);
  const verdict =
    score >= 75
      ? 'Убежище выдержит изоляцию'
      : score >= 50
        ? 'Выживание потребует дисциплины'
        : 'Системы на критическом пределе';
  return (
    <main className="game-main end-layout">
      <section className="ending-card bunker-ending">
        <span className="eyebrow">Гермодверь закрыта • прогноз {score}%</span>
        <h1>{verdict}</h1>
        <p>
          Внутри остаются {survivors.length} человек. Запасы рассчитаны на{' '}
          {state.scenario.durationYears} лет, но исход определят дисциплина и взаимное доверие.
        </p>
        <div className="survival-gauge">
          <Gauge aria-hidden="true" />
          <strong>{score}</strong>
          <span>индекс устойчивости</span>
        </div>
        <ResourceStrip state={state} />
        <div className="final-roster">
          {survivors.map((character) => (
            <div key={character.id}>
              <span>{character.name}</span>
              <strong>{character.profession.title}</strong>
            </div>
          ))}
        </div>
        <div className="epilogue">
          <Radio aria-hidden="true" />
          <p>
            {score >= 75
              ? 'На двести тринадцатый день приёмник ловит ответный сигнал. Команда готовит первую безопасную вылазку.'
              : score >= 50
                ? 'Первый год проходит без необратимых потерь. Каждый новый кризис всё ещё способен изменить баланс.'
                : 'Через несколько недель вводится жёсткое нормирование. История этой группы только начинается.'}
          </p>
        </div>
        <Button variant="primary" block onClick={onReset}>
          Создать другой мир
        </Button>
      </section>
    </main>
  );
}

export function BunkerGame({
  onExit,
  preferences,
}: {
  onExit: () => void;
  preferences: GamePreferences;
}) {
  const [state, dispatch] = useReducer(bunkerReducer, undefined, () =>
    loadStored(BUNKER_STORAGE_KEY, bunkerGameSchema),
  );
  const [resetOpen, setResetOpen] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showPrivate, setShowPrivate] = useState(false);
  const [privateCharacterId, setPrivateCharacterId] = useState<string | null>(null);
  const [privateVisible, setPrivateVisible] = useState(false);

  useEffect(() => {
    // A refresh or route change must always return to the covered side of a dossier.
    if (state) saveStored(BUNKER_STORAGE_KEY, { ...state, cardVisible: false });
    else clearStored(BUNKER_STORAGE_KEY);
  }, [state]);
  useEffect(() => {
    const hide = () => {
      if (!document.hidden) return;
      if (state?.stage === 'deal' && state.cardVisible) dispatch({ type: 'HIDE_CARD' });
      setPrivateVisible(false);
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, [state?.cardVisible, state?.stage]);

  const activeCount = useMemo(
    () => state?.characters.filter((character) => character.active).length ?? 0,
    [state],
  );
  const privateCharacter = state?.characters.find(
    (character) => character.id === privateCharacterId,
  );
  const closePrivateCard = () => {
    setPrivateVisible(false);
    setPrivateCharacterId(null);
  };
  const reset = () => {
    dispatch({ type: 'RESET' });
    setResetOpen(false);
    feedback(preferences, 'soft');
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  return (
    <div className="game-page bunker-page">
      <GameHeader
        eyebrow={state ? `Раунд ${state.round} • кандидаты ${activeCount}` : 'Дебаты о выживании'}
        title="Последний бункер"
        onBack={onExit}
        onSettings={() => setRosterOpen(true)}
      />
      {state && (
        <nav className="session-tools" aria-label="Инструменты партии">
          <Button variant="ghost" icon={<Users />} onClick={() => setRosterOpen(true)}>
            Кандидаты
          </Button>
          <Button variant="ghost" icon={<History />} onClick={() => setHistoryOpen(true)}>
            Журнал
          </Button>
          {state.checkpoint && (
            <Button variant="ghost" icon={<Undo2 />} onClick={() => dispatch({ type: 'UNDO' })}>
              Отменить
            </Button>
          )}
          <Button variant="danger" icon={<RotateCcw />} onClick={() => setResetOpen(true)}>
            Сброс
          </Button>
        </nav>
      )}
      {!state && (
        <Setup
          onStart={(names, capacity, tone, seed) => {
            dispatch({ type: 'START', names, capacity, tone, seed });
            feedback(preferences, 'success');
          }}
        />
      )}
      {state?.stage === 'scenario' && <Scenario state={state} dispatch={dispatch} />}
      {state?.stage === 'deal' && (
        <Deal state={state} dispatch={dispatch} haptics={preferences.haptics} />
      )}
      {state?.stage === 'round' && (
        <Round
          state={state}
          dispatch={dispatch}
          preferences={preferences}
          onPrivate={setPrivateCharacterId}
        />
      )}
      {state?.stage === 'vote' && <Voting state={state} dispatch={dispatch} />}
      {state?.stage === 'crisis' && <Crisis state={state} dispatch={dispatch} />}
      {state?.stage === 'final' && <Final state={state} onReset={() => setResetOpen(true)} />}

      <Modal open={resetOpen} title="Создать новый сценарий?" onClose={() => setResetOpen(false)}>
        <p className="modal-copy">Текущий состав, ресурсы и журнал кризисов будут удалены.</p>
        <div className="sheet-actions">
          <Button variant="danger" block onClick={reset}>
            Удалить и начать заново
          </Button>
          <Button variant="ghost" block onClick={() => setResetOpen(false)}>
            Вернуться в убежище
          </Button>
        </div>
      </Modal>
      <Modal
        open={rosterOpen}
        title="Кандидаты убежища"
        onClose={() => {
          setRosterOpen(false);
          setShowPrivate(false);
        }}
      >
        {!state ? (
          <EmptyState title="Список ещё пуст" text="Создайте сценарий и анкеты кандидатов." />
        ) : (
          <>
            <div className="roster-list">
              {state.characters.map((character) => (
                <div
                  className={cx('roster-row', !character.active && 'roster-row--out')}
                  key={character.id}
                >
                  <span className="avatar-token">{character.name.slice(0, 1).toUpperCase()}</span>
                  <div>
                    <strong>{character.name}</strong>
                    <small>{character.active ? 'В отборе' : 'Исключён'}</small>
                  </div>
                  <span className="role-mask">
                    {showPrivate
                      ? character.profession.title
                      : character.revealed.includes('profession')
                        ? character.profession.title
                        : '••••••'}
                  </span>
                </div>
              ))}
            </div>
            {showPrivate ? (
              <Button
                variant="secondary"
                block
                icon={<EyeOff />}
                onClick={() => setShowPrivate(false)}
              >
                Скрыть профессии
              </Button>
            ) : (
              <HoldToReveal
                haptics={preferences.haptics}
                label="Удерживайте, чтобы показать профессии ведущему"
                onReveal={() => setShowPrivate(true)}
              />
            )}
          </>
        )}
      </Modal>
      <Modal open={historyOpen} title="Журнал убежища" onClose={() => setHistoryOpen(false)}>
        {state?.history.length ? (
          <ol className="history-list">
            {[...state.history].reverse().map((entry) => (
              <li key={entry.id}>
                <span>{entry.round ? `Раунд ${entry.round}` : 'Подготовка'}</span>
                <p>{entry.text}</p>
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState
            title="Записей пока нет"
            text="Решения и кризисы появятся здесь по ходу партии."
          />
        )}
      </Modal>
      <Modal
        open={Boolean(privateCharacter)}
        title="Личная карта кандидата"
        onClose={closePrivateCard}
      >
        {privateCharacter &&
          (!privateVisible ? (
            <div className="private-review-cover">
              <EyeOff aria-hidden="true" />
              <span className="eyebrow">Передайте телефон</span>
              <h3>{privateCharacter.name}</h3>
              <p>На экране будут все скрытые свойства и одноразовая карта.</p>
              <HoldToReveal
                haptics={preferences.haptics}
                label="Удерживайте, чтобы проверить досье"
                onReveal={() => setPrivateVisible(true)}
              />
            </div>
          ) : (
            <div className="private-review">
              <div className="private-fields">
                {(Object.keys(FIELD_META) as RevealField[]).map((field) => (
                  <PrivateField
                    key={field}
                    character={privateCharacter}
                    field={field}
                    canReroll={false}
                    onReroll={() => undefined}
                  />
                ))}
              </div>
              <div className="action-card-private">
                <Sparkles aria-hidden="true" />
                <div>
                  <span>
                    {privateCharacter.actionUsed ? 'Карта уже использована' : 'Одноразовая карта'}
                  </span>
                  <strong>{privateCharacter.actionCard.name}</strong>
                  <p>{privateCharacter.actionCard.description}</p>
                </div>
              </div>
              {!privateCharacter.actionUsed && (
                <Button
                  variant="primary"
                  block
                  onClick={() => {
                    dispatch({ type: 'USE_ACTION', characterId: privateCharacter.id });
                    feedback(preferences, 'success');
                    closePrivateCard();
                  }}
                >
                  Использовать карту и раскрыть эффект
                </Button>
              )}
              <Button variant="ghost" block onClick={closePrivateCard}>
                Скрыть досье
              </Button>
            </div>
          ))}
      </Modal>
    </div>
  );
}
