import { useEffect, useState } from 'react';
import {
  BookOpen,
  ChefHat,
  CloudRain,
  Droplets,
  Flame,
  GraduationCap,
  Moon,
  ShoppingBag,
  Sparkles,
  Square,
  Sun,
  Trees,
  Trophy,
  Zap,
} from 'lucide-react';
import { ComboEngine, WATERING_CAN_LABELS } from '../../core/ComboEngine';
import { getActiveStage, getStageInfo } from '../../core/curriculum';
import type { ThemeName, WeatherType } from '../../core/types';
import { useGameStore } from '../store/useGameStore';

const THEMES: Array<{ id: ThemeName; label: string; Icon: typeof Trees }> = [
  { id: 'wood', label: 'Rustic Wood', Icon: Trees },
  { id: 'minimal', label: 'Modern Minimal', Icon: Square },
  { id: 'dark', label: 'Dark Mode', Icon: Moon },
];

/** Next streak milestone (3 / 5 / 10 cycle) for the combo gauge. */
function nextMilestone(streak: number): { target: number; label: string } {
  const candidates = [
    { every: 3, label: 'Fast-Grow Water' },
    { every: 5, label: 'Golden Fertilizer' },
    { every: 10, label: 'Fever Time' },
  ];
  let best = { target: Number.POSITIVE_INFINITY, label: '' };
  for (const c of candidates) {
    const target = (Math.floor(streak / c.every) + 1) * c.every;
    if (target < best.target) best = { target, label: c.label };
  }
  return best;
}

function useFeverRemaining(endsAt: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (endsAt <= Date.now()) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [endsAt]);
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

