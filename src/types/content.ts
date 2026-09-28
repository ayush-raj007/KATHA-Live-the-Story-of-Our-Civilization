export type FactStatus = 'VERIFIED' | 'INTERPRETATION' | 'VERIFY';

export interface QuestionData {
  id: string;
  kingdom: string;
  npcId?: string;
  topic: string;
  question: {
    en: string;
    hi: string;
  };
  options: {
    en: string[];
    hi: string[];
  };
  correctIndex: number;
  explanation: {
    en: string;
    hi: string;
  };
  source: string;
  status: FactStatus;
}

export interface FoodItemData {
  id: string;
  kingdom: string;
  name: {
    en: string;
    hi: string;
  };
  emoji: string;
  urjaRestore: number;
  barterCost: {
    itemId: string;
    amount: number;
  };
  foodFact: {
    title: {
      en: string;
      hi: string;
    };
    description: {
      en: string;
      hi: string;
    };
    source: string;
    status: FactStatus;
  };
}

export interface MiniGameConfig {
  id: string;
  kingdom: string;
  title: {
    en: string;
    hi: string;
  };
  zoneId: string;
  championName: {
    en: string;
    hi: string;
  };
  minUrjaToEnter: number;
  failUrjaCost: number;
  retryUrjaCost: number;
  type: 'rhythm' | 'timing' | 'memory' | 'puzzle';
  description: {
    en: string;
    hi: string;
  };
  lore: {
    en: string;
    hi: string;
  };
  starCriteria: {
    oneStar: string;
    twoStar: string;
    threeStar: string;
  };
  rewards: {
    oneStarFoodId: string;
    threeStarBonus: string;
    gyaanPoints: number;
  };
  status: FactStatus;
}

export interface ToyData {
  id: string;
  kingdom: string;
  name: {
    en: string;
    hi: string;
  };
  craftOrigin: string;
  approximateDate: string;
  historicalContext: {
    en: string;
    hi: string;
  };
  phygitalConnection: {
    en: string;
    hi: string;
  };
  diyTemplate: {
    title: {
      en: string;
      hi: string;
    };
    craftType: string;
    materials: string[];
    instructions: string[];
    printableLayoutType: 'cutout_top' | 'origami_bull' | 'clay_mold';
  };
  status: FactStatus;
}

export interface KingdomZone {
  id: string;
  name: {
    en: string;
    hi: string;
  };
  description: {
    en: string;
    hi: string;
  };
  isometricCenter: { x: number; y: number };
  npcIds: string[];
  miniGameId?: string;
  foodSourceNpcId?: string;
}

export interface KingdomData {
  id: string;
  name: {
    en: string;
    hi: string;
  };
  eraLabel: {
    en: string;
    hi: string;
  };
  yearApprox: number;
  locationMapCoords: { x: number; y: number }; // percentage on India map
  regionName: string;
  stateStatus: 'unlocked' | 'locked';
  tagline: {
    en: string;
    hi: string;
  };
  description: {
    en: string;
    hi: string;
  };
  foodQuest: {
    title: {
      en: string;
      hi: string;
    };
    description: {
      en: string;
      hi: string;
    };
    teachingCore: string;
  };
  cargoDecisionPrompt?: {
    id: string;
    shipDestination: string;
    question: {
      en: string;
      hi: string;
    };
    options: {
      id: string;
      text: { en: string; hi: string };
      consequence: { en: string; hi: string };
      cargoManifest: string;
    }[];
  };
  zones: KingdomZone[];
  toyId: string;
  status: FactStatus;
}

export interface NpcData {
  id: string;
  kingdom: string;
  zoneId: string;
  name: {
    en: string;
    hi: string;
  };
  role: {
    en: string;
    hi: string;
  };
  avatar: string;
  isometricPos: { x: number; y: number };
  introDialogue: {
    en: string[];
    hi: string[];
  };
  checkpointQuestionId?: string;
  barterTrades?: {
    giveItemId: string;
    giveAmount: number;
    receiveItemId: string;
    receiveAmount: number;
    dialogue: { en: string; hi: string };
  }[];
  isMiniGameChampion?: boolean;
  miniGameId?: string;
}
