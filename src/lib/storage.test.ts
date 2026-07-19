import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { clearStored, hasStored, loadStored, saveStored } from './storage';

const schema = z.object({ version: z.literal(1), value: z.string() });

describe('safe local persistence', () => {
  it('round-trips validated state', () => {
    saveStored('session', { version: 1, value: 'ok' });
    expect(hasStored('session')).toBe(true);
    expect(loadStored('session', schema)).toEqual({ version: 1, value: 'ok' });
    clearStored('session');
    expect(hasStored('session')).toBe(false);
  });

  it('removes malformed and obsolete payloads instead of crashing', () => {
    localStorage.setItem('broken', '{not-json');
    expect(loadStored('broken', schema)).toBeNull();
    expect(localStorage.getItem('broken')).toBeNull();

    localStorage.setItem('old', JSON.stringify({ version: 0, value: 'legacy' }));
    expect(loadStored('old', schema)).toBeNull();
    expect(localStorage.getItem('old')).toBeNull();
  });
});
