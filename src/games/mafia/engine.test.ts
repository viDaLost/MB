import { describe, expect, it } from 'vitest';
import { MAFIA_ROLES, type MafiaRoleId } from '../../data/mafia';
import {
  checkWinner,
  createMafiaGame,
  getRoleDeck,
  mafiaGameSchema,
  mafiaReducer,
  getNightSteps,
  resolveNight,
  type MafiaGameState,
} from './engine';

const names = (count: number) => Array.from({ length: count }, (_, index) => `Игрок ${index + 1}`);

function withRoles(state: MafiaGameState, roles: MafiaRoleId[]): MafiaGameState {
  return {
    ...state,
    players: state.players.map((player, index) => ({
      ...player,
      role: roles[index],
      team: MAFIA_ROLES[roles[index]].team,
      alive: true,
    })),
  };
}

describe('Mafia engine', () => {
  it('keeps every preset valid across all supported table sizes', () => {
    for (const preset of ['classic', 'noir', 'chaos'] as const) {
      for (let count = 5; count <= 16; count += 1) {
        const game = createMafiaGame(names(count), preset, `${preset}-${count}`);
        expect(game.players).toHaveLength(count);
        expect(game.players.some((player) => player.team === 'mafia')).toBe(true);
        expect(mafiaGameSchema.safeParse(game).success).toBe(true);
        expect(game.players.filter((player) => player.role === 'don')).toHaveLength(
          preset === 'noir' && count >= 8 ? 1 : 0,
        );
        expect(game.players.filter((player) => player.role === 'maniac')).toHaveLength(
          preset === 'chaos' && count >= 8 ? 1 : 0,
        );
      }
    }
  });

  it('balances presets for the table size', () => {
    const classic = getRoleDeck(5, 'classic');
    const noir = getRoleDeck(8, 'noir');
    const chaos = getRoleDeck(16, 'chaos');

    expect(classic).toHaveLength(5);
    expect(classic.filter((role) => role === 'mafia')).toHaveLength(1);
    expect(noir).toContain('don');
    expect(noir.filter((role) => MAFIA_ROLES[role].team === 'mafia')).toHaveLength(2);
    expect(chaos).toContain('maniac');
    expect(chaos.filter((role) => MAFIA_ROLES[role].team === 'mafia')).toHaveLength(4);
  });

  it('repeats the same deal for the same code and validates saved state', () => {
    const first = createMafiaGame(names(10), 'noir', 'CITY-TEST');
    const second = createMafiaGame(names(10), 'noir', 'CITY-TEST');

    expect(first.players).toEqual(second.players);
    expect(mafiaGameSchema.safeParse(first).success).toBe(true);
  });

  it('gives the Don a distinct Commissioner search in noir mode', () => {
    let state = createMafiaGame(names(8), 'noir', 'DON-CHECK');
    state = { ...state, stage: 'night', nightStepIndex: 1 };
    expect(getNightSteps(state).slice(0, 2)).toEqual(['mafia', 'don']);
    const detective = state.players.find((player) => player.role === 'detective')!;
    state = mafiaReducer(state, {
      type: 'SET_NIGHT_TARGET',
      key: 'donTarget',
      playerId: detective.id,
    })!;
    expect(state.donResult).toEqual({ playerId: detective.id, isDetective: true });
  });

  it('lets the doctor prevent every attack on one target', () => {
    const state = withRoles(createMafiaGame(names(7), 'classic', 'DOCTOR'), [
      'mafia',
      'doctor',
      'detective',
      'civilian',
      'civilian',
      'civilian',
      'civilian',
    ]);
    const resolved = resolveNight({
      ...state,
      stage: 'night',
      nightActions: {
        mafiaTarget: state.players[3].id,
        doctorTarget: state.players[3].id,
      },
    });

    expect(resolved.players[3].alive).toBe(true);
    expect(resolved.lastNightSummary).toContain('Ночная атака была остановлена.');
    expect(resolved.stage).toBe('dawn');
  });

  it('resolves independent simultaneous attacks without double-counting victims', () => {
    const state = withRoles(createMafiaGame(names(8), 'chaos', 'NIGHT'), [
      'mafia',
      'mafia',
      'doctor',
      'detective',
      'maniac',
      'civilian',
      'civilian',
      'civilian',
    ]);
    const resolved = resolveNight({
      ...state,
      stage: 'night',
      nightActions: {
        mafiaTarget: state.players[5].id,
        maniacTarget: state.players[6].id,
        doctorTarget: state.players[5].id,
      },
    });

    expect(resolved.players[5].alive).toBe(true);
    expect(resolved.players[6].alive).toBe(false);
    expect(resolved.lastNightSummary).toEqual(
      expect.arrayContaining([
        `${state.players[6].name} не встретил рассвет.`,
        'Ночная атака была остановлена.',
      ]),
    );
  });

  it('detects city, mafia and solo victories', () => {
    const base = withRoles(createMafiaGame(names(5), 'classic', 'WIN'), [
      'mafia',
      'maniac',
      'civilian',
      'civilian',
      'civilian',
    ]).players;

    expect(checkWinner(base.map((player, index) => ({ ...player, alive: index >= 2 })))).toBe(
      'city',
    );
    expect(
      checkWinner(base.map((player, index) => ({ ...player, alive: index === 0 || index === 2 }))),
    ).toBe('mafia');
    expect(checkWinner(base.map((player, index) => ({ ...player, alive: index === 1 })))).toBe(
      'solo',
    );
  });

  it('handles empty votes, ties, elimination and one-step undo', () => {
    const game = createMafiaGame(names(8), 'classic', 'VOTE');
    const nominated = [game.players[0].id, game.players[1].id];
    let state: MafiaGameState = {
      ...game,
      stage: 'vote',
      nominations: nominated,
      votes: { [nominated[0]]: 0, [nominated[1]]: 0 },
    };

    state = mafiaReducer(state, { type: 'RESOLVE_VOTE' })!;
    expect(state.voteMessage).toContain('хотя бы один голос');
    state = mafiaReducer(state, { type: 'SET_VOTES', playerId: nominated[0], votes: 2 })!;
    state = mafiaReducer(state, { type: 'SET_VOTES', playerId: nominated[1], votes: 2 })!;
    state = mafiaReducer(state, { type: 'RESOLVE_VOTE' })!;
    expect(state.voteMessage).toContain('Ничья');
    state = mafiaReducer(state, { type: 'SET_VOTES', playerId: nominated[0], votes: 3 })!;
    state = mafiaReducer(state, { type: 'RESOLVE_VOTE' })!;
    expect(state.players[0].alive).toBe(false);
    expect(state.checkpoint).toBeDefined();
    state = mafiaReducer(state, { type: 'UNDO' })!;
    expect(state.stage).toBe('vote');
    expect(state.players[0].alive).toBe(true);
    expect(state.votes[nominated[0]]).toBe(3);
  });

  it('rejects actions that do not belong to the current phase', () => {
    const game = createMafiaGame(names(8), 'noir', 'GUARD');
    expect(mafiaReducer(game, { type: 'RESOLVE_NIGHT' })).toBe(game);
    expect(mafiaReducer(game, { type: 'NEXT_CARD' })).toBe(game);
  });

  it('never accepts more votes than living voters', () => {
    const game = createMafiaGame(names(8), 'classic', 'BUDGET');
    const first = game.players[0].id;
    const second = game.players[1].id;
    let vote: MafiaGameState = {
      ...game,
      stage: 'vote',
      nominations: [first, second],
      votes: { [first]: 0, [second]: 0 },
    };
    vote = mafiaReducer(vote, { type: 'SET_VOTES', playerId: first, votes: 8 })!;
    vote = mafiaReducer(vote, { type: 'SET_VOTES', playerId: second, votes: 4 })!;
    expect(Object.values(vote.votes).reduce((sum, value) => sum + value, 0)).toBe(8);
    expect(vote.votes[second]).toBe(0);
  });
});
