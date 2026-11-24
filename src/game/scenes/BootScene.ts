import Phaser from 'phaser';

/**
 * BootScene — pre-renders EVERY texture procedurally (Canvas 2D) exactly once.
 * Zero external assets → instant start, no broken links, offline-first.
 *
 * Anchor constants (in texture pixel space) are exported so the world layer
 * can attach live effects (smoke, window glow, windmill hub) precisely.
 */

type Ctx = CanvasRenderingContext2D;

const OUTLINE = '#3a2718';
const TAU = Math.PI * 2;

export const HOUSE_SIZE = { w: 240, h: 220 } as const;
export const HOUSE_CHIMNEY = { x: 173, y: 38 } as const;
export const HOUSE_DOOR = { x: 120, y: 206 } as const;
export const HOUSE_WINDOWS = [
  { x: 78, y: 150 },
  { x: 162, y: 150 },
] as const;
export const WINDMILL_SIZE = { w: 120, h: 190 } as const;
export const WINDMILL_HUB = { x: 60, y: 46 } as const;
export const POND_SIZE = { w: 240, h: 150 } as const;
export const FARMER_SIZE = { w: 112, h: 128 } as const;

export const ANIMAL_TEXTURE_WIDTH: Record<'sheep' | 'chicken' | 'cow' | 'dog', number> = {
  sheep: 100,
  chicken: 64,
  cow: 128,
  dog: 84,
};

// -----------------------------------------------------------------------------
// Drawing helpers
// -----------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stroke(ctx: Ctx, lw = 3, color = OUTLINE): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.stroke();
}

function circle(ctx: Ctx, x: number, y: number, r: number, fill: string, lw = 3): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) stroke(ctx, lw);
}

function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, lw = 3, rot = 0): void {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) stroke(ctx, lw);
}

function rrPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, lw = 3): void {
  rrPath(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) stroke(ctx, lw);
}

function poly(ctx: Ctx, pts: readonly number[], fill: string | CanvasGradient, lw = 3): void {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i += 2) {
    const x = pts[i] ?? 0;
    const y = pts[i + 1] ?? 0;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) stroke(ctx, lw);
}

function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, lw: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.stroke();
}

/** Outlined thick line (cartoon limb). */
function limb(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string, lw: number): void {
  line(ctx, x1, y1, x2, y2, OUTLINE, lw + 3);
  line(ctx, x1, y1, x2, y2, color, lw);
}

function leaf(ctx: Ctx, x: number, y: number, len: number, width: number, angle: number, fill: string, lw = 2.5): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(width, -len * 0.5, 0, -len);
  ctx.quadraticCurveTo(-width, -len * 0.5, 0, 0);
  ctx.fillStyle = fill;
  ctx.fill();
  if (lw > 0) stroke(ctx, lw);
  line(ctx, 0, -2, 0, -len * 0.8, 'rgba(255,255,255,0.35)', 1.5);
  ctx.restore();
}

