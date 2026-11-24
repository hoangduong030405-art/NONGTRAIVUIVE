import { ChefHat, Flame, Volume2, X } from 'lucide-react';
import { AudioEngine } from '../../core/AudioEngine';
import { useGameStore } from '../store/useGameStore';

interface Recipe {
  id: 'bread' | 'cheese' | 'sweater';
  name: string;
  emoji: string;
  reqDesc: string;
  reqStockKey: 'cropFodder' | 'milk' | 'wool';
  reqAmount: number;
  ieltsCollocation: string;
  ieltsMeaning: string;
  rewardXp: number;
}

const RECIPES: Recipe[] = [
  {
    id: 'bread',
    name: 'Ổ Bánh Mì Lúa Mạch',
    emoji: '🥖',
    reqDesc: '3 Lương thực hoa màu (Fodder)',
    reqStockKey: 'cropFodder',
    reqAmount: 3,
    ieltsCollocation: 'Staple food & Sustainable agriculture',
    ieltsMeaning: 'Lương thực thiết yếu trong chế độ ăn uống & nền nông nghiệp bền vững.',
    rewardXp: 40,
  },
  {
    id: 'cheese',
    name: 'Phô Mai Béo Ngậy',
    emoji: '🧀',
    reqDesc: '2 Bình Sữa bò tươi (Milk)',
    reqStockKey: 'milk',
    reqAmount: 2,
    ieltsCollocation: 'Artisanal dairy production',
    ieltsMeaning: 'Quy trình sản xuất bơ sữa truyền thống, thủ công chất lượng cao.',
    rewardXp: 50,
  },
  {
    id: 'sweater',
    name: 'Áo Len Dệt Cừu',
    emoji: '🧶',
    reqDesc: '2 Cuộn Len cừu mềm (Wool)',
    reqStockKey: 'wool',
    reqAmount: 2,
    ieltsCollocation: 'Biodegradable textile materials',
    ieltsMeaning: 'Nguyên liệu dệt may sinh học tự nhiên, thân thiện với hệ sinh thái.',
    rewardXp: 60,
  },
];

export function KitchenModal() {
  const open = useGameStore((s) => s.kitchenOpen);
  const setOpen = useGameStore((s) => s.setKitchenOpen);
  const profile = useGameStore((s) => s.profile);
  const craftItem = useGameStore((s) => s.craftItem);

  if (!open || !profile) return null;

  const stock = profile.stock ?? {
    cropFodder: 0,
    eggs: 0,
    milk: 0,
    wool: 0,
    fertilizerBags: 0,
    fish: 0,
    bread: 0,
    cheese: 0,
    sweater: 0,
  };

  const handleSpeak = (text: string) => {
    AudioEngine.speakWord(text, profile.accent);
  };

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

      <div className="panel relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl border-2 border-amber-600/30">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-amber-500/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-600 text-white shadow-md">
              <ChefHat size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-ink">Xưởng Chế Biến & Bếp Nông Trại</h2>
              <p className="text-xs font-semibold text-muted">
                Ủ bánh mì, nấu phô mai & dệt len thủ công cùng từ vựng IELTS
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

        {/* Body */}
        <div className="no-scrollbar flex-1 overflow-y-auto p-5 space-y-4">
          {/* Inventory summary banner */}
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 p-3 text-xs font-bold text-ink">
            <span>🌾 Lương thực: {stock.cropFodder ?? 0}</span>
            <span>🥛 Sữa bò: {stock.milk ?? 0}</span>
            <span>🧶 Len cừu: {stock.wool ?? 0}</span>
            <span className="text-amber-600">🥖 Bánh mì: {stock.bread ?? 0}</span>
            <span className="text-amber-600">🧀 Phô mai: {stock.cheese ?? 0}</span>
            <span className="text-amber-600">🧥 Áo len: {stock.sweater ?? 0}</span>
          </div>

          {/* Recipes list */}
          <div className="grid gap-3">
            {RECIPES.map((recipe) => {
              const currentStock = stock[recipe.reqStockKey] ?? 0;
              const canCraft = currentStock >= recipe.reqAmount;

              return (
                <div
                  key={recipe.id}
                  className="rounded-2xl border-2 border-line/60 bg-surface p-4 transition-all hover:border-amber-500/50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{recipe.emoji}</span>
                      <div>
                        <h3 className="font-extrabold text-base text-ink">{recipe.name}</h3>
                        <p className="text-xs font-semibold text-muted">
                          Yêu cầu: <span className={canCraft ? 'text-emerald-600' : 'text-rose-500'}>{recipe.reqDesc}</span> (Hiện có: {currentStock})
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!canCraft}
                      onClick={() => craftItem(recipe.id)}
                      className="btn btn-primary px-4 py-2 text-xs font-bold min-h-[38px] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Flame size={14} /> Chế biến (+{recipe.rewardXp} XP)
                    </button>
                  </div>

                  {/* IELTS Learning Tip attached to crafting */}
                  <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-500/5 border border-amber-500/20 px-3 py-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-amber-700 dark:text-amber-400">
                        IELTS Collocation: <span className="font-mono">{recipe.ieltsCollocation}</span>
                      </p>
                      <p className="text-muted text-[11px] truncate">{recipe.ieltsMeaning}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSpeak(recipe.ieltsCollocation)}
                      className="btn btn-ghost h-8 w-8 !min-h-0 p-0 text-amber-600 shrink-0 ml-2"
                      title="Phát âm tiếng Anh chuẩn"
                    >
                      <Volume2 size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-line bg-surface-2 px-5 py-3 text-right">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="btn btn-ghost px-5 text-xs font-bold"
          >
            Đóng xưởng
          </button>
        </div>
      </div>
    </div>
  );
}
