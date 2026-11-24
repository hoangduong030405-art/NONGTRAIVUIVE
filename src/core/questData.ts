import type { DailyQuest, FarmStock, MarketOrder } from './types';

export const INITIAL_DAILY_QUESTS: DailyQuest[] = [
  {
    id: 'quest_harvest_5',
    title: '🌾 Thu hoạch 3 vụ mùa bất kỳ',
    targetCount: 3,
    currentCount: 0,
    rewardCoins: 50,
    rewardXp: 40,
    type: 'harvest',
    completed: false,
    claimed: false,
  },
  {
    id: 'quest_quiz_3',
    title: '🧠 Vượt qua 2 câu đố IELTS tốc độ (<4s)',
    targetCount: 2,
    currentCount: 0,
    rewardCoins: 60,
    rewardXp: 50,
    type: 'quiz',
    completed: false,
    claimed: false,
  },
  {
    id: 'quest_feed_2',
    title: '🐮 Cho các con thú ăn lương thực 2 lần',
    targetCount: 2,
    currentCount: 0,
    rewardCoins: 40,
    rewardXp: 30,
    type: 'feed',
    completed: false,
    claimed: false,
  },
  {
    id: 'quest_craft_bread',
    title: '🥖 Chế biến 1 món bất kỳ tại Xưởng Bếp',
    targetCount: 1,
    currentCount: 0,
    rewardCoins: 75,
    rewardXp: 60,
    type: 'craft',
    completed: false,
    claimed: false,
  },
  {
    id: 'quest_fish_2',
    title: '🎣 Câu được 2 con cá tươi ở bờ hồ',
    targetCount: 2,
    currentCount: 0,
    rewardCoins: 45,
    rewardXp: 35,
    type: 'fish',
    completed: false,
    claimed: false,
  },
];

const QUEST_POOL: Array<Omit<DailyQuest, 'id' | 'currentCount' | 'completed' | 'claimed'>> = [
  { title: '🌾 Thu hoạch 4 vụ mùa IELTS', targetCount: 4, rewardCoins: 65, rewardXp: 50, type: 'harvest' },
  { title: '🌾 Thu hoạch 6 vụ mùa bất kỳ', targetCount: 6, rewardCoins: 95, rewardXp: 75, type: 'harvest' },
  { title: '⚡ Trả lời tốc độ ≤4s đúng 3 câu IELTS', targetCount: 3, rewardCoins: 80, rewardXp: 65, type: 'quiz' },
  { title: '🧠 Vượt qua 4 câu đố IELTS tốc độ', targetCount: 4, rewardCoins: 100, rewardXp: 85, type: 'quiz' },
  { title: '🐮 Cho vật nuôi ăn lương thực 3 lần', targetCount: 3, rewardCoins: 55, rewardXp: 40, type: 'feed' },
  { title: '🥚 Chăm sóc gà/bò/cừu 3 lần', targetCount: 3, rewardCoins: 60, rewardXp: 45, type: 'care' },
  { title: '🍳 Chế biến 2 món ăn/đồ tại Xưởng Bếp', targetCount: 2, rewardCoins: 95, rewardXp: 80, type: 'craft' },
  { title: '🎣 Câu được 3 con cá tươi ở hồ nước', targetCount: 3, rewardCoins: 65, rewardXp: 50, type: 'fish' },
];

export function generateDailyQuests(): DailyQuest[] {
  const byType = new Map<DailyQuest['type'], typeof QUEST_POOL>();
  for (const q of QUEST_POOL) {
    const arr = byType.get(q.type) ?? [];
    arr.push(q);
    byType.set(q.type, arr);
  }
  const picked: DailyQuest[] = [];
  let idx = 0;
  for (const [, variants] of byType) {
    const chosen = variants[Math.floor(Math.random() * variants.length)];
    if (chosen && picked.length < 5) {
      picked.push({
        ...chosen,
        id: `quest_${Date.now()}_${idx}`,
        currentCount: 0,
        completed: false,
        claimed: false,
      });
      idx += 1;
    }
  }
  return picked;
}

