import { z } from 'zod';
import {
  ACTION_CARDS,
  CRISES,
  DISASTERS,
  HEALTH,
  HOBBIES,
  ITEMS,
  PHOBIAS,
  PROFESSIONS,
  SECRETS,
  TRAITS,
  type ActionCardDefinition,
  type BunkerTone,
  type CrisisDefinition,
  type DisasterDefinition,
  type HealthDefinition,
  type ProfessionDefinition,
  type ResourceKey,
  type SurvivalTag,
} from '../../data/bunker';
import { createRng } from '../../lib/rng';

export type BunkerStage = 'scenario' | 'deal' | 'round' | 'vote' | 'crisis' | 'final';
export type RevealField =
  'profession' | 'health' | 'hobby' | 'phobia' | 'trait' | 'inventory' | 'secret';
export type RerollField = 'profession' | 'health' | 'inventory' | 'secret';
export type CharacterSex = 'мужчина' | 'женщина' | 'небинарный человек';

export interface BunkerCharacter {
  id: string;
  name: string;
  age: number;
  sex: CharacterSex;
  profession: ProfessionDefinition;
  health: HealthDefinition;
  hobby: string;
  phobia: string;
  trait: string;
  inventory: { name: string; tags: SurvivalTag[] };
  secret: string;
  actionCard: ActionCardDefinition;
  active: boolean;
  revealed: RevealField[];
  actionUsed: boolean;
  shielded: boolean;
  rerollsRemaining: number;
}

export interface BunkerScenario {
  disaster: DisasterDefinition;
  capacity: number;
  durationYears: number;
  shelter: {
    name: string;
    area: number;
    integrity: number;
    rooms: string[];
    limitation: string;
  };
  supplies: string[];
}

export interface ResourceState {
  air: number;
  water: number;
  food: number;
  energy: number;
  morale: number;
}

export interface BunkerLogEntry {
  id: string;
  round: number;
  text: string;
}

export interface CrisisResolution {
  optionTitle: string;
  success: boolean;
  missingTags: SurvivalTag[];
  text: string;
}

export interface BunkerCheckpoint {
  characters: BunkerCharacter[];
  stage: BunkerStage;
  round: number;
  resources: ResourceState;
  votes: Record<string, number>;
  voteMessage?: string;
  currentCrisis?: CrisisDefinition;
  crisisResolution?: CrisisResolution;
  crisesResolved: number;
  history: BunkerLogEntry[];
}

export interface BunkerGameState {
  version: 2;
  seed: string;
  tone: BunkerTone;
  stage: BunkerStage;
  round: number;
  scenarioNonce: number;
  scenario: BunkerScenario;
  resources: ResourceState;
  characters: BunkerCharacter[];
  dealIndex: number;
  cardVisible: boolean;
  votes: Record<string, number>;
  voteMessage?: string;
  currentCrisis?: CrisisDefinition;
  crisisResolution?: CrisisResolution;
  crisesResolved: number;
  history: BunkerLogEntry[];
  checkpoint?: BunkerCheckpoint;
}

