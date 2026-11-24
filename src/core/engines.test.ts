import { describe, expect, it } from 'vitest';
import { ComboEngine } from './ComboEngine';
import { getActiveStage, stageForLevel, STAGE_ROADMAP } from './curriculum';
import { FarmEngine } from './FarmEngine';
import { generateDailyQuests, generateRandomMarketOrder } from './questData';

const base = {
  isCorrect: true,
  elapsedMs: 6000,
  tier: 2 as const,
  baseXp: 50,
  currentStreak: 0,
  bestStreak: 0,
  currentToolTier: 'basic' as const,
  attemptNumber: 1,
  hasGoldenFertilizerActive: false,
};

describe('ComboEngine', () => {
  it('resets streak on wrong answer', () => {
    const r = ComboEngine.evaluateQuizResult({ ...base, isCorrect: false, currentStreak: 7, bestStreak: 7 });
    expect(r.newStreak).toBe(0);
    expect(r.bestStreak).toBe(7);
    expect(r.xpEarned).toBe(0);
  });

  it('awards critical speed bonus at <= 4000ms', () => {
    expect(ComboEngine.evaluateQuizResult({ ...base, elapsedMs: 4000 }).isCriticalSpeed).toBe(true);
    expect(ComboEngine.evaluateQuizResult({ ...base, elapsedMs: 4001 }).isCriticalSpeed).toBe(false);
  });

  it('triggers 3x / 5x / 10x milestones', () => {
    expect(ComboEngine.evaluateQuizResult({ ...base, currentStreak: 2 }).milestonesTriggered).toEqual(['FAST_GROW_WATER']);
    expect(ComboEngine.evaluateQuizResult({ ...base, currentStreak: 4 }).goldenFertilizerGranted).toBe(true);
    const fever = ComboEngine.evaluateQuizResult({ ...base, currentStreak: 9 });
    expect(fever.feverTimeTriggered).toBe(true);
    expect(fever.feverDurationMs).toBe(60_000);
    expect(fever.bonusTier3SeedGranted).toBe(true);
  });

  it('drops Lexi Chest + tool upgrade only for perfect Tier 3', () => {
    const perfect = ComboEngine.evaluateQuizResult({ ...base, tier: 3 });
    expect(perfect.lexiChestDropped).toBe(true);
    expect(perfect.newWateringCanTier).toBe('copper');
    expect(ComboEngine.evaluateQuizResult({ ...base, tier: 3, attemptNumber: 2 }).lexiChestDropped).toBe(false);
    expect(ComboEngine.evaluateQuizResult({ ...base, tier: 3, currentToolTier: 'diamond' }).newWateringCanTier).toBeNull();
  });
});

describe('FarmEngine', () => {
  const vocab = { id: 'x', tier: 1, growthDurationMs: 10_000 } as Parameters<typeof FarmEngine.plantSeed>[1];

  it('computes timestamp-based growth stages', () => {
    const plot = FarmEngine.plantSeed(FarmEngine.createEmptyPlot(0), vocab, 0);
    expect(FarmEngine.computePlotStatus(plot, 1000).stage).toBe('SEED');
    expect(FarmEngine.computePlotStatus(plot, 3000).stage).toBe('SPROUT');
    expect(FarmEngine.computePlotStatus(plot, 7000).stage).toBe('MATURE');
    expect(FarmEngine.computePlotStatus(plot, 10_000).isRipe).toBe(true);
  });

  it('Fast-Grow Water cuts remaining time by 30%', () => {
    const plot = FarmEngine.plantSeed(FarmEngine.createEmptyPlot(0), vocab, 0);
    const watered = FarmEngine.applyWaitReduction(plot, 0.3, 0);
    expect(FarmEngine.computePlotStatus(watered, 0).remainingMs).toBe(7000);
  });
});

describe('5-Stage IELTS Curriculum Progression', () => {
  it('computes levels at 100 XP per level', () => {
    expect(ComboEngine.calculateLevel(0).level).toBe(1);
    expect(ComboEngine.calculateLevel(99).level).toBe(1);
    expect(ComboEngine.calculateLevel(100).level).toBe(2);
    expect(ComboEngine.calculateLevel(200).level).toBe(3);
    expect(ComboEngine.calculateLevel(800).level).toBe(9);
  });

  it('maps levels smoothly to Stages 1..5 and respects manual override', () => {
    expect(STAGE_ROADMAP).toHaveLength(5);
    expect(stageForLevel(1)).toBe(1);
    expect(stageForLevel(2)).toBe(1);
    expect(stageForLevel(3)).toBe(2);
    expect(stageForLevel(5)).toBe(3);
    expect(stageForLevel(7)).toBe(4);
    expect(stageForLevel(9)).toBe(5);
    expect(getActiveStage(1, 'auto')).toBe(1);
    expect(getActiveStage(1, 4)).toBe(4);
  });

  it('generates varied daily quests and market orders', () => {
    const quests = generateDailyQuests();
    expect(quests.length).toBeGreaterThanOrEqual(4);
    expect(quests.every((q) => !q.completed && !q.claimed && q.currentCount === 0)).toBe(true);
    const order = generateRandomMarketOrder();
    expect(order.reqAmount).toBeGreaterThanOrEqual(1);
    expect(order.rewardCoins).toBeGreaterThan(0);
  });
});