const ORDER_TEMPLATES: Array<{
  customerName: string;
  reqItem: keyof FarmStock;
  baseAmount: number;
  rewardCoins: number;
  rewardXp: number;
  ieltsTopic: string;
}> = [
  { customerName: 'Giáo sư Baker (Cambridge)', reqItem: 'bread', baseAmount: 1, rewardCoins: 85, rewardXp: 55, ieltsTopic: 'Food Security & Sustainable Farming' },
  { customerName: 'Đầu bếp Claire (Le Cordon)', reqItem: 'cake', baseAmount: 1, rewardCoins: 115, rewardXp: 80, ieltsTopic: 'Culinary Heritage & Local Gastronomy' },
  { customerName: 'Nhà hàng Biển Xanh (Oslo)', reqItem: 'grilledFish', baseAmount: 1, rewardCoins: 120, rewardXp: 85, ieltsTopic: 'Sustainable Aquaculture & Diet' },
  { customerName: 'Bác sĩ Watson (Oxford Clinic)', reqItem: 'milk', baseAmount: 2, rewardCoins: 75, rewardXp: 50, ieltsTopic: 'Public Health & Nutrition Balance' },
  { customerName: 'Tiệm Bánh Sáng (Covent Garden)', reqItem: 'eggs', baseAmount: 2, rewardCoins: 70, rewardXp: 45, ieltsTopic: 'Organic Poultry & Rural Economy' },
  { customerName: 'Đầu bếp Gordon (Fine Dining)', reqItem: 'fish', baseAmount: 2, rewardCoins: 90, rewardXp: 60, ieltsTopic: 'Marine Biodiversity Preservation' },
  { customerName: 'Nghệ nhân Thợ Dệt Sophie', reqItem: 'wool', baseAmount: 2, rewardCoins: 85, rewardXp: 55, ieltsTopic: 'Traditional Handicraft & Globalization' },
  { customerName: 'Hãng Thời Trang Ấm (Edinburgh)', reqItem: 'sweater', baseAmount: 1, rewardCoins: 125, rewardXp: 90, ieltsTopic: 'Ethical Fashion & Eco-Textiles' },
  { customerName: 'Thị trưởng Green (Eco Town)', reqItem: 'cheese', baseAmount: 1, rewardCoins: 110, rewardXp: 75, ieltsTopic: 'Renewable Economy & Circular Agri' },
];

export function generateRandomMarketOrder(): MarketOrder {
  const tpl = ORDER_TEMPLATES[Math.floor(Math.random() * ORDER_TEMPLATES.length)] ?? ORDER_TEMPLATES[0]!;
  return {
    id: `order_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    customerName: tpl.customerName,
    reqItem: tpl.reqItem,
    reqAmount: tpl.baseAmount + (Math.random() > 0.65 ? 1 : 0),
    rewardCoins: tpl.rewardCoins + Math.floor(Math.random() * 25),
    rewardXp: tpl.rewardXp + 10,
    ieltsTopic: tpl.ieltsTopic,
  };
}

export const INITIAL_MARKET_ORDERS: MarketOrder[] = [
  {
    id: 'order_1',
    customerName: 'Giáo sư Baker (Cambridge)',
    reqItem: 'bread',
    reqAmount: 1,
    rewardCoins: 85,
    rewardXp: 55,
    ieltsTopic: 'Food Security & Sustainable Farming',
  },
  {
    id: 'order_2',
    customerName: 'Đầu bếp Claire (Le Cordon)',
    reqItem: 'cake',
    reqAmount: 1,
    rewardCoins: 115,
    rewardXp: 80,
    ieltsTopic: 'Culinary Heritage & Local Gastronomy',
  },
  {
    id: 'order_3',
    customerName: 'Nhà hàng Biển Xanh (Oslo)',
    reqItem: 'grilledFish',
    reqAmount: 1,
    rewardCoins: 120,
    rewardXp: 85,
    ieltsTopic: 'Sustainable Aquaculture & Diet',
  },
  {
    id: 'order_4',
    customerName: 'Tiệm Bánh Sáng (Covent Garden)',
    reqItem: 'eggs',
    reqAmount: 2,
    rewardCoins: 70,
    rewardXp: 45,
    ieltsTopic: 'Organic Poultry & Rural Economy',
  },
  {
    id: 'order_5',
    customerName: 'Thị trưởng Green (Eco Town)',
    reqItem: 'cheese',
    reqAmount: 1,
    rewardCoins: 110,
    rewardXp: 75,
    ieltsTopic: 'Renewable Economy & Circular Agri',
  },
];
