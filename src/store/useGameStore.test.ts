import { beforeEach, describe, expect, it } from 'vitest';
import { useGameStore } from './useGameStore';

const store = () => useGameStore.getState();
const stepIndex = () => store().activeQuest?.currentStepIndex;

const passGame = (gameId: string) => {
  useGameStore.setState((s) => ({
    miniGameRecords: {
      ...s.miniGameRecords,
      [gameId]: { gameId, stars: 1, bestScore: 100, passed: true }
    }
  }));
};

beforeEach(() => {
  localStorage.clear();
  useGameStore.setState(useGameStore.getInitialState(), true);
});

describe('quest progression', () => {
  it('completes step 0 when the player talks to Somendra', () => {
    expect(stepIndex()).toBe(0);
    store().talkToNpc('npc_bead_artisan');
    expect(stepIndex()).toBe(1);
  });

  it('does not complete step 0 when talking to a different NPC', () => {
    store().talkToNpc('npc_dock_master');
    expect(stepIndex()).toBe(0);
  });

  it('advances exactly one step when Seal Match is won at step 4 (cargo step is not skipped)', () => {
    passGame('bead_driller');
    passGame('tide_dock');
    useGameStore.setState((s) => ({ activeQuest: { ...s.activeQuest!, currentStepIndex: 4 } }));

    store().completeMiniGame('seal_match', 2, 200);

    expect(stepIndex()).toBe(5);
    expect(store().activeQuest?.isComplete).toBe(false);
  });

  it('counts goals achieved out of order when the quest reaches them', () => {
    passGame('bead_driller');
    store().talkToNpc('npc_bead_artisan');
    // Step 1 (Bead Driller) was already passed, so the quest moves on to the barter step.
    expect(stepIndex()).toBe(2);
  });

  it('does not soft-lock when the Kaal Shard is claimed before the cargo decision', () => {
    passGame('bead_driller');
    passGame('tide_dock');
    passGame('seal_match');
    useGameStore.setState((s) => ({ activeQuest: { ...s.activeQuest!, currentStepIndex: 5 } }));

    store().claimKaalShard('lothal');
    expect(stepIndex()).toBe(5); // still waiting on the cargo decision

    store().setCargoDecision('lothal', 'cargo_carnelian_timber');
    expect(store().activeQuest?.isComplete).toBe(true);
    expect(store().activeQuest?.steps.every((s) => s.completed)).toBe(true);
  });

  it('marks all steps completed and the quest complete after the final step', () => {
    passGame('bead_driller');
    passGame('tide_dock');
    passGame('seal_match');
    useGameStore.setState((s) => ({ activeQuest: { ...s.activeQuest!, currentStepIndex: 6 } }));

    store().claimKaalShard('lothal');

    expect(stepIndex()).toBe(7);
    expect(store().activeQuest?.isComplete).toBe(true);
  });
});

describe('mini-game entry', () => {
  it('uses the per-game minimum Urja from content (Seal Match needs 15)', () => {
    useGameStore.setState({ urja: 17 });
    expect(store().startMiniGame('seal_match')).toBe(true);
  });

  it('still blocks entry below the per-game minimum', () => {
    useGameStore.setState({ urja: 17 });
    expect(store().startMiniGame('bead_driller')).toBe(false);
  });
});

describe('pausing', () => {
  it('does not drain Urja while an overlay (dialogue, bag, card) is open', () => {
    useGameStore.setState({ activeScreen: 'kingdom', urja: 80 });
    store().pushOverlay();
    store().drainUrjaPassive();
    expect(store().urja).toBe(80);

    store().popOverlay();
    store().drainUrjaPassive();
    expect(store().urja).toBe(79);
  });

  it('opening and closing the toy viewer keeps the current screen', () => {
    useGameStore.setState({ activeScreen: 'kaal_ghar' });
    store().openToyModal('toy_terracotta_bull');
    expect(store().activeScreen).toBe('kaal_ghar');
    store().closeToyModal();
    expect(store().activeScreen).toBe('kaal_ghar');
    expect(store().activeToyId).toBeNull();
  });
});

describe('persistence', () => {
  it('re-derives the low-Urja flag when a save with low Urja is loaded', async () => {
    localStorage.setItem(
      'katha_kaal_yatri_save',
      JSON.stringify({ state: { urja: 10 }, version: 0 })
    );
    await useGameStore.persist.rehydrate();
    expect(store().urja).toBe(10);
    expect(store().isLowUrja).toBe(true);
  });
});

describe('Kaal Thakaan', () => {
  it('records the failed attempt on the wrong answer that drains Urja to zero', () => {
    useGameStore.setState({ urja: 10, activeScreen: 'kingdom' });
    store().answerCheckpointQuestion('q_tidal_dock', 0, 1);
    expect(store().isKaalThakaanTriggered).toBe(true);
    expect(store().answeredQuestions['q_tidal_dock']?.failedAttempts).toBe(1);
  });
});

describe('resetGame', () => {
  it('restores every piece of progress to the initial state', () => {
    const initial = useGameStore.getInitialState();
    passGame('bead_driller');
    store().talkToNpc('npc_bead_artisan');
    store().consumeFood('barley_cake');
    store().setCargoDecision('lothal', 'cargo_carnelian_timber');
    useGameStore.setState({ gyaan: 500, urja: 3, isKaalThakaanTriggered: true, overlayCount: 2 });

    store().resetGame();

    const s = store();
    expect(s.urja).toBe(100);
    expect(s.gyaan).toBe(0);
    expect(s.activeQuest?.currentStepIndex).toBe(0);
    expect(s.inventory).toEqual(initial.inventory);
    expect(s.cargoDecisions).toEqual({});
    expect(s.miniGameRecords).toEqual(initial.miniGameRecords);
    expect(s.journalEntries.map((j) => j.id)).toEqual(initial.journalEntries.map((j) => j.id));
    expect(s.activeFoodFactId).toBeNull();
    expect(s.isKaalThakaanTriggered).toBe(false);
    expect(s.overlayCount).toBe(0);
  });
});
