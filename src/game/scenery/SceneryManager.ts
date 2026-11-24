import Phaser from 'phaser';
import { EventBus } from '../../bridge/EventBus';
import {
  HOUSE_CHIMNEY,
  HOUSE_WINDOWS,
  WINDMILL_HUB,
} from '../scenes/BootScene';
import type { ParticlePool } from '../pools/ParticlePool';

export interface SceneryLayout {
  isMobile: boolean;
  isPortrait: boolean;
  housePos: { x: number; y: number; scale: number; visible: boolean };
  bakeryPos: { x: number; y: number; scale: number; visible: boolean };
  windmillPos: { x: number; y: number; scale: number; visible: boolean };
  pondPos: { x: number; y: number; scale: number; visible: boolean };
  pastureBounds: Phaser.Geom.Rectangle;
  fenceSegments: Array<{ x: number; y: number; w: number; h: number }>;
  cobblePaths: Array<{ x: number; y: number }>;
  natureProps: Array<{ key: string; x: number; y: number; scale?: number }>;
}

export class SceneryManager {
  private scene: Phaser.Scene;
  private particles: ParticlePool;

  private houseSprite!: Phaser.GameObjects.Image;
  private chimneyEmitterPos = { x: 0, y: 0 };
  private windowGlows: Phaser.GameObjects.Image[] = [];

  private bakerySprite!: Phaser.GameObjects.Image;

  private windmillBase!: Phaser.GameObjects.Image;
  private windmillBlades!: Phaser.GameObjects.Image;

  private pondSprite!: Phaser.GameObjects.Image;
  private pondRipple!: Phaser.GameObjects.Image;

  private natureContainer!: Phaser.GameObjects.Container;
  private pathContainer!: Phaser.GameObjects.Container;
  private fenceGraphics!: Phaser.GameObjects.Graphics;

  private butterflies: Array<{ sprite: Phaser.GameObjects.Image; baseX: number; baseY: number; offset: number }> = [];

  private smokeTimer = 0;
  private rippleTimer = 0;
  private moteTimer = 0;
  private isDarkTheme = false;
  private currentWeather: 'sunny' | 'rain' | 'rainbow' | 'night' = 'sunny';

  constructor(scene: Phaser.Scene, particles: ParticlePool) {
    this.scene = scene;
    this.particles = particles;
    this.buildStaticContainers();
  }

  private buildStaticContainers(): void {
    this.pathContainer = this.scene.add.container(0, 0).setDepth(2);
    this.fenceGraphics = this.scene.add.graphics().setDepth(4);
    this.natureContainer = this.scene.add.container(0, 0).setDepth(5);

    // House
    this.houseSprite = this.scene.add.image(-500, -500, 'house').setOrigin(0.5, 0.95).setDepth(15);
    for (let i = 0; i < HOUSE_WINDOWS.length; i += 1) {
      const glow = this.scene.add.image(-500, -500, 'window-glow').setOrigin(0.5, 0.5).setDepth(16).setAlpha(0);
      this.windowGlows.push(glow);
    }

    // Windmill
    this.windmillBase = this.scene.add.image(-500, -500, 'windmill-base').setOrigin(0.5, 0.95).setDepth(14);
    this.windmillBlades = this.scene.add.image(-500, -500, 'windmill-blades').setOrigin(0.5, 0.5).setDepth(15);

    // Bakery / Processing Kitchen
    this.bakerySprite = this.scene.add.image(-500, -500, 'bakery').setOrigin(0.5, 0.95).setDepth(14);
    this.bakerySprite.setInteractive({ useHandCursor: true });
    this.bakerySprite.on(Phaser.Input.Events.POINTER_DOWN, () => {
      EventBus.emit('game:open-kitchen');
    });

    // Pond
    this.pondSprite = this.scene.add.image(-500, -500, 'pond').setOrigin(0.5, 0.5).setDepth(3);
    this.pondRipple = this.scene.add.image(-500, -500, 'ripple').setOrigin(0.5, 0.5).setDepth(4).setAlpha(0);

    // Make pond interactive for fishing
    this.pondSprite.setInteractive({ useHandCursor: true });
    this.pondSprite.on(Phaser.Input.Events.POINTER_DOWN, () => {
      EventBus.emit('game:pond-fish');
    });

    // Butterflies
    for (let i = 0; i < 4; i += 1) {
      const b = this.scene.add.image(-500, -500, 'butterfly').setDepth(35).setScale(0.8);
      b.setTint(i % 2 === 0 ? 0xffffff : 0xfef08a);
      this.butterflies.push({ sprite: b, baseX: 0, baseY: 0, offset: i * 1.5 });
    }
  }