const tags = z.enum([
  'medicine',
  'engineering',
  'food',
  'security',
  'science',
  'social',
  'navigation',
  'energy',
]);
const resourceKey = z.enum(['air', 'water', 'food', 'energy', 'morale']);
const professionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  tags: z.array(tags),
  minAge: z.number(),
});
const healthSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  severity: z.union([z.literal(0), z.literal(1), z.literal(2)]),
  minAge: z.number().optional(),
  maxAge: z.number().optional(),
  allowedSex: z.array(z.enum(['мужчина', 'женщина', 'небинарный человек'])).optional(),
});
const actionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  type: z.enum(['shield', 'intel', 'supply']),
  resource: resourceKey.optional(),
  amount: z.number().optional(),
});
const characterSchema: z.ZodType<BunkerCharacter> = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number().int().min(18).max(80),
  sex: z.enum(['мужчина', 'женщина', 'небинарный человек']),
  profession: professionSchema,
  health: healthSchema,
  hobby: z.string(),
  phobia: z.string(),
  trait: z.string(),
  inventory: z.object({ name: z.string(), tags: z.array(tags) }),
  secret: z.string(),
  actionCard: actionSchema,
  active: z.boolean(),
  revealed: z.array(
    z.enum(['profession', 'health', 'hobby', 'phobia', 'trait', 'inventory', 'secret']),
  ),
  actionUsed: z.boolean(),
  shielded: z.boolean(),
  rerollsRemaining: z.number().int().nonnegative(),
});
const disasterSchema = z.object({
  id: z.string(),
  tone: z.array(z.enum(['realistic', 'cinematic', 'absurd'])),
  name: z.string(),
  description: z.string(),
  surface: z.string(),
  severity: z.number(),
  duration: z.tuple([z.number(), z.number()]),
  hazards: z.array(tags),
});
const resourcesSchema: z.ZodType<ResourceState> = z.object({
  air: z.number(),
  water: z.number(),
  food: z.number(),
  energy: z.number(),
  morale: z.number(),
});
const scenarioSchema: z.ZodType<BunkerScenario> = z.object({
  disaster: disasterSchema,
  capacity: z.number().int().min(2).max(10),
  durationYears: z.number().int().positive(),
  shelter: z.object({
    name: z.string(),
    area: z.number(),
    integrity: z.number(),
    rooms: z.array(z.string()),
    limitation: z.string(),
  }),
  supplies: z.array(z.string()),
});
const logSchema = z.object({ id: z.string(), round: z.number(), text: z.string() });
const optionSchema = z.object({
  title: z.string(),
  text: z.string(),
  required: z.array(tags),
  cost: z.partialRecord(resourceKey, z.number()),
  reward: z.partialRecord(resourceKey, z.number()),
});
const crisisSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  options: z.array(optionSchema),
});
const checkpointSchema: z.ZodType<BunkerCheckpoint> = z.object({
  characters: z.array(characterSchema),
  stage: z.enum(['scenario', 'deal', 'round', 'vote', 'crisis', 'final']),
  round: z.number(),
  resources: resourcesSchema,
  votes: z.record(z.string(), z.number()),
  voteMessage: z.string().optional(),
  currentCrisis: crisisSchema.optional(),
  crisisResolution: z
    .object({
      optionTitle: z.string(),
      success: z.boolean(),
      missingTags: z.array(tags),
      text: z.string(),
    })
    .optional(),
  crisesResolved: z.number().int().nonnegative(),
  history: z.array(logSchema),
});

export const bunkerGameSchema: z.ZodType<BunkerGameState> = z.object({
  version: z.literal(2),
  seed: z.string(),
  tone: z.enum(['realistic', 'cinematic', 'absurd']),
  stage: z.enum(['scenario', 'deal', 'round', 'vote', 'crisis', 'final']),
  round: z.number().int().positive(),
  scenarioNonce: z.number().int().nonnegative(),
  scenario: scenarioSchema,
  resources: resourcesSchema,
  characters: z.array(characterSchema).min(4).max(16),
  dealIndex: z.number().int().nonnegative(),
  cardVisible: z.boolean(),
  votes: z.record(z.string(), z.number()),
  voteMessage: z.string().optional(),
  currentCrisis: crisisSchema.optional(),
  crisisResolution: z
    .object({
      optionTitle: z.string(),
      success: z.boolean(),
      missingTags: z.array(tags),
      text: z.string(),
    })
    .optional(),
  crisesResolved: z.number().int().nonnegative(),
  history: z.array(logSchema),
  checkpoint: checkpointSchema.optional(),
});

const GENERIC_SECRETS = [
  'спрятал часть общего снаряжения до начала отбора',
  'знает о техническом проходе за северной стеной',
  'имеет профессиональный навык, о котором не указал в анкете',
  'не умеет плавать и скрывает это',
  'оставил снаружи человека, которому обещал вернуться',
  'запомнил карту соседнего подземного объекта',
  'слышал ночью механический шум из закрытого сектора',
  'нашёл чужую персональную карту доступа',
];

const SHELTERS = [
  'Командный узел гражданской обороны',
  'Подземный исследовательский блок',
  'Конверсионное военное убежище',
  'Автономный транспортный модуль',
  'Глубинная сервисная станция',
];
const ROOMS = [
  'медицинский отсек',
  'гидропонная',
  'мастерская',
  'узел связи',
  'склад сухих продуктов',
  'лаборатория воды',
  'дизельная',
  'карантинная',
  'комната отдыха',
  'наблюдательный пост',
];
const LIMITATIONS = [
  'Один внешний шлюз заблокирован обломками.',
  'Фильтры рассчитаны только на текущую вместимость.',
  'Резервный генератор нельзя запускать дольше шести часов подряд.',
  'Часть склада находится за неисправной гермодверью.',
  'Связь работает только короткими сеансами.',
];

