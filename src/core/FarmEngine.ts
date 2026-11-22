import type {
  CropStage,
  PlotComputedStatus,
  PlotState,
  VocabItem,
} from './types';

export const FARM_GRID_COLS = 4;
export const FARM_GRID_ROWS = 3;
export const FARM_PLOT_COUNT = FARM_GRID_COLS * FARM_GRID_ROWS;

export class FarmEngine {
  static createEmptyPlot(index: number): PlotState {
    return {
      index,
      vocabId: null,
      tier: null,
      plantedAt: null,
      baseDurationMs: 0,
      acceleratedMs: 0,
      quizzed: false,
      isGoldenFertilized: false,
      lastQuizAttemptAt: null,
    };
  }

  static createInitialPlots(): PlotState[] {
    const plots: PlotState[] = [];
    for (let i = 0; i < FARM_PLOT_COUNT; i += 1) {
      plots.push(FarmEngine.createEmptyPlot(i));
    }
    return plots;
  }

  /**
   * Zero-allocation primitive progress calculator for Phaser's 60 FPS update loop.
   */
  static computeProgressFast(
    plantedAt: number,
    baseDurationMs: number,
    acceleratedMs: number,
    now: number,
    speedMultiplier: number,
  ): number {
    if (baseDurationMs <= 0) {
      return 1;
    }
    const rawElapsed = Math.max(0, now - plantedAt);
    const effectiveElapsed = rawElapsed * speedMultiplier + acceleratedMs;
    const ratio = effectiveElapsed / baseDurationMs;
    if (ratio >= 1) return 1;
    if (ratio <= 0) return 0;
    return ratio;
  }

  static stageFromProgress(progress: number): CropStage {
    if (progress >= 1) return 'GOLDEN_RIPE';
    if (progress >= 0.65) return 'MATURE';
    if (progress >= 0.25) return 'SPROUT';
    return 'SEED';
  }

  static computePlotStatus(
    plot: PlotState,
    now: number = Date.now(),
    speedMultiplier: number = 1,
  ): PlotComputedStatus {
    if (!plot.vocabId || plot.plantedAt === null) {
      return {
        stage: 'EMPTY',
        progress: 0,
        remainingMs: 0,
        isRipe: false,
      };
    }

    const progress = FarmEngine.computeProgressFast(
      plot.plantedAt,
      plot.baseDurationMs,
      plot.acceleratedMs,
      now,
      speedMultiplier,
    );
    const stage = FarmEngine.stageFromProgress(progress);
    const effectiveElapsed =
      Math.max(0, now - plot.plantedAt) * speedMultiplier + plot.acceleratedMs;
    const remainingEffectiveMs = Math.max(
      0,
      plot.baseDurationMs - effectiveElapsed,
    );
    const remainingMs = Math.ceil(
      remainingEffectiveMs / Math.max(0.1, speedMultiplier),
    );

    return {
      stage,
      progress,
      remainingMs,
      isRipe: stage === 'GOLDEN_RIPE',
    };
  }

  static plantSeed(
    plot: PlotState,
    vocab: VocabItem,
    now: number = Date.now(),
    isGoldenFertilized: boolean = false,
  ): PlotState {
    return {
      index: plot.index,
      vocabId: vocab.id,
      tier: vocab.tier,
      plantedAt: now,
      baseDurationMs: vocab.growthDurationMs,
      acceleratedMs: 0,
      quizzed: false,
      isGoldenFertilized,
      lastQuizAttemptAt: null,
    };
  }

  /**
   * Applies growth acceleration when a plot's IELTS quiz is completed accurately.
   */
  static applyQuizBoost(
    plot: PlotState,
    accelerationRatio: number,
    isGoldenFertilized: boolean,
    now: number = Date.now(),
  ): PlotState {
    if (!plot.vocabId || plot.plantedAt === null) {
      return plot;
    }
    const addedMs = Math.round(plot.baseDurationMs * accelerationRatio);
    return {
      ...plot,
      quizzed: true,
      isGoldenFertilized: plot.isGoldenFertilized || isGoldenFertilized,
      acceleratedMs: plot.acceleratedMs + addedMs,
      lastQuizAttemptAt: now,
    };
  }

  /**
   * Applies Fast-Grow Water (3x streak: reduces remaining wait time by 30%).
   */
  static applyWaitReduction(
    plot: PlotState,
    reductionRatio: number,
    now: number = Date.now(),
    speedMultiplier: number = 1,
  ): PlotState {
    if (!plot.vocabId || plot.plantedAt === null) {
      return plot;
    }
    const effectiveElapsed =
      Math.max(0, now - plot.plantedAt) * speedMultiplier + plot.acceleratedMs;
    const remaining = Math.max(0, plot.baseDurationMs - effectiveElapsed);
    if (remaining <= 0) {
      return plot;
    }
    const boostMs = Math.round(remaining * reductionRatio);
    return {
      ...plot,
      acceleratedMs: plot.acceleratedMs + boostMs,
    };
  }

  static clearPlot(index: number): PlotState {
    return FarmEngine.createEmptyPlot(index);
  }
}
