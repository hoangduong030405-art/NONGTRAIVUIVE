import mitt from 'mitt';
import type { FarmToolMode, PlotState, ThemeName, VocabTier } from '../core/types';

/** Lightweight vocab snapshot shared with the Phaser layer (no quiz payload). */
export interface VocabMetaSnapshot {
  id: string;
  word: string;
  tier: VocabTier;
}

export type PlotFxKind = 'plant' | 'water' | 'combo' | 'golden' | 'harvest' | 'error';

/** Events emitted by the Phaser canvas (Layer 1) and consumed by React (Layer 2). */
export type GameToUiEvents = {
  'game:ready': undefined;
  /** User tapped/clicked a plot (store decides: plant / quiz / harvest / info). */
  'game:plot-tap': { plotIndex: number };
  /** Swipe-to-harvest or Fever auto-harvest on a ripe plot. */
  'game:harvest': { plotIndex: number; autoHarvested: boolean };
  /** Animal interacted with in game world */
  'game:animal-interact': { animalType: 'sheep' | 'chicken' | 'cow' | 'dog'; action: string };
  /** Fishing interaction at pond */
  'game:pond-fish': undefined;
  /** Manure / cleaning interaction */
  'game:clean-pasture': undefined;
};

/** Events emitted by React (Layer 2) and consumed by the Phaser canvas (Layer 1). */
export type UiToGameEvents = {
  /** Authoritative state snapshot. Phaser never mutates plots itself. */
  'ui:sync': {
    plots: readonly PlotState[];
    vocabMeta: Readonly<Record<string, VocabMetaSnapshot>>;
    speedMultiplier: number;
    feverEndsAt: number;
    activeToolMode: FarmToolMode;
  };
  'ui:plot-fx': { plotIndex: number; kind: PlotFxKind };
  'ui:theme-changed': { theme: ThemeName };
  'ui:tool-mode-changed': { mode: FarmToolMode };
};

export type AppEvents = GameToUiEvents & UiToGameEvents;

/** Zero-latency synchronous event bus bridging Phaser and React. */
export const EventBus = mitt<AppEvents>();
