import { z } from 'zod';
import { MAFIA_ROLES, type MafiaPreset, type MafiaRoleId, type MafiaTeam } from '../../data/mafia';
import { createRng } from '../../lib/rng';

export type MafiaStage = 'deal' | 'night' | 'dawn' | 'day' | 'vote' | 'ended';
export type NightActionKey =
  'mafiaTarget' | 'donTarget' | 'doctorTarget' | 'detectiveTarget' | 'maniacTarget';
export type NightStep = 'mafia' | 'don' | 'doctor' | 'detective' | 'maniac';

export interface MafiaPlayer {
  id: string;
  name: string;
  role: MafiaRoleId;
  team: MafiaTeam;
  alive: boolean;
}

export interface MafiaLogEntry {
  id: string;
  round: number;
  phase: 'system' | 'night' | 'day' | 'vote';
  text: string;
}

export interface MafiaCheckpoint {
  players: MafiaPlayer[];
  stage: MafiaStage;
  round: number;
  nightStepIndex: number;
  nightActions: Partial<Record<NightActionKey, string>>;
  detectiveResult?: { playerId: string; isMafia: boolean };
  donResult?: { playerId: string; isDetective: boolean };
  lastNightSummary: string[];
  nominations: string[];
  votes: Record<string, number>;
  voteMessage?: string;
  history: MafiaLogEntry[];
  winner?: MafiaTeam;
}

export interface MafiaGameState {
  version: 2;
  seed: string;
  preset: MafiaPreset;
  stage: MafiaStage;
  round: number;
  players: MafiaPlayer[];
  dealIndex: number;
  cardVisible: boolean;
  nightStepIndex: number;
  nightActions: Partial<Record<NightActionKey, string>>;
  detectiveResult?: { playerId: string; isMafia: boolean };
  donResult?: { playerId: string; isDetective: boolean };
  lastNightSummary: string[];
  nominations: string[];
  votes: Record<string, number>;
  voteMessage?: string;
  winner?: MafiaTeam;
  history: MafiaLogEntry[];
  checkpoint?: MafiaCheckpoint;
}

const roleSchema = z.enum(['civilian', 'mafia', 'don', 'detective', 'doctor', 'maniac']);
const teamSchema = z.enum(['city', 'mafia', 'solo']);
const playerSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: roleSchema,
  team: teamSchema,
  alive: z.boolean(),
});
const logSchema = z.object({
  id: z.string(),
  round: z.number().int().nonnegative(),
  phase: z.enum(['system', 'night', 'day', 'vote']),
  text: z.string(),
});
const checkpointSchema = z.object({
  players: z.array(playerSchema),
  stage: z.enum(['deal', 'night', 'dawn', 'day', 'vote', 'ended']),
  round: z.number().int().positive(),
  nightStepIndex: z.number().int().nonnegative(),
  nightActions: z.object({
    mafiaTarget: z.string().optional(),
    donTarget: z.string().optional(),
    doctorTarget: z.string().optional(),
    detectiveTarget: z.string().optional(),
    maniacTarget: z.string().optional(),
  }),
  detectiveResult: z.object({ playerId: z.string(), isMafia: z.boolean() }).optional(),
  donResult: z.object({ playerId: z.string(), isDetective: z.boolean() }).optional(),
  lastNightSummary: z.array(z.string()),
  nominations: z.array(z.string()),
  votes: z.record(z.string(), z.number().int().nonnegative()),
  voteMessage: z.string().optional(),
  history: z.array(logSchema),
  winner: teamSchema.optional(),
});

export const mafiaGameSchema: z.ZodType<MafiaGameState> = z.object({
  version: z.literal(2),
  seed: z.string(),
  preset: z.enum(['classic', 'noir', 'chaos']),
  stage: z.enum(['deal', 'night', 'dawn', 'day', 'vote', 'ended']),
  round: z.number().int().positive(),
  players: z.array(playerSchema).min(5).max(16),
  dealIndex: z.number().int().nonnegative(),
  cardVisible: z.boolean(),
  nightStepIndex: z.number().int().nonnegative(),
  nightActions: z.object({
    mafiaTarget: z.string().optional(),
    donTarget: z.string().optional(),
    doctorTarget: z.string().optional(),
    detectiveTarget: z.string().optional(),
    maniacTarget: z.string().optional(),
  }),
  detectiveResult: z.object({ playerId: z.string(), isMafia: z.boolean() }).optional(),
  donResult: z.object({ playerId: z.string(), isDetective: z.boolean() }).optional(),
  lastNightSummary: z.array(z.string()),
  nominations: z.array(z.string()),
  votes: z.record(z.string(), z.number().int().nonnegative()),
  voteMessage: z.string().optional(),
  winner: teamSchema.optional(),
  history: z.array(logSchema),
  checkpoint: checkpointSchema.optional(),
});