function log(round: number, text: string): BunkerLogEntry {
  return { id: `${Date.now()}-${round}-${text}`, round, text };
}

function matchesHealth(health: HealthDefinition, age: number, sex: CharacterSex) {
  return (
    (!health.minAge || age >= health.minAge) &&
    (!health.maxAge || age <= health.maxAge) &&
    (!health.allowedSex || health.allowedSex.includes(sex))
  );
}

export function generateScenario(
  seed: string,
  tone: BunkerTone,
  capacity: number,
  nonce = 0,
): BunkerScenario {
  const rng = createRng(`${seed}:scenario:${nonce}`);
  const disaster = rng.pick(DISASTERS.filter((item) => item.tone.includes(tone)));
  const durationYears = rng.int(disaster.duration[0], disaster.duration[1]);
  const relevantItems = ITEMS.filter((item) =>
    item.tags.some((tag) => disaster.hazards.includes(tag)),
  );
  const supplies = rng
    .sample(relevantItems.length >= 4 ? relevantItems : ITEMS, 4)
    .map((item) => item.name);
  const area = capacity * rng.int(11, 16) + rng.int(8, 24);
  return {
    disaster,
    capacity,
    durationYears,
    shelter: {
      name: rng.pick(SHELTERS),
      area,
      integrity: Math.max(45, rng.int(72, 96) - disaster.severity * 4),
      rooms: rng.sample(ROOMS, 4),
      limitation: rng.pick(LIMITATIONS),
    },
    supplies,
  };
}

function generateCharacters(names: string[], tone: BunkerTone, seed: string): BunkerCharacter[] {
  const rng = createRng(`${seed}:characters`);
  const professions = rng.shuffle(PROFESSIONS);
  const healthPool = rng.shuffle(HEALTH);
  const hobbies = rng.shuffle(HOBBIES);
  const phobias = rng.shuffle(PHOBIAS);
  const traits = rng.shuffle(TRAITS);
  const items = rng.shuffle(ITEMS);
  const secrets = rng.shuffle([...SECRETS[tone], ...GENERIC_SECRETS]);
  const sexes: CharacterSex[] = ['мужчина', 'женщина', 'небинарный человек'];
  const usedHealth = new Set<string>();
  return names.map((rawName, index) => {
    const profession = professions[index % professions.length];
    const sex = rng.pick(sexes);
    const age = rng.int(Math.max(18, profession.minAge), 74);
    const compatibleHealth = healthPool.filter((item) => matchesHealth(item, age, sex));
    const health =
      compatibleHealth.find((item) => !usedHealth.has(item.id)) ?? rng.pick(compatibleHealth);
    usedHealth.add(health.id);
    return {
      id: `b-${index + 1}`,
      name: rawName.trim() || `Игрок ${index + 1}`,
      age,
      sex,
      profession,
      health,
      hobby: hobbies[index % hobbies.length],
      phobia: phobias[index % phobias.length],
      trait: traits[index % traits.length],
      inventory: items[index % items.length],
      secret: secrets[index % secrets.length],
      actionCard: rng.pick(ACTION_CARDS),
      active: true,
      revealed: [],
      actionUsed: false,
      shielded: false,
      rerollsRemaining: 1,
    };
  });
}

export function createBunkerGame(
  names: string[],
  capacity: number,
  tone: BunkerTone,
  seed: string,
): BunkerGameState {
  const boundedNames = names.slice(0, 16);
  while (boundedNames.length < 4) boundedNames.push(`Игрок ${boundedNames.length + 1}`);
  const safeCapacity = Math.min(Math.max(2, capacity), Math.min(10, boundedNames.length - 1));
  const scenario = generateScenario(seed, tone, safeCapacity);
  const base = Math.max(48, 88 - scenario.disaster.severity * 6);
  const rng = createRng(`${seed}:resources`);
  const resources: ResourceState = {
    air: Math.min(100, base + rng.int(2, 12)),
    water: Math.min(100, base + rng.int(-2, 10)),
    food: Math.min(100, base + rng.int(-5, 8)),
    energy: Math.min(100, base + rng.int(-8, 8)),
    morale: Math.min(100, base + rng.int(0, 12)),
  };
  return {
    version: 2,
    seed,
    tone,
    stage: 'scenario',
    round: 1,
    scenarioNonce: 0,
    scenario,
    resources,
    characters: generateCharacters(boundedNames, tone, seed),
    dealIndex: 0,
    cardVisible: false,
    votes: {},
    crisesResolved: 0,
    history: [log(0, `Сценарий создан. Код: ${seed}.`)],
  };
}

