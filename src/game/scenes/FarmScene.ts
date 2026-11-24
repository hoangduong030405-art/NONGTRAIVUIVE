import Phaser from 'phaser';
import {
  EventBus,
  type PlotFxKind,
  type VocabMetaSnapshot,
} from '../../bridge/EventBus';
import { FarmEngine, FARM_PLOT_COUNT } from '../../core/FarmEngine';
import type { CropStage, FarmUpgrades, PlotState, ThemeName } from '../../core/types';
import { AnimalActor } from '../entities/AnimalActor';
import { FarmerActor } from '../entities/FarmerActor';
import { ParticlePool } from '../pools/ParticlePool';
import { SceneryManager } from '../scenery/SceneryManager';
import { computeWorldLayout } from '../scenery/WorldLayout';

const HUD_TOP_DESKTOP = 88;
const HUD_BOTTOM_DESKTOP = 125;
const HUD_TOP_MOBILE = 105;
const HUD_BOTTOM_MOBILE = 160;
const MOBILE_BREAKPOINT = 768;

const STAGE_TO_INDEX: Record<CropStage, number> = {
  EMPTY: 0,
  SEED: 1,
  SPROUT: 2,
  MATURE: 3,
  GOLDEN_RIPE: 4,
};

const THEME_LABEL: Record<ThemeName, { text: string; stroke: string }> = {
  wood: { text: '#fff8e7', stroke: '#3b2412' },
  minimal: { text: '#1f2937', stroke: '#ffffff' },
  dark: { text: '#e2e8f0', stroke: '#020617' },
};

interface PlotView {
  container: Phaser.GameObjects.Container;
  soil: Phaser.GameObjects.Image;
  crop: Phaser.GameObjects.Image;
  barBg: Phaser.GameObjects.Rectangle;
  barFill: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  timer: Phaser.GameObjects.Text;
  badge: Phaser.GameObjects.Image;
  stageIdx: number;
  soilKey: string;
  badgeKey: string;
  lastSecond: number;
  pendingHarvest: boolean;
}

export class FarmScene extends Phaser.Scene {
  private views: PlotView[] = [];
  private plots: readonly PlotState[] = [];
  private vocabMeta: Readonly<Record<string, VocabMetaSnapshot>> = {};
  private speedMultiplier = 1;
  private feverEndsAt = 0;

  private particles!: ParticlePool;
  private scenery!: SceneryManager;
  private farmer!: FarmerActor;
  private animals: AnimalActor[] = [];

  private cols = 4;
  private rows = 3;
  private cell = 135;
  private originX = 0;
  private originY = 0;

  private pointerDown = false;
  private downPlotIndex = -1;
  private dragHarvested = false;
  private dragDistance = 0;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private trailAccumulator = 0;
  private elapsed = 0;

  constructor() {
    super({ key: 'FarmScene' });
  }

