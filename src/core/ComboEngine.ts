import type {
  MilestoneType,
  RewardResult,
  VocabTier,
  WateringCanTier,
} from './types';

export const CRITICAL_SPEED_THRESHOLD_MS = 4000;
export const FAST_GROW_WATER_REDUCTION = 0.3;
export const GOLDEN_XP_MULTIPLIER = 1.5;
export const FEVER_DURATION_MS = 60_000;

export const WATERING_CAN_ORDER: readonly WateringCanTier[] = [
  'basic',
  'copper',
  'silver',
  'gold',
  'diamond',
];

export const WATERING_CAN_MULTIPLIERS: Record<WateringCanTier, number> = {
  basic: 1.0,
  copper: 1.15,
  silver: 1.3,
  gold: 1.45,
  diamond: 1.65,
};

export const WATERING_CAN_LABELS: Record<WateringCanTier, string> = {
  basic: 'Basic Can',
  copper: 'Copper Can (+15%)',
  silver: 'Silver Can (+30%)',
  gold: 'Gold Can (+45%)',
  diamond: 'Diamond Can (+65%)',
};

export interface ComboEvaluationInput {
  isCorrect: boolean;
  elapsedMs: number;
  tier: VocabTier;
  baseXp: number;
  currentStreak: number;
  bestStreak: number;
  currentToolTier: WateringCanTier;
  attemptNumber: number;
  hasGoldenFertilizerActive: boolean;
}

export class ComboEngine {
  static getNextWateringCanTier(
    current: WateringCanTier,
  ): WateringCanTier | null {
    const idx = WATERING_CAN_ORDER.indexOf(current);
    if (idx < 0 || idx >= WATERING_CAN_ORDER.length - 1) {
      return null;
    }
    return WATERING_CAN_ORDER[idx + 1] ?? null;
  }

  static getWateringCanMultiplier(tier: WateringCanTier): number {
    return WATERING_CAN_MULTIPLIERS[tier];
  }

  static calculateLevel(totalXp: number): {
    level: number;
    currentLevelXp: number;
    nextLevelXp: number;
    progressRatio: number;
  } {
    const safeXp = Math.max(0, Math.floor(totalXp));
    const level = Math.floor(safeXp / 200) + 1;
    const levelFloor = (level - 1) * 200;
    const currentLevelXp = safeXp - levelFloor;
    const nextLevelXp = 200;
    return {
      level,
      currentLevelXp,
      nextLevelXp,
      progressRatio: Math.min(1, currentLevelXp / nextLevelXp),
    };
  }

  static evaluateQuizResult(input: ComboEvaluationInput): RewardResult {
    const clampedElapsed = Math.max(0, input.elapsedMs);

    if (!input.isCorrect) {
      return {
        isCorrect: false,
        newStreak: 0,
        bestStreak: input.bestStreak,
        elapsedMs: clampedElapsed,
        isCriticalSpeed: false,
        xpEarned: 0,
        xpMultiplier: 1,
        growthAccelerationRatio: 0,
        milestonesTriggered: [],
        fastGrowReductionRatio: 0,
        goldenFertilizerGranted: false,
        feverTimeTriggered: false,
        feverDurationMs: 0,
        bonusTier3SeedGranted: false,
        lexiChestDropped: false,
        newWateringCanTier: null,
      };
    }

    const newStreak = input.currentStreak + 1;
    const bestStreak = Math.max(input.bestStreak, newStreak);
    const isCriticalSpeed = clampedElapsed <= CRITICAL_SPEED_THRESHOLD_MS;

    const milestonesTriggered: MilestoneType[] = [];
    let fastGrowReductionRatio = 0;
    let goldenFertilizerGranted = false;
    let feverTimeTriggered = false;
    let feverDurationMs = 0;
    let bonusTier3SeedGranted = false;

    if (newStreak > 0 && newStreak % 3 === 0) {
      milestonesTriggered.push('FAST_GROW_WATER');
      fastGrowReductionRatio = FAST_GROW_WATER_REDUCTION;
    }

    if (newStreak > 0 && newStreak % 5 === 0) {
      milestonesTriggered.push('GOLDEN_FERTILIZER');
      goldenFertilizerGranted = true;
    }

    if (newStreak > 0 && newStreak % 10 === 0) {
      milestonesTriggered.push('FEVER_TIME');
      feverTimeTriggered = true;
      feverDurationMs = FEVER_DURATION_MS;
      bonusTier3SeedGranted = true;
    }

    // Streak & speed XP multipliers
    let xpMultiplier = 1;
    if (isCriticalSpeed) {
      xpMultiplier *= 1.5;
    }
    if (input.hasGoldenFertilizerActive || goldenFertilizerGranted) {
      xpMultiplier *= GOLDEN_XP_MULTIPLIER;
    }
    if (newStreak >= 3) {
      const streakStepBonus = Math.min(0.5, Math.floor(newStreak / 3) * 0.1);
      xpMultiplier += streakStepBonus;
    }

    const xpEarned = Math.round(input.baseXp * xpMultiplier);

    // Perfect Tier 3 Answer: accurate on first try -> Lexi Chest + Tool Upgrade
    const isPerfectTier3 = input.tier === 3 && input.attemptNumber === 1;
    const lexiChestDropped = isPerfectTier3;
    const newWateringCanTier = lexiChestDropped
      ? ComboEngine.getNextWateringCanTier(input.currentToolTier)
      : null;

    // Growth acceleration applied to the quizzed crop
    const growthAccelerationRatio = isCriticalSpeed ? 0.75 : 0.55;

    return {
      isCorrect: true,
      newStreak,
      bestStreak,
      elapsedMs: clampedElapsed,
      isCriticalSpeed,
      xpEarned,
      xpMultiplier: Number(xpMultiplier.toFixed(2)),
      growthAccelerationRatio,
      milestonesTriggered,
      fastGrowReductionRatio,
      goldenFertilizerGranted,
      feverTimeTriggered,
      feverDurationMs,
      bonusTier3SeedGranted,
      lexiChestDropped,
      newWateringCanTier,
    };
  }
}
