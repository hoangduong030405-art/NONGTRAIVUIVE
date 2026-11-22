# LexiFarm IELTS — Internal Edutainment Web Game

A 2D farm simulation for practising IELTS vocabulary (Band 4.5 → 8.0+). For internal use only (LAN / intranet / local PWA): no payments, no ads, no tracking. All progress is stored on the device in IndexedDB.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173   (append ?fps to show the FPS meter)
npm run build        # type-check + production bundle in dist/
npm run preview -- --host   # serve dist/ to the LAN
npm test             # ComboEngine / FarmEngine unit tests
```

## Architecture (2-layer, decoupled)

| Layer | Tech | Responsibility |
|---|---|---|
| 1 · Game World | Phaser 3 (WebGL, transparent) | 4×3 grid (3×4 in portrait), crop stages drawn from procedural textures, tap/swipe input, pooled particles |
| 2 · Learning HUD | React 18 + Tailwind + Lucide | TopHud, SeedDock, IeltsQuizModal, ComboToast, AlmanacModal, themes |
| Bridge | Mitt `EventBus` | `game:*` intents (tap, harvest) → store; `ui:*` (sync, fx, theme) → Phaser |
| State | Zustand `useGameStore` | **Single source of truth.** Phaser never changes plot state; it only renders snapshots |
| Persistence | Dexie (IndexedDB) | profile, plots, SRS mastery, plus JSON export/import |

### Performance rules
- Growth is timestamp-based (`Date.now() - plantedAt`), so crops keep growing while the tab is closed.
- The `FarmScene.update` hot path allocates nothing: render state is cached and textures only change when the stage changes.
- `ParticlePool` pre-allocates 180 sprites and stores particle data in typed arrays.
- Toasts and progress bars animate only `transform`/`opacity`. The toast layer is `pointer-events: none`.

## Gameplay
1. Pick a seed in the dock and tap an empty plot to plant it.
2. Tap a growing plot with a **?** badge to open its IELTS quiz. A correct answer fertilizes the crop.
3. Tap or swipe across ripe plots (✓ badge) to harvest them. Tier 2/3 harvests unlock Tip Cards.

| Reward | Trigger |
|---|---|
| Critical Bonus (×1.5 XP, faster growth) | Correct answer in ≤ 4 s |
| Fast-Grow Water (−30% remaining time on all crops) | Every 3× streak |
| Golden Fertilizer (3★ yield, ×1.5 XP, +1 charge) | Every 5× streak |
| IELTS Fever Time (60 s auto-harvest, ×2 harvest XP, bonus Tier 3 seed) | Every 10× streak |
| Lexi Chest (exclusive Tip Card + watering can upgrade Copper → Silver → Gold → Diamond) | Tier 3 answered correctly on the first try |

Tier 2 unlocks at Level 2 and Tier 3 at Level 3 (200 XP per level).

## Content
Edit `public/data/ielts_vocab.json` (6 Tier 1, 8 Tier 2, 8 Tier 3 entries). Put the correct option at `correctIndex`; the UI shuffles options automatically. Lexi Chest–exclusive tips are in `src/core/tipCards.ts`.
