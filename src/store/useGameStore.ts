import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  ActiveScreen, 
  Language, 
  InventoryItem, 
  QuestProgress, 
  JournalEntry, 
  MiniGameRecord, 
  PlayerPosition,
  CargoDecisionRecord
} from '../types/game';
import foodsData from '../content/foods.json';
import kingdomsData from '../content/kingdoms.json';
import minigamesData from '../content/minigames.json';

export const MAX_URJA = 100;
export const LOW_URJA_THRESHOLD = 25; // below this, walk speed drops
const DEFAULT_MIN_URJA_TO_ENTER = 20;

interface GameState {
  // Screen & Navigation
  activeScreen: ActiveScreen;
  currentKingdomId: string;
  language: Language;
  soundEnabled: boolean;

  // Urja (Energy) & Gyaan
  urja: number; // 0 - 100
  gyaan: number; // Knowledge score
  isLowUrja: boolean; // urja < 25
  isKaalThakaanTriggered: boolean;
  isPaused: boolean; // paused during minigames and Kaal Thakaan
  overlayCount: number; // number of open modals/overlays; gameplay is paused while > 0
  
  // Player Position in current kingdom
  playerPosition: PlayerPosition;
  
  // Inventory & Economy
  inventory: Record<string, InventoryItem>;
  
  // Quests & Story Decisions
  activeQuest: QuestProgress | null;
  cargoDecisions: Record<string, CargoDecisionRecord>;
  
  // Checkpoints & Questions
  answeredQuestions: Record<string, { answeredCorrectly: boolean; failedAttempts: number }>;
  activeCheckpointQuestionId: string | null;
  activeNpcId: string | null;
  
  // Mini-Games
  activeMiniGameId: string | null;
  miniGameRecords: Record<string, MiniGameRecord>;
  
  // Toys & Kaal Shards
  unlockedToys: string[];
  activeToyId: string | null;
  kaalShards: string[]; // e.g. ['lothal_shard']
  unlockedKingdoms: string[]; // ['lothal']
  
  // Journal & History
  journalEntries: JournalEntry[];
  
  // Food Fact Modal
  activeFoodFactId: string | null;
  
  // Companion Nudge message
  companionMessage: string | null;
  companionMood: 'happy' | 'alert' | 'worried';

  // ACTIONS
  setScreen: (screen: ActiveScreen) => void;
  setLanguage: (lang: Language) => void;
  toggleSound: () => void;
  setPaused: (paused: boolean) => void;
  pushOverlay: () => void;
  popOverlay: () => void;
  setPlayerPosition: (pos: Partial<PlayerPosition>) => void;
  
  // Urja Operations
  drainUrjaPassive: () => void;
  consumeFood: (foodId: string) => boolean;
  applyUrjaChange: (delta: number, reason?: string) => void;
  triggerKaalThakaan: () => void;
  recoverFromKaalThakaan: () => void;
  
  // Checkpoint Interaction
  openCheckpoint: (npcId: string, questionId: string) => void;
  closeCheckpoint: () => void;
  answerCheckpointQuestion: (questionId: string, selectedIndex: number, correctIndex: number) => { isCorrect: boolean; urjaDelta: number; message: string };
  
  // Mini-Games
  startMiniGame: (gameId: string) => boolean;
  completeMiniGame: (gameId: string, stars: number, score: number) => void;
  failMiniGame: (gameId: string) => void;
  closeMiniGame: () => void;
  
  // Inventory & Barter
  addItem: (itemId: string, amount: number, category?: InventoryItem['category']) => void;
  removeItem: (itemId: string, amount: number) => boolean;
  executeBarter: (giveItemId: string, giveAmount: number, receiveItemId: string, receiveAmount: number) => boolean;
  
  // Quests & Story
  talkToNpc: (npcId: string) => void;
  advanceQuestStep: () => void;
  setCargoDecision: (kingdomId: string, optionId: string) => void;
  
  // Toys & Kaal Shards
  openToyModal: (toyId: string) => void;
  closeToyModal: () => void;
  claimKaalShard: (kingdomId: string) => void;
  
  // Companion
  askCompanionHint: () => string | null;
  clearCompanionMessage: () => void;
  