export function getRoleDeck(total: number, preset: MafiaPreset): MafiaRoleId[] {
  const mafiaSide = Math.max(1, Math.round(total / 4));
  const roles: MafiaRoleId[] = [];
  if (preset === 'noir' && total >= 8) {
    roles.push(
      'don',
      ...Array.from({ length: Math.max(0, mafiaSide - 1) }, () => 'mafia' as const),
    );
  } else {
    roles.push(...Array.from({ length: mafiaSide }, () => 'mafia' as const));
  }
  if (total >= 6) roles.push('detective');
  if (total >= 7) roles.push('doctor');
  if (preset === 'chaos' && total >= 8) roles.push('maniac');
  while (roles.length < total) roles.push('civilian');
  return roles.slice(0, total);
}

export function createMafiaGame(
  names: string[],
  preset: MafiaPreset,
  seed: string,
): MafiaGameState {
  const boundedNames = names.slice(0, 16);
  while (boundedNames.length < 5) boundedNames.push(`Игрок ${boundedNames.length + 1}`);
  const cleanNames = boundedNames.map((name, index) => name.trim() || `Игрок ${index + 1}`);
  const roles = createRng(seed).shuffle(getRoleDeck(cleanNames.length, preset));
  const players = cleanNames.map((name, index) => {
    const role = roles[index];
    return {
      id: `m-${index + 1}`,
      name,
      role,
      team: MAFIA_ROLES[role].team,
      alive: true,
    } satisfies MafiaPlayer;
  });
  return {
    version: 2,
    seed,
    preset,
    stage: 'deal',
    round: 1,
    players,
    dealIndex: 0,
    cardVisible: false,
    nightStepIndex: 0,
    nightActions: {},
    lastNightSummary: [],
    nominations: [],
    votes: {},
    history: [makeLog(1, 'system', `Партия создана. Код: ${seed}.`)],
  };
}

function makeLog(round: number, phase: MafiaLogEntry['phase'], text: string): MafiaLogEntry {
  return { id: `${Date.now()}-${round}-${phase}-${text}`, round, phase, text };
}

function checkpoint(state: MafiaGameState): MafiaCheckpoint {
  return {
    players: state.players.map((player) => ({ ...player })),
    stage: state.stage,
    round: state.round,
    nightStepIndex: state.nightStepIndex,
    nightActions: { ...state.nightActions },
    detectiveResult: state.detectiveResult,
    donResult: state.donResult,
    lastNightSummary: [...state.lastNightSummary],
    nominations: [...state.nominations],
    votes: { ...state.votes },
    voteMessage: state.voteMessage,
    history: state.history.map((entry) => ({ ...entry })),
    winner: state.winner,
  };
}

export function getNightSteps(state: MafiaGameState): NightStep[] {
  const has = (role: MafiaRoleId) =>
    state.players.some((player) => player.alive && player.role === role);
  const steps: NightStep[] = [];
  if (state.players.some((player) => player.alive && player.team === 'mafia')) steps.push('mafia');
  if (has('don')) steps.push('don');
  if (has('doctor')) steps.push('doctor');
  if (has('detective')) steps.push('detective');
  if (has('maniac')) steps.push('maniac');
  return steps;
}

export function nightTargetKey(step: NightStep): NightActionKey {
  if (step === 'mafia') return 'mafiaTarget';
  if (step === 'don') return 'donTarget';
  if (step === 'doctor') return 'doctorTarget';
  if (step === 'detective') return 'detectiveTarget';
  return 'maniacTarget';
}

export function validTargets(state: MafiaGameState, step: NightStep) {
  return state.players.filter((player) => {
    if (!player.alive) return false;
    if (step === 'mafia' || step === 'don') return player.team !== 'mafia';
    if (step === 'maniac') return player.role !== 'maniac';
    return true;
  });
}

export function checkWinner(players: MafiaPlayer[]): MafiaTeam | undefined {
  const alive = players.filter((player) => player.alive);
  const mafia = alive.filter((player) => player.team === 'mafia').length;
  const maniac = alive.filter((player) => player.role === 'maniac').length;
  if (maniac === 1 && alive.length === 1) return 'solo';
  if (mafia === 0 && maniac === 0) return 'city';
  if (mafia > 0 && mafia >= alive.length - mafia) return 'mafia';
  return undefined;
}

