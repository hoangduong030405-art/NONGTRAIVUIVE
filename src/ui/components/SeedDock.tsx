import { useMemo, useState } from 'react';
import {
  Droplets,
  Fish,
  Leaf,
  Lock,
  Sprout,
  Trash2,
  TreePine,
  Wheat,
} from 'lucide-react';
import type { VocabTier } from '../../core/types';
import { useGameStore } from '../store/useGameStore';

const TIER_TABS: Array<{ tier: VocabTier; label: string; short: string; band: string; Icon: typeof Sprout }> = [
  { tier: 1, label: 'Basic Seeds', short: 'Seeds', band: '4.5–5.5', Icon: Sprout },
  { tier: 2, label: 'Hybrid Saplings', short: 'Saplings', band: '6.0–6.5', Icon: Leaf },
  { tier: 3, label: 'Ancient Trees', short: 'Trees', band: '7.0–8.0+', Icon: TreePine },
];

export function SeedDock() {
  const vocabList = useGameStore((s) => s.vocabList);
  const profile = useGameStore((s) => s.profile);
  const selectedSeedId = useGameStore((s) => s.selectedSeedId);
  const activeToolMode = useGameStore((s) => s.activeToolMode);
  const selectSeed = useGameStore((s) => s.selectSeed);
  const setToolMode = useGameStore((s) => s.setToolMode);
  const feedAnimals = useGameStore((s) => s.feedAnimals);
  const cleanPastureManure = useGameStore((s) => s.cleanPastureManure);
  const fishAtPond = useGameStore((s) => s.fishAtPond);

  const [activeTier, setActiveTier] = useState<VocabTier>(1);

  const seeds = useMemo(() => vocabList.filter((v) => v.tier === activeTier), [vocabList, activeTier]);

  if (!profile) return null;

  const tierLocked = (tier: VocabTier) => {
    if (tier === 1 || tier === 2) return false;
    return (profile?.xp ?? 0) < 100;
  };

  const stock = profile.stock ?? {
    cropFodder: 0,
    eggs: 0,
    milk: 0,
    wool: 0,
    fertilizerBags: 0,
    fish: 0,
  };

  return (
    <nav
      aria-label="Seed and Farm dock"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 pb-safe px-2 md:px-6"
    >
      <div className="panel pointer-events-auto mx-auto flex max-w-5xl flex-col gap-2 p-2 md:flex-row md:items-stretch md:gap-3">
        {/* Farm Action Quick Tools (Water, Feed, Fish, Clean) */}
        <div className="flex flex-wrap items-center gap-1.5 border-b border-line/40 pb-2 md:w-48 md:flex-col md:border-b-0 md:border-r md:pb-0 md:pr-2">
          {/* Seeds mode */}
          <button
            type="button"
            onClick={() => setToolMode('seeds')}
            className={`btn flex-1 md:w-full min-h-[36px] text-xs font-bold px-2 ${
              activeToolMode === 'seeds' ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            <Sprout size={15} /> Gieo hạt
          </button>

          {/* Water tool */}
          <button
            type="button"
            onClick={() => setToolMode('water')}
            className={`btn flex-1 md:w-full min-h-[36px] text-xs font-bold px-2 ${
              activeToolMode === 'water' ? 'bg-sky-600 text-white' : 'btn-ghost'
            }`}
            title="Tưới nước cho cây để rút ngắn 25% thời gian"
          >
            <Droplets size={15} /> Tưới nước
          </button>

          {/* Feed animals */}
          <button
            type="button"
            onClick={() => feedAnimals(1)}
            disabled={stock.cropFodder <= 0}
            className="btn btn-ghost flex-1 md:w-full min-h-[36px] text-xs font-bold px-2 disabled:opacity-40"
            title={`Cho thú ăn lương thực (Hiện có ${stock.cropFodder} lương thực)`}
          >
            <Wheat size={15} className="text-amber-500" />
            Cho ăn ({stock.cropFodder})
          </button>

          {/* Fish */}
          <button
            type="button"
            onClick={() => fishAtPond()}
            className="btn btn-ghost flex-1 md:w-full min-h-[36px] text-xs font-bold px-2"
            title="Câu cá ở hồ nước (+35 XP)"
          >
            <Fish size={15} className="text-cyan-500" />
            Câu cá ({stock.fish})
          </button>

          {/* Clean manure */}
          <button
            type="button"
            onClick={() => cleanPastureManure()}
            className="btn btn-ghost flex-1 md:w-full min-h-[36px] text-xs font-bold px-2"
            title="Dọn phân thú tạo phân bón vàng (+30 XP & +1 Phân bón)"
          >
            <Trash2 size={15} className="text-emerald-600" />
            Dọn phân
          </button>
        </div>

        {/* Tier tabs: horizontal on mobile, vertical on desktop */}
        <div className="flex gap-1 md:w-36 md:flex-col" role="tablist" aria-label="Vocabulary tier">
          {TIER_TABS.map(({ tier, label, short, band, Icon }) => {
            const locked = tierLocked(tier);
            const active = tier === activeTier;
            return (
              <button
                key={tier}
                type="button"
                role="tab"
                aria-selected={active}
                disabled={locked}
                onClick={() => {
                  setActiveTier(tier);
                  setToolMode('seeds');
                }}
                title={locked ? 'Unlocks at 100 XP' : `${label} · Band ${band}`}
                className={`focus-ring flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition-colors md:justify-start ${
                  active && activeToolMode === 'seeds'
                    ? 'bg-surface-strong text-on-strong'
                    : 'bg-surface-2 text-ink'
                } ${locked ? 'opacity-50' : ''}`}
              >
                {locked ? <Lock size={14} /> : <Icon size={14} />}
                <span className="md:hidden">{short}</span>
                <span className="hidden md:inline">{label}</span>
                <span className="ml-auto hidden text-[10px] font-semibold opacity-70 md:inline">{band}</span>
              </button>
            );
          })}
        </div>

        {/* Seed cards: horizontal scroller */}
        <div className="no-scrollbar flex flex-1 snap-x gap-2 overflow-x-auto" role="listbox" aria-label="Seeds">
          {seeds.map((seed) => {
            const seedStock = profile.seedInventory[seed.id] ?? 0;
            const unlimited = seed.tier === 1;
            const empty = !unlimited && seedStock <= 0;
            const selected = seed.id === selectedSeedId && activeToolMode === 'seeds';
            return (
              <button
                key={seed.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  selectSeed(selected ? null : seed.id);
                  setToolMode('seeds');
                }}
                className={`focus-ring relative flex min-h-[64px] w-36 shrink-0 snap-start flex-col justify-between rounded-xl border-2 px-2.5 py-2 text-left transition-transform md:w-40 ${
                  selected
                    ? 'scale-[1.02] border-accent bg-surface shadow-md'
                    : 'border-transparent bg-surface-2 hover:border-line'
                } ${empty ? 'opacity-50' : ''}`}
              >
                <span className="line-clamp-2 text-[13px] font-bold leading-tight">{seed.word}</span>
                <span className="mt-1 flex items-center justify-between text-[10px] font-semibold text-muted">
                  <span>{Math.round(seed.growthDurationMs / 1000)}s</span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono ${
                      empty ? 'bg-danger text-white' : 'bg-surface text-ink'
                    }`}
                  >
                    {unlimited ? '∞' : `×${seedStock}`}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
