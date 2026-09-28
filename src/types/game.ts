export type ActiveScreen = 'kaal_map' | 'kingdom' | 'kaal_ghar' | 'minigame' | 'toy_modal' | 'journal_modal' | 'cargo_modal';

export type Language = 'en' | 'hi';

export interface InventoryItem {
  id: string;
  name: {
    en: string;
    hi: string;
  };
  emoji: string;
  count: number;
  category: 'raw' | 'food' | 'artifact' | 'toy';
  urjaValue?: number;
  isBanked?: boolean; // unbanked food is lost upon Kaal Thakaan
}

export interface QuestProgress {
  id: string;
  kingdomId: string;
  title: {
    en: string;
    hi: string;
  };
  currentStepIndex: number;
  steps: {
    text: { en: string; hi: string };
    completed: boolean;
  }[];
  isComplete: boolean;
}

export interface JournalEntry {
  id: string;
  timestamp: number;
  kingdomId: string;
  title: string;
  body: string;
  category: 'history' | 'craft' | 'food' | 'decision';
  source?: string;
  status: 'VERIFIED' | 'INTERPRETATION' | 'VERIFY';
}

export interface MiniGameRecord {
  gameId: string;
  stars: number; // 0 = unplayed, 1, 2, 3
  bestScore: number;
  passed: boolean;
}

export interface PlayerPosition {
  x: number;
  y: number;
  direction: 'N' | 'S' | 'E' | 'W' | 'NE' | 'NW' | 'SE' | 'SW';
  isMoving: boolean;
}

export interface CargoDecisionRecord {
  kingdomId: string;
  chosenOptionId: string;
  timestamp: number;
}