export function resolveNight(state: MafiaGameState): MafiaGameState {
  const protectedId = state.nightActions.doctorTarget;
  const attacked = new Set(
    [state.nightActions.mafiaTarget, state.nightActions.maniacTarget].filter(
      (value): value is string => Boolean(value),
    ),
  );
  if (protectedId) attacked.delete(protectedId);
  const nextPlayers = state.players.map((player) =>
    attacked.has(player.id) ? { ...player, alive: false } : player,
  );
  const victims = nextPlayers.filter((player) => attacked.has(player.id));
  const summary = victims.length
    ? victims.map((player) => `${player.name} не встретил рассвет.`)
    : ['Город проснулся без потерь.'];
  if (
    protectedId &&
    [state.nightActions.mafiaTarget, state.nightActions.maniacTarget].includes(protectedId)
  ) {
    summary.push('Ночная атака была остановлена.');
  }
  const winner = checkWinner(nextPlayers);
  return {
    ...state,
    checkpoint: checkpoint(state),
    players: nextPlayers,
    stage: winner ? 'ended' : 'dawn',
    winner,
    lastNightSummary: summary,
    history: [
      ...state.history,
      makeLog(
        state.round,
        'night',
        victims.length
          ? `Ночь: выбыл ${victims.map((player) => player.name).join(', ')}.`
          : 'Ночь прошла без потерь.',
      ),
    ],
  };
}

export function eliminateByVote(state: MafiaGameState, playerId: string): MafiaGameState {
  const eliminated = state.players.find((player) => player.id === playerId && player.alive);
  if (!eliminated) return state;
  const nextPlayers = state.players.map((player) =>
    player.id === playerId ? { ...player, alive: false } : player,
  );
  const winner = checkWinner(nextPlayers);
  return {
    ...state,
    checkpoint: checkpoint(state),
    players: nextPlayers,
    stage: winner ? 'ended' : 'night',
    round: winner ? state.round : state.round + 1,
    winner,
    nightStepIndex: 0,
    nightActions: {},
    detectiveResult: undefined,
    donResult: undefined,
    nominations: [],
    votes: {},
    voteMessage: undefined,
    history: [
      ...state.history,
      makeLog(state.round, 'vote', `${eliminated.name} покинул город по итогам голосования.`),
    ],
  };
}

export function getVoteLeader(state: MafiaGameState) {
  const nominees = state.nominations.map((id) => ({ id, votes: state.votes[id] ?? 0 }));
  if (nominees.length === 0) return { leader: undefined, tied: [] as string[] };
  const max = Math.max(...nominees.map((item) => item.votes));
  const tied = nominees.filter((item) => item.votes === max).map((item) => item.id);
  return { leader: tied.length === 1 && max > 0 ? tied[0] : undefined, tied };
}

export type MafiaAction =
  | { type: 'START'; names: string[]; preset: MafiaPreset; seed: string }
  | { type: 'REVEAL_CARD' }
  | { type: 'HIDE_CARD' }
  | { type: 'NEXT_CARD' }
  | { type: 'SET_NIGHT_TARGET'; key: NightActionKey; playerId: string }
  | { type: 'NEXT_NIGHT_STEP' }
  | { type: 'RESOLVE_NIGHT' }
  | { type: 'START_DAY' }
  | { type: 'TOGGLE_NOMINATION'; playerId: string }
  | { type: 'START_VOTE' }
  | { type: 'SET_VOTES'; playerId: string; votes: number }
  | { type: 'RESOLVE_VOTE' }
  | { type: 'SKIP_VOTE' }
  | { type: 'UNDO' }
  | { type: 'RESET' };

