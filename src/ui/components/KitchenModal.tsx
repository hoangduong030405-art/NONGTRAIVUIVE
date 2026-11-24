import { ChefHat, Flame, Volume2, X } from 'lucide-react';
import { AudioEngine } from '../../core/AudioEngine';
import { useGameStore } from '../store/useGameStore';

interface IngredientReq {
  key: 'cropFodder' | 'eggs' | 'milk' | 'wool' | 'fish';
  amount: number;
  label: string;
}

interface Recipe {
  id: 'bread' | 'cheese' | 'sweater' | 'cake' | 'grilledFish';
  name: string;
  emoji: string;
  ingredients: IngredientReq[];
  ieltsCollocation: string;
  ieltsMeaning: string;
  rewardXp: number;
}

const RECIPES: Recipe[] = [
  {
    id: 'bread',
    name: 'Ổ Bánh Mì Lúa Mạch',
    emoji: '🥖',
    ingredients: [{ key: 'cropFodder', amount: 3, label: '3 Lương thực' }],
    ieltsCollocation: 'Staple food & Sustainable agriculture',
    ieltsMeaning: 'Lương thực thiết yếu trong chế độ ăn uống & nền nông nghiệp bền vững.',
    rewardXp: 40,
  },
  {
    id: 'cheese',
    name: 'Phô Mai Béo Ngậy',
    emoji: '🧀',
    ingredients: [{ key: 'milk', amount: 2, label: '2 Sữa bò' }],
    ieltsCollocation: 'Artisanal dairy production',
    ieltsMeaning: 'Quy trình sản xuất bơ sữa truyền thống, thủ công chất lượng cao.',
    rewardXp: 50,
  },
  {
    id: 'sweater',
    name: 'Áo Len Dệt Cừu',
    emoji: '🧶',
    ingredients: [{ key: 'wool', amount: 2, label: '2 Len cừu' }],
    ieltsCollocation: 'Biodegradable textile materials',
    ieltsMeaning: 'Nguyên liệu dệt may sinh học tự nhiên, thân thiện với hệ sinh thái.',
    rewardXp: 60,
  },
  {
    id: 'cake',
    name: 'Bánh Kem Trứng Sữa',
    emoji: '🍰',
    ingredients: [
      { key: 'eggs', amount: 2, label: '2 Trứng gà' },
      { key: 'milk', amount: 1, label: '1 Sữa bò' },
    ],
    ieltsCollocation: 'Culinary heritage & local gastronomy',
    ieltsMeaning: 'Di sản ẩm thực địa phương & nghệ thuật làm bánh truyền thống.',
    rewardXp: 65,
  },
  {
    id: 'grilledFish',
    name: 'Cá Nướng Bơ Tỏi',
    emoji: '🍣',
    ingredients: [
      { key: 'fish', amount: 2, label: '2 Cá tươi' },
      { key: 'cropFodder', amount: 1, label: '1 Lương thực' },
    ],
    ieltsCollocation: 'Sustainable aquaculture & dietary protein',
    ieltsMeaning: 'Nuôi trồng thủy sản bền vững & nguồn đạm dinh dưỡng lành mạnh.',
    rewardXp: 70,
  },
];

export function KitchenModal() {
  const open = useGameStore((s) => s.kitchenOpen);
  const setOpen = useGameStore((s) => s.setKitchenOpen);
  const profile = useGameStore((s) => s.profile);
  const craftItem = useGameStore((s) => s.craftItem);

  if (!open || !profile) return null;

  const s = profile.stock;
  const stock = {
    cropFodder: s?.cropFodder ?? 0,
    eggs: s?.eggs ?? 0,
    milk: s?.milk ?? 0,
    wool: s?.wool ?? 0,
    fertilizerBags: s?.fertilizerBags ?? 0,
    fish: s?.fish ?? 0,
    bread: s?.bread ?? 0,
    cheese: s?.cheese ?? 0,
    sweater: s?.sweater ?? 0,
    cake: s?.cake ?? 0,
    grilledFish: s?.grilledFish ?? 0,
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
                Chế biến 5 đặc sản nông trại & học Collocation IELTS theo chủ đề
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
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl bg-surface-2 p-3 text-xs font-bold text-ink">
            <span>🌾 Lương thực: {stock.cropFodder}</span>
            <span>🥚 Trứng: {stock.eggs}</span>
            <span>🥛 Sữa: {stock.milk}</span>
            <span>🧶 Len: {stock.wool}</span>
            <span>🐟 Cá: {stock.fish}</span>
            <span className="text-amber-600">🥖 Bánh mì: {stock.bread}</span>
            <span className="text-amber-600">🧀 Phô mai: {stock.cheese}</span>
            <span className="text-amber-600">🧥 Áo len: {stock.sweater}</span>
            <span className="text-amber-600">🍰 Bánh kem: {stock.cake}</span>
            <span className="text-amber-600">🍣 Cá nướng: {stock.grilledFish}</span>
          </div>

          {/* Recipes list */}
          <div className="grid gap-3">
            {RECIPES.map((recipe) => {
              const canCraft = recipe.ingredients.every(
                (ing) => (stock[ing.key] ?? 0) >= ing.amount,
              );

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
                          Cần:{' '}
                          {recipe.ingredients.map((ing, idx) => {
                            const have = stock[ing.key] ?? 0;
                            const ok = have >= ing.amount;
                            return (
                              <span key={ing.key}>
                                {idx > 0 && ' + '}
                                <span className={ok ? 'text-emerald-600' : 'text-rose-500'}>
                                  {ing.label} ({have}/{ing.amount})
                                </span>
                              </span>
                            );
                          })}
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
