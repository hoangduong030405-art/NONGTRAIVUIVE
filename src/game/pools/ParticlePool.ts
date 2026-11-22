import type Phaser from 'phaser';

export type ParticleKind =
  | 'water'
  | 'star'
  | 'sparkle'
  | 'leaf'
  | 'heart'
  | 'smoke'
  | 'mote'
  | 'seed';

const TEXTURE_BY_KIND: Record<ParticleKind, string> = {
  water: 'particle-water',
  star: 'particle-star',
  sparkle: 'particle-sparkle',
  leaf: 'particle-leaf',
  heart: 'particle-heart',
  smoke: 'particle-smoke',
  mote: 'particle-mote',
  seed: 'particle-seed',
};

/**
 * Zero-GC pre-allocated object pool for farm VFX particles.
 * Uses flat typed arrays to avoid per-frame object allocation.
 */
export class ParticlePool {
  private readonly capacity: number;
  private readonly sprites: Phaser.GameObjects.Image[] = [];
  private readonly active: Uint8Array;
  private readonly vx: Float32Array;
  private readonly vy: Float32Array;
  private readonly gravity: Float32Array;
  private readonly age: Float32Array;
  private readonly lifetime: Float32Array;
  private readonly startScale: Float32Array;
  private readonly endScale: Float32Array;
  private readonly rotSpeed: Float32Array;
  private cursor = 0;

  constructor(scene: Phaser.Scene, capacity: number = 220) {
    this.capacity = capacity;
    this.active = new Uint8Array(capacity);
    this.vx = new Float32Array(capacity);
    this.vy = new Float32Array(capacity);
    this.gravity = new Float32Array(capacity);
    this.age = new Float32Array(capacity);
    this.lifetime = new Float32Array(capacity);
    this.startScale = new Float32Array(capacity);
    this.endScale = new Float32Array(capacity);
    this.rotSpeed = new Float32Array(capacity);

    for (let i = 0; i < capacity; i += 1) {
      const sprite = scene.add.image(-999, -999, 'particle-sparkle');
      sprite.setActive(false).setVisible(false).setDepth(45);
      this.sprites.push(sprite);
    }
  }

  private spawn(
    x: number,
    y: number,
    kind: ParticleKind,
    vx: number,
    vy: number,
    gravity: number,
    lifetimeMs: number,
    startScale: number,
    endScale: number,
    tint: number,
    rotSpeed: number,
    depth: number = 45,
  ): void {
    let idx = -1;
    for (let n = 0; n < this.capacity; n += 1) {
      const probe = (this.cursor + n) % this.capacity;
      if (this.active[probe] === 0) {
        idx = probe;
        this.cursor = (probe + 1) % this.capacity;
        break;
      }
    }

    if (idx === -1) {
      idx = this.cursor;
      this.cursor = (this.cursor + 1) % this.capacity;
    }

    const sprite = this.sprites[idx];
    if (!sprite) return;

    this.active[idx] = 1;
    this.vx[idx] = vx;
    this.vy[idx] = vy;
    this.gravity[idx] = gravity;
    this.age[idx] = 0;
    this.lifetime[idx] = lifetimeMs;
    this.startScale[idx] = startScale;
    this.endScale[idx] = endScale;
    this.rotSpeed[idx] = rotSpeed;

    sprite.setTexture(TEXTURE_BY_KIND[kind]);
    sprite.setPosition(x, y);
    sprite.setScale(startScale);
    sprite.setAlpha(1);
    sprite.setTint(tint);
    sprite.setRotation(0);
    sprite.setDepth(depth);
    sprite.setActive(true).setVisible(true);
  }

  emitPlantBurst(x: number, y: number): void {
    for (let i = 0; i < 12; i += 1) {
      const angle = -Math.PI + Math.random() * Math.PI;
      const speed = 42 + Math.random() * 78;
      const isSeed = i % 3 === 0;
      this.spawn(
        x + (Math.random() - 0.5) * 20,
        y + 6,
        isSeed ? 'seed' : i % 2 === 0 ? 'leaf' : 'sparkle',
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 24,
        230,
        460 + Math.random() * 180,
        0.78,
        0.15,
        isSeed ? 0xf59e0b : i % 2 === 0 ? 0x4ade80 : 0xd97706,
        (Math.random() - 0.5) * 6,
      );
    }
  }

  emitWaterBurst(x: number, y: number): void {
    for (let i = 0; i < 14; i += 1) {
      const angle = -Math.PI * 0.9 + Math.random() * (Math.PI * 0.8);
      const speed = 55 + Math.random() * 95;
      this.spawn(
        x + (Math.random() - 0.5) * 18,
        y - 12,
        'water',
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 35,
        340,
        520 + Math.random() * 200,
        0.9,
        0.2,
        i % 3 === 0 ? 0xbae6fd : 0x38bdf8,
        (Math.random() - 0.5) * 4,
      );
    }
  }

