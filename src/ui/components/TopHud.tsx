import { useEffect, useState } from 'react';
import {
  BookOpen,
  ChefHat,
  CloudRain,
  Droplets,
  Flame,
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
  const setWeather = useGameStore((s) => s.setWeather);
  const feverLeft = useFeverRemaining(profile?.feverEndsAt ?? 0);

  if (!profile) return null;

  const lvl = ComboEngine.calculateLevel(profile.xp);
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
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 pt-safe px-2 md:px-6">
      <div className="panel pointer-events-auto mx-auto flex max-w-6xl flex-col gap-2 px-3 py-2 md:flex-row md:items-center md:gap-4 md:px-4">
        {/* Row 1: Level + XP */}
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-surface-strong text-on-strong"
            aria-label={`Level ${lvl.level}`}
          >
            <span className="text-[9px] font-bold uppercase leading-none opacity-80">Lv</span>
            <span className="text-lg font-extrabold leading-none">{lvl.level}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-display text-sm font-bold md:text-base">LexiFarm IELTS</span>
              <span className="shrink-0 font-mono text-[11px] text-muted">
                {lvl.currentLevelXp}/{lvl.nextLevelXp} XP
              </span>
            </div>
            <div
              className="mt-1 h-2.5 overflow-hidden rounded-full bg-surface-2"
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
              className="btn btn-ghost h-10 w-10 !min-h-0 p-0 text-amber-500"
              title="Đổi thời tiết (Nắng / Mưa / Cầu vồng / Đêm)"
            >
              {profile.activeWeather === 'rain' ? <CloudRain size={16} /> : <Sun size={16} />}
            </button>
            <button
              type="button"
              onClick={() => setMarketOpen(true)}
              className="btn btn-ghost h-10 w-10 !min-h-0 p-0 text-emerald-600"
              title="Chợ nông sản"
            >
              <ShoppingBag size={16} />
            </button>
            <button
              type="button"
              onClick={() => setKitchenOpen(true)}
              className="btn btn-ghost h-10 w-10 !min-h-0 p-0 text-amber-600"
              title="Xưởng Bếp"
            >
              <ChefHat size={16} />
            </button>
            <button
              type="button"
              onClick={() => setQuestsOpen(true)}
              className="btn btn-ghost h-10 w-10 !min-h-0 p-0 text-indigo-600"
              title="Nhiệm vụ"
            >
              <Trophy size={16} />
            </button>
            <button
              type="button"
              onClick={cycleTheme}
              className="btn btn-ghost h-10 w-10 !min-h-0 p-0"
              aria-label={`Theme: ${THEMES[currentThemeIdx]?.label ?? ''}. Tap to switch`}
            >
              {(() => {
                const Icon = THEMES[currentThemeIdx]?.Icon ?? Trees;
                return <Icon size={16} />;
              })()}
            </button>
            <button
              type="button"
              onClick={() => setAlmanacOpen(true)}
              className="btn btn-primary h-10 w-10 !min-h-0 p-0"
              aria-label="Open Vocabulary Almanac"
            >
              <BookOpen size={16} />
            </button>
          </div>
        </div>

        {/* Row 2: Streak gauge + status chips */}
        <div className="flex items-center gap-2 md:gap-3">
          <div
            className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2.5 py-1.5 md:w-56 md:flex-none ${
              feverActive ? 'fever-pulse bg-danger text-white' : 'bg-surface-2'
            }`}
            title={feverActive ? 'IELTS Fever Time' : `Next: ${milestone.label} at ${milestone.target}x`}
          >
            <Flame size={18} className={profile.streak > 0 ? 'text-gold' : 'text-muted'} />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-1 text-xs font-bold">
                <span>{profile.streak}x Streak</span>
                <span className={`truncate text-[10px] font-semibold ${feverActive ? '' : 'text-muted'}`}>
                  {feverActive ? `FEVER ${feverLeft}s` : `→ ${milestone.target}x`}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/10">
                <div
                  className="h-full origin-left rounded-full bg-gold transition-transform duration-300"
                  style={{ transform: `scaleX(${feverActive ? feverLeft / 60 : gaugeRatio})` }}
                />
              </div>
            </div>
          </div>

          <span
            className="flex shrink-0 items-center gap-1 rounded-lg bg-surface-2 px-2 py-1.5 text-xs font-bold"
            title={WATERING_CAN_LABELS[profile.wateringCanTier]}
          >
            <Droplets size={14} className="text-info" />
            <span className="capitalize">{profile.wateringCanTier}</span>
          </span>
          <span
            className="flex shrink-0 items-center gap-1 rounded-lg bg-surface-2 px-2 py-1.5 text-xs font-bold"
            title="Golden Fertilizer charges (applied to next planting)"
          >
            <Sparkles size={14} className="text-gold" />
            {profile.goldenFertilizerCharges}
          </span>
          {/* Farm Stock counts: Eggs, Milk, Wool, Fish */}
          <span
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-surface-2 px-2 py-1.5 text-xs font-bold"
            title={`Kho nông sản: ${profile.stock?.cropFodder ?? 0} Lương thực, ${profile.stock?.eggs ?? 0} Trứng, ${profile.stock?.milk ?? 0} Sữa, ${profile.stock?.wool ?? 0} Lông cừu, ${profile.stock?.fish ?? 0} Cá`}
          >
            <span title="Lương thực">🌾 {profile.stock?.cropFodder ?? 0}</span>
            <span title="Trứng gà">🥚 {profile.stock?.eggs ?? 0}</span>
            <span title="Sữa bò">🥛 {profile.stock?.milk ?? 0}</span>
            <span title="Lông cừu">🧶 {profile.stock?.wool ?? 0}</span>
            <span title="Cá bắt được">🐟 {profile.stock?.fish ?? 0}</span>
          </span>
          <span
            className="hidden shrink-0 items-center gap-1 rounded-lg bg-surface-2 px-2 py-1.5 text-xs font-bold lg:flex"
            title="Best streak"
          >
            <Zap size={14} className="text-accent" />
            {profile.bestStreak}
          </span>
        </div>

        {/* Desktop: theme switcher + almanac */}
        <div className="hidden items-center gap-2 md:flex">
          {/* Weather button */}
          <button
            type="button"
            onClick={cycleWeather}
            className="btn btn-ghost px-2.5 py-1 text-xs font-bold gap-1 text-amber-500"
            title="Đổi thời tiết (Nắng ☀️, Mưa 🌧️ tự tưới nước, Cầu vồng 🌈, Đêm 🌙)"
          >
            {profile.activeWeather === 'rain' ? <CloudRain size={16} /> : profile.activeWeather === 'night' ? <Moon size={16} /> : <Sun size={16} />}
            <span className="capitalize">{profile.activeWeather ?? 'sunny'}</span>
          </button>

          {/* Quests button */}
          <button
            type="button"
            onClick={() => setQuestsOpen(true)}
            className="btn btn-ghost px-2.5 py-1 text-xs font-bold gap-1 text-indigo-600"
            title="Nhiệm vụ hàng ngày & Thành tựu"
          >
            <Trophy size={16} />
            Nhiệm vụ
          </button>

          {/* Kitchen Bakery button */}
          <button
            type="button"
            onClick={() => setKitchenOpen(true)}
            className="btn btn-ghost px-2.5 py-1 text-xs font-bold gap-1 text-amber-600"
            title="Xưởng Bếp & Chế biến nông sản"
          >
            <ChefHat size={16} />
            Xưởng Bếp
          </button>

          {/* Market button */}
          <button
            type="button"
            onClick={() => setMarketOpen(true)}
            className="btn btn-ghost px-2.5 py-1 text-xs font-bold gap-1 text-emerald-600"
            title="Chợ nông sản & Mua hạt giống"
          >
            <ShoppingBag size={16} />
            Chợ ({profile.coins ?? 0} Xu)
          </button>

          <div className="flex rounded-xl bg-surface-2 p-1" role="radiogroup" aria-label="Theme">
            {THEMES.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={profile.theme === id}
                aria-label={label}
                title={label}
                onClick={() => setTheme(id)}
                className={`focus-ring flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                  profile.theme === id ? 'bg-accent text-accent-contrast' : 'text-muted hover:text-ink'
                }`}
              >
                <Icon size={16} />
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setAlmanacOpen(true)} className="btn btn-primary px-3 text-xs">
            <BookOpen size={16} />
            Almanac
          </button>
        </div>
      </div>
    </header>
  );
}
