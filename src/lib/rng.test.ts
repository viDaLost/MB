import { describe, expect, it } from 'vitest';
import { createRng } from './rng';

describe('seeded random generator', () => {
  it('is deterministic without mutating source arrays', () => {
    const source = [1, 2, 3, 4, 5];
    const first = createRng('repeatable').shuffle(source);
    const second = createRng('repeatable').shuffle(source);

    expect(first).toEqual(second);
    expect(source).toEqual([1, 2, 3, 4, 5]);
  });

  it('samples unique values', () => {
    const result = createRng('sample').sample(['a', 'b', 'c', 'd'], 3);
    expect(result).toHaveLength(3);
    expect(new Set(result).size).toBe(3);
  });
});