export function TopHud() {
  const profile = useGameStore((s) => s.profile);
  const setTheme = useGameStore((s) => s.setTheme);
  const setAlmanacOpen = useGameStore((s) => s.setAlmanacOpen);
  const setMarketOpen = useGameStore((s) => s.setMarketOpen);
  const setKitchenOpen = useGameStore((s) => s.setKitchenOpen);
  const setQuestsOpen = useGameStore((s) => s.setQuestsOpen);
  const setMockTestOpen = useGameStore((s) => s.setMockTestOpen);
  const mastery = useGameStore((s) => s.mastery);
  const setWeather = useGameStore((s) => s.setWeather);
  const feverLeft = useFeverRemaining(profile?.feverEndsAt ?? 0);

  if (!profile) return null;

  const dueCount = Object.values(mastery).filter(
    (m) => m.correctCount < m.attemptCount || m.srsLevel === 0 || m.nextReviewAt <= Date.now(),
  ).length;

  const lvl = ComboEngine.calculateLevel(profile.xp);
  const activeStage = getActiveStage(lvl.level, profile.stageOverride);
  const stageInfo = getStageInfo(activeStage);
  const milestone = nextMilestone(profile.streak);
  const gaugeRatio = Math.min(1, profile.streak / milestone.target);
  const feverActive = feverLeft > 0;
  const currentThemeIdx = THEMES.findIndex((t) => t.id === profile.theme);

  const cycleTheme = () => {
    const next = THEMES[(currentThemeIdx + 1) % THEMES.length];
    if (next) setTheme(next.id);
  };

  const cycleWeather = () => {
    const weathers: WeatherType[] = ['sunny', 'rain', 'rainbow', 'night'];
    const curIdx = weathers.indexOf(profile.activeWeather ?? 'sunny');
    const nextW = weathers[(curIdx + 1) % weathers.length] ?? 'sunny';
    setWeather(nextW);
  };

  return (
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 pt-safe px-2 md:px-4">
      <div className="panel pointer-events-auto mx-auto flex max-w-6xl flex-col gap-1.5 px-3 py-2">
        {/* Row 1: Level + Stage + XP + Desktop/Mobile actions */}
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-strong text-on-strong"
            aria-label={`Level ${lvl.level}`}
          >
            <span className="text-[9px] font-bold uppercase leading-none opacity-80">Lv</span>
            <span className="text-base font-extrabold leading-none">{lvl.level}</span>
          </div>
          <div className="min-w-[160px] flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate font-display text-sm font-bold md:text-base">LexiFarm IELTS</span>
                <button
                  type="button"
                  onClick={() => setAlmanacOpen(true)}
                  className="shrink-0 rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-extrabold text-accent hover:bg-accent/25"
                  title={`${stageInfo.title} · ${stageInfo.band} (Nhấn để mở Lộ trình)`}
                >
                  GĐ {activeStage} · {stageInfo.band.replace('Band ', '')}
                </button>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-muted">
                {lvl.currentLevelXp}/{lvl.nextLevelXp} XP
              </span>
            </div>
            <div
              className="mt-1 h-2 overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={lvl.nextLevelXp}
              aria-valuenow={lvl.currentLevelXp}
              aria-label="Experience"
            >
              <div
                className="h-full origin-left rounded-full bg-accent transition-transform duration-300"
                style={{ transform: `scaleX(${lvl.progressRatio})` }}
              />
            </div>
          </div>

          {/* Mobile-only quick actions */}
          <div className="flex shrink-0 items-center gap-1 md:hidden">
            <button
              type="button"
              onClick={cycleWeather}
              className="btn btn-ghost h-9 w-9 !min-h-0 p-0 text-amber-500"
              title="Đổi thời tiết (Nắng / Mưa / Cầu vồng / Đêm)"
            >
              {profile.activeWeather === 'rain' ? <CloudRain size={15} /> : <Sun size={15} />}
            </button>
            <button
              type="button"
              onClick={() => setMarketOpen(true)}
              className="btn btn-ghost h-9 w-9 !min-h-0 p-0 text-emerald-600"
              title="Chợ nông sản"
            >
              <ShoppingBag size={15} />
            </button>
            <button
              type="button"
              onClick={() => setKitchenOpen(true)}
              className="btn btn-ghost h-9 w-9 !min-h-0 p-0 text-amber-600"
              title="Xưởng Bếp"
            >
              <ChefHat size={15} />
            </button>
            <button
              type="button"
              onClick={() => setQuestsOpen(true)}
              className="btn btn-ghost h-9 w-9 !min-h-0 p-0 text-indigo-600"
              title="Nhiệm vụ"
            >
              <Trophy size={15} />
            </button>
            <button
              type="button"
              onClick={() => setMockTestOpen(true)}
              className="relative btn btn-ghost h-9 w-9 !min-h-0 p-0 text-violet-600"
              title="Phòng Thi Thử & Ôn Tập SRS"
            >
              <GraduationCap size={15} />
              {dueCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 rounded-full bg-danger px-1 text-[9px] font-black text-white">
                  {dueCount > 9 ? '9+' : dueCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={cycleTheme}
              className="btn btn-ghost h-9 w-9 !min-h-0 p-0"
              aria-label={`Theme: ${THEMES[currentThemeIdx]?.label ?? ''}. Tap to switch`}
            >
              {(() => {
                const Icon = THEMES[currentThemeIdx]?.Icon ?? Trees;
                return <Icon size={15} />;
              })()}
            </button>
            <button
              type="button"
              onClick={() => setAlmanacOpen(true)}
              className="btn btn-primary h-9 w-9 !min-h-0 p-0"
              aria-label="Open Vocabulary Almanac"
            >
              <BookOpen size={15} />
            </button>
          </div>

          {/* Desktop quick actions */}
          <div className="hidden shrink-0 items-center gap-1.5 md:flex">
            <button
              type="button"
              onClick={cycleWeather}
              className="btn btn-ghost min-h-[34px] gap-1 px-2.5 py-1 text-xs font-bold text-amber-500"
              title="Đổi thời tiết (Nắng ☀️, Mưa 🌧️ tự tưới nước, Cầu vồng 🌈, Đêm 🌙)"
            >
              {profile.activeWeather === 'rain' ? <CloudRain size={15} /> : profile.activeWeather === 'night' ? <Moon size={15} /> : <Sun size={15} />}
              <span className="capitalize">{profile.activeWeather ?? 'sunny'}</span>
            </button>

            <button
              type="button"
              onClick={() => setQuestsOpen(true)}
              className="btn btn-ghost min-h-[34px] gap-1 px-2.5 py-1 text-xs font-bold text-indigo-600"
              title="Nhiệm vụ hàng ngày & Thành tựu"
            >
              <Trophy size={15} />
              Nhiệm vụ
            </button>

            <button
              type="button"
              onClick={() => setKitchenOpen(true)}
              className="btn btn-ghost min-h-[34px] gap-1 px-2.5 py-1 text-xs font-bold text-amber-600"
              title="Xưởng Bếp & Chế biến nông sản"
            >
              <ChefHat size={15} />
              Xưởng Bếp
            </button>

            <button
              type="button"
              onClick={() => setMarketOpen(true)}
              className="btn btn-ghost min-h-[34px] gap-1 px-2.5 py-1 text-xs font-bold text-emerald-600"
              title="Chợ nông sản & Mua hạt giống"
            >
              <ShoppingBag size={15} />
              Chợ ({profile.coins ?? 0} Xu)
            </button>

            <div className="flex rounded-xl bg-surface-2 p-0.5" role="radiogroup" aria-label="Theme">
              {THEMES.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={profile.theme === id}
                  aria-label={label}
                  title={label}
                  onClick={() => setTheme(id)}
                  className={`focus-ring flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    profile.theme === id ? 'bg-accent text-accent-contrast' : 'text-muted hover:text-ink'
                  }`}
                >
                  <Icon size={15} />
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMockTestOpen(true)}
              className="btn btn-ghost min-h-[34px] gap-1 px-2.5 py-1 text-xs font-bold text-violet-600"
              title="Phòng Thi Thử IELTS, Ôn Tập SRS & Luyện Nghe Nhanh"
            >
              <GraduationCap size={15} />
              Thi thử
              {dueCount > 0 && (
                <span className="rounded-full bg-danger px-1.5 py-0.5 text-[10px] font-black leading-none text-white">
                  {dueCount}
                </span>
              )}
            </button>
            <button type="button" onClick={() => setAlmanacOpen(true)} className="btn btn-primary min-h-[34px] px-3 py-1 text-xs">
              <BookOpen size={15} />
              Lộ trình
            </button>
          </div>
        </div>

        {/* Row 2: Streak gauge + status chips */}
        <div className="flex flex-wrap items-center gap-2 border-t border-line/40 pt-1.5 text-xs">
          <div
            className={`flex min-w-[150px] flex-1 items-center gap-2 rounded-lg px-2.5 py-1 md:w-52 md:flex-none ${
              feverActive ? 'fever-pulse bg-danger text-white' : 'bg-surface-2'
            }`}
            title={feverActive ? 'IELTS Fever Time' : `Next: ${milestone.label} at ${milestone.target}x`}
          >
            <Flame size={15} className={profile.streak > 0 ? 'text-gold' : 'text-muted'} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-1 text-[11px] font-bold">
                <span>{profile.streak}x Streak</span>
                <span className={`truncate text-[10px] font-semibold ${feverActive ? '' : 'text-muted'}`}>
                  {feverActive ? `FEVER ${feverLeft}s` : `→ ${milestone.target}x`}
                </span>
              </div>
              <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full origin-left rounded-full bg-gold transition-transform duration-300"
                  style={{ transform: `scaleX(${feverActive ? feverLeft / 60 : gaugeRatio})` }}
                />
              </div>
            </div>
          </div>

          <span
            className="flex shrink-0 items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-[11px] font-bold"
            title={WATERING_CAN_LABELS[profile.wateringCanTier]}
          >
            <Droplets size={13} className="text-info" />
            <span className="capitalize">{profile.wateringCanTier}</span>
          </span>
          <span
            className="flex shrink-0 items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-[11px] font-bold"
            title="Golden Fertilizer charges (applied to next planting)"
          >
            <Sparkles size={13} className="text-gold" />
            {profile.goldenFertilizerCharges}
          </span>
          <span
            className="flex shrink-0 items-center gap-2 rounded-lg bg-surface-2 px-2.5 py-1 text-[11px] font-bold"
            title={`Kho nông sản: ${profile.stock?.cropFodder ?? 0} Lương thực, ${profile.stock?.eggs ?? 0} Trứng, ${profile.stock?.milk ?? 0} Sữa, ${profile.stock?.wool ?? 0} Lông cừu, ${profile.stock?.fish ?? 0} Cá`}
          >
            <span title="Lương thực">🌾 {profile.stock?.cropFodder ?? 0}</span>
            <span title="Trứng gà">🥚 {profile.stock?.eggs ?? 0}</span>
            <span title="Sữa bò">🥛 {profile.stock?.milk ?? 0}</span>
            <span title="Lông cừu">🧶 {profile.stock?.wool ?? 0}</span>
            <span title="Cá bắt được">🐟 {profile.stock?.fish ?? 0}</span>
          </span>
          <span
            className="hidden shrink-0 items-center gap-1 rounded-lg bg-surface-2 px-2 py-1 text-[11px] font-bold sm:flex"
            title="Best streak"
          >
            <Zap size={13} className="text-accent" />
            Best: {profile.bestStreak}x
          </span>
        </div>
      </div>
    </header>
  );
}