function glow(ctx: Ctx, x: number, y: number, r: number, rgb = '253, 224, 71', a = 0.6): void {
  const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r);
  g.addColorStop(0, `rgba(${rgb}, ${a})`);
  g.addColorStop(0.55, `rgba(${rgb}, ${a * 0.35})`);
  g.addColorStop(1, `rgba(${rgb}, 0)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function sparkle4(ctx: Ctx, x: number, y: number, s: number, color = '#fffbe6'): void {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x + s * 0.15, y - s * 0.15, x + s, y);
  ctx.quadraticCurveTo(x + s * 0.15, y + s * 0.15, x, y + s);
  ctx.quadraticCurveTo(x - s * 0.15, y + s * 0.15, x - s, y);
  ctx.quadraticCurveTo(x - s * 0.15, y - s * 0.15, x, y - s);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function starPath(ctx: Ctx, cx: number, cy: number, outer: number, inner: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

/** Fill a cluster of circles with ONE outer outline (fluffy look). */
function fluff(ctx: Ctx, circles: ReadonlyArray<readonly [number, number, number]>, fill: string, lw = 3): void {
  for (const [x, y, r] of circles) circle(ctx, x, y, r + lw * 0.5, OUTLINE, 0);
  for (const [x, y, r] of circles) circle(ctx, x, y, r - lw * 0.5, fill, 0);
}

function dirtMound(ctx: Ctx, x: number, y: number, rx: number): void {
  ellipse(ctx, x, y, rx, rx * 0.36, '#5b3a1f', 2.5);
  ellipse(ctx, x - rx * 0.25, y - rx * 0.08, rx * 0.35, rx * 0.12, 'rgba(255,255,255,0.12)', 0);
}

// -----------------------------------------------------------------------------
// Scene
// -----------------------------------------------------------------------------

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.genParticles();
    this.genSoil();
    this.genCrops();
    this.genBadges();
    this.genEnvironment();
    this.genBuildings();
    this.genFarmer();
    this.genAnimals();
    this.genInteractiveProps();
    this.scene.start('FarmScene');
  }

  private tex(key: string, w: number, h: number, draw: (ctx: Ctx) => void): void {
    if (this.textures.exists(key)) return;
    const ct = this.textures.createCanvas(key, w, h);
    if (!ct) return;
    const ctx = ct.getContext();
    ctx.clearRect(0, 0, w, h);
    draw(ctx);
    ct.refresh();
  }

  // ---------------------------------------------------------------------------
  // Particles (white-based so ParticlePool can tint freely)
  // ---------------------------------------------------------------------------
  private genParticles(): void {
    this.tex('particle-water', 32, 32, (ctx) => {
      const g = ctx.createRadialGradient(13, 13, 2, 16, 18, 13);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#cfefff');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(16, 3);
      ctx.bezierCurveTo(26, 15, 26, 24, 16, 29);
      ctx.bezierCurveTo(6, 24, 6, 15, 16, 3);
      ctx.fill();
    });
    this.tex('particle-star', 32, 32, (ctx) => {
      starPath(ctx, 16, 16, 14, 6);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });
    this.tex('particle-sparkle', 28, 28, (ctx) => sparkle4(ctx, 14, 14, 12, '#ffffff'));
    this.tex('particle-leaf', 28, 28, (ctx) => {
      ctx.beginPath();
      ctx.moveTo(5, 23);
      ctx.quadraticCurveTo(5, 5, 23, 5);
      ctx.quadraticCurveTo(23, 23, 5, 23);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });
    this.tex('particle-heart', 32, 32, (ctx) => {
      ctx.beginPath();
      ctx.moveTo(16, 28);
      ctx.bezierCurveTo(1, 18, 4, 3, 16, 10);
      ctx.bezierCurveTo(28, 3, 31, 18, 16, 28);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });
    this.tex('particle-smoke', 48, 48, (ctx) => {
      const g = ctx.createRadialGradient(24, 24, 2, 24, 24, 23);
      g.addColorStop(0, 'rgba(255,255,255,0.95)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 48, 48);
    });
    this.tex('particle-mote', 24, 24, (ctx) => {
      const g = ctx.createRadialGradient(12, 12, 1, 12, 12, 11);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,255,255,0.6)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 24, 24);
    });
    this.tex('particle-seed', 16, 16, (ctx) => ellipse(ctx, 8, 8, 4, 5.5, '#ffffff', 0));
  }

  // ---------------------------------------------------------------------------
  // Soil plots — wooden raised beds with tilled ridges
  // ---------------------------------------------------------------------------
  private genSoil(): void {
    const bed = (key: string, frame: string, frameDark: string, soilTop: string, soilBot: string, opts: { wet?: boolean; golden?: boolean }) =>
      this.tex(key, 160, 160, (ctx) => {
        const rnd = mulberry32(key.length * 97);
        // drop shadow
        rrect(ctx, 12, 20, 136, 132, 24, 'rgba(0,0,0,0.22)', 0);
        // wooden frame
        rrect(ctx, 10, 10, 140, 136, 24, frame, 3);
        // plank seams
        ctx.save();
        rrPath(ctx, 10, 10, 140, 136, 24);
        ctx.clip();
        for (let i = 0; i < 6; i += 1) line(ctx, 10, 22 + i * 22, 150, 22 + i * 22, 'rgba(0,0,0,0.08)', 2);
        for (const x of [44, 116]) {
          line(ctx, x, 10, x, 22, frameDark, 2);
          line(ctx, x, 136, x, 146, frameDark, 2);
        }
        ctx.restore();
        // corner nails
        for (const [nx, ny] of [[22, 22], [138, 22], [22, 134], [138, 134]] as const) {
          circle(ctx, nx, ny, 3, opts.golden ? '#fff3c4' : '#d6c2a1', 1.5);
        }
        // soil bed
        const g = ctx.createLinearGradient(0, 22, 0, 136);
        g.addColorStop(0, soilTop);
        g.addColorStop(1, soilBot);
        rrect(ctx, 22, 22, 116, 112, 14, g, 2.5);
        // tilled ridges
        ctx.save();
        rrPath(ctx, 22, 22, 116, 112, 14);
        ctx.clip();
        for (let r = 0; r < 4; r += 1) {
          const y = 36 + r * 26;
          rrect(ctx, 28, y - 7, 104, 16, 8, 'rgba(255,255,255,0.08)', 0);
          line(ctx, 32, y - 6, 128, y - 6, 'rgba(255,255,255,0.18)', 2);
          line(ctx, 32, y + 9, 128, y + 9, 'rgba(0,0,0,0.28)', 3);
        }
        for (let i = 0; i < 9; i += 1) {
          ellipse(ctx, 30 + rnd() * 100, 30 + rnd() * 96, 2 + rnd() * 2, 1.5 + rnd() * 1.5, 'rgba(210,190,160,0.55)', 0);
        }
        if (opts.wet) {
          for (let i = 0; i < 7; i += 1) {
            ellipse(ctx, 34 + rnd() * 92, 34 + rnd() * 90, 6 + rnd() * 5, 2, 'rgba(160,220,255,0.28)', 0);
          }
        }
        ctx.restore();
        if (opts.golden) {
          sparkle4(ctx, 18, 18, 9, '#fff7cc');
          sparkle4(ctx, 142, 138, 8, '#fff7cc');
          sparkle4(ctx, 140, 20, 6, '#fff7cc');
        }
      });

    bed('soil-dry', '#a8743f', '#6e4521', '#9a6a40', '#7a4f2b', {});
    bed('soil-wet', '#9b6a39', '#5e3a1b', '#6a4426', '#4a2e18', { wet: true });
    bed('soil-golden', '#e0a526', '#9a6a0c', '#87592a', '#5e3c1a', { golden: true });
  }

  // ---------------------------------------------------------------------------
  // Crops — 3 distinct species × 4 stages
  //   Tier 1: Carrot  · Tier 2: Tomato bush  · Tier 3: Ancient golden-apple tree
  // ---------------------------------------------------------------------------
  private genCrops(): void {
    // ---- Tier 1: Carrot ----
    this.tex('crop-t1-1', 128, 128, (ctx) => {
      dirtMound(ctx, 64, 100, 26);
      ellipse(ctx, 64, 92, 7, 5, '#c98a3d', 2);
      leaf(ctx, 64, 92, 16, 6, -0.5, '#86efac');
      leaf(ctx, 64, 92, 18, 6, 0.45, '#4ade80');
    });
    this.tex('crop-t1-2', 128, 128, (ctx) => {
      dirtMound(ctx, 64, 102, 28);
      for (const [a, len, c] of [[-0.6, 30, '#4ade80'], [0, 36, '#22c55e'], [0.6, 30, '#86efac']] as const) {
        leaf(ctx, 64, 98, len, 9, a, c);
      }
    });
    this.tex('crop-t1-3', 128, 128, (ctx) => {
      dirtMound(ctx, 64, 104, 30);
      const leaves = [[-0.9, 40], [-0.45, 50], [0, 56], [0.45, 50], [0.9, 40]] as const;
      leaves.forEach(([a, len], i) => leaf(ctx, 64, 100, len, 10, a, i % 2 ? '#22c55e' : '#16a34a'));
      // tiny white umbel flowers
      for (const [x, y] of [[40, 54], [64, 40], [88, 54]] as const) {
        for (let k = 0; k < 5; k += 1) circle(ctx, x + Math.cos(k * 1.25) * 5, y + Math.sin(k * 1.25) * 5, 3, '#ffffff', 1.2);
        circle(ctx, x, y, 2.5, '#fde047', 0);
      }
    });
    this.tex('crop-t1-4', 128, 128, (ctx) => {
      glow(ctx, 64, 70, 60);
      dirtMound(ctx, 64, 106, 32);
      const leaves = [[-1, 44], [-0.55, 54], [-0.15, 60], [0.25, 58], [0.65, 52], [1.0, 42]] as const;
      leaves.forEach(([a, len], i) => leaf(ctx, 64, 92, len, 11, a, i % 2 ? '#22c55e' : '#15803d'));
      // juicy carrot shoulders peeking out
      poly(ctx, [44, 90, 84, 90, 70, 118, 58, 118], '#f97316', 3);
      rrect(ctx, 44, 84, 40, 12, 6, '#fb923c', 3);
      line(ctx, 52, 100, 60, 100, 'rgba(0,0,0,0.25)', 2);
      line(ctx, 66, 108, 72, 108, 'rgba(0,0,0,0.25)', 2);
      line(ctx, 50, 88, 60, 88, 'rgba(255,255,255,0.5)', 2.5);
      sparkle4(ctx, 26, 40, 8);
      sparkle4(ctx, 102, 30, 10);
      sparkle4(ctx, 98, 82, 6);
    });

    // ---- Tier 2: Tomato bush ----
    this.tex('crop-t2-1', 128, 128, (ctx) => {
      dirtMound(ctx, 64, 100, 26);
      ellipse(ctx, 64, 92, 6, 6, '#38bdf8', 2);
      leaf(ctx, 64, 90, 18, 7, -0.6, '#5eead4');
      leaf(ctx, 64, 90, 18, 7, 0.6, '#2dd4bf');
    });
    this.tex('crop-t2-2', 128, 128, (ctx) => {
      dirtMound(ctx, 64, 104, 28);
      limb(ctx, 64, 100, 64, 52, '#15803d', 5);
      for (const [y, a, side] of [[86, 1.0, 1], [76, -1.0, -1], [64, 0.9, 1], [56, -0.8, -1]] as const) {
        leaf(ctx, 64, y, 26, 10, a, side > 0 ? '#22c55e' : '#16a34a');
      }
      leaf(ctx, 64, 54, 20, 8, 0, '#4ade80');
    });
    this.tex('crop-t2-3', 128, 128, (ctx) => {
      dirtMound(ctx, 64, 106, 30);
      limb(ctx, 64, 102, 64, 70, '#166534', 6);
      fluff(ctx, [[44, 62, 20], [84, 62, 20], [64, 46, 24], [64, 70, 20], [50, 80, 14], [78, 80, 14]], '#22c55e');
      for (const [x, y] of [[40, 52], [64, 36], [88, 54], [56, 66], [76, 72]] as const) {
        ellipse(ctx, x - 4, y - 4, 7, 7, 'rgba(255,255,255,0.12)', 0);
        for (let k = 0; k < 5; k += 1) circle(ctx, x + Math.cos(k * 1.256) * 5, y + Math.sin(k * 1.256) * 5, 3.4, '#fde047', 1.2);
        circle(ctx, x, y, 2.6, '#f59e0b', 0);
      }
    });
    this.tex('crop-t2-4', 128, 128, (ctx) => {
      glow(ctx, 64, 62, 60, '255, 140, 100', 0.5);
      dirtMound(ctx, 64, 108, 32);
      limb(ctx, 64, 104, 64, 70, '#166534', 6);
      fluff(ctx, [[42, 60, 21], [86, 60, 21], [64, 42, 25], [64, 68, 22], [48, 82, 15], [80, 82, 15]], '#16a34a');
      for (const [x, y, r] of [[44, 58, 10], [82, 54, 11], [64, 38, 10], [58, 76, 11], [84, 80, 9]] as const) {
        circle(ctx, x, y, r, '#ef4444', 2.5);
        ellipse(ctx, x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.2, 'rgba(255,255,255,0.7)', 0);
        poly(ctx, [x - 4, y - r + 1, x, y - r - 4, x + 4, y - r + 1], '#15803d', 1.5);
      }
      sparkle4(ctx, 22, 36, 8);
      sparkle4(ctx, 108, 34, 9);
      sparkle4(ctx, 104, 92, 6);
    });

    // ---- Tier 3: Ancient golden-apple tree ----
    this.tex('crop-t3-1', 128, 128, (ctx) => {
      glow(ctx, 64, 88, 26, '253, 224, 71', 0.45);
      dirtMound(ctx, 64, 102, 26);
      ellipse(ctx, 64, 90, 9, 10, '#f59e0b', 2.5);
      rrect(ctx, 55, 80, 18, 7, 3, '#92400e', 2);
      leaf(ctx, 66, 80, 16, 6, 0.5, '#86efac');
    });
    this.tex('crop-t3-2', 128, 128, (ctx) => {
      dirtMound(ctx, 64, 106, 28);
      limb(ctx, 64, 104, 64, 54, '#92400e', 7);
      limb(ctx, 64, 74, 82, 62, '#92400e', 4);
      fluff(ctx, [[64, 46, 14], [52, 52, 10], [76, 50, 10]], '#4ade80');
      fluff(ctx, [[86, 58, 9]], '#22c55e');
    });
    this.tex('crop-t3-3', 128, 128, (ctx) => {
      ellipse(ctx, 64, 110, 34, 9, 'rgba(0,0,0,0.2)', 0);
      poly(ctx, [56, 110, 72, 110, 69, 60, 59, 60], '#8b4513', 3);
      fluff(ctx, [[40, 58, 22], [88, 58, 22], [64, 40, 28], [64, 62, 22]], '#22c55e');
      ellipse(ctx, 54, 34, 12, 7, 'rgba(255,255,255,0.18)', 0);
      for (const [x, y] of [[40, 50], [62, 30], [86, 46], [52, 66], [80, 66], [70, 50]] as const) {
        for (let k = 0; k < 5; k += 1) circle(ctx, x + Math.cos(k * 1.256) * 4, y + Math.sin(k * 1.256) * 4, 3, '#f9a8d4', 1);
        circle(ctx, x, y, 2, '#fde047', 0);
      }
    });
    this.tex('crop-t3-4', 128, 128, (ctx) => {
      glow(ctx, 64, 56, 64, '253, 224, 71', 0.7);
      ellipse(ctx, 64, 112, 36, 9, 'rgba(0,0,0,0.2)', 0);
      poly(ctx, [55, 112, 73, 112, 70, 58, 58, 58], '#8b4513', 3);
      fluff(ctx, [[38, 56, 23], [90, 56, 23], [64, 36, 29], [64, 60, 24]], '#16a34a');
      ellipse(ctx, 52, 30, 13, 7, 'rgba(255,255,255,0.2)', 0);
      for (const [x, y] of [[40, 52], [86, 48], [64, 30], [58, 64], [80, 68], [48, 70]] as const) {
        circle(ctx, x, y, 7.5, '#fbbf24', 2.5);
        circle(ctx, x - 2.5, y - 2.5, 2.4, '#fff7cc', 0);
        line(ctx, x, y - 7, x + 2, y - 11, '#78350f', 2);
      }
      sparkle4(ctx, 18, 30, 9);
      sparkle4(ctx, 110, 26, 10);
      sparkle4(ctx, 108, 90, 7);
      sparkle4(ctx, 20, 92, 6);
    });
  }

  private genBadges(): void {
    const badge = (key: string, size: number, fill: string, glyph: string) =>
      this.tex(key, size, size, (ctx) => {
        const c = size / 2;
        circle(ctx, c, c + 1.5, c - 3, 'rgba(0,0,0,0.25)', 0);
        circle(ctx, c, c, c - 3, fill, 3);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.round(size * 0.5)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(glyph, c, c + 1);
      });
    badge('badge-quiz', 40, '#0ea5e9', '?');
    badge('badge-star', 36, '#f59e0b', '★');
    badge('badge-harvest', 42, '#22c55e', '✓');
  }

  // ---------------------------------------------------------------------------
  // Environment: grass, trees, bushes, flowers, pond, fences details
  // ---------------------------------------------------------------------------
  private genEnvironment(): void {
    // Seamless grass tile (blades wrap around edges)
    this.tex('grass-tile', 128, 128, (ctx) => {
      ctx.fillStyle = '#8cc35c';
      ctx.fillRect(0, 0, 128, 128);
      const rnd = mulberry32(42);
      const colors = ['#7db552', '#9bd068', '#78ad4c', '#a6d872'];
      for (let i = 0; i < 70; i += 1) {
        const x = rnd() * 128;
        const y = rnd() * 128;
        const col = colors[i % colors.length] ?? '#7db552';
        const h = 4 + rnd() * 5;
        for (const ox of [-128, 0, 128]) {
          for (const oy of [-128, 0, 128]) {
            line(ctx, x + ox, y + oy, x + ox - 1.5, y + oy - h, col, 2);
            line(ctx, x + ox + 3, y + oy, x + ox + 4, y + oy - h * 0.8, col, 2);
          }
        }
      }
    });
    this.tex('grass-patch', 128, 128, (ctx) => {
      const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
      g.addColorStop(0, 'rgba(255,255,255,0.9)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(64, 64, 62, 44, 0, 0, TAU);
      ctx.fill();
    });

    this.tex('tree', 140, 170, (ctx) => {
      ellipse(ctx, 70, 160, 44, 10, 'rgba(0,0,0,0.22)', 0);
      poly(ctx, [60, 160, 80, 160, 77, 104, 63, 104], '#8b5a2b', 3);
      fluff(ctx, [[42, 84, 30], [98, 84, 30], [70, 52, 38], [70, 92, 30], [50, 60, 24], [92, 60, 24]], '#3f9b46');
      ellipse(ctx, 56, 44, 18, 10, 'rgba(255,255,255,0.16)', 0);
      for (const [x, y] of [[44, 78], [92, 70], [70, 96], [80, 44]] as const) circle(ctx, x, y, 4.5, '#ef4444', 1.5);
    });
    this.tex('pine', 100, 150, (ctx) => {
      ellipse(ctx, 50, 142, 30, 8, 'rgba(0,0,0,0.22)', 0);
      rrect(ctx, 44, 112, 12, 30, 3, '#7c4a22', 3);
      poly(ctx, [50, 52, 90, 118, 10, 118], '#2f7d3b', 3);
      poly(ctx, [50, 30, 82, 86, 18, 86], '#3a9147', 3);
      poly(ctx, [50, 8, 72, 56, 28, 56], '#48a556', 3);
      line(ctx, 40, 40, 32, 52, 'rgba(255,255,255,0.25)', 3);
    });
    this.tex('bush', 76, 56, (ctx) => {
      ellipse(ctx, 38, 50, 30, 6, 'rgba(0,0,0,0.2)', 0);
      fluff(ctx, [[22, 34, 15], [52, 34, 16], [38, 24, 17], [38, 38, 15]], '#4caf50');
      for (const [x, y] of [[24, 30], [46, 22], [54, 38], [36, 40]] as const) circle(ctx, x, y, 3.2, '#e11d48', 1.2);
    });
    const flowerColors: Array<[string, string]> = [
      ['flower-red', '#f43f5e'],
      ['flower-yellow', '#facc15'],
      ['flower-purple', '#a78bfa'],
      ['flower-white', '#ffffff'],
      ['flower-blue', '#60a5fa'],
    ];
    for (const [key, col] of flowerColors) {
      this.tex(key, 26, 34, (ctx) => {
        line(ctx, 13, 33, 13, 16, '#2f855a', 2.5);
        leaf(ctx, 13, 28, 8, 3.5, 0.9, '#48bb78', 1.2);
        for (let k = 0; k < 5; k += 1) circle(ctx, 13 + Math.cos(k * 1.256 - 1.57) * 5.5, 12 + Math.sin(k * 1.256 - 1.57) * 5.5, 4.2, col, 1.5);
        circle(ctx, 13, 12, 3, '#f59e0b', 1.2);
      });
    }
    this.tex('tuft', 34, 28, (ctx) => {
      const blades: Array<[number, number, string]> = [
        [6, -4, '#4f9a3a'],
        [12, -1, '#6abf4b'],
        [17, 2, '#5aa843'],
        [22, 5, '#78c95a'],
        [28, 7, '#4f9a3a'],
      ];
      for (const [x, lean, col] of blades) {
        ctx.beginPath();
        ctx.moveTo(x - 2.5, 28);
        ctx.quadraticCurveTo(x + lean * 0.4, 14, x + lean, 3);
        ctx.quadraticCurveTo(x + lean * 0.4 + 2, 14, x + 2.5, 28);
        ctx.closePath();
        ctx.fillStyle = col;
        ctx.fill();
        stroke(ctx, 1.2, '#2f5e24');
      }
    });
    this.tex('stone', 30, 20, (ctx) => {
      ellipse(ctx, 15, 11, 12, 7, '#a8a29e', 2.5);
      ellipse(ctx, 12, 8, 5, 2.5, 'rgba(255,255,255,0.45)', 0);
    });
    this.tex('mushroom', 24, 26, (ctx) => {
      rrect(ctx, 9, 12, 7, 12, 3, '#fef3c7', 2);
      ctx.beginPath();
      ctx.arc(12.5, 13, 10, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = '#ef4444';
      ctx.fill();
      stroke(ctx, 2);
      circle(ctx, 8, 9, 1.8, '#fff', 0);
      circle(ctx, 15, 7, 2.2, '#fff', 0);
    });
    this.tex('cobble', 22, 16, (ctx) => {
      ellipse(ctx, 11, 8, 9, 6, '#d6c7ad', 2);
      ellipse(ctx, 9, 6, 4, 2, 'rgba(255,255,255,0.5)', 0);
    });

    this.tex('pond', POND_SIZE.w, POND_SIZE.h, (ctx) => {
      const rnd = mulberry32(7);
      // muddy bank
      ellipse(ctx, 120, 78, 116, 68, '#7a9a4a', 0);
      // stone rim
      for (let i = 0; i < 46; i += 1) {
        const a = (i / 46) * TAU;
        const x = 120 + Math.cos(a) * 106;
        const y = 76 + Math.sin(a) * 60;
        ellipse(ctx, x, y, 9 + rnd() * 5, 6 + rnd() * 3, i % 3 ? '#a8a29e' : '#c4bdb6', 2);
      }
      // water
      const g = ctx.createRadialGradient(100, 60, 10, 120, 76, 104);
      g.addColorStop(0, '#9be3ff');
      g.addColorStop(0.6, '#38b6f0');
      g.addColorStop(1, '#1673b8');
      ellipse(ctx, 120, 76, 98, 52, '#1673b8', 3);
      ctx.beginPath();
      ctx.ellipse(120, 76, 96, 50, 0, 0, TAU);
      ctx.fillStyle = g;
      ctx.fill();
      // highlights
      line(ctx, 66, 58, 96, 52, 'rgba(255,255,255,0.6)', 4);
      line(ctx, 140, 96, 168, 92, 'rgba(255,255,255,0.4)', 3);
      // lily pads
      for (const [x, y, r] of [[160, 62, 13], [78, 94, 11]] as const) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.arc(x, y, r, 0.35, TAU - 0.1);
        ctx.closePath();
        ctx.fillStyle = '#3fae4f';
        ctx.fill();
        stroke(ctx, 2);
      }
      for (let k = 0; k < 5; k += 1) circle(ctx, 160 + Math.cos(k * 1.256) * 3.5, 60 + Math.sin(k * 1.256) * 3.5, 3, '#f9a8d4', 1);
      circle(ctx, 160, 60, 2, '#fde047', 0);
      // reeds
      for (const [x, h] of [[30, 34], [38, 44], [46, 30], [204, 40], [212, 30]] as const) {
        line(ctx, x, 82, x + 2, 82 - h, '#3f7d32', 3);
        rrect(ctx, x - 1, 82 - h - 2, 6, 13, 3, '#7c4a22', 1.5);
      }
    });
    this.tex('ripple', 64, 32, (ctx) => {
      ctx.beginPath();
      ctx.ellipse(32, 16, 28, 12, 0, 0, TAU);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });
    this.tex('butterfly', 30, 24, (ctx) => {
      ellipse(ctx, 9, 8, 8, 7, '#ffffff', 2, -0.3);
      ellipse(ctx, 21, 8, 8, 7, '#ffffff', 2, 0.3);
      ellipse(ctx, 10, 17, 5.5, 5, '#ffffff', 2, 0.3);
      ellipse(ctx, 20, 17, 5.5, 5, '#ffffff', 2, -0.3);
      circle(ctx, 9, 8, 2.4, 'rgba(0,0,0,0.25)', 0);
      circle(ctx, 21, 8, 2.4, 'rgba(0,0,0,0.25)', 0);
      line(ctx, 15, 4, 15, 21, OUTLINE, 3);
    });
    this.tex('shadow', 64, 22, (ctx) => ellipse(ctx, 32, 11, 30, 9, 'rgba(0,0,0,0.25)', 0));
    this.tex('treat', 48, 48, (ctx) => {
      glow(ctx, 24, 24, 24, '253, 224, 71', 0.7);
      starPath(ctx, 24, 24, 18, 9);
      const g = ctx.createLinearGradient(0, 6, 0, 42);
      g.addColorStop(0, '#fde68a');
      g.addColorStop(1, '#f59e0b');
      ctx.fillStyle = g;
      ctx.fill();
      stroke(ctx, 2.5);
      circle(ctx, 20, 20, 2, '#92400e', 0);
      circle(ctx, 28, 26, 2, '#92400e', 0);
      sparkle4(ctx, 18, 14, 4);
    });
    this.tex('window-glow', 64, 64, (ctx) => glow(ctx, 32, 32, 32, '255, 214, 120', 0.95));
  }

  // ---------------------------------------------------------------------------
  // Buildings: farmhouse + windmill
  // ---------------------------------------------------------------------------
  private genBuildings(): void {
    this.tex('house', HOUSE_SIZE.w, HOUSE_SIZE.h, (ctx) => {
      ellipse(ctx, 120, 210, 104, 10, 'rgba(0,0,0,0.22)', 0);
      // chimney (behind roof)
      rrect(ctx, 162, 44, 22, 46, 2, '#b45f3c', 3);
      for (let y = 52; y < 88; y += 8) line(ctx, 163, y, 183, y, 'rgba(0,0,0,0.18)', 1.5);
      rrect(ctx, 158, 38, 30, 9, 2, '#8d4a2f', 3);
      // walls
      const wall = ctx.createLinearGradient(0, 100, 0, 206);
      wall.addColorStop(0, '#fbecc8');
      wall.addColorStop(1, '#ead39f');
      rrect(ctx, 36, 100, 168, 106, 4, wall, 3);
      ctx.save();
      rrPath(ctx, 36, 100, 168, 106, 4);
      ctx.clip();
      for (let y = 112; y < 206; y += 12) line(ctx, 36, y, 204, y, 'rgba(140,100,50,0.18)', 2);
      ctx.restore();
      // roof
      poly(ctx, [20, 110, 120, 30, 220, 110], '#d9473f', 3);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(20, 110);
      ctx.lineTo(120, 30);
      ctx.lineTo(220, 110);
      ctx.closePath();
      ctx.clip();
      for (let y = 46; y < 112; y += 13) {
        line(ctx, 0, y, 240, y, 'rgba(120,20,20,0.35)', 2.5);
        for (let x = (y / 13) % 2 ? 0 : 10; x < 240; x += 20) line(ctx, x, y, x, y + 13, 'rgba(120,20,20,0.25)', 1.5);
      }
      ctx.restore();
      line(ctx, 18, 112, 120, 30, '#fff4e0', 6);
      line(ctx, 120, 30, 222, 112, '#fff4e0', 6);
      line(ctx, 18, 112, 120, 30, OUTLINE, 1.5);
      line(ctx, 120, 30, 222, 112, OUTLINE, 1.5);
      // attic round window
      circle(ctx, 120, 78, 13, '#8fd3ff', 3);
      line(ctx, 107, 78, 133, 78, '#fff4e0', 3);
      line(ctx, 120, 65, 120, 91, '#fff4e0', 3);
      // windows + flower boxes
      for (const w of HOUSE_WINDOWS) {
        rrect(ctx, w.x - 18, w.y - 22, 36, 32, 4, '#8fd3ff', 3);
        line(ctx, w.x, w.y - 22, w.x, w.y + 10, '#fff4e0', 3.5);
        line(ctx, w.x - 18, w.y - 6, w.x + 18, w.y - 6, '#fff4e0', 3.5);
        line(ctx, w.x - 12, w.y - 16, w.x - 4, w.y - 18, 'rgba(255,255,255,0.8)', 2.5);
        rrect(ctx, w.x - 22, w.y + 10, 44, 9, 2, '#a8743f', 2.5);
        for (let k = 0; k < 4; k += 1) circle(ctx, w.x - 15 + k * 10, w.y + 8, 4, k % 2 ? '#f472b6' : '#facc15', 1.5);
      }
      // door
      rrect(ctx, 102, 140, 36, 66, 16, '#9a5b2e', 3);
      line(ctx, 120, 146, 120, 204, 'rgba(0,0,0,0.2)', 2);
      circle(ctx, 130, 176, 3, '#fcd34d', 1.5);
      rrect(ctx, 96, 202, 48, 8, 3, '#b9a58a', 2.5);
      // lantern
      rrect(ctx, 146, 146, 9, 13, 2, '#fde68a', 2);
    });

    this.tex('windmill-base', WINDMILL_SIZE.w, WINDMILL_SIZE.h, (ctx) => {
      ellipse(ctx, 60, 184, 46, 7, 'rgba(0,0,0,0.22)', 0);
      const g = ctx.createLinearGradient(34, 0, 86, 0);
      g.addColorStop(0, '#e9dcc0');
      g.addColorStop(1, '#cdb894');
      poly(ctx, [30, 186, 90, 186, 76, 56, 44, 56], g, 3);
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(30, 186);
      ctx.lineTo(90, 186);
      ctx.lineTo(76, 56);
      ctx.lineTo(44, 56);
      ctx.closePath();
      ctx.clip();
      for (let y = 70; y < 186; y += 14) line(ctx, 0, y, 120, y, 'rgba(120,90,50,0.22)', 2);
      ctx.restore();
      rrect(ctx, 50, 150, 20, 36, 9, '#8b5a2b', 2.5);
      rrect(ctx, 53, 100, 14, 16, 6, '#8fd3ff', 2.5);
      poly(ctx, [36, 60, 60, 24, 84, 60], '#c2453d', 3);
    });

    // Kitchen / Bakery / Processing Workshop Building
    this.tex('bakery', 160, 160, (ctx) => {
      ellipse(ctx, 80, 150, 70, 8, 'rgba(0,0,0,0.22)', 0);
      // walls
      rrect(ctx, 20, 70, 120, 80, 4, '#fef08a', 3);
      // awning (striped canopy)
      for (let i = 0; i < 6; i += 1) {
        poly(ctx, [20 + i * 20, 60, 40 + i * 20, 60, 36 + i * 20, 78, 16 + i * 20, 78], i % 2 === 0 ? '#ef4444' : '#ffffff', 2);
      }
      // roof
      poly(ctx, [10, 60, 80, 15, 150, 60], '#b91c1c', 3);
      // chimney & mini oven smoke
      rrect(ctx, 115, 20, 16, 30, 2, '#78350f', 2.5);
      // door
      rrect(ctx, 62, 95, 36, 55, 10, '#854d0e', 3);
      circle(ctx, 90, 125, 2.5, '#fef08a', 1.5);
      // window with display bread & cheese
      rrect(ctx, 26, 95, 28, 28, 4, '#bae6fd', 2);
      rrect(ctx, 106, 95, 28, 28, 4, '#bae6fd', 2);
      // Signboard
      rrect(ctx, 50, 42, 60, 18, 4, '#fffbeb', 2);
      ctx.fillStyle = '#b45309';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🥖 BAKERY', 80, 54);
    });

    this.tex('windmill-blades', 180, 180, (ctx) => {
      ctx.translate(90, 90);
      for (let i = 0; i < 4; i += 1) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 2);
        line(ctx, 0, 0, 0, -86, '#7c4a22', 5);
        rrect(ctx, 3, -84, 18, 66, 2, '#fdf6e3', 2.5);
        for (let y = -76; y < -18; y += 11) line(ctx, 3, y, 21, y, 'rgba(124,74,34,0.6)', 1.5);
        line(ctx, 12, -84, 12, -18, 'rgba(124,74,34,0.6)', 1.5);
        ctx.restore();
      }
      circle(ctx, 0, 0, 9, '#7c4a22', 3);
      circle(ctx, 0, 0, 3.5, '#fcd34d', 0);
    });

    // Golden Scarecrow
    this.tex('scarecrow', 96, 120, (ctx) => {
      ellipse(ctx, 48, 112, 24, 6, 'rgba(0,0,0,0.2)', 0);
      limb(ctx, 48, 110, 48, 42, '#78350f', 6);
      limb(ctx, 18, 56, 78, 56, '#78350f', 5);
      // Shirt
      rrect(ctx, 34, 48, 28, 30, 5, '#ea580c', 2.5);
      // Straw cuffs
      for (const sx of [16, 80]) {
        line(ctx, sx, 54, sx - 4, 62, '#facc15', 2);
        line(ctx, sx, 56, sx + 4, 62, '#facc15', 2);
      }
      // Pumpkin/Burlap head
      circle(ctx, 48, 36, 13, '#fde047', 2.5);
      circle(ctx, 43, 35, 2, '#292524', 0);
      circle(ctx, 53, 35, 2, '#292524', 0);
      // Straw hat
      ellipse(ctx, 48, 25, 22, 6, '#eab308', 2.5);
      rrect(ctx, 37, 12, 22, 13, 4, '#ca8a04', 2.5);
    });

    // Beehive
    this.tex('beehive', 80, 96, (ctx) => {
      ellipse(ctx, 40, 88, 22, 6, 'rgba(0,0,0,0.2)', 0);
      rrect(ctx, 24, 66, 32, 22, 3, '#78350f', 2.5);
      ellipse(ctx, 40, 56, 22, 12, '#f59e0b', 2.5);
      ellipse(ctx, 40, 42, 19, 10, '#fbbf24', 2.5);
      ellipse(ctx, 40, 29, 14, 9, '#fcd34d', 2.5);
      circle(ctx, 40, 54, 4, '#451a03', 0);
      // Tiny bees
      circle(ctx, 16, 30, 3, '#facc15', 1.5);
      circle(ctx, 64, 24, 3, '#facc15', 1.5);
    });

    // Stone Water Well
    this.tex('well', 100, 110, (ctx) => {
      ellipse(ctx, 50, 100, 34, 8, 'rgba(0,0,0,0.2)', 0);
      // Stone base
      rrect(ctx, 22, 66, 56, 32, 8, '#94a3b8', 2.5);
      ellipse(ctx, 50, 66, 28, 9, '#38bdf8', 2.5);
      // Posts
      limb(ctx, 28, 66, 28, 28, '#78350f', 5);
      limb(ctx, 72, 66, 72, 28, '#78350f', 5);
      // Roof
      poly(ctx, [16, 30, 50, 10, 84, 30], '#b45309', 2.5);
      // Bucket
      rrect(ctx, 44, 42, 12, 12, 2, '#92400e', 2);
      line(ctx, 50, 30, 50, 42, '#475569', 2);
    });

    // Flower Arch
    this.tex('flower-arch', 110, 90, (ctx) => {
      ctx.beginPath();
      ctx.arc(55, 76, 40, Math.PI, 0);
      stroke(ctx, 11, '#3f6212');
      ctx.beginPath();
      ctx.arc(55, 76, 40, Math.PI, 0);
      stroke(ctx, 7, '#22c55e');
      const blooms = [
        [20, 62, '#f43f5e'],
        [28, 44, '#facc15'],
        [44, 36, '#a78bfa'],
        [66, 36, '#f43f5e'],
        [82, 44, '#facc15'],
        [90, 62, '#60a5fa'],
      ] as const;
      for (const [bx, by, col] of blooms) {
        circle(ctx, bx, by, 6, col, 1.5);
        circle(ctx, bx, by, 2, '#fef08a', 0);
      }
    });
  }

  private genInteractiveProps(): void {
    // 🎁 Lucky Golden Gift Chest
    this.tex('world-chest', 64, 64, (ctx) => {
      glow(ctx, 32, 34, 28, '253, 224, 71', 0.45);
      ellipse(ctx, 32, 54, 20, 5, 'rgba(0,0,0,0.22)', 0);
      rrect(ctx, 13, 28, 38, 24, 6, '#b45309', 2.8);
      rrect(ctx, 11, 20, 42, 13, 6, '#d97706', 2.8);
      // Gold trim bands
      rrect(ctx, 18, 20, 6, 32, 2, '#fbbf24', 1.8);
      rrect(ctx, 40, 20, 6, 32, 2, '#fbbf24', 1.8);
      // Center lock
      rrect(ctx, 27, 29, 10, 10, 3, '#fde047', 2);
      circle(ctx, 32, 34, 2, '#78350f', 0);
      sparkle4(ctx, 12, 14, 6, '#fef08a');
      sparkle4(ctx, 52, 14, 7, '#fef08a');
    });

    // 🐛 Garden Pest Bug (cute green beetle/caterpillar to tap & chase away)
    this.tex('world-bug', 56, 56, (ctx) => {
      ellipse(ctx, 28, 44, 15, 4, 'rgba(0,0,0,0.18)', 0);
      ellipse(ctx, 20, 34, 9, 8, '#4ade80', 2.5);
      ellipse(ctx, 30, 31, 10, 9, '#22c55e', 2.5);
      circle(ctx, 40, 27, 8, '#16a34a', 2.5);
      // spots
      circle(ctx, 18, 32, 2.2, '#fde047', 0);
      circle(ctx, 29, 28, 2.5, '#fde047', 0);
      // eyes + antennae
      circle(ctx, 43, 25, 2, '#ffffff', 1);
      circle(ctx, 43.5, 25, 1, '#111827', 0);
      line(ctx, 40, 20, 45, 12, OUTLINE, 2);
      line(ctx, 37, 20, 34, 12, OUTLINE, 2);
      circle(ctx, 45, 12, 2, '#f97316', 1.5);
      circle(ctx, 34, 12, 2, '#f97316', 1.5);
    });

    // 💩 Organic Pasture Manure Pile (tap to turn into Golden Fertilizer!)
    this.tex('world-manure', 56, 48, (ctx) => {
      ellipse(ctx, 28, 41, 18, 5, 'rgba(0,0,0,0.2)', 0);
      ellipse(ctx, 28, 34, 15, 8, '#78350f', 2.5);
      ellipse(ctx, 28, 26, 11, 7, '#92400e', 2.5);
      ellipse(ctx, 28, 19, 6, 5, '#b45309', 2.5);
      // cute shimmer indicating fertilizer value
      sparkle4(ctx, 14, 14, 5, '#fde047');
      sparkle4(ctx, 43, 16, 4.5, '#fde047');
    });
  }

  // ---------------------------------------------------------------------------
  // Chibi farmer (front view, mirrored with flipX when walking left)
  // ---------------------------------------------------------------------------
  private genFarmer(): void {
    interface Pose {
      lArm: number; // radians from straight down, positive = outward/up
      rArm: number;
      legs: 0 | 1 | 2;
      blink: boolean;
      item: 'none' | 'can' | 'seeds';
      mouth: 'smile' | 'open';
    }
    const cx = 56;
    const skin = '#f8cfa0';
    const draw = (ctx: Ctx, p: Pose) => {
      // legs + boots
      const lY = p.legs === 1 ? -5 : 0;
      const rY = p.legs === 2 ? -5 : 0;
      rrect(ctx, cx - 12, 96 + lY, 11, 18, 4, '#2f5a96', 2.5);
      rrect(ctx, cx + 1, 96 + rY, 11, 18, 4, '#2f5a96', 2.5);
      rrect(ctx, cx - 15, 110 + lY, 15, 10, 5, '#6b4226', 2.5);
      rrect(ctx, cx, 110 + rY, 15, 10, 5, '#6b4226', 2.5);

      const arm = (sx: number, side: number, ang: number) => {
        const ex = sx + Math.sin(ang) * 19 * side;
        const ey = 74 + Math.cos(ang) * 19;
        limb(ctx, sx, 74, ex, ey, '#e05a47', 8);
        circle(ctx, ex, ey, 5.5, skin, 2.5);
        return { x: ex, y: ey };
      };

      // torso: plaid shirt + denim overalls
      rrect(ctx, cx - 18, 68, 36, 34, 11, '#e05a47', 3);
      line(ctx, cx - 12, 70, cx - 12, 100, 'rgba(255,255,255,0.25)', 2);
      line(ctx, cx + 12, 70, cx + 12, 100, 'rgba(255,255,255,0.25)', 2);
      rrect(ctx, cx - 12, 80, 24, 24, 6, '#3d6fb8', 2.5);
      limb(ctx, cx - 10, 81, cx - 14, 70, '#3d6fb8', 3);
      limb(ctx, cx + 10, 81, cx + 14, 70, '#3d6fb8', 3);
      circle(ctx, cx - 8, 84, 2, '#fcd34d', 1);
      circle(ctx, cx + 8, 84, 2, '#fcd34d', 1);
      rrect(ctx, cx - 5, 89, 10, 7, 2, '#5585cc', 1.5);

      arm(cx - 17, -1, p.lArm);
      const hand = arm(cx + 17, 1, p.rArm);

      if (p.item === 'can') {
        rrect(ctx, hand.x - 3, hand.y - 6, 20, 15, 4, '#7fb2d9', 2.5);
        limb(ctx, hand.x + 16, hand.y + 1, hand.x + 27, hand.y + 9, '#7fb2d9', 3);
        circle(ctx, hand.x + 28, hand.y + 10, 3.5, '#5d93bd', 2);
        line(ctx, hand.x, hand.y - 2, hand.x + 12, hand.y - 2, 'rgba(255,255,255,0.6)', 2);
      } else if (p.item === 'seeds') {
        ellipse(ctx, hand.x + 2, hand.y - 6, 7, 8, '#d8b27a', 2.5);
        line(ctx, hand.x - 3, hand.y - 12, hand.x + 7, hand.y - 12, '#8b5a2b', 2);
        for (const [dx, dy] of [[10, -18], [16, -10], [6, -24]] as const) circle(ctx, hand.x + dx, hand.y + dy, 2, '#a16207', 0);
      }

      // head
      circle(ctx, cx, 48, 24, skin, 3);
      circle(ctx, cx - 21, 42, 6, '#8b5a2b', 2);
      circle(ctx, cx + 21, 42, 6, '#8b5a2b', 2);
      // blush
      ellipse(ctx, cx - 13, 58, 5, 3, 'rgba(244,114,182,0.55)', 0);
      ellipse(ctx, cx + 13, 58, 5, 3, 'rgba(244,114,182,0.55)', 0);
      // eyes
      if (p.blink) {
        for (const ex of [cx - 8, cx + 8]) {
          ctx.beginPath();
          ctx.arc(ex, 51, 3.5, Math.PI * 0.1, Math.PI * 0.9);
          stroke(ctx, 2.5);
        }
      } else {
        for (const ex of [cx - 8, cx + 8]) {
          ellipse(ctx, ex, 51, 3.2, 4.4, '#2b1d14', 0);
          circle(ctx, ex + 1, 49.5, 1.3, '#ffffff', 0);
        }
      }
      // mouth
      if (p.mouth === 'open') {
        ctx.beginPath();
        ctx.arc(cx, 59, 4.5, 0, Math.PI);
        ctx.closePath();
        ctx.fillStyle = '#b91c1c';
        ctx.fill();
        stroke(ctx, 2);
      } else {
        ctx.beginPath();
        ctx.arc(cx, 57, 4, Math.PI * 0.15, Math.PI * 0.85);
        stroke(ctx, 2.2);
      }
      // straw hat
      ellipse(ctx, cx, 32, 36, 9.5, '#f2c94c', 3);
      ctx.beginPath();
      ctx.ellipse(cx, 28, 19, 14, 0, Math.PI, 0);
      ctx.closePath();
      ctx.fillStyle = '#f7d774';
      ctx.fill();
      stroke(ctx, 3);
      rrect(ctx, cx - 19, 24, 38, 6, 2, '#d9534f', 2);
      line(ctx, cx - 28, 33, cx - 12, 35, 'rgba(160,110,20,0.5)', 1.5);
      line(ctx, cx + 12, 35, cx + 28, 33, 'rgba(160,110,20,0.5)', 1.5);
    };

    const base: Pose = { lArm: 0.28, rArm: 0.28, legs: 0, blink: false, item: 'none', mouth: 'smile' };
    const frames: Record<string, Pose> = {
      'farmer-stand': base,
      'farmer-blink': { ...base, blink: true },
      'farmer-walk-1': { ...base, lArm: 0.6, rArm: -0.05, legs: 1 },
      'farmer-walk-2': { ...base, lArm: -0.05, rArm: 0.6, legs: 2 },
      'farmer-water': { ...base, rArm: 1.25, item: 'can' },
      'farmer-seed': { ...base, rArm: 2.0, item: 'seeds', mouth: 'open' },
      'farmer-cheer': { ...base, lArm: 2.7, rArm: 2.7, mouth: 'open' },
      'farmer-wave': { ...base, rArm: 2.55, mouth: 'open' },
    };
    for (const [key, pose] of Object.entries(frames)) {
      this.tex(key, FARMER_SIZE.w, FARMER_SIZE.h, (ctx) => draw(ctx, pose));
    }
  }

  // ---------------------------------------------------------------------------
  // Animals (side view facing right)
  // ---------------------------------------------------------------------------
  private genAnimals(): void {
    // ---- Sheep ----
    const sheep = (ctx: Ctx, legPhase: number, graze: boolean) => {
      const legs = [30, 42, 62, 74];
      legs.forEach((x, i) => {
        const up = legPhase !== 0 && (i % 2 === 0) === (legPhase === 1) ? -3 : 0;
        rrect(ctx, x - 3, 62 + up, 7, 16, 3, '#475569', 2);
      });
      circle(ctx, 18, 50, 6, '#f8fafc', 2.5);
      fluff(ctx, [[34, 46, 16], [50, 38, 18], [66, 42, 17], [76, 52, 13], [30, 58, 13], [48, 60, 16], [64, 60, 15]], '#fbfbf7');
      ellipse(ctx, 44, 36, 9, 5, 'rgba(255,255,255,0.9)', 0);
      const hx = graze ? 86 : 84;
      const hy = graze ? 60 : 42;
      ellipse(ctx, hx - 4, hy - 9, 7, 3.5, '#374151', 2, graze ? 0.2 : -0.5);
      ellipse(ctx, hx, hy, 11, 13, '#4b5563', 2.5);
      fluff(ctx, [[hx - 2, hy - 12, 5], [hx + 4, hy - 13, 4.5]], '#fbfbf7', 2);
      circle(ctx, hx + 4, hy - 2, 2.8, '#ffffff', 0);
      circle(ctx, hx + 4.8, hy - 2, 1.6, '#111827', 0);
      ellipse(ctx, hx + 2, hy + 7, 3, 1.8, 'rgba(244,114,182,0.7)', 0);
    };
    this.tex('sheep-0', 100, 84, (ctx) => sheep(ctx, 0, false));
    this.tex('sheep-1', 100, 84, (ctx) => sheep(ctx, 1, false));
    this.tex('sheep-2', 100, 84, (ctx) => sheep(ctx, 0, true));

    // ---- Chicken ----
    const chicken = (ctx: Ctx, mode: 'idle' | 'walk' | 'peck' | 'flap') => {
      const walk = mode === 'walk';
      limb(ctx, 28, 48, walk ? 24 : 27, 59, '#f59e0b', 2.5);
      limb(ctx, 36, 48, walk ? 39 : 37, 59, '#f59e0b', 2.5);
      ctx.save();
      if (mode === 'peck') {
        ctx.translate(32, 48);
        ctx.rotate(0.45);
        ctx.translate(-32, -48);
      }
      poly(ctx, [18, 36, 6, 22, 12, 40], '#f1f5f9', 2.5);
      fluff(ctx, [[32, 38, 16], [44, 26, 10]], '#ffffff', 3);
      circle(ctx, 42, 15, 3.4, '#ef4444', 1.5);
      circle(ctx, 46, 14, 3.4, '#ef4444', 1.5);
      circle(ctx, 49.5, 17, 3, '#ef4444', 1.5);
      poly(ctx, [52, 24, 59, 27, 52, 30], '#f59e0b', 1.8);
      ellipse(ctx, 51, 32, 2.2, 3, '#ef4444', 0);
      circle(ctx, 46, 23, 1.9, '#111827', 0);
      if (mode === 'flap') {
        ellipse(ctx, 26, 26, 10, 6, '#e2e8f0', 2.5, -0.9);
        ellipse(ctx, 36, 24, 9, 5, '#f1f5f9', 2.5, -1.3);
      } else {
        ellipse(ctx, 30, 39, 10, 6.5, '#e2e8f0', 2.5, 0.15);
      }
      ctx.restore();
    };
    this.tex('chicken-0', 64, 64, (ctx) => chicken(ctx, 'idle'));
    this.tex('chicken-1', 64, 64, (ctx) => chicken(ctx, 'walk'));
    this.tex('chicken-peck', 64, 64, (ctx) => chicken(ctx, 'peck'));
    this.tex('chicken-flap', 64, 64, (ctx) => chicken(ctx, 'flap'));

    // ---- Cow ----
    const cow = (ctx: Ctx, legPhase: number, tailUp: boolean, graze: boolean) => {
      // tail
      if (tailUp) {
        limb(ctx, 26, 38, 12, 46, '#f8fafc', 3);
        ellipse(ctx, 10, 48, 4, 5, '#1f2937', 1.5);
      } else {
        limb(ctx, 26, 38, 18, 62, '#f8fafc', 3);
        ellipse(ctx, 17, 65, 4, 5, '#1f2937', 1.5);
      }
      [34, 48, 78, 90].forEach((x, i) => {
        const up = legPhase !== 0 && (i % 2 === 0) === (legPhase === 1) ? -3 : 0;
        rrect(ctx, x - 4, 62 + up, 9, 22, 3, '#f8fafc', 2.5);
        rrect(ctx, x - 4, 78 + up, 9, 6, 2, '#57534e', 2);
      });
      rrect(ctx, 24, 28, 78, 42, 20, '#ffffff', 3);
      ctx.save();
      rrPath(ctx, 24, 28, 78, 42, 20);
      ctx.clip();
      for (const [x, y, rx, ry] of [[40, 38, 12, 9], [70, 52, 14, 10], [90, 34, 8, 7], [30, 62, 8, 6]] as const) {
        ellipse(ctx, x, y, rx, ry, '#1f2937', 0, 0.4);
      }
      ctx.restore();
      ellipse(ctx, 62, 72, 8, 4, '#f9a8d4', 2);
      const hx = graze ? 100 : 98;
      const hy = graze ? 56 : 30;
      poly(ctx, [hx - 2, hy - 12, hx - 8, hy - 20, hx + 2, hy - 15], '#fef3c7', 2);
      poly(ctx, [hx + 16, hy - 12, hx + 22, hy - 20, hx + 12, hy - 15], '#fef3c7', 2);
      ellipse(ctx, hx - 6, hy - 6, 6, 3.5, '#f8fafc', 2, -0.4);
      rrect(ctx, hx - 4, hy - 14, 24, 30, 11, '#ffffff', 3);
      ellipse(ctx, hx + 2, hy - 8, 5, 4, '#1f2937', 0);
      ellipse(ctx, hx + 10, hy + 10, 11, 8, '#f9a8d4', 2.5);
      circle(ctx, hx + 6, hy + 10, 1.6, '#9d174d', 0);
      circle(ctx, hx + 14, hy + 10, 1.6, '#9d174d', 0);
      circle(ctx, hx + 12, hy - 4, 2.4, '#111827', 0);
      circle(ctx, hx + 12.8, hy - 4.8, 0.9, '#ffffff', 0);
      if (graze) {
        for (const [x, l] of [[hx + 4, 8], [hx + 10, 11], [hx + 16, 7]] as const) line(ctx, x, hy + 18, x + 1, hy + 18 + l, '#4ade80', 2.5);
      }
    };
    this.tex('cow-0', 128, 92, (ctx) => cow(ctx, 0, false, false));
    this.tex('cow-1', 128, 92, (ctx) => cow(ctx, 1, true, false));
    this.tex('cow-graze', 128, 92, (ctx) => cow(ctx, 0, true, true));

    // ---- Dog (shiba) ----
    const dog = (ctx: Ctx, legPhase: number, sit: boolean) => {
      const fur = '#e8913a';
      const cream = '#fde7c4';
      if (sit) {
        ctx.beginPath();
        ctx.arc(22, 38, 9, Math.PI * 0.3, Math.PI * 1.9);
        stroke(ctx, 7, OUTLINE);
        ctx.beginPath();
        ctx.arc(22, 38, 9, Math.PI * 0.3, Math.PI * 1.9);
        stroke(ctx, 4, fur);
        ellipse(ctx, 38, 46, 17, 15, fur, 3);
        ellipse(ctx, 32, 58, 10, 5, fur, 2.5);
        rrect(ctx, 46, 44, 7, 18, 3, fur, 2.5);
        rrect(ctx, 54, 44, 7, 18, 3, fur, 2.5);
        ellipse(ctx, 50, 44, 8, 10, cream, 0);
      } else {
        [26, 34, 50, 58].forEach((x, i) => {
          const up = legPhase !== 0 && (i % 2 === 0) === (legPhase === 1) ? -3 : 0;
          rrect(ctx, x - 3, 46 + up, 7, 16, 3, fur, 2.5);
          rrect(ctx, x - 3, 57 + up, 7, 5, 2, cream, 1.5);
        });
        ctx.beginPath();
        ctx.arc(16, 28, 8, Math.PI * 0.3, Math.PI * 1.9);
        stroke(ctx, 7, OUTLINE);
        ctx.beginPath();
        ctx.arc(16, 28, 8, Math.PI * 0.3, Math.PI * 1.9);
        stroke(ctx, 4, fur);
        ellipse(ctx, 42, 40, 22, 13, fur, 3);
        ellipse(ctx, 50, 46, 10, 6, cream, 0);
      }
      const hx = sit ? 54 : 64;
      const hy = sit ? 24 : 28;
      poly(ctx, [hx - 10, hy - 6, hx - 8, hy - 20, hx - 1, hy - 10], fur, 2.5);
      poly(ctx, [hx + 2, hy - 10, hx + 8, hy - 20, hx + 10, hy - 5], fur, 2.5);
      circle(ctx, hx, hy, 13, fur, 3);
      ellipse(ctx, hx + 6, hy + 5, 8, 6, cream, 0);
      ellipse(ctx, hx - 4, hy + 6, 4, 3, 'rgba(244,114,182,0.6)', 0);
      circle(ctx, hx + 12, hy + 3, 2.6, '#111827', 0);
      ellipse(ctx, hx + 3, hy - 2, 2.2, 2.8, '#111827', 0);
      circle(ctx, hx + 3.6, hy - 3, 0.8, '#ffffff', 0);
      ctx.beginPath();
      ctx.arc(hx + 9, hy + 7, 3, 0.2, Math.PI * 0.9);
      stroke(ctx, 1.8);
    };
    this.tex('dog-0', 84, 68, (ctx) => dog(ctx, 0, false));
    this.tex('dog-1', 84, 68, (ctx) => dog(ctx, 1, false));
    this.tex('dog-sit', 84, 68, (ctx) => dog(ctx, 0, true));
  }
}
