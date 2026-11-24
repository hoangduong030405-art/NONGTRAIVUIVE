import { create } from 'zustand';
import { EventBus, type PlotFxKind, type VocabMetaSnapshot } from '../../bridge/EventBus';
import { AudioEngine } from '../../core/AudioEngine';
import {
  ComboEngine,
  WATERING_CAN_LABELS,
  WATERING_CAN_MULTIPLIERS,
} from '../../core/ComboEngine';
import {
  FARM_CROP_PACKS,
  getActiveStage,
  getStageInfo,
  stageForLevel,
} from '../../core/curriculum';
import { FarmEngine } from '../../core/FarmEngine';
import { StorageService } from '../../core/StorageService';
import { LEXI_CHEST_TIPS } from '../../core/tipCards';
import type {
  AccentPreference,
  CurriculumQuestion,
  CurriculumStage,
  DailyQuest,
  FarmStock,
  FarmToolMode,
  FarmUpgrades,
  IeltsTipCard,
  MarketOrder,
  PlayerProgress,
  PlotState,
  RewardResult,
  ThemeName,
  ToastNotification,
  VocabItem,
  VocabMasteryRecord,
  VocabTier,
  WeatherType,
} from '../../core/types';
import {
  generateDailyQuests,
  generateRandomMarketOrder,
  INITIAL_MARKET_ORDERS,
} from '../../core/questData';

/** Spaced-repetition review intervals (ms) for SRS levels 0..5. */
const SRS_INTERVALS_MS = [
  0,
  10 * 60_000,
  60 * 60_000,
  24 * 60 * 60_000,
  3 * 24 * 60 * 60_000,
  7 * 24 * 60 * 60_000,
] as const;
const MAX_SRS_LEVEL = SRS_INTERVALS_MS.length - 1;
const TOAST_TTL_MS = 2600;
const MAX_TOASTS = 4;

const THEME_META_COLOR: Record<ThemeName, string> = {
  wood: '#5c3a21',
  minimal: '#f8fafc',
  dark: '#0b1120',
};

export interface ActiveQuiz {
  plotIndex: number;
  vocabId: string;
  questionId: string;
  /** performance.now() timestamp when the quiz became visible. */
  openedAt: number;
  isFirstAttempt: boolean;
}

export interface QuizOutcome {
  selectedIndex: number;
  reward: RewardResult;
  chestTip: IeltsTipCard | null;
}

export type LoadStatus = 'loading' | 'ready' | 'error';

interface GameState {
  status: LoadStatus;
  errorMessage: string | null;
  vocabList: VocabItem[];
  vocabMap: Record<string, VocabItem>;
  vocabMeta: Record<string, VocabMetaSnapshot>;
  stageQuestions: Partial<Record<CurriculumStage, CurriculumQuestion[]>>;
  questionMap: Record<string, CurriculumQuestion>;
  loadingStage: CurriculumStage | null;
  allTipCards: IeltsTipCard[];

  profile: PlayerProgress | null;
  plots: PlotState[];
  mastery: Record<string, VocabMasteryRecord>;

  selectedSeedId: string | null;
  activeToolMode: FarmToolMode;
  activeQuiz: ActiveQuiz | null;
  quizOutcome: QuizOutcome | null;
  almanacOpen: boolean;
  marketOpen: boolean;
  kitchenOpen: boolean;
  questsOpen: boolean;
  mockTestOpen: boolean;
  fishingOpen: boolean;
  waterAllReadyAt: number;
  toasts: ToastNotification[];
  marketOrders: MarketOrder[];

  init: () => Promise<void>;
  ensureStageLoaded: (stage: CurriculumStage) => Promise<CurriculumQuestion[]>;
  setStageOverride: (override: CurriculumStage | 'auto') => Promise<void>;
  selectSeed: (vocabId: string | null) => void;
  setToolMode: (mode: FarmToolMode) => void;
  setWeather: (weather: WeatherType) => void;
  handlePlotTap: (plotIndex: number) => void;
  harvestPlot: (plotIndex: number, autoHarvested: boolean) => void;
  harvestAllRipe: () => number;
  waterPlotDirectly: (plotIndex: number) => void;
  waterAllGrowing: () => number;
  feedAnimals: (cropCount?: number) => void;
  careAnimal: (animalType: 'sheep' | 'chicken' | 'cow' | 'dog') => void;
  cleanPastureManure: () => void;
  fishAtPond: () => void;
  catchFishWithResult: (
    tier: 'normal' | 'silver' | 'gold',
    bonusCoins: number,
    bonusSeed: boolean,
  ) => void;
  collectWorldTreasure: (kind: 'chest' | 'bug') => void;
  craftItem: (product: 'bread' | 'cheese' | 'sweater' | 'cake' | 'grilledFish') => boolean;
  fulfillOrder: (orderId: string) => boolean;
  claimQuest: (questId: string) => void;
  refreshDailyQuests: () => void;
  updateQuestProgress: (type: DailyQuest['type'], amount?: number) => void;
  buySeedFromMarket: (vocabId: string, costCoins: number, amount?: number) => boolean;
  buyFarmUpgrade: (upgradeKey: keyof FarmUpgrades, costCoins: number, label: string) => boolean;
  awardPronunciationBonus: (word: string) => void;
  recordMockTestResults: (
    results: Array<{ questionId: string; isCorrect: boolean }>,
    xpBonus: number,
    coinBonus: number,
  ) => void;
  markQuizVisible: () => void;
  submitQuizAnswer: (optionIndex: number) => QuizOutcome | null;
  closeQuiz: () => void;
  setTheme: (theme: ThemeName) => void;
  setAccent: (accent: AccentPreference) => void;
  toggleSfx: () => void;
  setAlmanacOpen: (open: boolean) => void;
  setMarketOpen: (open: boolean) => void;
  setKitchenOpen: (open: boolean) => void;
  setQuestsOpen: (open: boolean) => void;
  setMockTestOpen: (open: boolean) => void;
  setFishingOpen: (open: boolean) => void;
  pushToast: (toast: Omit<ToastNotification, 'id' | 'createdAt'>) => void;
  dismissToast: (id: string) => void;
  exportBackup: () => Promise<string>;
  exportSyncCode: () => Promise<string>;
  importBackup: (rawJson: string) => Promise<void>;
  resetFarm: () => Promise<void>;
}

let toastCounter = 0;
const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();
const stageFetchPromises = new Map<CurriculumStage, Promise<CurriculumQuestion[]>>();

function applyThemeToDocument(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_META_COLOR[theme]);
}

function isTier1(tier: VocabTier | null | undefined): boolean {
  return tier === 1;
}

function pickRandom<T>(items: readonly T[]): T | undefined {
  if (items.length === 0) return undefined;
  return items[Math.floor(Math.random() * items.length)];
}