  // Food Fact
  openFoodFact: (foodId: string) => void;
  closeFoodFact: () => void;
  
  // Reset
  resetGame: () => void;
}

const INITIAL_INVENTORY: Record<string, InventoryItem> = {
  carnelian_beads: {
    id: 'carnelian_beads',
    name: { en: 'Carnelian Beads', hi: 'अकीक के मनके' },
    emoji: '🔴',
    count: 2,
    category: 'raw'
  },
  barley_cake: {
    id: 'barley_cake',
    name: { en: 'Steamed Barley Cake', hi: 'जौ की रोटी' },
    emoji: '🫓',
    count: 1,
    category: 'food',
    urjaValue: 35,
    isBanked: false
  }
};

const INITIAL_QUEST: QuestProgress = {
  id: 'lothal_food_quest',
  kingdomId: 'lothal',
  title: {
    en: 'Aaj Ka Bhojan: The Barter Tide',
    hi: 'आज का भोजन: वस्तु विनिमय की लहर'
  },
  currentStepIndex: 0,
  steps: [
    {
      text: {
        en: 'Visit Somendra at the Bead Kiln to learn micro-drilling',
        hi: 'मनका भट्टी पर शिल्पी सोमेंद्र से मिलें और वेधन सीखें'
      },
      completed: false
    },
    {
      text: {
        en: 'Score at least 1 star in the Bead Driller mini-game to earn beads',
        hi: 'अकीक मनका वेधन खेल में १ स्टार पाकर मनके अर्जित करें'
      },
      completed: false
    },
    {
      text: {
        en: 'Barter carnelian beads with Marak at the Dockyard for fresh food',
        hi: 'गोदी पर मारक से मनकों के बदले भोजन का विनिमय करें'
      },
      completed: false
    },
    {
      text: {
        en: 'Guide incoming trade ship safely in the Tidal Dock mini-game',
        hi: 'ज्वारीय गोदी खेल में व्यापारिक जहाज को सुरक्षित घाट लगाएं'
      },
      completed: false
    },
    {
      text: {
        en: 'Archive Indus Seals with Revati at the Acro-Granary',
        hi: 'अन्नागार में रेवती के साथ सिंधु मुहरों का मिलान करें'
      },
      completed: false
    },
    {
      text: {
        en: 'Decide the outbound Gulf cargo consignment for the sailing dhow',
        hi: 'खाड़ी जाने वाले जहाज के लिए माल का निर्णय लें'
      },
      completed: false
    },
    {
      text: {
        en: 'Inspect the Terracotta Bull on wheels and claim the Lothal Kaal Shard!',
        hi: 'पहियों वाले नंदी खिलौने का परीक्षण कर लोथल काल खंड प्राप्त करें!'
      },
      completed: false
    }
  ],
  isComplete: false
};

// Indices into INITIAL_QUEST.steps
const QUEST_STEP = {
  MEET_SOMENDRA: 0,
  BEAD_DRILLER: 1,
  BARTER: 2,
  TIDE_DOCK: 3,
  SEAL_MATCH: 4,
  CARGO_DECISION: 5,
  KAAL_SHARD: 6
} as const;

const LOTHAL_SHARD_ID = 'lothal_shard';

type ProgressState = Pick<GameState, 'miniGameRecords' | 'cargoDecisions' | 'kaalShards'>;

// Whether a step's goal is already met by saved progress. Meeting Somendra and
// bartering are one-off events, so they only complete when they happen.
const isQuestStepDone = (state: ProgressState, stepIndex: number): boolean => {
  switch (stepIndex) {
    case QUEST_STEP.BEAD_DRILLER: return Boolean(state.miniGameRecords['bead_driller']?.passed);
    case QUEST_STEP.TIDE_DOCK: return Boolean(state.miniGameRecords['tide_dock']?.passed);
    case QUEST_STEP.SEAL_MATCH: return Boolean(state.miniGameRecords['seal_match']?.passed);
    case QUEST_STEP.CARGO_DECISION: return Boolean(state.cargoDecisions['lothal']);
    case QUEST_STEP.KAAL_SHARD: return state.kaalShards.includes(LOTHAL_SHARD_ID);
    default: return false;
  }
};

/**
 * Returns the quest after an event: completes `eventStep` if it is the current step,
 * then skips over any following steps whose goals were already achieved out of order.
 */