export function roundFields(round: number): RevealField[] {
  if (round === 1) return ['profession', 'health'];
  if (round === 2) return ['hobby', 'inventory'];
  if (round === 3) return ['trait', 'phobia'];
  return ['secret'];
}

export function getActiveTags(state: BunkerGameState) {
  return new Set(
    state.characters
      .filter((character) => character.active)
      .flatMap((character) => [...character.profession.tags, ...character.inventory.tags]),
  );
}

function makeCheckpoint(state: BunkerGameState): BunkerCheckpoint {
  return {
    characters: state.characters.map((character) => ({
      ...character,
      revealed: [...character.revealed],
    })),
    stage: state.stage,
    round: state.round,
    resources: { ...state.resources },
    votes: { ...state.votes },
    voteMessage: state.voteMessage,
    currentCrisis: state.currentCrisis,
    crisisResolution: state.crisisResolution,
    crisesResolved: state.crisesResolved,
    history: state.history.map((entry) => ({ ...entry })),
  };
}

function clampResource(value: number) {
  return Math.max(0, Math.min(100, value));
}

function rerollCharacterField(state: BunkerGameState, characterId: string, field: RerollField) {
  const source = state.characters.find((item) => item.id === characterId);
  if (!source || source.rerollsRemaining <= 0) return state;
  const rng = createRng(`${state.seed}:reroll:${characterId}:${field}:${source.rerollsRemaining}`);
  const characters = state.characters.map((character) => {
    if (character.id !== characterId) return character;
    if (field === 'profession') {
      const pool = PROFESSIONS.filter(
        (item) => item.minAge <= character.age && item.id !== character.profession.id,
      );
      return {
        ...character,
        profession: rng.pick(pool),
        rerollsRemaining: character.rerollsRemaining - 1,
      };
    }
    if (field === 'health') {
      const pool = HEALTH.filter(
        (item) =>
          matchesHealth(item, character.age, character.sex) && item.id !== character.health.id,
      );
      return {
        ...character,
        health: rng.pick(pool),
        rerollsRemaining: character.rerollsRemaining - 1,
      };
    }
    if (field === 'inventory') {
      return {
        ...character,
        inventory: rng.pick(ITEMS.filter((item) => item.name !== character.inventory.name)),
        rerollsRemaining: character.rerollsRemaining - 1,
      };
    }
    const pool = [...SECRETS[state.tone], ...GENERIC_SECRETS].filter(
      (item) => item !== character.secret,
    );
    return {
      ...character,
      secret: rng.pick(pool),
      rerollsRemaining: character.rerollsRemaining - 1,
    };
  });
  return { ...state, characters };
}

function activateActionCard(state: BunkerGameState, characterId: string) {
  const character = state.characters.find(
    (item) => item.id === characterId && item.active && !item.actionUsed,
  );
  if (!character) return state;
  const next = state.characters.map((item) => {
    if (item.id !== characterId) return item;
    if (item.actionCard.type === 'shield') return { ...item, shielded: true, actionUsed: true };
    if (item.actionCard.type === 'intel')
      return {
        ...item,
        revealed: Array.from(new Set([...item.revealed, 'secret' as const])),
        actionUsed: true,
      };
    return { ...item, actionUsed: true };
  });
  const resources = { ...state.resources };
  if (character.actionCard.type === 'supply' && character.actionCard.resource) {
    resources[character.actionCard.resource] = clampResource(
      resources[character.actionCard.resource] + (character.actionCard.amount ?? 10),
    );
  }
  return {
    ...state,
    characters: next,
    resources,
    history: [
      ...state.history,
      log(state.round, `${character.name} использует карту «${character.actionCard.name}».`),
    ],
  };
}

function voteLeader(state: BunkerGameState) {
  const candidates = state.characters.filter((character) => character.active);
  const max = Math.max(0, ...candidates.map((character) => state.votes[character.id] ?? 0));
  const tied = candidates.filter((character) => (state.votes[character.id] ?? 0) === max);
  return { leader: max > 0 && tied.length === 1 ? tied[0] : undefined, tied };
}

function nextCrisis(state: BunkerGameState) {
  const rng = createRng(`${state.seed}:crisis:${state.round}`);
  const used = new Set(
    state.history
      .filter((entry) => entry.text.startsWith('Кризис:'))
      .map((entry) => entry.text.split('«')[1]?.split('»')[0]),
  );
  const pool = CRISES.filter((crisis) => !used.has(crisis.title));
  return rng.pick(pool.length ? pool : CRISES);
}

