import { useCallback, useEffect, useRef, useState } from 'react';
import { Award, Coins, Fish, RotateCcw, Sparkles, X } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

type CatchTier = 'normal' | 'silver' | 'gold';

interface CatchSummary {
  tier: CatchTier;
  position: number;
  fishCount: number;
  xp: number;
  coins: number;
  bonusSeed: boolean;
}

export function FishingModal() {
  const open = useGameStore((s) => s.fishingOpen);
  const setOpen = useGameStore((s) => s.setFishingOpen);
  if (!open) return null;
  return <FishingBody onClose={() => setOpen(false)} />;
}

function FishingBody({ onClose }: { onClose: () => void }) {
  const profile = useGameStore((s) => s.profile);
  const catchFishWithResult = useGameStore((s) => s.catchFishWithResult);

  const [cursor, setCursor] = useState(12);
  const [casting, setCasting] = useState(true);
  const [result, setResult] = useState<CatchSummary | null>(null);
  const cursorRef = useRef(12);
  const dirRef = useRef(1);
  const lastFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!casting) return undefined;
    let rafId = 0;
    const speed = 138; // % per second

    const step = (ts: number) => {
      if (lastFrameRef.current === null) lastFrameRef.current = ts;
      const dt = Math.min(0.05, (ts - lastFrameRef.current) / 1000);
      lastFrameRef.current = ts;

      let next = cursorRef.current + dirRef.current * speed * dt;
      if (next >= 98) {
        next = 98;
        dirRef.current = -1;
      } else if (next <= 2) {
        next = 2;
        dirRef.current = 1;
      }
      cursorRef.current = next;
      setCursor(next);
      rafId = requestAnimationFrame(step);
    };

    lastFrameRef.current = null;
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [casting]);

  const pullLine = useCallback(() => {
    if (!casting) return;
    setCasting(false);
    const pos = cursorRef.current;

    let tier: CatchTier = 'normal';
    let coins = 5;
    let xp = 25;
    let fishCount = 1;
    let bonusSeed = false;

    if (pos >= 43 && pos <= 57) {
      tier = 'gold';
      coins = 45;
      xp = 85;
      fishCount = 2;
      bonusSeed = true;
    } else if (pos >= 22 && pos <= 78) {
      tier = 'silver';
      coins = 20;
      xp = 50;
      fishCount = 2;
    }

    setResult({ tier, position: pos, fishCount, xp, coins, bonusSeed });
    catchFishWithResult(tier, coins, bonusSeed);
  }, [casting, catchFishWithResult]);

  const castAgain = useCallback(() => {
    cursorRef.current = Math.random() < 0.5 ? 5 : 95;
    dirRef.current = cursorRef.current < 50 ? 1 : -1;
    setCursor(cursorRef.current);
    setResult(null);
    setCasting(true);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (casting) pullLine();
        else castAgain();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [casting, pullLine, castAgain, onClose]);

  if (!profile) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fishing-title"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="panel relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-cyan-500/40 bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-cyan-500/10 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-600 text-white shadow">
              <Fish size={22} />
            </div>
            <div>
              <h2 id="fishing-title" className="font-display text-lg font-black text-ink">
                Câu Cá Bên Hồ
              </h2>
              <p className="text-xs font-semibold text-muted">
                Canh kim chạm vùng Xanh hoặc Tâm Vàng để giật cá lớn!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
            aria-label="Đóng mini-game câu cá"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          {/* Lake Banner */}
          <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3.5 py-2 text-xs font-bold">
            <span>🐟 Kho cá: {profile.stock?.fish ?? 0}</span>
            <span>🪙 Xu: {profile.coins ?? 0}</span>
            <span>⚡ Giữ đúng vùng Vàng = +Hạt hiếm!</span>
          </div>

          {/* Timing Meter */}
          <div>
            <div className="relative h-10 w-full overflow-hidden rounded-full border-2 border-line bg-slate-200 dark:bg-slate-800">
              {/* Silver good zone 22..78 */}
              <div
                className="absolute inset-y-0 bg-cyan-400/75"
                style={{ left: '22%', width: '56%' }}
              />
              {/* Gold bullseye 43..57 */}
              <div
                className="absolute inset-y-0 bg-amber-400"
                style={{ left: '43%', width: '14%' }}
              />
              {/* Moving bobber cursor */}
              <div
                className="absolute inset-y-0.5 w-2.5 -translate-x-1/2 rounded-full border-2 border-white bg-rose-600 shadow-md"
                style={{ left: `${cursor}%` }}
              />
            </div>

            <div className="mt-1.5 flex justify-between px-1 text-[10px] font-bold text-muted">
              <span>Cá Rô (+25 XP)</span>
              <span className="text-cyan-600">Cá Chép (+50 XP)</span>
              <span className="text-amber-600">Hoàng Gia (+85 XP + 🍅)</span>
            </div>
          </div>

          {/* Result card */}
          {result && (
            <div
              className={`rounded-2xl border-2 p-3.5 text-center ${
                result.tier === 'gold'
                  ? 'border-amber-400 bg-amber-500/10'
                  : result.tier === 'silver'
                    ? 'border-cyan-500 bg-cyan-500/10'
                    : 'border-line bg-surface-2'
              }`}
            >
              <p className="text-sm font-black text-ink">
                {result.tier === 'gold'
                  ? '🦈 ĐỈNH CAO! Câu trúng Cá Hoàng Gia!'
                  : result.tier === 'silver'
                    ? '🐠 XUẤT SẮC! Cá Chép Vàng!'
                    : '🐟 Câu được Cá Rô Tươi!'}
              </p>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-bold">
                <span className="rounded-lg bg-surface px-2.5 py-1">+{result.fishCount} 🐟</span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-surface px-2.5 py-1 text-accent">
                  <Award size={13} /> +{result.xp} XP
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-surface px-2.5 py-1 text-amber-600">
                  <Coins size={13} /> +{result.coins} Xu
                </span>
                {result.bonusSeed && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-400 px-2.5 py-1 text-black">
                    <Sparkles size={13} /> +1 Hạt hiếm
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2">
            {casting ? (
              <button
                type="button"
                onClick={pullLine}
                className="btn btn-primary min-h-[44px] flex-1 text-sm font-black"
              >
                🎣 Kéo Cần Ngay! (Space)
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={castAgain}
                  className="btn btn-primary min-h-[44px] flex-1 text-xs font-bold"
                >
                  <RotateCcw size={15} /> Thả Câu Tiếp (Space)
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-ghost min-h-[44px] px-4 text-xs font-bold"
                >
                  Xong
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