const progressQuest = (
  quest: QuestProgress | null,
  state: ProgressState,
  eventStep?: number
): QuestProgress | null => {
  if (!quest || quest.isComplete) return quest;

  let index = quest.currentStepIndex;
  if (eventStep === index) index++;
  while (index < quest.steps.length && isQuestStepDone(state, index)) index++;
  if (index === quest.currentStepIndex) return quest;

  return {
    ...quest,
    currentStepIndex: index,
    steps: quest.steps.map((step, idx) => ({ ...step, completed: idx < index })),
    isComplete: index >= quest.steps.length
  };
};

const INITIAL_MINIGAME_RECORDS: Record<string, MiniGameRecord> = {
  bead_driller: { gameId: 'bead_driller', stars: 0, bestScore: 0, passed: false },
  tide_dock: { gameId: 'tide_dock', stars: 0, bestScore: 0, passed: false },
  seal_match: { gameId: 'seal_match', stars: 0, bestScore: 0, passed: false }
};

const WELCOME_JOURNAL_ENTRY: JournalEntry = {
  id: 'welcome_entry',
  timestamp: Date.now(),
  kingdomId: 'lothal',
  title: 'The Cracked Lattu & The Port of Lothal',
  body: 'Our Channapatna spinning top has lost power. We have landed in the ancient Gulf of Khambhat around 2000 BCE. Here, Harappan engineers built the world’s first tidal dockyard. We must stay energized through ancient foods, win the 3 champions, and earn the Lothal Kaal Shard to repair our top.',
  category: 'history',
  status: 'VERIFIED'
};

