import { describe, expect, it } from 'vitest';
import { beadDrillerStars, sealMatchStars, tideDockStars } from './scoring';

// Thresholds follow the star criteria shown to players in minigames.json.
describe('Bead Driller stars', () => {
  it('1 star needs 150 points', () => {
    expect(beadDrillerStars(149, 0)).toBe(0);
    expect(beadDrillerStars(150, 0)).toBe(1);
  });
  it('2 stars need 300 points with fewer than 2 misfires', () => {
    expect(beadDrillerStars(300, 1)).toBe(2);
    expect(beadDrillerStars(300, 2)).toBe(1);
  });
  it('3 stars need 450 points', () => {
    expect(beadDrillerStars(449, 0)).toBe(2);
    expect(beadDrillerStars(450, 0)).toBe(3);
  });
});

describe('Tide Dock stars', () => {
  it('needs 2 docked ships to pass, 3 for 2 stars, all 4 for 3 stars', () => {
    expect(tideDockStars(1)).toBe(0);
    expect(tideDockStars(2)).toBe(1);
    expect(tideDockStars(3)).toBe(2);
    expect(tideDockStars(4)).toBe(3);
  });
});

describe('Seal Match stars', () => {
  it('1 star for 4 pairs before time runs out', () => {
    expect(sealMatchStars(3, 0, 55_000)).toBe(0);
    expect(sealMatchStars(4, 9, 55_000)).toBe(1);
  });
  it('2 stars for all 6 pairs with under 5 errors', () => {
    expect(sealMatchStars(6, 4, 50_000)).toBe(2);
    expect(sealMatchStars(6, 5, 50_000)).toBe(1);
  });
  it('3 stars for all 6 pairs in under 45 seconds', () => {
    expect(sealMatchStars(6, 9, 44_999)).toBe(3);
    expect(sealMatchStars(6, 0, 45_000)).toBe(2);
  });
});
