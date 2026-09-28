import { describe, expect, it } from 'vitest';
import npcs from './npcs.json';
import questions from './questions.json';
import foods from './foods.json';
import minigames from './minigames.json';
import kingdoms from './kingdoms.json';
import toys from './toys.json';

// Cross-references between content files are resolved with .find() at runtime and
// silently render nothing when broken, so check them here.
describe('content integrity', () => {
  it('every NPC checkpoint question exists', () => {
    for (const npc of npcs) {
      expect(questions.some((q) => q.id === npc.checkpointQuestionId), npc.id).toBe(true);
    }
  });

  it('every question has a valid correct answer in both languages', () => {
    for (const q of questions) {
      expect(q.options.en.length, q.id).toBe(q.options.hi.length);
      expect(q.correctIndex, q.id).toBeGreaterThanOrEqual(0);
      expect(q.correctIndex, q.id).toBeLessThan(q.options.en.length);
    }
  });

  it('every barter trade gives and receives known items', () => {
    for (const npc of npcs) {
      for (const trade of npc.barterTrades) {
        expect(trade.giveItemId, npc.id).toBe('carnelian_beads');
        expect(foods.some((f) => f.id === trade.receiveItemId), trade.receiveItemId).toBe(true);
        expect(trade.giveAmount).toBeGreaterThan(0);
      }
    }
  });

  it('every NPC mini-game has a config', () => {
    for (const npc of npcs) {
      if (npc.miniGameId) {
        expect(minigames.some((g) => g.id === npc.miniGameId), npc.miniGameId).toBe(true);
      }
    }
  });

  it('every kingdom toy exists and Lothal has 3 zones and a cargo decision', () => {
    for (const k of kingdoms) {
      expect(toys.some((t) => t.id === k.toyId), k.id).toBe(true);
    }
    const lothal = kingdoms.find((k) => k.id === 'lothal');
    expect(lothal?.zones).toHaveLength(3);
    expect(lothal?.cargoDecisionPrompt?.options.length).toBeGreaterThan(0);
  });
});