  create(): void {
    this.particles = new ParticlePool(this, 240);
    this.scenery = new SceneryManager(this, this.particles);

    // Build crop plot objects
    this.buildPlotViews();

    // Create playable Chibi Farmer
    this.farmer = new FarmerActor(this, this.scale.width / 2, this.scale.height / 2);

    // Create adorable roaming animals (pasture initialized in layout)
    const initBounds = new Phaser.Geom.Rectangle(0, 0, 100, 100);
    const sheep = new AnimalActor(this, 0, 0, 'sheep', initBounds, this.particles);
    const cow = new AnimalActor(this, 0, 0, 'cow', initBounds, this.particles);
    const chicken1 = new AnimalActor(this, 0, 0, 'chicken', initBounds, this.particles);
    const chicken2 = new AnimalActor(this, 0, 0, 'chicken', initBounds, this.particles);
    const dog = new AnimalActor(this, 0, 0, 'dog', initBounds, this.particles, this.farmer);

    this.animals = [sheep, cow, chicken1, chicken2, dog];

    // Compute layout & setup viewport
    this.layout(this.scale.width, this.scale.height);

    // Event listeners
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.onPointerDown, this);
    this.input.on(Phaser.Input.Events.POINTER_MOVE, this.onPointerMove, this);
    this.input.on(Phaser.Input.Events.POINTER_UP, this.onPointerUp, this);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onPointerUp, this);

    EventBus.on('ui:sync', this.onSync);
    EventBus.on('ui:plot-fx', this.onPlotFx);
    EventBus.on('ui:theme-changed', this.onThemeChanged);
    EventBus.on('ui:weather-changed', (p) => {
      this.scenery.setWeather(p.weather);
    });
    EventBus.on('ui:upgrades-changed', (p) => {
      this.scenery.setUpgrades(p.upgrades);
    });

    EventBus.on('game:pond-fish', () => {
      if (this.farmer) {
        // Find pond location and move farmer there to fish
        this.farmer.walkTo(this.originX - 100, this.originY + 120, () => {
          this.farmer.playAction('fish', 1200);
          this.particles.emitWaterBurst(this.originX - 100, this.originY + 110);
        });
      }
    });

    EventBus.on('game:animal-interact', (payload) => {
      if (this.farmer) {
        const action = payload.action === 'wool' ? 'shear' : payload.action === 'water' ? 'water' : 'wave';
        this.farmer.playAction(action as any, 700);
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.events.once(Phaser.Scenes.Events.DESTROY, this.cleanup, this);

    const initialTheme = document.documentElement.dataset.theme;
    if (initialTheme === 'wood' || initialTheme === 'minimal' || initialTheme === 'dark') {
      this.applyTheme(initialTheme);
    }

    EventBus.emit('game:ready');
  }

  private buildPlotViews(): void {
    for (let i = 0; i < FARM_PLOT_COUNT; i += 1) {
      const soil = this.add.image(0, 0, 'soil-dry');
      const crop = this.add.image(0, -6, 'crop-t1-1').setVisible(false);
      const barBg = this.add
        .rectangle(0, 0, 100, 8, 0x000000, 0.35)
        .setOrigin(0, 0.5)
        .setVisible(false);
      const barFill = this.add
        .rectangle(0, 0, 100, 8, 0x4ade80, 1)
        .setOrigin(0, 0.5)
        .setVisible(false);
      const label = this.add
        .text(0, 0, '', {
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          fontSize: '13px',
          fontStyle: 'bold',
          color: '#fff8e7',
          stroke: '#3b2412',
          strokeThickness: 4,
          align: 'center',
        })
        .setOrigin(0.5, 0.5);
      const timer = this.add
        .text(0, 0, '', {
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: '11px',
          fontStyle: 'bold',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(1, 0.5);
      const badge = this.add.image(0, 0, 'badge-quiz').setVisible(false);

      const container = this.add.container(0, 0, [
        soil,
        crop,
        barBg,
        barFill,
        label,
        timer,
        badge,
      ]);
      container.setDepth(10);

      this.views.push({
        container,
        soil,
        crop,
        barBg,
        barFill,
        label,
        timer,
        badge,
        stageIdx: -1,
        soilKey: 'soil-dry',
        badgeKey: '',
        lastSecond: -1,
        pendingHarvest: false,
      });
    }
  }

  private onResize(gameSize: Phaser.Structs.Size): void {
    this.layout(gameSize.width, gameSize.height);
  }

  private layout(width: number, height: number): void {
    const isMobile = width < MOBILE_BREAKPOINT;
    const isPortrait = height > width;
    this.cols = isPortrait ? 3 : 4;
    this.rows = isPortrait ? 4 : 3;

    const top = isMobile ? HUD_TOP_MOBILE : HUD_TOP_DESKTOP;
    const bottom = isMobile ? HUD_BOTTOM_MOBILE : HUD_BOTTOM_DESKTOP;
    const sidePad = isMobile ? 12 : 36;

    const availW = Math.max(120, width - sidePad * 2);
    const availH = Math.max(120, height - top - bottom);
    this.cell = Math.floor(
      Math.min(availW / this.cols, availH / this.rows, isMobile ? 128 : 155),
    );

    const gridW = this.cell * this.cols;
    const gridH = this.cell * this.rows;
    this.originX = Math.round((width - gridW) / 2);
    this.originY = Math.round(top + (availH - gridH) / 2);

    const soilScale = (this.cell * 0.96) / 160;
    const cropScale = (this.cell * 0.8) / 128;
    const barWidth = this.cell * 0.62;
    const fontPx = Math.max(10, Math.round(this.cell * 0.095));

    for (let i = 0; i < this.views.length; i += 1) {
      const v = this.views[i];
      if (!v) continue;
      const col = i % this.cols;
      const row = Math.floor(i / this.cols);
      v.container.setPosition(
        this.originX + col * this.cell + this.cell / 2,
        this.originY + row * this.cell + this.cell / 2,
      );
      v.soil.setScale(soilScale);
      v.crop.setScale(cropScale).setY(-this.cell * 0.08);
      v.crop.setData('baseScale', cropScale);

      const barY = this.cell * 0.36;
      v.barBg.setPosition(-barWidth / 2, barY).setSize(barWidth, Math.max(5, this.cell * 0.05));
      v.barFill.setPosition(-barWidth / 2, barY).setSize(barWidth, Math.max(5, this.cell * 0.05));

      v.label.setFontSize(fontPx).setY(this.cell * 0.25);
      v.label.setWordWrapWidth(this.cell * 0.9, true);
      v.timer.setFontSize(Math.max(9, fontPx - 2)).setPosition(barWidth / 2, barY - this.cell * 0.075);
      v.badge.setPosition(this.cell * 0.33, -this.cell * 0.33).setScale(this.cell / 145);
    }

    // Dynamic Rich Scenery computation & placement
    const worldLayout = computeWorldLayout(
      width,
      height,
      this.originX,
      this.originY,
      this.cols,
      this.rows,
      this.cell,
    );
    this.scenery.applyLayout(worldLayout);

    // Place Farmer initially near first plot or center
    if (this.farmer) {
      this.farmer.setPosition(this.originX + this.cell / 2, this.originY - 25);
    }

    // Position animals inside pasture bounds
    const p = worldLayout.pastureBounds;
    this.animals.forEach((a, idx) => {
      a.setBounds(p);
      if (a.animalType !== 'dog') {
        const ax = p.x + 20 + ((idx * 45) % Math.max(30, p.width - 40));
        const ay = p.y + 25 + ((idx * 30) % Math.max(20, p.height - 35));
        a.setPosition(ax, ay);
      } else {
        // Dog near farmer
        a.setPosition(this.originX + this.cell / 2 - 40, this.originY - 20);
      }
    });
  }

  private readonly onSync = (payload: {
    plots: readonly PlotState[];
    vocabMeta: Readonly<Record<string, VocabMetaSnapshot>>;
    speedMultiplier: number;
    feverEndsAt: number;
    weather?: 'sunny' | 'rain' | 'rainbow' | 'night';
    upgrades?: FarmUpgrades;
  }): void => {
    this.plots = payload.plots;
    this.vocabMeta = payload.vocabMeta;
    this.speedMultiplier = payload.speedMultiplier;
    this.feverEndsAt = payload.feverEndsAt;
    if (payload.weather) {
      this.scenery.setWeather(payload.weather);
    }
    if (payload.upgrades) {
      this.scenery.setUpgrades(payload.upgrades);
    }

    for (let i = 0; i < this.views.length; i += 1) {
      const v = this.views[i];
      const plot = this.plots[i];
      if (!v) continue;
      v.pendingHarvest = false;
      v.stageIdx = -1;
      v.lastSecond = -1;
      const meta = plot?.vocabId ? this.vocabMeta[plot.vocabId] : undefined;
      v.label.setText(meta ? this.shortLabel(meta.word) : '');
    }
  };

  private readonly onPlotFx = (payload: { plotIndex: number; kind: PlotFxKind }): void => {
    const v = this.views[payload.plotIndex];
    if (!v) return;
    const x = v.container.x;
    const y = v.container.y;

    // Send farmer to the action location
    this.farmer.walkTo(x - 20, y + 10, () => {
      switch (payload.kind) {
        case 'plant':
          this.farmer.playAction('seed', 600);
          break;
        case 'water':
          this.farmer.playAction('water', 700);
          break;
        case 'combo':
        case 'golden':
          this.farmer.playAction('cheer', 900);
          // 5x combo streak triggers animal happy dance!
          this.animals.forEach((a) => a.triggerHappyDance());
          break;
        case 'harvest':
          this.farmer.playAction('cheer', 500);
          break;
      }
    });

    switch (payload.kind) {
      case 'plant':
        this.particles.emitPlantBurst(x, y);
        this.punch(v, 1.12);
        break;
      case 'water':
        this.particles.emitWaterBurst(x, y);
        break;
      case 'combo':
        this.particles.emitComboBurst(x, y - this.cell * 0.1, false);
        this.punch(v, 1.15);
        break;
      case 'golden':
        this.particles.emitComboBurst(x, y - this.cell * 0.1, true);
        this.punch(v, 1.2);
        break;
      case 'harvest':
        this.particles.emitHarvestBurst(x, y, false);
        break;
      case 'error':
        this.tweens.add({
          targets: v.container,
          x: { from: x - 6, to: x },
          duration: 220,
          ease: 'Elastic.Out',
        });
        break;
      default:
        break;
    }
  };

  private readonly onThemeChanged = (payload: { theme: ThemeName }): void => {
    this.applyTheme(payload.theme);
  };

  private applyTheme(theme: ThemeName): void {
    const palette = THEME_LABEL[theme];
    for (const v of this.views) {
      v.label.setColor(palette.text);
      v.label.setStroke(palette.stroke, 4);
    }
    this.scenery.setDarkTheme(theme === 'dark');
  }

  private punch(v: PlotView, scale: number): void {
    this.tweens.killTweensOf(v.container);
    v.container.setScale(1);
    this.tweens.add({
      targets: v.container,
      scale: { from: scale, to: 1 },
      duration: 260,
      ease: 'Back.Out',
    });
  }

  private shortLabel(word: string): string {
    return word.length > 20 ? `${word.slice(0, 18)}…` : word;
  }

  private plotIndexAt(x: number, y: number): number {
    const col = Math.floor((x - this.originX) / this.cell);
    const row = Math.floor((y - this.originY) / this.cell);
    if (col < 0 || row < 0 || col >= this.cols || row >= this.rows) return -1;
    const idx = row * this.cols + col;
    return idx < FARM_PLOT_COUNT ? idx : -1;
  }

  private isPlotRipe(index: number, now: number): boolean {
    const plot = this.plots[index];
    if (!plot || !plot.vocabId || plot.plantedAt === null) return false;
    return (
      FarmEngine.computeProgressFast(
        plot.plantedAt,
        plot.baseDurationMs,
        plot.acceleratedMs,
        now,
        this.speedMultiplier,
      ) >= 1
    );
  }

  private onPointerDown(pointer: Phaser.Input.Pointer): void {
    this.pointerDown = true;
    this.dragHarvested = false;
    this.dragDistance = 0;
    this.lastPointerX = pointer.x;
    this.lastPointerY = pointer.y;
    this.downPlotIndex = this.plotIndexAt(pointer.x, pointer.y);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.pointerDown) return;
    const dx = pointer.x - this.lastPointerX;
    const dy = pointer.y - this.lastPointerY;
    this.dragDistance += Math.abs(dx) + Math.abs(dy);
    this.lastPointerX = pointer.x;
    this.lastPointerY = pointer.y;

    if (this.dragDistance < 14) return;

    this.trailAccumulator += Math.abs(dx) + Math.abs(dy);
    if (this.trailAccumulator > 18) {
      this.trailAccumulator = 0;
      this.particles.emitSwipeTrail(pointer.x, pointer.y);
    }

    const idx = this.plotIndexAt(pointer.x, pointer.y);
    if (idx < 0) return;
    const v = this.views[idx];
    if (!v || v.pendingHarvest) return;
    if (this.isPlotRipe(idx, Date.now())) {
      v.pendingHarvest = true;
      this.dragHarvested = true;
      this.particles.emitHarvestBurst(v.container.x, v.container.y, false);
      EventBus.emit('game:harvest', { plotIndex: idx, autoHarvested: false });
    }
  }

  private onPointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.pointerDown) return;
    this.pointerDown = false;
    if (this.dragHarvested) return;

    const upIdx = this.plotIndexAt(pointer.x, pointer.y);
    if (upIdx >= 0 && upIdx === this.downPlotIndex && this.dragDistance < 24) {
      const v = this.views[upIdx];
      if (v && !v.pendingHarvest) {
        EventBus.emit('game:plot-tap', { plotIndex: upIdx });
      }
    } else if (upIdx < 0 && this.dragDistance < 15) {
      // Tap on open grass/path -> farmer runs there!
      this.farmer.walkTo(pointer.x, pointer.y);
    }
  }

  update(time: number, delta: number): void {
    this.elapsed += delta;
    this.particles.update(delta);
    this.scenery.update(time, delta);
    this.farmer.update(time, delta);
    this.animals.forEach((a) => a.update(time, delta));

    const now = Date.now();
    const feverActive = now < this.feverEndsAt;

    for (let i = 0; i < this.views.length; i += 1) {
      const v = this.views[i];
      if (!v) continue;
      const plot = this.plots[i];

      if (!plot || !plot.vocabId || plot.plantedAt === null || plot.tier === null) {
        if (v.stageIdx !== 0) {
          v.stageIdx = 0;
          v.crop.setVisible(false);
          v.barBg.setVisible(false);
          v.barFill.setVisible(false);
          v.timer.setVisible(false);
          v.badge.setVisible(false);
          v.badgeKey = '';
          v.label.setText('');
          this.setSoil(v, 'soil-dry');
        }
        continue;
      }

      const progress = FarmEngine.computeProgressFast(
        plot.plantedAt,
        plot.baseDurationMs,
        plot.acceleratedMs,
        now,
        this.speedMultiplier,
      );
      const stage = FarmEngine.stageFromProgress(progress);
      const stageIdx = STAGE_TO_INDEX[stage];

      if (stageIdx !== v.stageIdx) {
        v.stageIdx = stageIdx;
        v.crop.setTexture(`crop-t${plot.tier}-${stageIdx}`).setVisible(true);
        const ripe = stageIdx === 4;
        v.barBg.setVisible(!ripe);
        v.barFill.setVisible(!ripe);
        v.timer.setVisible(!ripe);
        this.setSoil(
          v,
          plot.isGoldenFertilized ? 'soil-golden' : plot.quizzed ? 'soil-wet' : 'soil-dry',
        );
        if (stageIdx > 1 && stageIdx < 4) {
          this.particles.emitPlantBurst(v.container.x, v.container.y);
        }
      }

      const badgeKey =
        stageIdx === 4
          ? 'badge-harvest'
          : !plot.quizzed
            ? 'badge-quiz'
            : plot.isGoldenFertilized
              ? 'badge-star'
              : '';
      if (badgeKey !== v.badgeKey) {
        v.badgeKey = badgeKey;
        if (badgeKey) v.badge.setTexture(badgeKey).setVisible(true);
        else v.badge.setVisible(false);
      }

      const baseScale = (v.crop.getData('baseScale') as number | undefined) ?? 1;
      if (stageIdx === 4) {
        const wobble = Math.sin(this.elapsed * 0.006 + i) * 0.04;
        v.crop.setScale(baseScale * (1 + wobble), baseScale * (1 - wobble * 0.5));
        v.badge.setY(-this.cell * 0.33 + Math.sin(this.elapsed * 0.008 + i) * 3);

        if (feverActive && !v.pendingHarvest) {
          v.pendingHarvest = true;
          EventBus.emit('game:harvest', { plotIndex: i, autoHarvested: true });
        }
      } else {
        v.crop.setScale(baseScale);
        v.barFill.scaleX = progress;
        v.barFill.fillColor = plot.quizzed ? 0x38bdf8 : 0x4ade80;

        const remainingSec = Math.ceil(
          Math.max(
            0,
            plot.baseDurationMs -
              (Math.max(0, now - plot.plantedAt) * this.speedMultiplier + plot.acceleratedMs),
          ) /
            1000 /
            this.speedMultiplier,
        );
        if (remainingSec !== v.lastSecond) {
          v.lastSecond = remainingSec;
          v.timer.setText(`${remainingSec}s`);
        }
      }
    }
  }

  private setSoil(v: PlotView, key: string): void {
    if (v.soilKey === key) return;
    v.soilKey = key;
    v.soil.setTexture(key);
  }

  private cleanup(): void {
    EventBus.off('ui:sync', this.onSync);
    EventBus.off('ui:plot-fx', this.onPlotFx);
    EventBus.off('ui:theme-changed', this.onThemeChanged);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this);
  }
}
