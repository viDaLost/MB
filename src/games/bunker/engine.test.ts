import { describe, expect, it } from 'vitest';
import { ACTION_CARDS, type HealthDefinition } from '../../data/bunker';
import {
  bunkerGameSchema,
  bunkerReducer,
  createBunkerGame,
  finalScore,
  generateScenario,
  resolveCrisis,
  type BunkerGameState,
} from './engine';

const names = (count: number) =>
  Array.from({ length: count }, (_, index) => `Кандидат ${index + 1}`);

function healthMatches(health: HealthDefinition, age: number, sex: string) {
  return (
    (!health.minAge || age >= health.minAge) &&
    (!health.maxAge || age <= health.maxAge) &&
    (!health.allowedSex || health.allowedSex.includes(sex as never))
  );
}

function startVote(game: BunkerGameState): BunkerGameState {
  return bunkerReducer(
    {
      ...game,
      stage: 'round',
      characters: game.characters.map((character) => ({
        ...character,
        revealed: ['profession', 'health'],
      })),
    },
    { type: 'START_VOTE' },
  )!;
}

describe('Bunker engine', () => {
  it('keeps demographic and scenario constraints valid across a seed matrix', () => {
    const tones = ['realistic', 'cinematic', 'absurd'] as const;
    for (let index = 0; index < 90; index += 1) {
      const tone = tones[index % tones.length];
      const game = createBunkerGame(names(16), 8, tone, `MATRIX-${index}`);
      expect(game.scenario.disaster.tone).toContain(tone);
      expect(new Set(game.characters.map((character) => character.profession.id)).size).toBe(16);
      expect(new Set(game.characters.map((character) => character.hobby)).size).toBe(16);
      expect(new Set(game.characters.map((character) => character.phobia)).size).toBe(16);
      expect(new Set(game.characters.map((character) => character.trait)).size).toBe(16);
      expect(new Set(game.characters.map((character) => character.inventory.name)).size).toBe(16);
      expect(new Set(game.characters.map((character) => character.secret)).size).toBe(16);
      game.characters.forEach((character) => {
        expect(character.age).toBeGreaterThanOrEqual(character.profession.minAge);
        expect(healthMatches(character.health, character.age, character.sex)).toBe(true);
      });
    }
  });

  it('creates deterministic, tone-safe and capacity-aware scenarios', () => {
    const first = generateScenario('SHELTER-TEST', 'realistic', 5);
    const second = generateScenario('SHELTER-TEST', 'realistic', 5);

    expect(first).toEqual(second);
    expect(first.disaster.tone).toContain('realistic');
    expect(first.capacity).toBe(5);
    expect(first.shelter.area).toBeGreaterThan(5 * 11);
    expect(new Set(first.supplies).size).toBe(4);
  });

  it('generates coherent and diverse dossiers', () => {
    const game = createBunkerGame(names(16), 8, 'cinematic', 'DOSSIERS');

    expect(new Set(game.characters.map((character) => character.profession.id)).size).toBe(16);
    expect(new Set(game.characters.map((character) => character.hobby)).size).toBe(16);
    expect(new Set(game.characters.map((character) => character.phobia)).size).toBe(16);
    expect(new Set(game.characters.map((character) => character.inventory.name)).size).toBe(16);
    for (const character of game.characters) {
      expect(character.age).toBeGreaterThanOrEqual(character.profession.minAge);
      expect(healthMatches(character.health, character.age, character.sex)).toBe(true);
      if (character.health.id === 'pregnancy') {
        expect(character.sex).toBe('женщина');
        expect(character.age).toBeGreaterThanOrEqual(20);
        expect(character.age).toBeLessThanOrEqual(44);
      }
    }
    expect(bunkerGameSchema.safeParse(game).success).toBe(true);
  });

  it('clamps impossible shelter capacity from direct engine calls', () => {
    expect(createBunkerGame(names(6), 99, 'realistic', 'CAP').scenario.capacity).toBe(5);
    expect(createBunkerGame(names(6), 1, 'realistic', 'CAP').scenario.capacity).toBe(2);
  });

  it('allows exactly one coherent private reroll', () => {
    let game: BunkerGameState = {
      ...createBunkerGame(names(8), 4, 'cinematic', 'REROLL'),
      stage: 'deal',
      cardVisible: true,
    };
    const before = game.characters[0];
    game = bunkerReducer(game, { type: 'REROLL_FIELD', characterId: before.id, field: 'health' })!;
    const after = game.characters[0];

    expect(after.health.id).not.toBe(before.health.id);
    expect(healthMatches(after.health, after.age, after.sex)).toBe(true);
    expect(after.rerollsRemaining).toBe(0);
    expect(
      bunkerReducer(game, { type: 'REROLL_FIELD', characterId: after.id, field: 'health' }),
    ).toBe(game);
  });

  it('distinguishes an empty vote from a tie and can undo exclusion', () => {
    let game = startVote(createBunkerGame(names(8), 4, 'realistic', 'VOTE'));
    const first = game.characters[0].id;
    const second = game.characters[1].id;

    game = bunkerReducer(game, { type: 'RESOLVE_VOTE' })!;
    expect(game.voteMessage).toContain('хотя бы один голос');
    game = bunkerReducer(game, { type: 'SET_VOTES', characterId: first, votes: 2 })!;
    game = bunkerReducer(game, { type: 'SET_VOTES', characterId: second, votes: 2 })!;
    game = bunkerReducer(game, { type: 'RESOLVE_VOTE' })!;
    expect(game.voteMessage).toContain('Ничья');
    game = bunkerReducer(game, { type: 'SET_VOTES', characterId: first, votes: 3 })!;
    game = bunkerReducer(game, { type: 'RESOLVE_VOTE' })!;
    expect(game.stage).toBe('crisis');
    expect(game.characters[0].active).toBe(false);
    game = bunkerReducer(game, { type: 'UNDO' })!;
    expect(game.stage).toBe('vote');
    expect(game.characters[0].active).toBe(true);
    expect(game.votes[first]).toBe(3);
  });

  it('consumes a veto instead of eliminating its owner', () => {
    let game = createBunkerGame(names(8), 4, 'realistic', 'SHIELD');
    const shield = ACTION_CARDS.find((card) => card.type === 'shield')!;
    game = {
      ...game,
      stage: 'round',
      characters: game.characters.map((character, index) => ({
        ...character,
        revealed: ['profession', 'health'],
        actionCard: index === 0 ? shield : character.actionCard,
      })),
    };
    const protectedId = game.characters[0].id;
    game = bunkerReducer(game, { type: 'USE_ACTION', characterId: protectedId })!;
    game = bunkerReducer(game, { type: 'START_VOTE' })!;
    game = bunkerReducer(game, { type: 'SET_VOTES', characterId: protectedId, votes: 5 })!;
    game = bunkerReducer(game, { type: 'RESOLVE_VOTE' })!;

    expect(game.characters[0].active).toBe(true);
    expect(game.characters[0].shielded).toBe(false);
    expect(game.stage).toBe('crisis');
  });

  it('changes resources during a crisis and restores the exact crisis on undo', () => {
    let game = startVote(createBunkerGame(names(8), 4, 'cinematic', 'CRISIS'));
    const excluded = game.characters[0].id;
    game = bunkerReducer(game, { type: 'SET_VOTES', characterId: excluded, votes: 5 })!;
    game = bunkerReducer(game, { type: 'RESOLVE_VOTE' })!;
    const crisisId = game.currentCrisis!.id;
    const resourcesBefore = game.resources;
    const resolved = resolveCrisis(game, 0);

    expect(resolved.crisesResolved).toBe(1);
    expect(resolved.resources).not.toEqual(resourcesBefore);
    game = bunkerReducer(resolved, { type: 'UNDO' })!;
    expect(game.stage).toBe('crisis');
    expect(game.currentCrisis?.id).toBe(crisisId);
    expect(game.crisisResolution).toBeUndefined();
    expect(game.resources).toEqual(resourcesBefore);
  });

  it('finishes as soon as active candidates fit and keeps score bounded', () => {
    let game = startVote(createBunkerGame(names(4), 3, 'absurd', 'FINAL'));
    game = bunkerReducer(game, {
      type: 'SET_VOTES',
      characterId: game.characters[0].id,
      votes: 3,
    })!;
    game = bunkerReducer(game, { type: 'RESOLVE_VOTE' })!;

    expect(game.stage).toBe('final');
    expect(game.characters.filter((character) => character.active)).toHaveLength(3);
    expect(finalScore(game)).toBeGreaterThanOrEqual(0);
    expect(finalScore(game)).toBeLessThanOrEqual(100);
  });

  it('rejects out-of-phase and premature actions', () => {
    const game = createBunkerGame(names(8), 4, 'realistic', 'GUARD');
    expect(bunkerReducer(game, { type: 'START_VOTE' })).toBe(game);
    expect(bunkerReducer(game, { type: 'NEXT_CARD' })).toBe(game);
    expect(bunkerReducer({ ...game, stage: 'round' }, { type: 'START_VOTE' })?.stage).toBe('round');
  });

  it('limits distributed votes to active candidates', () => {
    let game = startVote(createBunkerGame(names(8), 4, 'realistic', 'BUDGET'));
    const first = game.characters[0].id;
    const second = game.characters[1].id;
    game = bunkerReducer(game, { type: 'SET_VOTES', characterId: first, votes: 8 })!;
    game = bunkerReducer(game, { type: 'SET_VOTES', characterId: second, votes: 4 })!;
    expect(Object.values(game.votes).reduce((sum, value) => sum + value, 0)).toBe(8);
    expect(game.votes[second]).toBe(0);
  });
});
