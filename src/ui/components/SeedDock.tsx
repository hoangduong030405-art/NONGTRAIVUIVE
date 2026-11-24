import {
  Compass,
  Droplets,
  Fish,
  Sprout,
  Trash2,
  Wheat,
  Zap,
} from 'lucide-react';
import { FARM_CROP_PACKS, getActiveStage, getStageInfo } from '../../core/curriculum';
import { useGameStore } from '../store/useGameStore';

export function SeedDock() {
  const profile = useGameStore((s) => s.profile);
  const selectedSeedId = useGameStore((s) => s.selectedSeedId);
  const activeToolMode = useGameStore((s) => s.activeToolMode);
  const selectSeed = useGameStore((s) => s.selectSeed);
  const setToolMode = useGameStore((s) => s.setToolMode);
  const setAlmanacOpen = useGameStore((s) => s.setAlmanacOpen);
  const feedAnimals = useGameStore((s) => s.feedAnimals);
  const cleanPastureManure = useGameStore((s) => s.cleanPastureManure);
  const fishAtPond = useGameStore((s) => s.fishAtPond);

  if (!profile) return null;

  const activeStage = getActiveStage(profile.level, profile.stageOverride);
  const stageInfo = getStageInfo(activeStage);
  const stagePrefix = `s${activeStage}_`;
  const completedInStage = (profile.completedQuestionIds ?? []).filter((id) =>
    id.startsWith(stagePrefix),
  ).length;

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
      className="pointer-events-none absolute inset-x-0 bottom-0 z-20 pb-safe px-2 md:px-4"
    >
      <div className="panel pointer-events-auto mx-auto flex max-w-4xl flex-col gap-1.5 p-2">
        {/* Top slim row: 5 compact action tools + Stage auto-push banner */}
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => setToolMode('seeds')}
              className={`btn min-h-[32px] px-2.5 py-1 text-xs font-bold ${
                activeToolMode === 'seeds' ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              <Sprout size={14} /> Gieo hạt
            </button>

            <button
              type="button"
              onClick={() => setToolMode('water')}
              className={`btn min-h-[32px] px-2.5 py-1 text-xs font-bold ${
                activeToolMode === 'water' ? 'bg-sky-600 text-white' : 'btn-ghost'
              }`}
              title="Tưới nước cho cây để rút ngắn 25% thời gian"
            >
              <Droplets size={14} /> Tưới nước
            </button>

            <button
              type="button"
              onClick={() => feedAnimals(1)}
              disabled={stock.cropFodder <= 0}
              className="btn btn-ghost min-h-[32px] px-2.5 py-1 text-xs font-bold disabled:opacity-40"
              title={`Cho thú ăn lương thực (Hiện có ${stock.cropFodder} lương thực)`}
            >
              <Wheat size={14} className="text-amber-500" />
              Cho ăn ({stock.cropFodder})
            </button>

            <button
              type="button"
              onClick={() => fishAtPond()}
              className="btn btn-ghost min-h-[32px] px-2.5 py-1 text-xs font-bold"
              title="Câu cá ở hồ nước (+35 XP)"
            >
              <Fish size={14} className="text-cyan-500" />
              Câu cá ({stock.fish})
            </button>

            <button
              type="button"
              onClick={() => cleanPastureManure()}
              className="btn btn-ghost min-h-[32px] px-2.5 py-1 text-xs font-bold"
              title="Dọn phân thú tạo phân bón vàng (+30 XP & +1 Phân bón)"
            >
              <Trash2 size={14} className="text-emerald-600" />
              Dọn phân
            </button>
          </div>

          <div className="flex min-w-0 items-center gap-1.5 rounded-xl bg-surface-2 px-2.5 py-1 text-[11px]">
            <Zap size={13} className="shrink-0 text-amber-500" />
            <span className="truncate font-bold">
              Tự đẩy: GĐ {activeStage} ({stageInfo.band.replace('Band ', '')})
            </span>
            <span className="hidden rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted lg:inline">
              {profile.stageOverride && profile.stageOverride !== 'auto' ? '📌 Thủ công' : '🤖 Tự động'} ·{' '}
              {completedInStage}/{stageInfo.questionTarget}
            </span>
            <button
              type="button"
              onClick={() => setAlmanacOpen(true)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent hover:bg-accent/25"
            >
              <Compass size={11} /> Lộ trình 5 GĐ
            </button>
          </div>
        </div>

        {/* Bottom slim row: 3 Farm Crop Packs */}
        <div className="grid grid-cols-3 gap-2" role="listbox" aria-label="Loại cây trồng">
          {FARM_CROP_PACKS.map((pack) => {
            const seedId = `crop_t${pack.tier}`;
            const seedStock = profile.seedInventory[seedId] ?? 0;
            const unlimited = pack.tier === 1;
            const empty = !unlimited && seedStock <= 0;
            const selected = seedId === selectedSeedId && activeToolMode === 'seeds';

            return (
              <button
                key={seedId}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  selectSeed(seedId);
                  setToolMode('seeds');
                }}
                className={`focus-ring relative flex min-h-[50px] items-center justify-between gap-2 rounded-xl border-2 px-2.5 py-1.5 text-left transition-transform ${
                  selected
                    ? 'scale-[1.01] border-accent bg-surface shadow-sm'
                    : 'border-transparent bg-surface-2 hover:border-line'
                } ${empty ? 'opacity-55' : ''}`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {pack.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold leading-tight">{pack.name}</p>
                  <p className="truncate text-[10px] font-semibold text-muted">
                    {pack.durationSec}s · {pack.xpBoostLabel}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold ${
                    empty ? 'bg-danger text-white' : 'bg-surface text-ink'
                  }`}
                >
                  {unlimited ? '∞' : `×${seedStock}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
