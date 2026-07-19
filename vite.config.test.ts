import { describe, expect, it } from 'vitest';

import { normalizeBasePath, resolveBasePath } from './vite.config';

describe('GitHub Pages base path', () => {
  it.each([
    ['', '/'],
    ['/', '/'],
    ['games', '/games/'],
    ['/games', '/games/'],
    ['/games/', '/games/'],
  ])('normalizes %j to %j', (input, expected) => {
    expect(normalizeBasePath(input)).toBe(expected);
  });

  it('prefers the path supplied by configure-pages', () => {
    expect(
      resolveBasePath({
        VITE_BASE_PATH: '/custom-domain-path',
        GITHUB_REPOSITORY: 'player/night-games',
      }),
    ).toBe('/custom-domain-path/');
  });

  it('derives a project path from GITHUB_REPOSITORY as a fallback', () => {
    expect(resolveBasePath({ GITHUB_REPOSITORY: 'player/night-games' })).toBe('/night-games/');
  });

  it('uses the domain root for a user or organization Pages repository', () => {
    expect(resolveBasePath({ GITHUB_REPOSITORY: 'player/player.github.io' })).toBe('/');
  });
});