export function mafiaReducer(
  state: MafiaGameState | null,
  action: MafiaAction,
): MafiaGameState | null {
  if (action.type === 'START') return createMafiaGame(action.names, action.preset, action.seed);
  if (action.type === 'RESET') return null;
  if (!state) return state;
  if (action.type === 'REVEAL_CARD')
    return state.stage === 'deal' ? { ...state, cardVisible: true } : state;
  if (action.type === 'HIDE_CARD')
    return state.stage === 'deal' ? { ...state, cardVisible: false } : state;
  if (action.type === 'NEXT_CARD') {
    if (state.stage !== 'deal' || !state.cardVisible) return state;
    const nextIndex = state.dealIndex + 1;
    if (nextIndex >= state.players.length) {
      return {
        ...state,
        dealIndex: nextIndex,
        cardVisible: false,
        stage: 'night',
        nightStepIndex: 0,
      };
    }
    return { ...state, dealIndex: nextIndex, cardVisible: false };
  }
  if (action.type === 'SET_NIGHT_TARGET') {
    if (state.stage !== 'night') return state;
    const step = getNightSteps(state)[state.nightStepIndex];
    if (
      !step ||
      nightTargetKey(step) !== action.key ||
      !validTargets(state, step).some((player) => player.id === action.playerId)
    )
      return state;
    const detectiveResult =
      action.key === 'detectiveTarget'
        ? {
            playerId: action.playerId,
            isMafia:
              state.players.find((player) => player.id === action.playerId)?.team === 'mafia',
          }
        : state.detectiveResult;
    const donResult =
      action.key === 'donTarget'
        ? {
            playerId: action.playerId,
            isDetective:
              state.players.find((player) => player.id === action.playerId)?.role === 'detective',
          }
        : state.donResult;
    return {
      ...state,
      nightActions: { ...state.nightActions, [action.key]: action.playerId },
      detectiveResult,
      donResult,
    };
  }
  if (action.type === 'NEXT_NIGHT_STEP') {
    if (state.stage !== 'night') return state;
    const step = getNightSteps(state)[state.nightStepIndex];
    if (!step || !state.nightActions[nightTargetKey(step)]) return state;
    return { ...state, nightStepIndex: state.nightStepIndex + 1 };
  }
  if (action.type === 'RESOLVE_NIGHT') {
    if (state.stage !== 'night' || getNightSteps(state)[state.nightStepIndex]) return state;
    return resolveNight(state);
  }
  if (action.type === 'START_DAY')
    return state.stage === 'dawn' ? { ...state, stage: 'day', nominations: [], votes: {} } : state;
  if (action.type === 'TOGGLE_NOMINATION') {
    if (
      state.stage !== 'day' ||
      !state.players.some((player) => player.id === action.playerId && player.alive)
    )
      return state;
    const nominations = state.nominations.includes(action.playerId)
      ? state.nominations.filter((id) => id !== action.playerId)
      : [...state.nominations, action.playerId];
    return { ...state, nominations, voteMessage: undefined };
  }
  if (action.type === 'START_VOTE') {
    if (state.stage !== 'day' || state.nominations.length === 0) return state;
    return {
      ...state,
      stage: 'vote',
      votes: Object.fromEntries(state.nominations.map((id) => [id, 0])),
      voteMessage: undefined,
    };
  }
  if (action.type === 'SET_VOTES') {
    if (state.stage !== 'vote' || !state.nominations.includes(action.playerId)) return state;
    const aliveCount = state.players.filter((player) => player.alive).length;
    const otherVotes = Object.entries(state.votes).reduce(
      (sum, [playerId, votes]) => (playerId === action.playerId ? sum : sum + votes),
      0,
    );
    const available = Math.max(0, aliveCount - otherVotes);
    return {
      ...state,
      votes: {
        ...state.votes,
        [action.playerId]: Math.min(available, Math.max(0, Math.trunc(action.votes))),
      },
    };
  }
  if (action.type === 'RESOLVE_VOTE') {
    if (state.stage !== 'vote') return state;
    const { leader, tied } = getVoteLeader(state);
    if (!leader) {
      const totalVotes = Object.values(state.votes).reduce((sum, votes) => sum + votes, 0);
      return {
        ...state,
        voteMessage:
          totalVotes === 0
            ? 'Добавьте хотя бы один голос.'
            : tied.length > 1
              ? 'Ничья. Измените голоса или завершите день без исключения.'
              : 'Голосование не завершено.',
      };
    }
    return eliminateByVote(state, leader);
  }
  if (action.type === 'SKIP_VOTE') {
    if (state.stage !== 'day' && state.stage !== 'vote') return state;
    return {
      ...state,
      checkpoint: checkpoint(state),
      stage: 'night',
      round: state.round + 1,
      nightStepIndex: 0,
      nightActions: {},
      detectiveResult: undefined,
      donResult: undefined,
      nominations: [],
      votes: {},
      voteMessage: undefined,
      history: [
        ...state.history,
        makeLog(state.round, 'vote', 'Город завершил день без исключения.'),
      ],
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