  public setDarkTheme(isDark: boolean): void {
    this.isDarkTheme = isDark;
    for (const glow of this.windowGlows) {
      glow.setAlpha(isDark ? 0.85 : 0);
    }
  }

  public setWeather(weather: 'sunny' | 'rain' | 'rainbow' | 'night'): void {
    this.currentWeather = weather;
  }

  public applyLayout(layout: SceneryLayout): void {
    // 1. House
    if (layout.housePos.visible) {
      this.houseSprite.setVisible(true).setPosition(layout.housePos.x, layout.housePos.y).setScale(layout.housePos.scale);
      const s = layout.housePos.scale;
      this.chimneyEmitterPos = {
        x: layout.housePos.x + (HOUSE_CHIMNEY.x - 120) * s,
        y: layout.housePos.y - (220 * 0.95 - HOUSE_CHIMNEY.y) * s,
      };

      for (let i = 0; i < HOUSE_WINDOWS.length; i += 1) {
        const win = HOUSE_WINDOWS[i];
        const glow = this.windowGlows[i];
        if (win && glow) {
          glow.setPosition(
            layout.housePos.x + (win.x - 120) * s,
            layout.housePos.y - (220 * 0.95 - win.y) * s,
          ).setScale(s * 1.1);
        }
      }
    } else {
      this.houseSprite.setVisible(false);
      this.windowGlows.forEach((g) => g.setVisible(false));
    }

    // 2. Windmill
    if (layout.windmillPos.visible) {
      this.windmillBase.setVisible(true).setPosition(layout.windmillPos.x, layout.windmillPos.y).setScale(layout.windmillPos.scale);
      const ws = layout.windmillPos.scale;
      this.windmillBlades.setVisible(true).setPosition(
        layout.windmillPos.x + (WINDMILL_HUB.x - 60) * ws,
        layout.windmillPos.y - (190 * 0.95 - WINDMILL_HUB.y) * ws,
      ).setScale(ws * 0.85);
    } else {
      this.windmillBase.setVisible(false);
      this.windmillBlades.setVisible(false);
    }

    // Bakery
    if (layout.bakeryPos.visible) {
      this.bakerySprite.setVisible(true).setPosition(layout.bakeryPos.x, layout.bakeryPos.y).setScale(layout.bakeryPos.scale);
    } else {
      this.bakerySprite.setVisible(false);
    }

    // 3. Pond
    if (layout.pondPos.visible) {
      this.pondSprite.setVisible(true).setPosition(layout.pondPos.x, layout.pondPos.y).setScale(layout.pondPos.scale);
      this.pondRipple.setPosition(layout.pondPos.x + 10, layout.pondPos.y + 6).setScale(layout.pondPos.scale * 0.9);
    } else {
      this.pondSprite.setVisible(false);
      this.pondRipple.setVisible(false);
    }

    // 4. Cobble paths
    this.pathContainer.removeAll(true);
    for (const pt of layout.cobblePaths) {
      const stone = this.scene.add.image(pt.x, pt.y, 'cobble').setOrigin(0.5, 0.5);
      stone.setRotation((Math.random() - 0.5) * 0.4);
      stone.setScale(0.85 + Math.random() * 0.25);
      this.pathContainer.add(stone);
    }

    // 5. Fences
    this.fenceGraphics.clear();
    for (const f of layout.fenceSegments) {
      this.renderFencePostAndRails(f.x, f.y, f.w, f.h);
    }

    // 6. Nature props (trees, bushes, flowers, stones)
    this.natureContainer.removeAll(true);
    for (const p of layout.natureProps) {
      const prop = this.scene.add.image(p.x, p.y, p.key).setOrigin(0.5, 0.9);
      if (p.scale) prop.setScale(p.scale);
      prop.setDepth(p.y);
      this.natureContainer.add(prop);
    }

    // 7. Scatter butterflies around pond / crops
    this.butterflies.forEach((b, idx) => {
      const bx = layout.pondPos.visible ? layout.pondPos.x + (idx - 2) * 50 : 200 + idx * 80;
      const by = layout.pondPos.visible ? layout.pondPos.y + ((idx % 2) * 40 - 20) : 300 + idx * 40;
      b.baseX = bx;
      b.baseY = by;
      b.sprite.setPosition(bx, by);
    });
  }