  emitComboBurst(x: number, y: number, isGolden: boolean): void {
    const count = isGolden ? 20 : 14;
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.25;
      const speed = 65 + Math.random() * 110;
      this.spawn(
        x,
        y,
        i % 2 === 0 ? 'star' : 'sparkle',
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 25,
        160,
        620 + Math.random() * 220,
        1.0,
        0.1,
        isGolden ? 0xfbbf24 : i % 2 === 0 ? 0xfde047 : 0x34d399,
        (Math.random() - 0.5) * 8,
      );
    }
  }

  emitHarvestBurst(x: number, y: number, isGolden: boolean): void {
    const count = isGolden ? 22 : 15;
    for (let i = 0; i < count; i += 1) {
      const angle = -Math.PI * 0.95 + Math.random() * Math.PI * 0.9;
      const speed = 75 + Math.random() * 125;
      this.spawn(
        x + (Math.random() - 0.5) * 24,
        y,
        i % 3 === 0 ? 'leaf' : 'star',
        Math.cos(angle) * speed,
        Math.sin(angle) * speed - 45,
        240,
        650 + Math.random() * 240,
        1.05,
        0.18,
        isGolden ? 0xf59e0b : i % 2 === 0 ? 0xfbbf24 : 0x4ade80,
        (Math.random() - 0.5) * 7,
      );
    }
  }

  emitHeartBurst(x: number, y: number): void {
    for (let i = 0; i < 6; i += 1) {
      const vx = (Math.random() - 0.5) * 58;
      const vy = -55 - Math.random() * 45;
      this.spawn(
        x + (Math.random() - 0.5) * 16,
        y - 10,
        i % 3 === 0 ? 'sparkle' : 'heart',
        vx,
        vy,
        25,
        780 + Math.random() * 220,
        0.78,
        0.2,
        i % 3 === 0 ? 0xfef08a : i % 2 === 0 ? 0xf43f5e : 0xfb7185,
        (Math.random() - 0.5) * 2,
      );
    }
  }

  emitChimneySmoke(x: number, y: number): void {
    this.spawn(
      x + (Math.random() - 0.5) * 4,
      y,
      'smoke',
      10 + Math.random() * 12,
      -24 - Math.random() * 12,
      -4,
      1900 + Math.random() * 500,
      0.32,
      1.15,
      0xf1f5f9,
      (Math.random() - 0.5) * 0.8,
      18,
    );
  }

  emitAmbientMote(x: number, y: number, isDark: boolean): void {
    this.spawn(
      x,
      y,
      isDark ? 'mote' : Math.random() < 0.5 ? 'mote' : 'sparkle',
      8 + (Math.random() - 0.5) * 18,
      -10 - Math.random() * 14,
      0,
      2100 + Math.random() * 900,
      isDark ? 0.65 : 0.45,
      0.1,
      isDark ? 0xfef08a : 0xffffff,
      (Math.random() - 0.5) * 1.5,
      36,
    );
  }

  emitSwipeTrail(x: number, y: number): void {
    this.spawn(
      x,
      y,
      'sparkle',
      (Math.random() - 0.5) * 24,
      -20 - Math.random() * 24,
      40,
      260,
      0.7,
      0.05,
      0xfef08a,
      4,
    );
  }

  update(deltaMs: number): void {
    const dt = deltaMs * 0.001;
    for (let i = 0; i < this.capacity; i += 1) {
      if (this.active[i] === 0) continue;

      const nextAge = (this.age[i] ?? 0) + deltaMs;
      const life = this.lifetime[i] ?? 1;
      const sprite = this.sprites[i];

      if (nextAge >= life || !sprite) {
        this.active[i] = 0;
        if (sprite) {
          sprite.setActive(false).setVisible(false);
        }
        continue;
      }

      this.age[i] = nextAge;
      const t = nextAge / life;

      const curVy = (this.vy[i] ?? 0) + (this.gravity[i] ?? 0) * dt;
      this.vy[i] = curVy;

      sprite.x += (this.vx[i] ?? 0) * dt;
      sprite.y += curVy * dt;
      sprite.rotation += (this.rotSpeed[i] ?? 0) * dt;

      const s0 = this.startScale[i] ?? 1;
      const s1 = this.endScale[i] ?? 0;
      sprite.setScale(s0 + (s1 - s0) * t);
      sprite.setAlpha(1 - t * t);
    }
  }
}