// Everything that makes up a fresh game (excluding the language and sound settings).
const createInitialProgress = () => ({
  activeScreen: 'kaal_map' as ActiveScreen,
  currentKingdomId: 'lothal',
  urja: MAX_URJA,
  gyaan: 0,
  isLowUrja: false,
  isKaalThakaanTriggered: false,
  isPaused: false,
  overlayCount: 0,
  playerPosition: { x: 320, y: 280, direction: 'S', isMoving: false } as PlayerPosition,
  inventory: INITIAL_INVENTORY,
  activeQuest: INITIAL_QUEST as QuestProgress | null,
  cargoDecisions: {} as Record<string, CargoDecisionRecord>,
  answeredQuestions: {} as GameState['answeredQuestions'],
  activeCheckpointQuestionId: null as string | null,
  activeNpcId: null as string | null,
  activeMiniGameId: null as string | null,
  miniGameRecords: INITIAL_MINIGAME_RECORDS,
  unlockedToys: ['toy_terracotta_bull'],
  activeToyId: null as string | null,
  kaalShards: [] as string[],
  unlockedKingdoms: ['lothal'],
  journalEntries: [WELCOME_JOURNAL_ENTRY],
  activeFoodFactId: null as string | null,
  companionMessage: 'Namaste Yatri! I am your Lothal Terracotta Bull companion. Follow me to explore the ancient port city!' as string | null,
  companionMood: 'happy' as GameState['companionMood']
});

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      ...createInitialProgress(),
      language: 'en',
      soundEnabled: true,

      setScreen: (screen) => set({ activeScreen: screen }),
      setLanguage: (lang) => set({ language: lang }),
      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),
      setPaused: (paused) => set({ isPaused: paused }),
      pushOverlay: () => set((state) => ({ overlayCount: state.overlayCount + 1 })),
      popOverlay: () => set((state) => ({ overlayCount: Math.max(0, state.overlayCount - 1) })),
      setPlayerPosition: (pos) =>
        set((state) => ({ playerPosition: { ...state.playerPosition, ...pos } })),

      drainUrjaPassive: () => {
        const state = get();
        // Paused during dialogue, menus, minigames, or when Kaal Thakaan is already triggered
        if (state.isPaused || state.overlayCount > 0 || state.activeScreen !== 'kingdom' || state.isKaalThakaanTriggered) {
          return;
        }

        const newUrja = Math.max(0, state.urja - 1);
        const isLow = newUrja < LOW_URJA_THRESHOLD;
        
        let companionMsg = state.companionMessage;
        let companionMood = state.companionMood;

        if (newUrja === 0) {
          get().triggerKaalThakaan();
          return;
        } else if (isLow && !state.isLowUrja) {
          companionMsg = state.language === 'en'
            ? 'Warning! Urja is critically low (<25). Walk speed is reduced. Find Somendra or Marak to eat barley cakes or fish!'
            : 'सावधान! ऊर्जा २५ से कम है। चाल धीमी हो गई है। तुरंत कुछ आहार लें!';
          companionMood = 'worried';
        }

        set({
          urja: newUrja,
          isLowUrja: isLow,
          companionMessage: companionMsg,
          companionMood: companionMood
        });
      },

      consumeFood: (foodId: string) => {
        const state = get();
        const item = state.inventory[foodId];
        if (!item || item.count <= 0) return false;

        const foodDef = foodsData.find((f) => f.id === foodId);
        const urjaBoost = foodDef ? foodDef.urjaRestore : (item.urjaValue || 25);
        const newUrja = Math.min(MAX_URJA, state.urja + urjaBoost);

        // Deduct 1 food item
        const newInventory = { ...state.inventory };
        if (newInventory[foodId].count <= 1) {
          delete newInventory[foodId];
        } else {
          newInventory[foodId] = {
            ...newInventory[foodId],
            count: newInventory[foodId].count - 1
          };
        }

        // Add to journal if not already present
        const journalTitle = foodDef ? foodDef.foodFact.title.en : 'Nourishing Food';
        const hasJournal = state.journalEntries.some((j) => j.title === journalTitle);
        const newJournal = [...state.journalEntries];
        if (!hasJournal && foodDef) {
          newJournal.push({
            id: `food_${foodId}_${Date.now()}`,
            timestamp: Date.now(),
            kingdomId: state.currentKingdomId,
            title: foodDef.foodFact.title.en,
            body: foodDef.foodFact.description.en,
            category: 'food',
            source: foodDef.foodFact.source,
            status: foodDef.foodFact.status as 'VERIFIED' | 'INTERPRETATION' | 'VERIFY'
          });
        }

        set({
          urja: newUrja,
          isLowUrja: newUrja < LOW_URJA_THRESHOLD,
          inventory: newInventory,
          activeFoodFactId: foodId,
          journalEntries: newJournal,
          companionMood: 'happy',
          companionMessage: state.language === 'en'
            ? `Delicious! Restored +${urjaBoost} Urja. Knowledge gained!`
            : `स्वादिष्ट! +${urjaBoost} ऊर्जा पुनः प्राप्त हुई!`
        });

        return true;
      },

      applyUrjaChange: (delta: number, reason?: string) => {
        const state = get();
        const newUrja = Math.min(MAX_URJA, Math.max(0, state.urja + delta));
        
        if (newUrja === 0) {
          get().triggerKaalThakaan();
          return;
        }

        set({
          urja: newUrja,
          isLowUrja: newUrja < LOW_URJA_THRESHOLD,
          companionMessage: reason ? reason : state.companionMessage
        });
      },

      triggerKaalThakaan: () => {
        // Kaal Thakaan: Urja reached 0. Top wobbles, player pulled back to Kaal Ghar with 50 Urja.
        // Unbanked food is lost; Gyaan, journal entries, and collected toys are KEPT!
        const state = get();
        const clearedInventory = { ...state.inventory };
        
        // Remove unbanked food
        Object.keys(clearedInventory).forEach((key) => {
          if (clearedInventory[key].category === 'food' && !clearedInventory[key].isBanked) {
            delete clearedInventory[key];
          }
        });

        set({
          urja: 50,
          isLowUrja: false,
          isKaalThakaanTriggered: true,
          activeScreen: 'kaal_ghar',
          inventory: clearedInventory,
          activeMiniGameId: null,
          activeCheckpointQuestionId: null,
          activeNpcId: null,
          isPaused: true,
          companionMood: 'worried',
          companionMessage: state.language === 'en'
            ? 'Kaal Thakaan! Your spinning top wobbled and pulled you safely back to Kaal Ghar. Urja restored to 50.'
            : 'काल थकान! आपका लट्टू डगमगाया और आप सुरक्षित काल घर लौट आए। ऊर्जा ५० पर बहाल हुई।'
        });
      },

      recoverFromKaalThakaan: () => {
        set({
          isKaalThakaanTriggered: false,
          activeScreen: 'kingdom',
          urja: 50,
          isLowUrja: false,
          isPaused: false
        });
      },

      openCheckpoint: (npcId: string, questionId: string) => {
        set({
          activeNpcId: npcId,
          activeCheckpointQuestionId: questionId,
          isPaused: true
        });
      },

      closeCheckpoint: () => {
        set({
          activeCheckpointQuestionId: null,
          activeNpcId: null,
          isPaused: false
        });
      },

      answerCheckpointQuestion: (questionId: string, selectedIndex: number, correctIndex: number) => {
        const state = get();
        const prevHistory = state.answeredQuestions[questionId] || { answeredCorrectly: false, failedAttempts: 0 };
        const isCorrect = selectedIndex === correctIndex;

        if (isCorrect) {
          const urjaDelta = 5;
          const gyaanDelta = 15;
          const newUrja = Math.min(MAX_URJA, state.urja + urjaDelta);

          set({
            urja: newUrja,
            isLowUrja: newUrja < LOW_URJA_THRESHOLD,
            gyaan: state.gyaan + gyaanDelta,
            answeredQuestions: {
              ...state.answeredQuestions,
              [questionId]: { answeredCorrectly: true, failedAttempts: prevHistory.failedAttempts }
            },
            companionMood: 'happy',
            companionMessage: state.language === 'en'
              ? 'Brilliant deduction! +5 Urja & +15 Gyaan awarded.'
              : 'अद्भुत उत्तर! +५ ऊर्जा और +१५ ज्ञान प्राप्त हुआ।'
          });

          return {
            isCorrect: true,
            urjaDelta,
            message: state.language === 'en' ? 'Correct!' : 'सही उत्तर!'
          };
        } else {
          // Educational checkpoint wrong answer: -10 (-15 if same concept is answered wrong again)
          const newFailedAttempts = prevHistory.failedAttempts + 1;
          const penalty = newFailedAttempts > 1 ? 15 : 10;
          const newUrja = Math.max(0, state.urja - penalty);

          set({
            answeredQuestions: {
              ...state.answeredQuestions,
              [questionId]: { answeredCorrectly: false, failedAttempts: newFailedAttempts }
            }
          });

          if (newUrja === 0) {
            get().triggerKaalThakaan();
          } else {
            set({
              urja: newUrja,
              isLowUrja: newUrja < LOW_URJA_THRESHOLD,
              companionMood: 'worried'
            });
          }

          return {
            isCorrect: false,
            urjaDelta: -penalty,
            message: state.language === 'en'
              ? `Incorrect! -${penalty} Urja.`
              : `त्रुटि! -${penalty} ऊर्जा।`
          };
        }
      },

      startMiniGame: (gameId: string) => {
        const state = get();
        const minUrja = minigamesData.find((g) => g.id === gameId)?.minUrjaToEnter ?? DEFAULT_MIN_URJA_TO_ENTER;
        if (state.urja < minUrja) {
          set({
            companionMessage: state.language === 'en'
              ? `You need at least ${minUrja} Urja to enter this champion's contest! Eat some food first.`
              : `इस प्रतियोगिता में भाग लेने के लिए कम से कम ${minUrja} ऊर्जा चाहिए! पहले भोजन करें।`,
            companionMood: 'alert'
          });
          return false;
        }

        set({
          activeMiniGameId: gameId,
          activeScreen: 'minigame',
          isPaused: true
        });
        return true;
      },

      completeMiniGame: (gameId: string, stars: number, score: number) => {
        const state = get();
        const prev = state.miniGameRecords[gameId] || { gameId, stars: 0, bestScore: 0, passed: false };
        const passed = stars >= 1;
        const newStars = Math.max(prev.stars, stars);
        const bestScore = Math.max(prev.bestScore, score);

        const newRecords = {
          ...state.miniGameRecords,
          [gameId]: { gameId, stars: newStars, bestScore, passed: prev.passed || passed }
        };

        // Rewards
        const gyaanBonus = stars * 10;
        let rewardMsg = '';

        // Add food reward if 1+ star
        if (gameId === 'bead_driller' && passed) {
          get().addItem('carnelian_beads', 3, 'raw');
          get().addItem('barley_cake', 1, 'food');
          rewardMsg = 'Earned 3 Carnelian Beads & 1 Barley Cake!';
        } else if (gameId === 'tide_dock' && passed) {
          get().addItem('roasted_fish', 1, 'food');
          rewardMsg = 'Docked safely! Dockmaster gifted Roasted Fish!';
        } else if (gameId === 'seal_match' && passed) {
          get().addItem('jujube_dates', 2, 'food');
          rewardMsg = 'Archives aligned! Earned dried sweet Jujube dates!';
        }

        set({
          miniGameRecords: newRecords,
          gyaan: state.gyaan + gyaanBonus,
          companionMood: 'happy',
          companionMessage: `Champion victory! ${stars} Star(s) earned! ${rewardMsg}`,
          isPaused: true
        });

        // Passing a mini-game completes its quest step (now, or when the quest reaches it)
        set((s) => ({ activeQuest: progressQuest(s.activeQuest, s) }));
      },

      failMiniGame: (_gameId: string) => {
        const state = get();
        // Mini-game fail: -10 Urja
        const penalty = 10;
        const newUrja = Math.max(0, state.urja - penalty);

        if (newUrja === 0) {
          get().triggerKaalThakaan();
        } else {
          set({
            urja: newUrja,
            isLowUrja: newUrja < LOW_URJA_THRESHOLD,
            isPaused: true,
            companionMood: 'alert',
            companionMessage: state.language === 'en'
              ? `Mini-game attempt failed! -${penalty} Urja. Recover with food and try again.`
              : `प्रयास असफल रहा! -${penalty} ऊर्जा। भोजन खाकर पुनः प्रयास करें।`
          });
        }
      },

      closeMiniGame: () => {
        set({
          activeMiniGameId: null,
          activeScreen: 'kingdom',
          isPaused: false
        });
      },

      addItem: (itemId: string, amount: number, category: InventoryItem['category'] = 'raw') => {
        set((state) => {
          const inv = { ...state.inventory };
          if (inv[itemId]) {
            inv[itemId] = { ...inv[itemId], count: inv[itemId].count + amount };
          } else {
            // Find in food defs or fallback
            const foodDef = foodsData.find((f) => f.id === itemId);
            inv[itemId] = {
              id: itemId,
              name: foodDef ? foodDef.name : { en: itemId, hi: itemId },
              emoji: foodDef ? foodDef.emoji : '📦',
              count: amount,
              category: foodDef ? 'food' : category,
              urjaValue: foodDef ? foodDef.urjaRestore : undefined
            };
          }
          return { inventory: inv };
        });
      },

      removeItem: (itemId: string, amount: number) => {
        const state = get();
        const item = state.inventory[itemId];
        if (!item || item.count < amount) return false;

        const newInv = { ...state.inventory };
        if (newInv[itemId].count === amount) {
          delete newInv[itemId];
        } else {
          newInv[itemId] = { ...newInv[itemId], count: newInv[itemId].count - amount };
        }

        set({ inventory: newInv });
        return true;
      },

      executeBarter: (giveItemId: string, giveAmount: number, receiveItemId: string, receiveAmount: number) => {
        const state = get();
        const canGive = get().removeItem(giveItemId, giveAmount);
        if (!canGive) return false;

        get().addItem(receiveItemId, receiveAmount, 'food');

        set((s) => ({ activeQuest: progressQuest(s.activeQuest, s, QUEST_STEP.BARTER) }));

        set({
          companionMood: 'happy',
          companionMessage: state.language === 'en'
            ? 'Barter trade completed! Fresh food in inventory.'
            : 'वस्तु विनिमय सफल! सामग्री थैले में जोड़ी गई।'
        });

        return true;
      },

      talkToNpc: (npcId: string) => {
        if (npcId !== 'npc_bead_artisan') return;
        set((s) => ({ activeQuest: progressQuest(s.activeQuest, s, QUEST_STEP.MEET_SOMENDRA) }));
      },

      advanceQuestStep: () => {
        set((state) => {
          if (!state.activeQuest) return {};
          const nextIndex = state.activeQuest.currentStepIndex + 1;
          const updatedSteps = state.activeQuest.steps.map((step, idx) => ({
            ...step,
            completed: idx < nextIndex
          }));
          const isComplete = nextIndex >= state.activeQuest.steps.length;

          return {
            activeQuest: {
              ...state.activeQuest,
              currentStepIndex: nextIndex,
              steps: updatedSteps,
              isComplete
            }
          };
        });
      },

      setCargoDecision: (kingdomId: string, optionId: string) => {
        const state = get();
        const kingdom = kingdomsData.find((k) => k.id === kingdomId);
        const option = kingdom?.cargoDecisionPrompt?.options.find((o) => o.id === optionId);

        const newDecisions = {
          ...state.cargoDecisions,
          [kingdomId]: {
            kingdomId,
            chosenOptionId: optionId,
            timestamp: Date.now()
          }
        };

        const newJournal = [...state.journalEntries];
        if (option) {
          newJournal.push({
            id: `cargo_${kingdomId}_${Date.now()}`,
            timestamp: Date.now(),
            kingdomId,
            title: `Cargo Consignment: ${option.text.en}`,
            body: `${option.consequence.en} Manifest: ${option.cargoManifest}`,
            category: 'decision',
            status: 'VERIFIED'
          });
        }

        set({
          cargoDecisions: newDecisions,
          journalEntries: newJournal,
          activeScreen: 'kingdom',
          companionMood: 'happy',
          companionMessage: option
            ? `Consignment sent! ${option.consequence.en}`
            : 'Cargo dispatched!'
        });

        set((s) => ({ activeQuest: progressQuest(s.activeQuest, s, QUEST_STEP.CARGO_DECISION) }));
      },

      // The toy viewer is an overlay: it pauses gameplay via pushOverlay while mounted
      // and leaves the current screen (kingdom, Kaal Ghar, ...) underneath it.
      openToyModal: (toyId: string) => set({ activeToyId: toyId }),
      closeToyModal: () => set({ activeToyId: null }),

      claimKaalShard: (kingdomId: string) => {
        const state = get();
        const shardId = `${kingdomId}_shard`;
        if (state.kaalShards.includes(shardId)) return;

        // Check rule: Pass all 3 champions + complete toy interaction
        const bPass = state.miniGameRecords['bead_driller']?.passed;
        const tPass = state.miniGameRecords['tide_dock']?.passed;
        const sPass = state.miniGameRecords['seal_match']?.passed;

        if (!bPass || !tPass || !sPass) {
          set({
            companionMessage: state.language === 'en'
              ? 'You must defeat all 3 Lothal mini-game champions before claiming the Kaal Shard!'
              : 'काल खंड प्राप्त करने के लिए तीनों प्रतियोगिताओं में विजयी होना आवश्यक है!',
            companionMood: 'alert'
          });
          return;
        }

        const newShards = [...state.kaalShards, shardId];
        const newJournal = [
          ...state.journalEntries,
          {
            id: `shard_${shardId}`,
            timestamp: Date.now(),
            kingdomId,
            title: 'Lothal Kaal Shard Restored!',
            body: 'With knowledge of Indus bead craft, tidal maritime architecture, and ancient toy physics, the first glowing Kaal Shard has been affixed to the Channapatna spinning top!',
            category: 'history' as const,
            status: 'VERIFIED' as const
          }
        ];

        set({
          kaalShards: newShards,
          gyaan: state.gyaan + 100,
          journalEntries: newJournal,
          companionMood: 'happy',
          companionMessage: state.language === 'en'
            ? 'KAAL SHARD RESTORED! Your spinning top gleams with temporal energy!'
            : 'काल खंड प्राप्त! आपके लट्टू में समय ऊर्जा लौट आई है!'
        });

        set((s) => ({ activeQuest: progressQuest(s.activeQuest, s, QUEST_STEP.KAAL_SHARD) }));
      },

      askCompanionHint: () => {
        const state = get();
        // Hint from companion: -3 Urja
        if (state.urja <= 3) {
          set({
            companionMessage: state.language === 'en'
              ? 'Urja too low to ask for a hint! Find food first.'
              : 'ऊर्जा बहुत कम है! पहले कुछ आहार लें।'
          });
          return null;
        }

        let hint = '';
        const step = state.activeQuest?.currentStepIndex ?? 0;

        switch (step) {
          case 0:
            hint = state.language === 'en'
              ? 'Hint: Walk east to the Bead Kiln zone. Talk to Somendra the Lapidary to learn how carnelian turns red!'
              : 'संकेत: पूर्व दिशा में मनका भट्टी की ओर जाएं और शिल्पी सोमेंद्र से बात करें!';
            break;
          case 1:
            hint = state.language === 'en'
              ? 'Hint: Play the Bead Driller mini-game. Tap steadily in rhythm to avoid cracking the stone!'
              : 'संकेत: मनका वेधन खेल खेलें। सही ताल में टैप कर मनके अर्जित करें!';
            break;
          case 2:
            hint = state.language === 'en'
              ? 'Hint: Head southwest to the Dockyard. Talk to Marak the Dockmaster and trade 2 beads for barley cakes!'
              : 'संकेत: गोदी पर मारक के पास जाएं और मनकों से भोजन का विनिमय करें!';
            break;
          case 3:
            hint = state.language === 'en'
              ? 'Hint: Play Tide Dock! Press and hold to release the ship into the basin right at high tide.'
              : 'संकेत: ज्वारीय गोदी खेलें! उच्च ज्वार के समय जहाज को गोदी में प्रवेश कराएं।';
            break;
          case 4:
            hint = state.language === 'en'
              ? 'Hint: Visit Revati at the Acro-Granary up on the brick podium. Complete the Seal Match memory game!'
              : 'संकेत: चबूतरे पर अन्नागार में रेवती से मिलें और सिंधु मुहरों का मिलान करें!';
            break;
          case 5:
            hint = state.language === 'en'
              ? 'Hint: Choose whether to send carnelian beads or woven cotton on the ship to Mesopotamia.'
              : 'संकेत: मेसोपोटामिया जाने वाले जहाज के माल का चयन करें।';
            break;
          case 6:
            hint = state.language === 'en'
              ? 'Hint: Open your Toy Bag to inspect the 4000-year-old terracotta wheeled bull and claim your Kaal Shard!'
              : 'संकेत: पहियों वाले नंदी खिलौने का परीक्षण करें और काल खंड प्राप्त करें!';
            break;
          default:
            hint = state.language === 'en'
              ? 'Explore the kingdom, keep an eye on your Urja, and visit Kaal Ghar to review your DIY toy templates!'
              : 'नगर का भ्रमण करें, ऊर्जा का ध्यान रखें और काल घर में खिलौने देखें!';
        }

        const newUrja = Math.max(1, state.urja - 3);
        set({
          urja: newUrja,
          isLowUrja: newUrja < LOW_URJA_THRESHOLD,
          companionMessage: hint,
          companionMood: 'alert'
        });

        return hint;
      },

      clearCompanionMessage: () => set({ companionMessage: null }),

      openFoodFact: (foodId: string) => set({ activeFoodFactId: foodId }),
      closeFoodFact: () => set({ activeFoodFactId: null }),

      resetGame: () => {
        set({
          ...createInitialProgress(),
          journalEntries: [{ ...WELCOME_JOURNAL_ENTRY, timestamp: Date.now() }],
          companionMessage: 'Welcome to Lothal! Ready to live the Katha?'
        });
      }
    }),
    {
      name: 'katha_kaal_yatri_save',
      // isLowUrja is derived from urja and is not saved, so recompute it on load.
      merge: (persisted, current) => {
        const merged = { ...current, ...(persisted as Partial<GameState>) };
        return { ...merged, isLowUrja: merged.urja < LOW_URJA_THRESHOLD };
      },
      partialize: (state) => ({
        urja: state.urja,
        gyaan: state.gyaan,
        inventory: state.inventory,
        activeQuest: state.activeQuest,
        cargoDecisions: state.cargoDecisions,
        answeredQuestions: state.answeredQuestions,
        miniGameRecords: state.miniGameRecords,
        unlockedToys: state.unlockedToys,
        kaalShards: state.kaalShards,
        unlockedKingdoms: state.unlockedKingdoms,
        journalEntries: state.journalEntries,
        language: state.language,
        soundEnabled: state.soundEnabled
      })
    }
  )
);
