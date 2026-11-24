import { Award, CheckCircle2, Coins, Gift, RefreshCw, Trophy, X } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

export function DailyQuestsModal() {
  const open = useGameStore((s) => s.questsOpen);
  const setOpen = useGameStore((s) => s.setQuestsOpen);
  const profile = useGameStore((s) => s.profile);
  const claimQuest = useGameStore((s) => s.claimQuest);
  const refreshDailyQuests = useGameStore((s) => s.refreshDailyQuests);

  if (!open || !profile) return null;

  const quests = profile.dailyQuests ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      <div className="panel relative flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl border-2 border-indigo-600/30">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-indigo-500/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md">
              <Trophy size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-ink">Nhiệm Vụ Hằng Ngày & Thành Tựu</h2>
              <p className="text-xs font-semibold text-muted">
                Hoàn thành thử thách nông trại để mở rương Xu vàng 🪙 & điểm XP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2 text-muted"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quests list */}
        <div className="no-scrollbar flex-1 overflow-y-auto p-5 space-y-3">
          {quests.map((quest) => {
            const progressRatio = Math.min(1, quest.currentCount / quest.targetCount);

            return (
              <div
                key={quest.id}
                className={`rounded-2xl border-2 p-4 transition-all ${
                  quest.claimed
                    ? 'border-line/40 bg-surface-2/40 opacity-60'
                    : quest.completed
                    ? 'border-emerald-500 bg-emerald-500/5 shadow-md'
                    : 'border-line bg-surface'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-ink">{quest.title}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-2.5 flex items-center gap-2.5">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            quest.completed ? 'bg-emerald-500' : 'bg-indigo-600'
                          }`}
                          style={{ width: `${progressRatio * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs font-bold text-muted">
                        {quest.currentCount} / {quest.targetCount}
                      </span>
                    </div>
                  </div>

                  {/* Claim Button */}
                  <div className="shrink-0">
                    {quest.claimed ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-muted">
                        <CheckCircle2 size={16} /> Đã nhận
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={!quest.completed}
                        onClick={() => claimQuest(quest.id)}
                        className={`btn px-3 py-1.5 text-xs font-bold min-h-[34px] ${
                          quest.completed
                            ? 'btn-primary bg-emerald-600 border-emerald-600'
                            : 'btn-ghost opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <Gift size={15} /> Nhận thưởng
                      </button>
                    )}
                  </div>
                </div>

                {/* Rewards line */}
                <div className="mt-3 flex items-center gap-3 border-t border-line/40 pt-2 text-xs font-bold">
                  <span className="flex items-center gap-1 text-amber-600">
                    <Coins size={14} /> +{quest.rewardCoins} Xu
                  </span>
                  <span className="flex items-center gap-1 text-accent">
                    <Award size={14} /> +{quest.rewardXp} XP
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line bg-surface-2 px-5 py-3">
          <button
            type="button"
            onClick={() => refreshDailyQuests()}
            className="btn btn-ghost gap-1.5 px-3 text-xs font-bold text-indigo-600"
          >
            <RefreshCw size={14} /> Đổi bộ nhiệm vụ mới
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn btn-ghost px-5 text-xs font-bold"
          >
            Đóng bảng
          </button>
        </div>
      </div>
    </div>
  );
}
