export type VocabTier = 1 | 2 | 3;

export type ThemeName = 'wood' | 'minimal' | 'dark';

export type AccentPreference = 'en-GB' | 'en-US';

export type WateringCanTier = 'basic' | 'copper' | 'silver' | 'gold' | 'diamond';

export type CropStage = 'EMPTY' | 'SEED' | 'SPROUT' | 'MATURE' | 'GOLDEN_RIPE';

export type QuizType =
  | 'simple_translation'
  | 'phonetic_meaning'
  | 'collocation_match'
  | 'paraphrase_upgrade'
  | 'listening_challenge';

export type MilestoneType =
  | 'FAST_GROW_WATER'
  | 'GOLDEN_FERTILIZER'
  | 'FEVER_TIME';

export type WeatherType = 'sunny' | 'rain' | 'rainbow' | 'night';

export interface VocabTipCardData {
  id: string;
  title: string;
  skill: 'Writing Task 2' | 'Speaking Part 3' | 'Writing & Speaking';
  bandTarget: string;
  upgradeFrom: string;
  upgradeTo: string;
  tip: string;
}

export interface IeltsTipCard extends VocabTipCardData {
  sourceVocabId: string;
}

export interface VocabQuizData {
  prompt: string;
  sentence: string;
  collocationTarget?: string;
  basicPhrase?: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface VocabItem {
  id: string;
  tier: VocabTier;
  band: string;
  word: string;
  ipa: string;
  partOfSpeech: string;
  meaning: string;
  example: string;
  growthDurationMs: number;
  xpReward: number;
  quizType: QuizType;
  quiz: VocabQuizData;
  tipCard?: VocabTipCardData;
}

export type CurriculumStage = 1 | 2 | 3 | 4 | 5;

export interface CurriculumQuestion extends VocabItem {
  stage: CurriculumStage;
  module: string;
  topic: string;
}

export interface PlotState {
  index: number;
  vocabId: string | null;
  assignedQuestionId?: string | null;
  tier: VocabTier | null;
  plantedAt: number | null;
  baseDurationMs: number;
  acceleratedMs: number;
  quizzed: boolean;
  isGoldenFertilized: boolean;
  lastQuizAttemptAt: number | null;
}

export interface PlotComputedStatus {
  stage: CropStage;
  progress: number;
  remainingMs: number;
  isRipe: boolean;
}

export interface RewardResult {
  isCorrect: boolean;
  newStreak: number;
  bestStreak: number;
  elapsedMs: number;
  isCriticalSpeed: boolean;
  xpEarned: number;
  xpMultiplier: number;
  growthAccelerationRatio: number;
  milestonesTriggered: MilestoneType[];
  fastGrowReductionRatio: number;
  goldenFertilizerGranted: boolean;
  feverTimeTriggered: boolean;
  feverDurationMs: number;
  bonusTier3SeedGranted: boolean;
  lexiChestDropped: boolean;
  newWateringCanTier: WateringCanTier | null;
}

export interface VocabMasteryRecord {
  vocabId: string;
  srsLevel: number;
  correctCount: number;
  attemptCount: number;
  lastPracticedAt: number;
  nextReviewAt: number;
  harvestCount: number;
}

export type FarmToolMode = 'seeds' | 'water' | 'feed' | 'care' | 'fish';

export interface FarmStock {
  cropFodder: number;    // Thu hoạch cây trồng
  eggs: number;          // Trứng gà
  milk: number;          // Sữa bò
  wool: number;          // Lông cừu
  fertilizerBags: number;// Phân bón hữu cơ
  fish: number;          // Cá bắt được
  bread: number;         // Chế biến từ lúa mì / fodder
  cheese: number;        // Chế biến từ sữa
  sweater: number;       // Dệt từ len cừu
  cake: number;          // Bánh kem từ trứng gà + sữa
  grilledFish: number;   // Cá nướng bơ tỏi từ cá + lương thực
}

export interface DailyQuest {
  id: string;
  title: string;
  targetCount: number;
  currentCount: number;
  rewardCoins: number;
  rewardXp: number;
  type: 'harvest' | 'quiz' | 'feed' | 'fish' | 'care' | 'craft';
  completed: boolean;
  claimed: boolean;
}

export interface MarketOrder {
  id: string;
  customerName: string;
  reqItem: keyof FarmStock;
  reqAmount: number;
  rewardCoins: number;
  rewardXp: number;
  ieltsTopic: string;
}

export interface FarmUpgrades {
  scarecrow: boolean;   // +15% all crop growth speed
  beehive: boolean;     // +15 bonus XP per harvest
  well: boolean;        // Manual watering cuts 40% wait time instead of 25%
  flowerArch: boolean;  // +15% Coins on Market Orders
}

export interface PlayerProgress {
  id: 'player';
  xp: number;
  coins: number;
  level: number;
  streak: number;
  bestStreak: number;
  totalHarvested: number;
  criticalAnswers: number;
  wateringCanTier: WateringCanTier;
  goldenFertilizerCharges: number;
  feverEndsAt: number;
  theme: ThemeName;
  accent: AccentPreference;
  sfxEnabled: boolean;
  unlockedTipCardIds: string[];
  seedInventory: Record<string, number>;
  stock: FarmStock;
  upgrades: FarmUpgrades;
  dailyQuests: DailyQuest[];
  activeWeather: WeatherType;
  stageOverride: CurriculumStage | 'auto';
  completedQuestionIds: string[];
  mockTestsCompleted?: number;
  updatedAt: number;
}

export interface ToastNotification {
  id: string;
  variant: 'critical' | 'water' | 'golden' | 'fever' | 'chest' | 'harvest' | 'info' | 'animal' | 'fish' | 'market' | 'quest';
  title: string;
  subtitle: string;
  createdAt: number;
}

export interface BackupPayload {
  schemaVersion: number;
  exportedAt: string;
  profile: PlayerProgress;
  plots: PlotState[];
  mastery: VocabMasteryRecord[];
}
