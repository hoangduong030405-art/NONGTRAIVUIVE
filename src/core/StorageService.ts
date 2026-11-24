import Dexie, { type Table } from 'dexie';
import { FarmEngine } from './FarmEngine';
import { INITIAL_DAILY_QUESTS } from './questData';
import type {
  BackupPayload,
  PlayerProgress,
  PlotState,
  VocabItem,
  VocabMasteryRecord,
} from './types';

class LexiFarmDatabase extends Dexie {
  profile!: Table<PlayerProgress, string>;
  plots!: Table<PlotState, number>;
  mastery!: Table<VocabMasteryRecord, string>;

  constructor() {
    super('LexiFarmIeltsDB');
    this.version(1).stores({
      profile: 'id',
      plots: 'index, vocabId, tier',
      mastery: 'vocabId, srsLevel, nextReviewAt',
    });
  }
}

export const db = new LexiFarmDatabase();

export function createDefaultSeedInventory(
  vocabList: VocabItem[],
): Record<string, number> {
  const inventory: Record<string, number> = {};
  for (const item of vocabList) {
    if (item.tier === 1) {
      // Tier 1 seeds are infinite; store sentinel -1 or generous display
      inventory[item.id] = 99;
    } else if (item.tier === 2) {
      inventory[item.id] = 4;
    } else {
      inventory[item.id] = 2;
    }
  }
  return inventory;
}

export function createDefaultPlayerProgress(
  vocabList: VocabItem[],
): PlayerProgress {
  return {
    id: 'player',
    xp: 0,
    coins: 100,
    level: 1,
    streak: 0,
    bestStreak: 0,
    totalHarvested: 0,
    criticalAnswers: 0,
    wateringCanTier: 'basic',
    goldenFertilizerCharges: 1,
    feverEndsAt: 0,
    theme: 'wood',
    accent: 'en-GB',
    sfxEnabled: true,
    unlockedTipCardIds: [],
    seedInventory: createDefaultSeedInventory(vocabList),
    stock: {
      cropFodder: 8,
      eggs: 2,
      milk: 2,
      wool: 1,
      fertilizerBags: 1,
      fish: 1,
      bread: 0,
      cheese: 0,
      sweater: 0,
    },
    dailyQuests: INITIAL_DAILY_QUESTS,
    activeWeather: 'sunny',
    updatedAt: Date.now(),
  };
}

export class StorageService {
  static async loadState(vocabList: VocabItem[]): Promise<{
    profile: PlayerProgress;
    plots: PlotState[];
    mastery: Record<string, VocabMasteryRecord>;
  }> {
    try {
      const [storedProfile, storedPlots, storedMastery] = await Promise.all([
        db.profile.get('player'),
        db.plots.orderBy('index').toArray(),
        db.mastery.toArray(),
      ]);

      const defaultInventory = createDefaultSeedInventory(vocabList);
      const defaultProfile = createDefaultPlayerProgress(vocabList);
      const profile: PlayerProgress = storedProfile
        ? {
            ...defaultProfile,
            ...storedProfile,
            seedInventory: {
              ...defaultInventory,
              ...(storedProfile.seedInventory ?? {}),
            },
            stock: {
              ...defaultProfile.stock,
              ...(storedProfile.stock ?? {}),
            },
            dailyQuests: storedProfile.dailyQuests && storedProfile.dailyQuests.length > 0
              ? storedProfile.dailyQuests
              : defaultProfile.dailyQuests,
            coins: storedProfile.coins ?? defaultProfile.coins,
            activeWeather: storedProfile.activeWeather ?? 'sunny',
          }
        : defaultProfile;

      const plots =
        storedPlots.length === FarmEngine.createInitialPlots().length
          ? storedPlots
          : FarmEngine.createInitialPlots();

      if (!storedProfile) {
        await db.profile.put(profile);
      }
      if (storedPlots.length !== plots.length) {
        await db.plots.bulkPut(plots);
      }

      const mastery: Record<string, VocabMasteryRecord> = {};
      for (const rec of storedMastery) {
        mastery[rec.vocabId] = rec;
      }

      return { profile, plots, mastery };
    } catch {
      return {
        profile: createDefaultPlayerProgress(vocabList),
        plots: FarmEngine.createInitialPlots(),
        mastery: {},
      };
    }
  }