async function fetchStageBank(stage: CurriculumStage): Promise<CurriculumQuestion[]> {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/stage_${stage}.json`);
    if (!res.ok) return [];
    const data = (await res.json()) as CurriculumQuestion[];
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function buildCanonicalCropItems(fallbackVocab: VocabItem[]): VocabItem[] {
  const defaultQuiz = fallbackVocab[0]?.quiz ?? {
    prompt: 'Chọn nghĩa đúng của từ sau:',
    sentence: 'I eat an apple every day.',
    options: ['Quả táo', 'Quả cam', 'Quả chuối', 'Quả nho'],
    correctIndex: 0,
    explanation: 'Apple có nghĩa là Quả táo.',
  };

  return FARM_CROP_PACKS.map((pack) => ({
    id: `crop_t${pack.tier}`,
    tier: pack.tier,
    band: pack.tier === 3 ? 'Cây Cổ Thụ' : pack.tier === 2 ? 'Cây Trung Cấp' : 'Cây Cấp Tốc',
    word: pack.name,
    ipa: pack.tier === 1 ? 'Cấp tốc' : pack.tier === 2 ? 'Trung cấp' : 'Cổ thụ',
    partOfSpeech: 'nông sản',
    meaning: pack.xpBoostLabel,
    example: `Gieo ${pack.name} để hệ thống tự đẩy câu hỏi theo giai đoạn.`,
    growthDurationMs: pack.durationSec * 1000,
    xpReward: pack.tier === 3 ? 65 : pack.tier === 2 ? 40 : 22,
    quizType: 'simple_translation',
    quiz: defaultQuiz,
  }));
}

export const useGameStore = create<GameState>()((set, get) => {
  // --- internal helpers ------------------------------------------------------

  const speedOf = (profile: PlayerProgress | null): number => {
    if (!profile) return 1;
    const base = WATERING_CAN_MULTIPLIERS[profile.wateringCanTier];
    return profile.upgrades?.scarecrow ? base + 0.15 : base;
  };

  const emitSync = (): void => {
    const { plots, vocabMeta, profile, status, activeToolMode } = get();
    if (status !== 'ready' || !profile) return;
    EventBus.emit('ui:sync', {
      plots,
      vocabMeta,
      speedMultiplier: speedOf(profile),
      feverEndsAt: profile.feverEndsAt,
      activeToolMode,
      weather: profile.activeWeather ?? 'sunny',
      upgrades: profile.upgrades ?? { scarecrow: false, beehive: false, well: false, flowerArch: false },
    });
  };

  const fx = (plotIndex: number, kind: PlotFxKind): void => {
    EventBus.emit('ui:plot-fx', { plotIndex, kind });
  };

  const commitProfile = (nextProfile: PlayerProgress): void => {
    const prevProfile = get().profile;
    set({ profile: nextProfile });
    void StorageService.saveProfile(nextProfile);
    if (prevProfile) {
      const oldStage = stageForLevel(prevProfile.level);
      const newStage = stageForLevel(nextProfile.level);
      if (newStage > oldStage) {
        const info = getStageInfo(newStage);
        void get().ensureStageLoaded(newStage);
        get().pushToast({
          variant: 'golden',
          title: `🎉 Chúc mừng lên ${info.title}!`,
          subtitle:
            nextProfile.stageOverride === 'auto'
              ? `${info.band} · Câu hỏi ngẫu nhiên mới đã được kích hoạt!`
              : `Đạt Lv.${nextProfile.level} (${info.band}) · Vào Sổ tay để chuyển giai đoạn`,
        });
      }
    }
  };

  const commitPlots = (plots: PlotState[], changed: readonly number[]): void => {
    set({ plots });
    for (const idx of changed) {
      const p = plots[idx];
      if (p) void StorageService.savePlot(p);
    }
    emitSync();
  };

  const pickQuestionForStage = (stage: CurriculumStage): CurriculumQuestion | undefined => {
    const { stageQuestions, profile, vocabList } = get();
    const pool = stageQuestions[stage] ?? [];
    if (pool.length > 0) {
      const completed = new Set(profile?.completedQuestionIds ?? []);
      const unseen = pool.filter((q) => !completed.has(q.id));
      return pickRandom(unseen.length > 0 ? unseen : pool);
    }
    const targetTier: VocabTier = stage <= 1 ? 1 : stage <= 3 ? 2 : 3;
    const fallbackPool = vocabList.filter((v) => v.tier === targetTier);
    const fallback = pickRandom(fallbackPool.length > 0 ? fallbackPool : vocabList);
    return fallback
      ? {
          ...fallback,
          stage,
          module: `Giai đoạn ${stage}`,
          topic: fallback.partOfSpeech,
        }
      : undefined;
  };

  return {
    status: 'loading',
    errorMessage: null,
    vocabList: [],
    vocabMap: {},
    vocabMeta: {},
    stageQuestions: {},
    questionMap: {},
    loadingStage: null,
    allTipCards: [],

    profile: null,
    plots: FarmEngine.createInitialPlots(),
    mastery: {},

    selectedSeedId: null,
    activeToolMode: 'seeds',
    activeQuiz: null,
    quizOutcome: null,
    almanacOpen: false,
    marketOpen: false,
    kitchenOpen: false,
    questsOpen: false,
    mockTestOpen: false,
    fishingOpen: false,
    waterAllReadyAt: 0,
    toasts: [],
    marketOrders: INITIAL_MARKET_ORDERS,

    // -------------------------------------------------------------------------
    init: async () => {
      if (get().status === 'ready') return;
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}data/ielts_vocab.json`);
        if (!res.ok) throw new Error(`Failed to load vocabulary (${res.status})`);
        const vocabList = (await res.json()) as VocabItem[];

        const vocabMap: Record<string, VocabItem> = {};
        const vocabMeta: Record<string, VocabMetaSnapshot> = {};
        const vocabTips: IeltsTipCard[] = [];
        for (const v of vocabList) {
          vocabMap[v.id] = v;
          vocabMeta[v.id] = { id: v.id, word: v.word, tier: v.tier };
          if (v.tipCard) vocabTips.push({ ...v.tipCard, sourceVocabId: v.id });
        }
        for (const crop of buildCanonicalCropItems(vocabList)) {
          vocabMap[crop.id] = crop;
          vocabMeta[crop.id] = { id: crop.id, word: crop.word, tier: crop.tier };
        }

        const { profile, plots, mastery } = await StorageService.loadState(vocabList);
        applyThemeToDocument(profile.theme);
        AudioEngine.setEnabled(profile.sfxEnabled);

        const activeStage = getActiveStage(profile.level, profile.stageOverride);
        const initialStageBank = await fetchStageBank(activeStage);
        const initialQuestionMap: Record<string, CurriculumQuestion> = {};
        for (const q of initialStageBank) {
          initialQuestionMap[q.id] = q;
        }

        set({
          status: 'ready',
          vocabList,
          vocabMap,
          vocabMeta,
          stageQuestions: initialStageBank.length > 0 ? { [activeStage]: initialStageBank } : {},
          questionMap: initialQuestionMap,
          loadingStage: null,
          allTipCards: [...vocabTips, ...LEXI_CHEST_TIPS],
          profile,
          plots,
          mastery,
          selectedSeedId: vocabMap['crop_t1']?.id ?? vocabList.find((v) => v.tier === 1)?.id ?? null,
        });
        EventBus.emit('ui:theme-changed', { theme: profile.theme });
        emitSync();
      } catch (err) {
        set({
          status: 'error',
          errorMessage: err instanceof Error ? err.message : 'Unknown loading error',
        });
      }
    },

    ensureStageLoaded: async (stage) => {
      const existing = get().stageQuestions[stage];
      if (existing && existing.length > 0) return existing;

      const inflight = stageFetchPromises.get(stage);
      if (inflight) return inflight;

      const promise = (async (): Promise<CurriculumQuestion[]> => {
        set({ loadingStage: stage });
        try {
          const questions = await fetchStageBank(stage);
          if (questions.length > 0) {
            set((state) => {
              const nextMap: Record<string, CurriculumQuestion> = { ...state.questionMap };
              for (const q of questions) {
                nextMap[q.id] = q;
              }
              return {
                stageQuestions: { ...state.stageQuestions, [stage]: questions },
                questionMap: nextMap,
                loadingStage: state.loadingStage === stage ? null : state.loadingStage,
              };
            });
          } else {
            set((state) => ({
              loadingStage: state.loadingStage === stage ? null : state.loadingStage,
            }));
          }
          return questions;
        } finally {
          stageFetchPromises.delete(stage);
        }
      })();

      stageFetchPromises.set(stage, promise);
      return promise;
    },

    setStageOverride: async (override) => {
      const { profile, pushToast } = get();
      if (!profile) return;
      const nextProfile: PlayerProgress = { ...profile, stageOverride: override };
      commitProfile(nextProfile);
      const activeStage = getActiveStage(nextProfile.level, override);
      await get().ensureStageLoaded(activeStage);
      const info = getStageInfo(activeStage);
      pushToast({
        variant: 'info',
        title: override === 'auto' ? `Tự động theo Level (${info.title})` : `Đã chọn ${info.title}`,
        subtitle: `${info.band} · Câu hỏi ngẫu nhiên được đẩy theo giai đoạn này`,
      });
    },

    selectSeed: (vocabId) => set({ selectedSeedId: vocabId, activeToolMode: 'seeds' }),

    setToolMode: (mode) => {
      set({ activeToolMode: mode });
      EventBus.emit('ui:tool-mode-changed', { mode });
    },

    // -------------------------------------------------------------------------
    handlePlotTap: (plotIndex) => {
      const { plots, profile, selectedSeedId, vocabMap, questionMap, activeQuiz, pushToast } = get();
      if (!profile || activeQuiz) return;
      const plot = plots[plotIndex];
      if (!plot) return;

      // EMPTY PLOT → plant selected crop pack & auto-push random question by level
      if (!plot.vocabId) {
        const { activeToolMode } = get();
        if (activeToolMode === 'water') {
          pushToast({ variant: 'info', title: 'Ô đất trống', subtitle: 'Hãy gieo hạt trước khi tưới nước.' });
          return;
        }

        const vocab = selectedSeedId ? vocabMap[selectedSeedId] : undefined;
        if (!vocab) {
          pushToast({ variant: 'info', title: 'Chọn loại cây', subtitle: 'Hãy chọn loại hạt giống bên dưới để gieo.' });
          fx(plotIndex, 'error');
          return;
        }
        const stock = profile.seedInventory[vocab.id] ?? 0;
        if (!isTier1(vocab.tier) && stock <= 0) {
          pushToast({ variant: 'info', title: 'Hết hạt giống', subtitle: `Thu hoạch thêm "${vocab.word}" hoặc mua thêm ở Chợ.` });
          fx(plotIndex, 'error');
          return;
        }

        const activeStage = getActiveStage(profile.level, profile.stageOverride);
        const picked = pickQuestionForStage(activeStage);
        if (!get().stageQuestions[activeStage]?.length) {
          void get().ensureStageLoaded(activeStage);
        }
        const questionId = picked?.id ?? vocab.id;

        const useGolden = profile.goldenFertilizerCharges > 0;
        const planted: PlotState = {
          ...FarmEngine.plantSeed(plot, vocab, Date.now(), useGolden),
          assignedQuestionId: questionId,
        };
        const nextPlots = plots.slice();
        nextPlots[plotIndex] = planted;

        const nextInventory = { ...profile.seedInventory };
        if (!isTier1(vocab.tier)) nextInventory[vocab.id] = stock - 1;

        commitProfile({
          ...profile,
          seedInventory: nextInventory,
          goldenFertilizerCharges: useGolden
            ? profile.goldenFertilizerCharges - 1
            : profile.goldenFertilizerCharges,
        });
        commitPlots(nextPlots, [plotIndex]);
        fx(plotIndex, useGolden ? 'golden' : 'plant');
        AudioEngine.playPlant();

        // Auto-open random quiz from player's current stage immediately upon planting!
        set({
          activeQuiz: {
            plotIndex,
            vocabId: vocab.id,
            questionId,
            openedAt: performance.now(),
            isFirstAttempt: true,
          },
          quizOutcome: null,
        });
        return;
      }

      const status = FarmEngine.computePlotStatus(plot, Date.now(), speedOf(profile));

      // RIPE → harvest
      if (status.isRipe) {
        get().harvestPlot(plotIndex, false);
        return;
      }

      // If active tool mode is watering, water directly!
      if (get().activeToolMode === 'water') {
        get().waterPlotDirectly(plotIndex);
        return;
      }

      // GROWING & not yet quizzed → open auto-pushed IELTS quiz to fertilize
      if (!plot.quizzed) {
        const activeStage = getActiveStage(profile.level, profile.stageOverride);
        let assignedId = plot.assignedQuestionId ?? null;
        if (!assignedId || (!questionMap[assignedId] && !vocabMap[assignedId])) {
          const picked = pickQuestionForStage(activeStage);
          assignedId = picked?.id ?? plot.vocabId;
          const nextPlots = plots.slice();
          nextPlots[plotIndex] = { ...plot, assignedQuestionId: assignedId };
          commitPlots(nextPlots, [plotIndex]);
        }
        set({
          activeQuiz: {
            plotIndex,
            vocabId: plot.vocabId,
            questionId: assignedId,
            openedAt: performance.now(),
            isFirstAttempt: plot.lastQuizAttemptAt === null,
          },
          quizOutcome: null,
        });
        return;
      }

      // Already quizzed -> watering or status
      get().waterPlotDirectly(plotIndex);
    },

    // Manual watering of a plot (-25% wait time)
    waterPlotDirectly: (plotIndex) => {
      const { plots, profile, pushToast } = get();
      if (!profile) return;
      const plot = plots[plotIndex];
      if (!plot || !plot.vocabId || plot.plantedAt === null) return;

      const now = Date.now();
      const speed = speedOf(profile);
      const ratio = profile.upgrades?.well ? 0.4 : 0.25;
      const reduced = FarmEngine.applyWaitReduction(plot, ratio, now, speed);
      const nextPlots = plots.slice();
      nextPlots[plotIndex] = reduced;

      commitPlots(nextPlots, [plotIndex]);
      fx(plotIndex, 'water');
      AudioEngine.playWater();

      pushToast({
        variant: 'water',
        title: 'Watered crop!',
        subtitle: `Growth time reduced by ${Math.round(ratio * 100)}%`,
      });
    },

    harvestAllRipe: () => {
      const { plots, profile, pushToast } = get();
      if (!profile) return 0;
      const now = Date.now();
      const speed = speedOf(profile);
      const ripeIndices: number[] = [];
      for (const plot of plots) {
        if (plot.vocabId && FarmEngine.computePlotStatus(plot, now, speed).isRipe) {
          ripeIndices.push(plot.index);
        }
      }
      if (ripeIndices.length === 0) return 0;
      for (const idx of ripeIndices) {
        get().harvestPlot(idx, true);
      }
      pushToast({
        variant: 'harvest',
        title: `🌾 Thu hoạch nhanh ${ripeIndices.length} ô mùa!`,
        subtitle: `Kho nông sản đã nhận thêm +${ripeIndices.length * 2}+ lương thực`,
      });
      return ripeIndices.length;
    },

    waterAllGrowing: () => {
      const { plots, profile, waterAllReadyAt, pushToast } = get();
      if (!profile) return 0;
      const now = Date.now();
      if (now < waterAllReadyAt) {
        const waitSec = Math.ceil((waterAllReadyAt - now) / 1000);
        pushToast({
          variant: 'info',
          title: `Bình tưới toàn nông trại đang nạp nước`,
          subtitle: `Vui lòng chờ ${waitSec}s nữa hoặc tưới từng ô`,
        });
        return 0;
      }
      const speed = speedOf(profile);
      const ratio = profile.upgrades?.well ? 0.4 : 0.25;
      const nextPlots = plots.slice();
      const changed: number[] = [];
      for (let i = 0; i < nextPlots.length; i += 1) {
        const p = nextPlots[i];
        if (!p || !p.vocabId || p.plantedAt === null) continue;
        if (FarmEngine.computePlotStatus(p, now, speed).isRipe) continue;
        nextPlots[i] = FarmEngine.applyWaitReduction(p, ratio, now, speed);
        changed.push(i);
        fx(i, 'water');
      }
      if (changed.length === 0) {
        pushToast({ variant: 'info', title: 'Chưa có cây đang lớn', subtitle: 'Hãy gieo hạt trước khi tưới toàn nông trại!' });
        return 0;
      }
      set({ waterAllReadyAt: now + 15_000 });
      commitPlots(nextPlots, changed);
      AudioEngine.playWater();
      pushToast({
        variant: 'water',
        title: `💧 Đã tưới ${changed.length} ô cây đang lớn!`,
        subtitle: `Rút ngắn ${Math.round(ratio * 100)}% thời gian chờ`,
      });
      return changed.length;
    },

    // Feed animals with harvest fodder
    feedAnimals: (amount = 1) => {
      const { profile, pushToast } = get();
      if (!profile) return;
      const currentFodder = profile.stock.cropFodder ?? 0;
      if (currentFodder < amount) {
        pushToast({
          variant: 'info',
          title: 'Not enough animal feed',
          subtitle: 'Harvest more crops to get fresh fodder!',
        });
        return;
      }

      const nextStock: FarmStock = {
        ...profile.stock,
        cropFodder: currentFodder - amount,
      };

      const xpBonus = 15 * amount;
      const nextXp = profile.xp + xpBonus;
      commitProfile({
        ...profile,
        xp: nextXp,
        level: ComboEngine.calculateLevel(nextXp).level,
        stock: nextStock,
      });

      EventBus.emit('ui:feed-animals');
      EventBus.emit('ui:floating-text', {
        target: 'pasture',
        text: `🌾 Cho ăn +${xpBonus} XP`,
        color: '#fde047',
      });
      AudioEngine.playAnimal('cow');
      get().updateQuestProgress('feed', 1);
      pushToast({
        variant: 'animal',
        title: 'Fed farm animals! 🌾',
        subtitle: `Used ${amount} fodder · +${xpBonus} XP`,
      });
    },

    // Collect eggs / milk / wool from animals
    careAnimal: (type) => {
      const { profile, pushToast } = get();
      if (!profile) return;

      const nextStock: FarmStock = { ...profile.stock };
      const bellCoins = profile.upgrades?.luckyBell ? 15 : 0;
      let title = '';
      let sub = '';
      let xpGain = 25;
      let floatText = '+25 XP';

      switch (type) {
        case 'chicken':
          nextStock.eggs = (nextStock.eggs ?? 0) + 1;
          xpGain = 20;
          title = 'Nhặt Trứng Gà! 🥚';
          sub = `Kho trứng: ${nextStock.eggs} · +${xpGain} XP${bellCoins ? ` · +${bellCoins} Xu 🔔` : ''}`;
          floatText = `+1 🥚 +${xpGain} XP`;
          AudioEngine.playAnimal('chicken');
          break;
        case 'cow':
          nextStock.milk = (nextStock.milk ?? 0) + 1;
          xpGain = 25;
          title = 'Vắt Sữa Bò! 🥛';
          sub = `Kho sữa: ${nextStock.milk} · +${xpGain} XP${bellCoins ? ` · +${bellCoins} Xu 🔔` : ''}`;
          floatText = `+1 🥛 +${xpGain} XP`;
          AudioEngine.playAnimal('cow');
          break;
        case 'sheep':
          nextStock.wool = (nextStock.wool ?? 0) + 1;
          xpGain = 25;
          title = 'Cắt Lông Cừu! 🧶';
          sub = `Kho len: ${nextStock.wool} · +${xpGain} XP${bellCoins ? ` · +${bellCoins} Xu 🔔` : ''}`;
          floatText = `+1 🧶 +${xpGain} XP`;
          AudioEngine.playAnimal('sheep');
          break;
        case 'dog':
          xpGain = 15;
          title = 'Vuốt ve Chú Cún! 🐶';
          sub = `Bạn trung thành +${xpGain} XP${bellCoins ? ` · +${bellCoins} Xu 🔔` : ''}`;
          floatText = `Woof! +${xpGain} XP`;
          AudioEngine.playAnimal('dog');
          break;
      }

      const nextXp = profile.xp + xpGain;
      commitProfile({
        ...profile,
        xp: nextXp,
        coins: (profile.coins ?? 0) + bellCoins,
        level: ComboEngine.calculateLevel(nextXp).level,
        stock: nextStock,
      });

      EventBus.emit('ui:floating-text', {
        target: 'pasture',
        text: bellCoins ? `${floatText} +${bellCoins}🪙` : floatText,
        color: '#86efac',
      });
      get().updateQuestProgress('care', 1);
      pushToast({ variant: 'animal', title, subtitle: sub });
    },

    // Clean pasture manure -> free organic fertilizer bags
    cleanPastureManure: () => {
      const { profile, pushToast } = get();
      if (!profile) return;

      const nextStock: FarmStock = {
        ...profile.stock,
        fertilizerBags: (profile.stock.fertilizerBags ?? 0) + 1,
      };

      const nextCharges = profile.goldenFertilizerCharges + 1;
      const nextXp = profile.xp + 30;

      commitProfile({
        ...profile,
        xp: nextXp,
        level: ComboEngine.calculateLevel(nextXp).level,
        goldenFertilizerCharges: nextCharges,
        stock: nextStock,
      });

      EventBus.emit('ui:floating-text', {
        target: 'pasture',
        text: '🧹 +1 Phân Vàng +30 XP',
        color: '#fde047',
      });
      AudioEngine.playPlant();
      pushToast({
        variant: 'golden',
        title: 'Đã dọn sạch chuồng trại! 🧹',
        subtitle: 'Thu được +1 Phân bón vàng & +30 XP',
      });
    },

    // Fishing at the pond (quick fallback)
    fishAtPond: () => {
      get().catchFishWithResult('normal', 5, false);
    },

    catchFishWithResult: (tier, bonusCoins, bonusSeed) => {
      const { profile, pushToast } = get();
      if (!profile) return;

      const fishAmount = tier === 'normal' ? 1 : 2;
      const xpGain = tier === 'gold' ? 85 : tier === 'silver' ? 50 : 25;
      const nextStock: FarmStock = {
        ...profile.stock,
        fish: (profile.stock.fish ?? 0) + fishAmount,
      };

      const nextInv = { ...profile.seedInventory };
      let seedLabel = '';
      if (bonusSeed) {
        const seedKey = Math.random() < 0.4 ? 'crop_t3' : 'crop_t2';
        nextInv[seedKey] = (nextInv[seedKey] ?? 0) + 1;
        seedLabel = seedKey === 'crop_t3' ? ' · +1 Táo Cổ Thụ 🍎' : ' · +1 Cà Chua 🍅';
      }

      const nextXp = profile.xp + xpGain;
      commitProfile({
        ...profile,
        xp: nextXp,
        coins: (profile.coins ?? 0) + bonusCoins,
        level: ComboEngine.calculateLevel(nextXp).level,
        stock: nextStock,
        seedInventory: nextInv,
      });

      AudioEngine.playHarvest();
      get().updateQuestProgress('fish', 1);
      EventBus.emit('ui:floating-text', {
        target: 'pond',
        text: `+${fishAmount} 🐟 +${xpGain} XP +${bonusCoins}🪙`,
        color: tier === 'gold' ? '#fde047' : '#38bdf8',
      });

      const title =
        tier === 'gold'
          ? '🐟 Tuyệt đỉnh! Câu được Cá Hoàng Gia!'
          : tier === 'silver'
            ? '🐠 Câu trúng Cá Chép Vàng!'
            : '🎣 Câu được Cá Rô Tươi!';
      pushToast({
        variant: 'fish',
        title,
        subtitle: `+${fishAmount} Cá · +${xpGain} XP · +${bonusCoins} Xu${seedLabel}`,
      });
    },

    collectWorldTreasure: (kind) => {
      const { profile, pushToast } = get();
      if (!profile) return;

      if (kind === 'chest') {
        const coinsGain = 25 + Math.floor(Math.random() * 26);
        const dropTomato = Math.random() < 0.5;
        const nextInv = { ...profile.seedInventory };
        if (dropTomato) {
          nextInv.crop_t2 = (nextInv.crop_t2 ?? 0) + 1;
        }
        const nextXp = profile.xp + 25;
        commitProfile({
          ...profile,
          xp: nextXp,
          level: ComboEngine.calculateLevel(nextXp).level,
          coins: (profile.coins ?? 0) + coinsGain,
          goldenFertilizerCharges: profile.goldenFertilizerCharges + (dropTomato ? 0 : 1),
          seedInventory: nextInv,
        });
        AudioEngine.playChest();
        pushToast({
          variant: 'golden',
          title: '🎁 Mở Rương Quà Nông Trại!',
          subtitle: `+${coinsGain} Xu · +25 XP${dropTomato ? ' · +1 Cà Chua 🍅' : ' · +1 Phân bón vàng ✨'}`,
        });
      } else {
        const nextXp = profile.xp + 30;
        commitProfile({
          ...profile,
          xp: nextXp,
          level: ComboEngine.calculateLevel(nextXp).level,
          coins: (profile.coins ?? 0) + 15,
        });
        AudioEngine.playCorrect(false);
        pushToast({
          variant: 'quest',
          title: '🐞 Đã bắt gọn Sâu vườn bảo vệ cây!',
          subtitle: '+30 XP · +15 Xu vàng 🪙',
        });
      }
    },

    // -------------------------------------------------------------------------
    harvestPlot: (plotIndex, autoHarvested) => {
      const { plots, profile, vocabMap, mastery, pushToast } = get();
      if (!profile) return;
      const plot = plots[plotIndex];
      if (!plot || !plot.vocabId) {
        emitSync();
        return;
      }
      const now = Date.now();
      const status = FarmEngine.computePlotStatus(plot, now, speedOf(profile));
      const vocab = vocabMap[plot.vocabId];
      if (!status.isRipe || !vocab) {
        emitSync(); // clears Phaser's pending flag
        return;
      }

      const isGolden = plot.isGoldenFertilized;
      const feverActive = now < profile.feverEndsAt;
      const beehiveBonus = profile.upgrades?.beehive ? 15 : 0;
      const xp = Math.round(vocab.xpReward * (isGolden ? 1.5 : 1) * (feverActive ? 2 : 1)) + beehiveBonus;
      const stars = isGolden ? 3 : plot.quizzed ? 2 : 1;

      // Seeds come back from the harvest; golden crops yield an extra one.
      const nextInventory = { ...profile.seedInventory };
      if (!isTier1(vocab.tier)) {
        nextInventory[vocab.id] = (nextInventory[vocab.id] ?? 0) + 1 + (isGolden ? 1 : 0);
      }

      // Add to crop fodder for feeding animals (+1 extra if Windmill Gear upgraded)
      const gearBonus = profile.upgrades?.windmillGear ? 1 : 0;
      const nextStock: FarmStock = {
        ...profile.stock,
        cropFodder: (profile.stock.cropFodder ?? 0) + (isGolden ? 3 : 2) + gearBonus,
      };

      EventBus.emit('ui:floating-text', {
        plotIndex,
        text: `+${xp} XP 🌾`,
        color: isGolden ? '#fde047' : '#86efac',
      });

      // Unlock permanent IELTS Tip Card from Tier 2/3 harvests.
      let unlockedIds = profile.unlockedTipCardIds;
      let newTip: string | null = null;
      if (vocab.tipCard && vocab.tier >= 2 && !unlockedIds.includes(vocab.tipCard.id)) {
        unlockedIds = [...unlockedIds, vocab.tipCard.id];
        newTip = vocab.tipCard.title;
      }

      const xpTotal = profile.xp + xp;
      commitProfile({
        ...profile,
        xp: xpTotal,
        level: ComboEngine.calculateLevel(xpTotal).level,
        totalHarvested: profile.totalHarvested + 1,
        seedInventory: nextInventory,
        stock: nextStock,
        unlockedTipCardIds: unlockedIds,
      });

      const prev = mastery[vocab.id];
      const record: VocabMasteryRecord = {
        vocabId: vocab.id,
        srsLevel: prev?.srsLevel ?? 0,
        correctCount: prev?.correctCount ?? 0,
        attemptCount: prev?.attemptCount ?? 0,
        lastPracticedAt: prev?.lastPracticedAt ?? now,
        nextReviewAt: prev?.nextReviewAt ?? now,
        harvestCount: (prev?.harvestCount ?? 0) + 1,
      };
      set({ mastery: { ...mastery, [vocab.id]: record } });
      void StorageService.saveMastery(record);

      const nextPlots = plots.slice();
      nextPlots[plotIndex] = FarmEngine.clearPlot(plotIndex);
      commitPlots(nextPlots, [plotIndex]);

      fx(plotIndex, isGolden ? 'golden' : 'harvest');
      AudioEngine.playHarvest();
      get().updateQuestProgress('harvest', 1);

      if (!autoHarvested || newTip) {
        pushToast({
          variant: isGolden ? 'golden' : 'harvest',
          title: `${'★'.repeat(stars)} ${vocab.word}`,
          subtitle: `+${xp} XP${feverActive ? ' (Fever x2)' : ''}${autoHarvested ? ' · auto' : ''}`,
        });
      }
      if (newTip) {
        pushToast({ variant: 'chest', title: 'New IELTS Tip Card!', subtitle: newTip });
      }
    },

    markQuizVisible: () => {
      const q = get().activeQuiz;
      if (q) set({ activeQuiz: { ...q, openedAt: performance.now() } });
    },

    // -------------------------------------------------------------------------
    submitQuizAnswer: (optionIndex) => {
      const {
        activeQuiz,
        quizOutcome,
        plots,
        profile,
        vocabMap,
        questionMap,
        mastery,
        allTipCards,
        pushToast,
      } = get();
      if (!activeQuiz || quizOutcome || !profile) return null;
      const question = questionMap[activeQuiz.questionId] ?? vocabMap[activeQuiz.vocabId];
      const plotVocab = vocabMap[activeQuiz.vocabId];
      const plot = plots[activeQuiz.plotIndex];
      if (!question || !plot || plot.vocabId !== activeQuiz.vocabId) return null;

      const now = Date.now();
      const isCorrect = optionIndex === question.quiz.correctIndex;
      const reward = ComboEngine.evaluateQuizResult({
        isCorrect,
        elapsedMs: performance.now() - activeQuiz.openedAt,
        tier: plotVocab?.tier ?? question.tier,
        baseXp: Math.max(question.xpReward, plotVocab?.xpReward ?? question.xpReward),
        currentStreak: profile.streak,
        bestStreak: profile.bestStreak,
        currentToolTier: profile.wateringCanTier,
        attemptNumber: activeQuiz.isFirstAttempt ? 1 : 2,
        hasGoldenFertilizerActive: plot.isGoldenFertilized,
      });

      // --- SRS mastery -------------------------------------------------------
      const prev = mastery[question.id];
      const prevLevel = prev?.srsLevel ?? 0;
      const srsLevel = isCorrect ? Math.min(MAX_SRS_LEVEL, prevLevel + 1) : Math.max(0, prevLevel - 1);
      const record: VocabMasteryRecord = {
        vocabId: question.id,
        srsLevel,
        correctCount: (prev?.correctCount ?? 0) + (isCorrect ? 1 : 0),
        attemptCount: (prev?.attemptCount ?? 0) + 1,
        lastPracticedAt: now,
        nextReviewAt: now + (SRS_INTERVALS_MS[srsLevel] ?? 0),
        harvestCount: prev?.harvestCount ?? 0,
      };
      set({ mastery: { ...mastery, [question.id]: record } });
      void StorageService.saveMastery(record);

      const speed = speedOf(profile);
      const nextPlots = plots.slice();
      const changed: number[] = [activeQuiz.plotIndex];
      let chestTip: IeltsTipCard | null = null;

      if (!isCorrect) {
        nextPlots[activeQuiz.plotIndex] = { ...plot, lastQuizAttemptAt: now };
        commitProfile({ ...profile, streak: 0 });
        commitPlots(nextPlots, changed);
        fx(activeQuiz.plotIndex, 'error');
        AudioEngine.playError();
      } else {
        // Fertilize the quizzed crop
        nextPlots[activeQuiz.plotIndex] = FarmEngine.applyQuizBoost(
          plot,
          reward.growthAccelerationRatio,
          reward.goldenFertilizerGranted,
          now,
        );

        // 3x streak: Fast-Grow Water on every growing crop (-30% remaining time)
        if (reward.fastGrowReductionRatio > 0) {
          for (let i = 0; i < nextPlots.length; i += 1) {
            const p = nextPlots[i];
            if (!p || !p.vocabId) continue;
            nextPlots[i] = FarmEngine.applyWaitReduction(p, reward.fastGrowReductionRatio, now, speed);
            if (!changed.includes(i)) changed.push(i);
            fx(i, 'water');
          }
        }

        const prevCompleted = profile.completedQuestionIds ?? [];
        const completedQuestionIds = prevCompleted.includes(question.id)
          ? prevCompleted
          : [...prevCompleted, question.id];

        let nextProfile: PlayerProgress = {
          ...profile,
          xp: profile.xp + reward.xpEarned,
          level: ComboEngine.calculateLevel(profile.xp + reward.xpEarned).level,
          streak: reward.newStreak,
          bestStreak: reward.bestStreak,
          criticalAnswers: profile.criticalAnswers + (reward.isCriticalSpeed ? 1 : 0),
          completedQuestionIds,
        };

        if (reward.goldenFertilizerGranted) {
          nextProfile = {
            ...nextProfile,
            goldenFertilizerCharges: nextProfile.goldenFertilizerCharges + 1,
          };
        }

        let bonusSeedWord: string | null = null;
        if (reward.feverTimeTriggered) {
          const bonus = vocabMap['crop_t3'] ?? pickRandom(get().vocabList.filter((v) => v.tier === 3));
          const inv = { ...nextProfile.seedInventory };
          if (bonus && reward.bonusTier3SeedGranted) {
            inv[bonus.id] = (inv[bonus.id] ?? 0) + 1;
            bonusSeedWord = bonus.word;
          }
          nextProfile = {
            ...nextProfile,
            feverEndsAt: now + reward.feverDurationMs,
            seedInventory: inv,
          };
        }

        if (reward.lexiChestDropped) {
          const locked = LEXI_CHEST_TIPS.filter(
            (t) => !nextProfile.unlockedTipCardIds.includes(t.id),
          );
          const tip = pickRandom(locked);
          if (tip) {
            chestTip = allTipCards.find((t) => t.id === tip.id) ?? tip;
            nextProfile = {
              ...nextProfile,
              unlockedTipCardIds: [...nextProfile.unlockedTipCardIds, tip.id],
            };
          }
          if (reward.newWateringCanTier) {
            nextProfile = { ...nextProfile, wateringCanTier: reward.newWateringCanTier };
          }
        }

        commitProfile(nextProfile);
        commitPlots(nextPlots, changed);

        fx(activeQuiz.plotIndex, reward.goldenFertilizerGranted || plot.isGoldenFertilized ? 'golden' : 'combo');
        AudioEngine.playCorrect(reward.isCriticalSpeed);

        // --- Non-blocking reward toasts ----------------------------------------
        if (reward.isCriticalSpeed) {
          get().updateQuestProgress('quiz', 1);
          pushToast({
            variant: 'critical',
            title: 'Critical Bonus!',
            subtitle: `Perfect in ${(reward.elapsedMs / 1000).toFixed(1)}s · +${reward.xpEarned} XP`,
          });
        }
        if (reward.milestonesTriggered.includes('FAST_GROW_WATER')) {
          AudioEngine.playWater();
          pushToast({ variant: 'water', title: `${reward.newStreak}x Streak · Fast-Grow Water`, subtitle: 'All crops: −30% remaining time' });
        }
        if (reward.goldenFertilizerGranted) {
          pushToast({ variant: 'golden', title: 'Golden Fertilizer!', subtitle: '3★ Golden yield + 1.5x XP' });
        }
        if (reward.feverTimeTriggered) {
          AudioEngine.playFever();
          pushToast({
            variant: 'fever',
            title: 'IELTS FEVER TIME! 60s',
            subtitle: bonusSeedWord ? `Auto-harvest ON · Bonus seed: ${bonusSeedWord}` : 'Auto-harvest ON',
          });
        }
        if (reward.lexiChestDropped) {
          AudioEngine.playChest();
          pushToast({
            variant: 'chest',
            title: 'Lexi Chest opened!',
            subtitle: [
              chestTip ? `Tip: ${chestTip.title}` : null,
              reward.newWateringCanTier ? WATERING_CAN_LABELS[reward.newWateringCanTier] : null,
            ]
              .filter(Boolean)
              .join(' · ') || 'All chest rewards already collected',
          });
        }
      }

      const outcome: QuizOutcome = { selectedIndex: optionIndex, reward, chestTip };
      set({ quizOutcome: outcome });
      return outcome;
    },

    closeQuiz: () => set({ activeQuiz: null, quizOutcome: null }),

    // -------------------------------------------------------------------------
    setTheme: (theme) => {
      const { profile } = get();
      applyThemeToDocument(theme);
      EventBus.emit('ui:theme-changed', { theme });
      if (profile) commitProfile({ ...profile, theme });
    },

    setAccent: (accent) => {
      const { profile } = get();
      if (profile) commitProfile({ ...profile, accent });
    },

    toggleSfx: () => {
      const { profile } = get();
      if (!profile) return;
      const sfxEnabled = !profile.sfxEnabled;
      AudioEngine.setEnabled(sfxEnabled);
      commitProfile({ ...profile, sfxEnabled });
    },

    setWeather: (weather) => {
      const { profile } = get();
      if (!profile) return;
      const nextProfile = { ...profile, activeWeather: weather };
      commitProfile(nextProfile);
      EventBus.emit('ui:weather-changed', { weather });
      emitSync();

      // If it starts raining, automatically water all active crops!
      if (weather === 'rain') {
        const { plots } = get();
        const now = Date.now();
        const speed = speedOf(profile);
        const nextPlots = plots.slice();
        let wateredCount = 0;
        for (let i = 0; i < nextPlots.length; i += 1) {
          const p = nextPlots[i];
          if (p && p.vocabId && p.plantedAt !== null) {
            nextPlots[i] = FarmEngine.applyWaitReduction(p, 0.35, now, speed);
            wateredCount += 1;
            fx(i, 'water');
          }
        }
        if (wateredCount > 0) {
          commitPlots(nextPlots, Array.from({ length: nextPlots.length }, (_, i) => i));
          AudioEngine.playWater();
          get().pushToast({
            variant: 'water',
            title: 'Trời mưa rào! 🌧️',
            subtitle: 'Toàn bộ hoa màu đã được tưới nước tự động (-35% thời gian)',
          });
        }
      } else if (weather === 'rainbow') {
        get().pushToast({
          variant: 'golden',
          title: 'Cầu vồng xuất hiện! 🌈',
          subtitle: 'Không khí tươi vui tràn ngập nông trại!',
        });
      }
    },

    craftItem: (product) => {
      const { profile, pushToast, updateQuestProgress } = get();
      if (!profile) return false;

      const stock = { ...profile.stock };
      let titleLabel = '';
      let xpEarned = 40;
      if (product === 'bread') {
        if ((stock.cropFodder ?? 0) < 3) {
          pushToast({ variant: 'info', title: 'Thiếu nguyên liệu', subtitle: 'Cần 3 Lương thực hoa màu để nướng bánh mì!' });
          return false;
        }
        stock.cropFodder -= 3;
        stock.bread = (stock.bread ?? 0) + 1;
        titleLabel = 'Ổ Bánh Mì 🥖';
        xpEarned = 40;
      } else if (product === 'cheese') {
        if ((stock.milk ?? 0) < 2) {
          pushToast({ variant: 'info', title: 'Thiếu nguyên liệu', subtitle: 'Cần 2 Bình Sữa bò để ủ Phô mai!' });
          return false;
        }
        stock.milk -= 2;
        stock.cheese = (stock.cheese ?? 0) + 1;
        titleLabel = 'Miếng Phô Mai 🧀';
        xpEarned = 50;
      } else if (product === 'sweater') {
        if ((stock.wool ?? 0) < 2) {
          pushToast({ variant: 'info', title: 'Thiếu nguyên liệu', subtitle: 'Cần 2 Cuộn Len cừu để dệt Áo ấm!' });
          return false;
        }
        stock.wool -= 2;
        stock.sweater = (stock.sweater ?? 0) + 1;
        titleLabel = 'Áo Len Ấm 🧶';
        xpEarned = 60;
      } else if (product === 'cake') {
        if ((stock.eggs ?? 0) < 2 || (stock.milk ?? 0) < 1) {
          pushToast({ variant: 'info', title: 'Thiếu nguyên liệu', subtitle: 'Cần 2 Trứng gà + 1 Bình Sữa bò để làm Bánh kem!' });
          return false;
        }
        stock.eggs -= 2;
        stock.milk -= 1;
        stock.cake = (stock.cake ?? 0) + 1;
        titleLabel = 'Bánh Kem Trứng Sữa 🍰';
        xpEarned = 65;
      } else if (product === 'grilledFish') {
        if ((stock.fish ?? 0) < 2 || (stock.cropFodder ?? 0) < 1) {
          pushToast({ variant: 'info', title: 'Thiếu nguyên liệu', subtitle: 'Cần 2 Cá tươi + 1 Lương thực để làm Cá nướng!' });
          return false;
        }
        stock.fish -= 2;
        stock.cropFodder -= 1;
        stock.grilledFish = (stock.grilledFish ?? 0) + 1;
        titleLabel = 'Cá Nướng Bơ Tỏi 🍣';
        xpEarned = 70;
      }

      const nextXp = profile.xp + xpEarned;
      commitProfile({
        ...profile,
        xp: nextXp,
        level: ComboEngine.calculateLevel(nextXp).level,
        stock,
      });

      updateQuestProgress('craft', 1);
      AudioEngine.playCorrect();
      pushToast({
        variant: 'market',
        title: `Chế biến thành công: ${titleLabel}`,
        subtitle: `+${xpEarned} XP · Sẵn sàng giao hàng cho thị trường`,
      });
      return true;
    },

    fulfillOrder: (orderId) => {
      const { profile, marketOrders, pushToast } = get();
      if (!profile) return false;

      const order = marketOrders.find((o) => o.id === orderId);
      if (!order) return false;

      const stock = { ...profile.stock };
      const available = stock[order.reqItem] ?? 0;
      if (available < order.reqAmount) {
        pushToast({
          variant: 'info',
          title: 'Chưa đủ hàng giao',
          subtitle: `Cần ${order.reqAmount} đơn vị ${order.reqItem} (Hiện có: ${available})`,
        });
        return false;
      }

      stock[order.reqItem] = available - order.reqAmount;
      const coinMultiplier = profile.upgrades?.flowerArch ? 1.15 : 1;
      const coinsEarned = Math.round(order.rewardCoins * coinMultiplier);
      const nextCoins = (profile.coins ?? 0) + coinsEarned;
      const nextXp = profile.xp + order.rewardXp;

      // Replace fulfilled order with a fresh varied IELTS market order
      const remainingOrders = marketOrders.filter((o) => o.id !== orderId);
      const newOrders = [...remainingOrders, generateRandomMarketOrder()];

      commitProfile({
        ...profile,
        coins: nextCoins,
        xp: nextXp,
        level: ComboEngine.calculateLevel(nextXp).level,
        stock,
      });

      set({ marketOrders: newOrders });
      AudioEngine.playChest();
      pushToast({
        variant: 'market',
        title: `Đã giao đơn cho ${order.customerName}! 🚚`,
        subtitle: `+${coinsEarned} Xu vàng 🪙 · +${order.rewardXp} XP (${order.ieltsTopic})`,
      });
      return true;
    },

    claimQuest: (questId) => {
      const { profile, pushToast } = get();
      if (!profile) return;

      const quest = profile.dailyQuests.find((q) => q.id === questId);
      if (!quest || !quest.completed || quest.claimed) return;

      const nextQuests = profile.dailyQuests.map((q) =>
        q.id === questId ? { ...q, claimed: true } : q,
      );

      const nextCoins = (profile.coins ?? 0) + quest.rewardCoins;
      const nextXp = profile.xp + quest.rewardXp;

      commitProfile({
        ...profile,
        coins: nextCoins,
        xp: nextXp,
        level: ComboEngine.calculateLevel(nextXp).level,
        dailyQuests: nextQuests,
      });

      AudioEngine.playChest();
      pushToast({
        variant: 'quest',
        title: 'Nhận thưởng nhiệm vụ! 🏆',
        subtitle: `+${quest.rewardCoins} Xu vàng 🪙 · +${quest.rewardXp} XP`,
      });
    },

    refreshDailyQuests: () => {
      const { profile, pushToast } = get();
      if (!profile) return;
      const freshQuests = generateDailyQuests();
      commitProfile({
        ...profile,
        dailyQuests: freshQuests,
      });
      AudioEngine.playPlant();
      pushToast({
        variant: 'quest',
        title: 'Đã làm mới 5 Nhiệm Vụ Mới! 🎯',
        subtitle: 'Hoàn thành để kiếm thêm Xu vàng 🪙 và XP',
      });
    },

    updateQuestProgress: (type, amount = 1) => {
      const { profile } = get();
      if (!profile) return;

      let changed = false;
      const nextQuests = profile.dailyQuests.map((q) => {
        if (q.type === type && !q.completed) {
          const nextCount = q.currentCount + amount;
          const completed = nextCount >= q.targetCount;
          changed = true;
          return {
            ...q,
            currentCount: Math.min(q.targetCount, nextCount),
            completed,
          };
        }
        return q;
      });

      if (changed) {
        commitProfile({ ...profile, dailyQuests: nextQuests });
      }
    },

    buySeedFromMarket: (vocabId, costCoins, amount = 1) => {
      const { profile, pushToast, vocabMap } = get();
      if (!profile) return false;

      const curCoins = profile.coins ?? 0;
      if (curCoins < costCoins) {
        pushToast({
          variant: 'info',
          title: 'Không đủ Xu vàng 🪙',
          subtitle: 'Giao đơn hàng nông sản tại Chợ để kiếm thêm Xu vàng!',
        });
        return false;
      }

      const inv = { ...profile.seedInventory };
      inv[vocabId] = (inv[vocabId] ?? 0) + amount;

      commitProfile({
        ...profile,
        coins: curCoins - costCoins,
        seedInventory: inv,
      });

      const word = vocabMap[vocabId]?.word ?? 'Hạt giống';
      AudioEngine.playPlant();
      pushToast({
        variant: 'market',
        title: `Đã mua hạt giống: ${word} 🌱`,
        subtitle: `-${costCoins} Xu · Thêm +${amount} hạt vào Túi giống`,
      });
      return true;
    },

    buyFarmUpgrade: (upgradeKey, costCoins, label) => {
      const { profile, pushToast } = get();
      if (!profile) return false;
      const currentUpgrades = profile.upgrades ?? { scarecrow: false, beehive: false, well: false, flowerArch: false };
      if (currentUpgrades[upgradeKey]) return false;

      const curCoins = profile.coins ?? 0;
      if (curCoins < costCoins) {
        pushToast({
          variant: 'info',
          title: 'Không đủ Xu vàng 🪙',
          subtitle: 'Giao đơn hàng hoặc hoàn thành nhiệm vụ để kiếm thêm Xu!',
        });
        return false;
      }

      const nextUpgrades: FarmUpgrades = { ...currentUpgrades, [upgradeKey]: true };
      commitProfile({
        ...profile,
        coins: curCoins - costCoins,
        upgrades: nextUpgrades,
      });

      EventBus.emit('ui:upgrades-changed', { upgrades: nextUpgrades });
      emitSync();
      AudioEngine.playChest();
      pushToast({
        variant: 'golden',
        title: `Đã nâng cấp: ${label}! ✨`,
        subtitle: `Công trình mới đã xuất hiện trên nông trại!`,
      });
      return true;
    },

    awardPronunciationBonus: (word) => {
      const { profile, pushToast } = get();
      if (!profile) return;
      const nextXp = profile.xp + 25;
      commitProfile({
        ...profile,
        xp: nextXp,
        level: ComboEngine.calculateLevel(nextXp).level,
      });
      AudioEngine.playCorrect(true);
      pushToast({
        variant: 'critical',
        title: `Phát âm chuẩn: "${word}"! 🎙️`,
        subtitle: '+25 XP Speaking Bonus',
      });
    },

    recordMockTestResults: (results, xpBonus, coinBonus) => {
      const { profile, mastery, pushToast, updateQuestProgress } = get();
      if (!profile) return;

      const now = Date.now();
      const nextMastery = { ...mastery };
      const completedSet = new Set(profile.completedQuestionIds ?? []);
      let correctCount = 0;

      for (const item of results) {
        const prev = nextMastery[item.questionId];
        const prevLevel = prev?.srsLevel ?? 0;
        const srsLevel = item.isCorrect
          ? Math.min(MAX_SRS_LEVEL, prevLevel + 1)
          : Math.max(0, prevLevel - 1);
        if (item.isCorrect) {
          correctCount += 1;
          completedSet.add(item.questionId);
        }
        const record: VocabMasteryRecord = {
          vocabId: item.questionId,
          srsLevel,
          correctCount: (prev?.correctCount ?? 0) + (item.isCorrect ? 1 : 0),
          attemptCount: (prev?.attemptCount ?? 0) + 1,
          lastPracticedAt: now,
          nextReviewAt: now + (SRS_INTERVALS_MS[srsLevel] ?? 0),
          harvestCount: prev?.harvestCount ?? 0,
        };
        nextMastery[item.questionId] = record;
        void StorageService.saveMastery(record);
      }

      set({ mastery: nextMastery });
      const nextXp = profile.xp + xpBonus;
      const nextCoins = (profile.coins ?? 0) + coinBonus;
      commitProfile({
        ...profile,
        xp: nextXp,
        coins: nextCoins,
        level: ComboEngine.calculateLevel(nextXp).level,
        completedQuestionIds: Array.from(completedSet),
        mockTestsCompleted: (profile.mockTestsCompleted ?? 0) + 1,
      });

      if (correctCount > 0) {
        updateQuestProgress('quiz', Math.min(3, correctCount));
      }
      AudioEngine.playChest();
      pushToast({
        variant: 'golden',
        title: `🎓 Hoàn thành Thi Thử / Ôn tập (${correctCount}/${results.length})!`,
        subtitle: `+${xpBonus} XP · +${coinBonus} Xu vàng 🪙`,
      });
    },

    setMarketOpen: (open) => set({ marketOpen: open }),
    setKitchenOpen: (open) => set({ kitchenOpen: open }),
    setQuestsOpen: (open) => set({ questsOpen: open }),
    setAlmanacOpen: (open) => set({ almanacOpen: open }),
    setMockTestOpen: (open) => set({ mockTestOpen: open }),
    setFishingOpen: (open) => set({ fishingOpen: open }),

    pushToast: (toast) => {
      toastCounter += 1;
      const id = `toast-${toastCounter}`;
      const entry: ToastNotification = { ...toast, id, createdAt: Date.now() };
      const next = [...get().toasts, entry];
      const overflow = next.length - MAX_TOASTS;
      if (overflow > 0) {
        for (const old of next.slice(0, overflow)) {
          const t = toastTimers.get(old.id);
          if (t) clearTimeout(t);
          toastTimers.delete(old.id);
        }
      }
      set({ toasts: overflow > 0 ? next.slice(overflow) : next });
      toastTimers.set(
        id,
        setTimeout(() => get().dismissToast(id), TOAST_TTL_MS),
      );
    },

    dismissToast: (id) => {
      const t = toastTimers.get(id);
      if (t) clearTimeout(t);
      toastTimers.delete(id);
      set({ toasts: get().toasts.filter((x) => x.id !== id) });
    },

    // -------------------------------------------------------------------------
    exportBackup: async () => {
      const p = get().profile;
      if (p) await StorageService.saveProfile(p);
      return StorageService.exportBackupJson();
    },

    exportSyncCode: async () => {
      const p = get().profile;
      if (p) await StorageService.saveProfile(p);
      return StorageService.exportSyncCode();
    },

    importBackup: async (rawJson) => {
      const { vocabList } = get();
      const { profile, plots, mastery } = await StorageService.importBackupJson(rawJson, vocabList);
      applyThemeToDocument(profile.theme);
      AudioEngine.setEnabled(profile.sfxEnabled);
      set({ profile, plots, mastery, activeQuiz: null, quizOutcome: null });
      void get().ensureStageLoaded(getActiveStage(profile.level, profile.stageOverride));
      EventBus.emit('ui:theme-changed', { theme: profile.theme });
      emitSync();
    },

    resetFarm: async () => {
      const { vocabList, profile: old } = get();
      const { profile, plots, mastery } = await StorageService.resetAll(vocabList);
      const keepTheme: PlayerProgress = old ? { ...profile, theme: old.theme, accent: old.accent } : profile;
      void StorageService.saveProfile(keepTheme);
      set({ profile: keepTheme, plots, mastery, activeQuiz: null, quizOutcome: null });
      emitSync();
    },
  };
});

/** Re-push authoritative state whenever the Phaser scene (re)boots. */
export function syncGameNow(): void {
  const { plots, vocabMeta, profile, status, activeToolMode } = useGameStore.getState();
  if (status !== 'ready' || !profile) return;
  const base = WATERING_CAN_MULTIPLIERS[profile.wateringCanTier];
  const speedMultiplier = profile.upgrades?.scarecrow ? base + 0.15 : base;
  EventBus.emit('ui:sync', {
    plots,
    vocabMeta,
    speedMultiplier,
    feverEndsAt: profile.feverEndsAt,
    activeToolMode,
    weather: profile.activeWeather ?? 'sunny',
    upgrades: profile.upgrades ?? { scarecrow: false, beehive: false, well: false, flowerArch: false },
  });
  EventBus.emit('ui:theme-changed', { theme: profile.theme });
}
