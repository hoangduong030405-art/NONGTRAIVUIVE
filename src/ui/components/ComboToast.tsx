import { memo } from 'react';
import { Droplets, Fish, Flame, Gift, Heart, Info, ShoppingBag, Sparkles, Sprout, Trophy, Zap } from 'lucide-react';
import type { ToastNotification } from '../../core/types';
import { useGameStore } from '../store/useGameStore';

const VARIANT: Record<ToastNotification['variant'], { Icon: typeof Info; cls: string }> = {
  critical: { Icon: Zap, cls: 'bg-gold text-black' },
  water: { Icon: Droplets, cls: 'bg-info text-white' },
  golden: { Icon: Sparkles, cls: 'bg-gold text-black' },
  fever: { Icon: Flame, cls: 'bg-danger text-white' },
  chest: { Icon: Gift, cls: 'bg-accent text-accent-contrast' },
  harvest: { Icon: Sprout, cls: 'bg-success text-white' },
  info: { Icon: Info, cls: 'bg-surface-strong text-on-strong' },
  animal: { Icon: Heart, cls: 'bg-pink-600 text-white' },
  fish: { Icon: Fish, cls: 'bg-sky-600 text-white' },
  market: { Icon: ShoppingBag, cls: 'bg-emerald-600 text-white' },
  quest: { Icon: Trophy, cls: 'bg-indigo-600 text-white' },
};

const ToastItem = memo(function ToastItem({ toast }: { toast: ToastNotification }) {
  const { Icon, cls } = VARIANT[toast.variant];
  return (
    <div
      className={`gpu flex w-full max-w-sm animate-slide-down items-center gap-3 rounded-2xl px-3 py-2 shadow-lg ${cls}`}
    >
      <Icon size={20} className="shrink-0" />
      <div className="min-w-0">
        <p className="truncate text-sm font-extrabold leading-tight">{toast.title}</p>
        <p className="truncate text-xs font-semibold opacity-90">{toast.subtitle}</p>
      </div>
    </div>
  );
});

/**
 * Non-blocking reward banner stack. The whole layer is pointer-events:none so
 * the player can keep tapping farm plots underneath without interruption.
 */
export function ComboToast() {
  const toasts = useGameStore((s) => s.toasts);
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 px-3 pt-[max(0.5rem,env(safe-area-inset-top))]"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.slice(-3).map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