  static async saveProfile(profile: PlayerProgress): Promise<void> {
    try {
      await db.profile.put({
        ...profile,
        updatedAt: Date.now(),
      });
    } catch {
      // Non-fatal in restricted storage environments
    }
  }

  static async savePlots(plots: PlotState[]): Promise<void> {
    try {
      await db.plots.bulkPut(plots);
    } catch {
      // Non-fatal in restricted storage environments
    }
  }

  static async savePlot(plot: PlotState): Promise<void> {
    try {
      await db.plots.put(plot);
    } catch {
      // Non-fatal in restricted storage environments
    }
  }

  static async saveMastery(record: VocabMasteryRecord): Promise<void> {
    try {
      await db.mastery.put(record);
    } catch {
      // Non-fatal in restricted storage environments
    }
  }

  static async exportBackupJson(): Promise<string> {
    const [profile, plots, mastery] = await Promise.all([
      db.profile.get('player'),
      db.plots.orderBy('index').toArray(),
      db.mastery.toArray(),
    ]);

    if (!profile) {
      throw new Error('No saved farm profile found to export.');
    }

    const payload: BackupPayload = {
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      profile,
      plots,
      mastery,
    };

    return JSON.stringify(payload, null, 2);
  }

  static async importBackupJson(
    rawJson: string,
    vocabList: VocabItem[],
  ): Promise<{
    profile: PlayerProgress;
    plots: PlotState[];
    mastery: Record<string, VocabMasteryRecord>;
  }> {
    const parsed: unknown = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid backup JSON format.');
    }

    const candidate = parsed as Partial<BackupPayload>;
    if (
      candidate.schemaVersion !== 1 ||
      !candidate.profile ||
      !Array.isArray(candidate.plots) ||
      !Array.isArray(candidate.mastery)
    ) {
      throw new Error('Backup JSON is missing required LexiFarm fields.');
    }

    const validIds = new Set(vocabList.map((v) => v.id));
    const defaults = createDefaultPlayerProgress(vocabList);
    const mergedProfile: PlayerProgress = {
      ...defaults,
      ...candidate.profile,
      id: 'player',
      seedInventory: {
        ...defaults.seedInventory,
        ...(candidate.profile.seedInventory ?? {}),
      },
      stock: {
        ...defaults.stock,
        ...(candidate.profile.stock ?? {}),
      },
      updatedAt: Date.now(),
    };

    const sanitizedPlots = FarmEngine.createInitialPlots().map((empty, idx) => {
      const incoming = candidate.plots?.find((p) => p.index === idx);
      if (!incoming || (incoming.vocabId && !validIds.has(incoming.vocabId))) {
        return empty;
      }
      return {
        ...empty,
        ...incoming,
        index: idx,
      };
    });

    const sanitizedMastery = candidate.mastery.filter(
      (m) => m && typeof m.vocabId === 'string' && validIds.has(m.vocabId),
    );

    await db.transaction('rw', db.profile, db.plots, db.mastery, async () => {
      await db.profile.put(mergedProfile);
      await db.plots.clear();
      await db.plots.bulkPut(sanitizedPlots);
      await db.mastery.clear();
      if (sanitizedMastery.length > 0) {
        await db.mastery.bulkPut(sanitizedMastery);
      }
    });

    const masteryMap: Record<string, VocabMasteryRecord> = {};
    for (const rec of sanitizedMastery) {
      masteryMap[rec.vocabId] = rec;
    }

    return {
      profile: mergedProfile,
      plots: sanitizedPlots,
      mastery: masteryMap,
    };
  }

  static async resetAll(vocabList: VocabItem[]): Promise<{
    profile: PlayerProgress;
    plots: PlotState[];
    mastery: Record<string, VocabMasteryRecord>;
  }> {
    const profile = createDefaultPlayerProgress(vocabList);
    const plots = FarmEngine.createInitialPlots();
    await db.transaction('rw', db.profile, db.plots, db.mastery, async () => {
      await db.profile.put(profile);
      await db.plots.clear();
      await db.plots.bulkPut(plots);
      await db.mastery.clear();
    });
    return { profile, plots, mastery: {} };
  }
}