export function resolveCrisis(state: BunkerGameState, optionIndex: number): BunkerGameState {
  const crisis = state.currentCrisis;
  const option = crisis?.options[optionIndex];
  if (!crisis || !option || state.crisisResolution) return state;
  const activeTags = getActiveTags(state);
  const missingTags = option.required.filter((tag) => !activeTags.has(tag));
  const success = missingTags.length === 0;
  const resources = { ...state.resources };
  (Object.entries(option.cost) as Array<[ResourceKey, number]>).forEach(([key, amount]) => {
    resources[key] = clampResource(resources[key] - amount - (success ? 0 : Math.ceil(amount / 2)));
  });
  if (success) {
    (Object.entries(option.reward) as Array<[ResourceKey, number]>).forEach(([key, amount]) => {
      resources[key] = clampResource(resources[key] + amount);
    });
  } else {
    resources.morale = clampResource(resources.morale - 6);
  }
  const resolution: CrisisResolution = {
    optionTitle: option.title,
    success,
    missingTags,
    text: success
      ? 'Команда справилась: нужные компетенции нашлись внутри группы.'
      : 'Решение удалось лишь частично, и убежище потеряло дополнительные ресурсы.',
  };
  return {
    ...state,
    checkpoint: makeCheckpoint(state),
    resources,
    crisisResolution: resolution,
    crisesResolved: state.crisesResolved + 1,
    history: [
      ...state.history,
      log(
        state.round,
        `Кризис: «${crisis.title}». Решение «${option.title}» — ${success ? 'успех' : 'частичный провал'}.`,
      ),
    ],
  };
}

export function finalScore(state: BunkerGameState) {
  const values = Object.values(state.resources);
  const resourceScore = values.reduce((sum, value) => sum + value, 0) / values.length;
  const tags = getActiveTags(state).size;
  const severeHealth = state.characters.filter(
    (character) => character.active && character.health.severity === 2,
  ).length;
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(resourceScore * 0.65 + tags * 5 + state.crisesResolved * 3 - severeHealth * 3),
    ),
  );
}

export type BunkerAction =
  | { type: 'START'; names: string[]; capacity: number; tone: BunkerTone; seed: string }
  | { type: 'REROLL_SCENARIO' }
  | { type: 'LOCK_SCENARIO' }
  | { type: 'REVEAL_CARD' }
  | { type: 'HIDE_CARD' }
  | { type: 'NEXT_CARD' }
  | { type: 'REROLL_FIELD'; characterId: string; field: RerollField }
  | { type: 'REVEAL_ROUND'; characterId: string }
  | { type: 'USE_ACTION'; characterId: string }
  | { type: 'START_VOTE' }
  | { type: 'SET_VOTES'; characterId: string; votes: number }
  | { type: 'RESOLVE_VOTE' }
  | { type: 'RESOLVE_CRISIS'; optionIndex: number }
  | { type: 'CONTINUE_AFTER_CRISIS' }
  | { type: 'UNDO' }
  | { type: 'RESET' };

