import type { ZodType } from 'zod';

export function loadStored<T>(key: string, schema: ZodType<T>): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const result = schema.safeParse(JSON.parse(raw));
    if (!result.success) {
      localStorage.removeItem(key);
      return null;
    }
    return result.data;
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage can be unavailable in privacy mode. The game remains usable in memory.
    }
    return null;
  }
}

export function saveStored<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function clearStored(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing else is required when storage is blocked.
  }
}

export function hasStored(key: string) {
  try {
    return Boolean(localStorage.getItem(key));
  } catch {
    return false;
  }
}
