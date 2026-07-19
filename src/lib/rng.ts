export interface RandomSource {
  next: () => number;
  int: (min: number, max: number) => number;
  pick: <T>(items: readonly T[]) => T;
  shuffle: <T>(items: readonly T[]) => T[];
  sample: <T>(items: readonly T[], count: number) => T[];
}

function xmur3(value: string) {
  let hash = 1779033703 ^ value.length;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }
  return () => {
    hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
    hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
    return (hash ^= hash >>> 16) >>> 0;
  };
}

function mulberry32(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createRng(seed: string): RandomSource {
  const random = mulberry32(xmur3(seed)());
  const source: RandomSource = {
    next: random,
    int: (min, max) => Math.floor(random() * (max - min + 1)) + min,
    pick: <T>(items: readonly T[]) => {
      if (items.length === 0) throw new Error('Нельзя выбрать значение из пустого списка.');
      return items[Math.floor(random() * items.length)];
    },
    shuffle: <T>(items: readonly T[]) => {
      const copy = [...items];
      for (let index = copy.length - 1; index > 0; index -= 1) {
        const nextIndex = Math.floor(random() * (index + 1));
        [copy[index], copy[nextIndex]] = [copy[nextIndex], copy[index]];
      }
      return copy;
    },
    sample: <T>(items: readonly T[], count: number) => source.shuffle(items).slice(0, count),
  };
  return source;
}

export function createSeed(prefix = 'GAME') {
  const bytes = new Uint32Array(2);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else {
    bytes[0] = Date.now();
    bytes[1] = Math.floor(Math.random() * 0xffffffff);
  }
  return `${prefix}-${bytes[0].toString(36)}-${bytes[1].toString(36)}`.toUpperCase();
}
