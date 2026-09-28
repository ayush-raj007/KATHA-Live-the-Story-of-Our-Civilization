// Star thresholds for the Lothal mini-games. These mirror the star criteria shown
// to players in content/minigames.json, so keep the two in sync.

export const BEAD_DRILLER = {
  oneStarScore: 150,
  twoStarScore: 300,
  twoStarMaxMisfires: 1, // "< 2 misfires"
  threeStarScore: 450,
} as const;

export const TIDE_DOCK = {
  fleets: 4,
  oneStarDocked: 2,
  twoStarDocked: 3,
} as const;

export const SEAL_MATCH = {
  pairs: 6,
  timeLimitMs: 55_000,
  oneStarPairs: 4,
  twoStarMaxErrors: 4, // "under 5 errors"
  threeStarUnderMs: 45_000,
} as const;

export const beadDrillerStars = (score: number, misfires: number): number => {
  if (score >= BEAD_DRILLER.threeStarScore) return 3;
  if (score >= BEAD_DRILLER.twoStarScore && misfires <= BEAD_DRILLER.twoStarMaxMisfires) return 2;
  if (score >= BEAD_DRILLER.oneStarScore) return 1;
  return 0;
};

export const tideDockStars = (docked: number): number => {
  if (docked >= TIDE_DOCK.fleets) return 3;
  if (docked >= TIDE_DOCK.twoStarDocked) return 2;
  if (docked >= TIDE_DOCK.oneStarDocked) return 1;
  return 0;
};

export const sealMatchStars = (matchedPairs: number, errors: number, elapsedMs: number): number => {
  const allMatched = matchedPairs >= SEAL_MATCH.pairs;
  if (allMatched && elapsedMs < SEAL_MATCH.threeStarUnderMs) return 3;
  if (allMatched && errors <= SEAL_MATCH.twoStarMaxErrors) return 2;
  if (matchedPairs >= SEAL_MATCH.oneStarPairs) return 1;
  return 0;
};