export function bunkerReducer(
  state: BunkerGameState | null,
  action: BunkerAction,
): BunkerGameState | null {
  if (action.type === 'START')
    return createBunkerGame(action.names, action.capacity, action.tone, action.seed);
  if (action.type === 'RESET') return null;
  if (!state) return state;
  if (action.type === 'REROLL_SCENARIO' && state.stage === 'scenario') {
    const nonce = state.scenarioNonce + 1;
    return {
      ...state,
      scenarioNonce: nonce,
      scenario: generateScenario(state.seed, state.tone, state.scenario.capacity, nonce),
    };
  }
  if (action.type === 'LOCK_SCENARIO')
    return state.stage === 'scenario'
      ? { ...state, stage: 'deal', dealIndex: 0, cardVisible: false }
      : state;
  if (action.type === 'REVEAL_CARD')
    return state.stage === 'deal' ? { ...state, cardVisible: true } : state;
  if (action.type === 'HIDE_CARD')
    return state.stage === 'deal' ? { ...state, cardVisible: false } : state;
  if (action.type === 'NEXT_CARD') {
    if (state.stage !== 'deal' || !state.cardVisible) return state;
    const nextIndex = state.dealIndex + 1;
    return nextIndex >= state.characters.length
      ? { ...state, stage: 'round', dealIndex: nextIndex, cardVisible: false }
      : { ...state, dealIndex: nextIndex, cardVisible: false };
  }
  if (action.type === 'REROLL_FIELD') {
    if (
      state.stage !== 'deal' ||
      !state.cardVisible ||
      state.characters[state.dealIndex]?.id !== action.characterId
    )
      return state;
    return rerollCharacterField(state, action.characterId, action.field);
  }
  if (action.type === 'REVEAL_ROUND') {
    if (
      state.stage !== 'round' ||
      !state.characters.some((character) => character.id === action.characterId && character.active)
    )
      return state;
    return {
      ...state,
      characters: state.characters.map((character) =>
        character.id === action.characterId
          ? {
              ...character,
              revealed: Array.from(new Set([...character.revealed, ...roundFields(state.round)])),
            }
          : character,
      ),
    };
  }
  if (action.type === 'USE_ACTION')
    return state.stage === 'round' ? activateActionCard(state, action.characterId) : state;
  if (action.type === 'START_VOTE') {
    if (state.stage !== 'round') return state;
    const required = roundFields(state.round);
    const allRevealed = state.characters
      .filter((character) => character.active)
      .every((character) => required.every((field) => character.revealed.includes(field)));
    if (state.round <= 3 && !allRevealed) return state;
    return {
      ...state,
      stage: 'vote',
      votes: Object.fromEntries(
        state.characters
          .filter((character) => character.active)
          .map((character) => [character.id, 0]),
      ),
      voteMessage: undefined,
    };
  }
  if (action.type === 'SET_VOTES') {
    const active = state.characters.filter((character) => character.active);
    if (state.stage !== 'vote' || !active.some((character) => character.id === action.characterId))
      return state;
    const otherVotes = Object.entries(state.votes).reduce(
      (sum, [characterId, votes]) => (characterId === action.characterId ? sum : sum + votes),
      0,
    );
    const available = Math.max(0, active.length - otherVotes);
    return {
      ...state,
      votes: {
        ...state.votes,
        [action.characterId]: Math.min(available, Math.max(0, Math.trunc(action.votes))),
      },
    };
  }
  if (action.type === 'RESOLVE_VOTE') {
    if (state.stage !== 'vote') return state;
    const { leader, tied } = voteLeader(state);
    const totalVotes = Object.values(state.votes).reduce((sum, votes) => sum + votes, 0);
    if (!leader)
      return {
        ...state,
        voteMessage:
          totalVotes === 0
            ? 'Добавьте хотя бы один голос.'
            : tied.length > 1
              ? 'Ничья. Проведите короткую защитную речь и скорректируйте голоса.'
              : 'Голосование не завершено.',
      };
    const checkpoint = makeCheckpoint(state);
    const protectedByCard = leader.shielded;
    const characters = state.characters.map((character) => {
      if (character.id === leader.id && protectedByCard) return { ...character, shielded: false };
      if (character.id === leader.id) return { ...character, active: false };
      return { ...character, shielded: false };
    });
    const activeCount = characters.filter((character) => character.active).length;
    const historyText = protectedByCard
      ? `${leader.name} использует право вето и остаётся в убежище.`
      : `${leader.name} исключён по итогам голосования.`;
    if (activeCount <= state.scenario.capacity) {
      return {
        ...state,
        checkpoint,
        characters,
        stage: 'final',
        votes: {},
        voteMessage: undefined,
        history: [...state.history, log(state.round, historyText)],
      };
    }
    return {
      ...state,
      checkpoint,
      characters,
      stage: 'crisis',
      votes: {},
      voteMessage: undefined,
      currentCrisis: nextCrisis(state),
      crisisResolution: undefined,
      history: [...state.history, log(state.round, historyText)],
    };
  }
  if (action.type === 'RESOLVE_CRISIS')
    return state.stage === 'crisis' ? resolveCrisis(state, action.optionIndex) : state;
  if (
    action.type === 'CONTINUE_AFTER_CRISIS' &&
    state.stage === 'crisis' &&
    state.crisisResolution
  ) {
    return {
      ...state,
      stage: 'round',
      round: state.round + 1,
      currentCrisis: undefined,
      crisisResolution: undefined,
    };
  }
  if (action.type === 'UNDO' && state.checkpoint) {
    return {
      ...state,
      ...state.checkpoint,
      checkpoint: undefined,
      voteMessage: 'Последнее итоговое действие отменено.',
    };
  }
  return state;
}