  private renderFencePostAndRails(x: number, y: number, w: number, h: number): void {
    const isHorizontal = w >= h;
    const postColor = 0x8b5a2b;
    const railColor = 0xa67341;
    const outlineColor = 0x3a2718;

    this.fenceGraphics.lineStyle(2, outlineColor, 1);
    this.fenceGraphics.fillStyle(railColor, 1);

    if (isHorizontal) {
      // Top and bottom rail
      this.fenceGraphics.fillRoundedRect(x, y + 6, w, 5, 2);
      this.fenceGraphics.strokeRoundedRect(x, y + 6, w, 5, 2);
      this.fenceGraphics.fillRoundedRect(x, y + 16, w, 5, 2);
      this.fenceGraphics.strokeRoundedRect(x, y + 16, w, 5, 2);

      // Posts along the rail
      const postCount = Math.max(2, Math.round(w / 38));
      const step = w / (postCount - 1);
      this.fenceGraphics.fillStyle(postColor, 1);
      for (let i = 0; i < postCount; i += 1) {
        const px = x + i * step - 3;
        this.fenceGraphics.fillRoundedRect(px, y, 6, 26, 2);
        this.fenceGraphics.strokeRoundedRect(px, y, 6, 26, 2);
      }
    } else {
      // Vertical fence
      this.fenceGraphics.fillRoundedRect(x + 4, y, 5, h, 2);
      this.fenceGraphics.strokeRoundedRect(x + 4, y, 5, h, 2);
      this.fenceGraphics.fillRoundedRect(x + 14, y, 5, h, 2);
      this.fenceGraphics.strokeRoundedRect(x + 14, y, 5, h, 2);

      const postCount = Math.max(2, Math.round(h / 38));
      const step = h / (postCount - 1);
      this.fenceGraphics.fillStyle(postColor, 1);
      for (let i = 0; i < postCount; i += 1) {
        const py = y + i * step - 3;
        this.fenceGraphics.fillRoundedRect(x, py, 24, 6, 2);
        this.fenceGraphics.strokeRoundedRect(x, py, 24, 6, 2);
      }
    }
  }

  public update(time: number, delta: number): void {
    // 1. Windmill rotation
    if (this.windmillBlades.visible) {
      this.windmillBlades.rotation += 0.008;
    }

    // 2. Chimney smoke puffs
    if (this.houseSprite.visible) {
      this.smokeTimer += delta;
      if (this.smokeTimer > 380) {
        this.smokeTimer = 0;
        this.particles.emitChimneySmoke(this.chimneyEmitterPos.x, this.chimneyEmitterPos.y);
      }
    }

    // 3. Pond water ripples
    if (this.pondSprite.visible) {
      this.rippleTimer += delta;
      if (this.rippleTimer > 2400) {
        this.rippleTimer = 0;
        this.pondRipple.setScale(0.3).setAlpha(0.85);
        this.scene.tweens.add({
          targets: this.pondRipple,
          scaleX: 1.15,
          scaleY: 0.95,
          alpha: 0,
          duration: 1800,
          ease: 'Sine.easeOut',
        });
      }
    }

    // 4. Butterflies drifting
    for (const b of this.butterflies) {
      const t = time * 0.002 + b.offset;
      b.sprite.x = b.baseX + Math.sin(t) * 22;
      b.sprite.y = b.baseY + Math.cos(t * 1.5) * 14;
      b.sprite.rotation = Math.sin(t * 2) * 0.25;
      b.sprite.scaleX = Math.cos(t * 6) > 0 ? 0.75 : -0.75;
    }

    // 5. Ambient sunlight motes / fireflies / weather particles
    this.moteTimer += delta;
    if (this.currentWeather === 'rain') {
      // Frequent raindrops across the sky
      for (let i = 0; i < 3; i += 1) {
        const rx = Math.random() * (this.scene.scale.width + 100);
        const ry = Math.random() * (this.scene.scale.height * 0.4);
        this.particles.emitRainDrop(rx, ry);
      }
    } else if (this.currentWeather === 'rainbow') {
      if (this.moteTimer > 280) {
        this.moteTimer = 0;
        const rx = Math.random() * this.scene.scale.width;
        const ry = 100 + Math.random() * (this.scene.scale.height - 220);
        this.particles.emitRainbowMote(rx, ry);
      }
    } else {
      if (this.moteTimer > 500) {
        this.moteTimer = 0;
        const rx = Math.random() * this.scene.scale.width;
        const ry = 100 + Math.random() * (this.scene.scale.height - 200);
        this.particles.emitAmbientMote(rx, ry, this.isDarkTheme || this.currentWeather === 'night');
      }
    }
  }
}
