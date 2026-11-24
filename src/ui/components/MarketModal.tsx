import { useState } from 'react';
import { Coins, PackageCheck, ShoppingBag, Sprout, Truck, Volume2, X } from 'lucide-react';
import { AudioEngine } from '../../core/AudioEngine';
import { useGameStore } from '../store/useGameStore';

export function MarketModal() {
  const open = useGameStore((s) => s.marketOpen);
  const setOpen = useGameStore((s) => s.setMarketOpen);
  const profile = useGameStore((s) => s.profile);
  const marketOrders = useGameStore((s) => s.marketOrders);
  const fulfillOrder = useGameStore((s) => s.fulfillOrder);
  const buySeedFromMarket = useGameStore((s) => s.buySeedFromMarket);
  const vocabList = useGameStore((s) => s.vocabList);

  const [activeTab, setActiveTab] = useState<'orders' | 'seeds'>('orders');

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

  const rareSeeds = vocabList.filter((v) => v.tier >= 2);

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

      <div className="panel relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl border-2 border-emerald-600/30">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-emerald-500/10 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
              <ShoppingBag size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-ink">Chợ Nông Sản & Đơn Hàng IELTS</h2>
              <p className="text-xs font-semibold text-muted">
                Giao hàng nông sản nhận Xu vàng 🪙 & Mua các giống cây học thuật cao cấp
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 font-mono text-sm font-black text-amber-700 dark:text-amber-400">
              <Coins size={16} />
              {profile.coins ?? 0} Xu
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-2 text-muted"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-line bg-surface-2 px-5 py-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`btn text-xs font-bold px-4 min-h-[34px] ${
              activeTab === 'orders' ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            <Truck size={14} /> Đơn đặt hàng ({marketOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('seeds')}
            className={`btn text-xs font-bold px-4 min-h-[34px] ${
              activeTab === 'seeds' ? 'btn-primary' : 'btn-ghost'
            }`}
          >
            <Sprout size={14} /> Mua giống cây Band 6.5 - 8.0+
          </button>
        </div>

        {/* Body */}
        <div className="no-scrollbar flex-1 overflow-y-auto p-5">
          {activeTab === 'orders' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {marketOrders.map((order) => {
                const currentHave = stock[order.reqItem] ?? 0;
                const canDeliver = currentHave >= order.reqAmount;
                const itemLabel =
                  order.reqItem === 'bread'
                    ? '🥖 Bánh mì'
                    : order.reqItem === 'milk'
                    ? '🥛 Bình sữa bò'
                    : order.reqItem === 'wool'
                    ? '🧶 Cuộn len cừu'
                    : order.reqItem === 'fish'
                    ? '🐟 Cá tươi'
                    : order.reqItem === 'cheese'
                    ? '🧀 Miếng phô mai'
                    : '🌾 Lương thực';

                return (
                  <div
                    key={order.id}
                    className="flex flex-col justify-between rounded-2xl border-2 border-line bg-surface p-4 transition-all hover:border-emerald-500/50 shadow-sm"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {order.customerName}
                        </span>
                        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-muted">
                          {order.ieltsTopic}
                        </span>
                      </div>
                      <div className="my-3 flex items-center justify-between rounded-xl bg-surface-2 p-3">
                        <span className="font-extrabold text-sm text-ink">{itemLabel}</span>
                        <span className={`font-mono text-xs font-black ${canDeliver ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {currentHave} / {order.reqAmount}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-line/60 pt-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-600">
                        <span>+{order.rewardCoins} Xu</span>
                        <span className="text-muted">·</span>
                        <span className="text-accent">+{order.rewardXp} XP</span>
                      </div>
                      <button
                        type="button"
                        disabled={!canDeliver}
                        onClick={() => fulfillOrder(order.id)}
                        className="btn btn-primary px-3 py-1.5 text-xs font-bold min-h-[32px] disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <PackageCheck size={14} /> Giao hàng
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {activeTab === 'seeds' && (
            <div className="grid gap-3 sm:grid-cols-2">
              {rareSeeds.map((seed) => {
                const seedCost = seed.tier === 3 ? 120 : 60;
                const canAfford = (profile.coins ?? 0) >= seedCost;
                const currentInventory = profile.seedInventory[seed.id] ?? 0;

                return (
                  <div
                    key={seed.id}
                    className="flex flex-col justify-between rounded-2xl border-2 border-line bg-surface p-4 transition-all hover:border-emerald-500/50 shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                            seed.tier === 3 ? 'bg-amber-500 text-black' : 'bg-sky-500 text-white'
                          }`}>
                            {seed.band}
                          </span>
                          <h3 className="mt-1 font-black text-sm text-ink">{seed.word}</h3>
                          <p className="font-mono text-xs text-muted">{seed.ipa}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => AudioEngine.speakWord(seed.word, profile.accent)}
                          className="btn btn-ghost h-8 w-8 !min-h-0 p-0 text-muted"
                          title="Phát âm"
                        >
                          <Volume2 size={16} />
                        </button>
                      </div>
                      <p className="mt-2 text-xs text-muted line-clamp-2">{seed.meaning}</p>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-3">
                      <div className="text-xs font-semibold text-muted">
                        Kho: <span className="font-mono font-bold text-ink">×{currentInventory}</span>
                      </div>
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => buySeedFromMarket(seed.id, seedCost, 1)}
                        className="btn btn-primary px-3 py-1.5 text-xs font-bold min-h-[32px] disabled:opacity-40"
                      >
                        <Coins size={14} /> Mua ({seedCost} Xu)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
