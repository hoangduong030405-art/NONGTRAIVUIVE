import type { CurriculumStage, VocabTier } from './types';

export interface StageDescriptor {
  stage: CurriculumStage;
  title: string;
  band: string;
  minLevel: number;
  maxLevel: number | null;
  goal: string;
  modules: string[];
  questionTarget: number;
}

export const STAGE_ROADMAP: readonly StageDescriptor[] = [
  {
    stage: 1,
    title: 'Giai đoạn 1: Xây nền tảng',
    band: 'Band 3.0 → 4.5',
    minLevel: 1,
    maxLevel: 2,
    goal: 'Xóa mất gốc, đọc/nghe câu đơn và hiểu cấu trúc câu cơ bản.',
    modules: [
      'Module 1.1: Ngữ âm (20 nguyên âm & 24 phụ âm IPA, trọng âm, -s/-ed, nối âm)',
      'Module 1.2: Ngữ pháp cốt lõi (Từ loại, 6 thì cơ bản, S+V+O, câu ghép, ĐK 1 & 2)',
      'Module 1.3: Từ vựng nền tảng A1–A2 (10 chủ đề đời sống dịch đơn giản)',
    ],
    questionTarget: 200,
  },
  {
    stage: 2,
    title: 'Giai đoạn 2: Làm quen Format IELTS',
    band: 'Band 4.5 → 5.5',
    minLevel: 3,
    maxLevel: 4,
    goal: 'Chuyển từ tiếng Anh giao tiếp sang tư duy làm bài thi 4 kỹ năng.',
    modules: [
      'Module 2.1: Từ vựng B1 (5 chủ đề IELTS) & MĐQH, Bị động, So sánh',
      'Module 2.2: Listening & Reading cơ bản (Keywords, Skimming, Scanning)',
      'Module 2.3: Writing & Speaking nhập môn (Topic sentence, Task 1 tăng/giảm, Part 1)',
    ],
    questionTarget: 200,
  },
  {
    stage: 3,
    title: 'Giai đoạn 3: Bứt phá kỹ năng & Chiến thuật',
    band: 'Band 5.5 → 6.5',
    minLevel: 5,
    maxLevel: 6,
    goal: 'Làm chủ kỹ thuật Paraphrase, dạng đề thi thật và viết bài luận hoàn chỉnh.',
    modules: [
      'Module 3.1: Hệ thống Paraphrase, Academic Word List (B2) & Liên từ',
      'Module 3.2: Chiến thuật Listening Part 3/4 & Reading T/F/NG, Headings',
      'Module 3.3 & 3.4: Cấu trúc Writing Task 1 & 2 chuẩn + Speaking Part 2 Cue Card',
    ],
    questionTarget: 205,
  },
  {
    stage: 4,
    title: 'Giai đoạn 4: Nâng cấp chuyên sâu',
    band: 'Band 6.5 → 7.5',
    minLevel: 7,
    maxLevel: 8,
    goal: 'Tăng độ chính xác tối đa, dùng Collocations tự nhiên và lập luận sắc bén.',
    modules: [
      'Module 4.1: Collocations 6 chủ đề chuyên sâu & Ngữ pháp C1 (Đảo ngữ, Bị động KQ)',
      'Module 4.2: Luyện tốc độ & Sửa lỗi bẫy logic False vs Not Given',
      'Module 4.3: Chuỗi nhân–quả sâu, Referencing & Speaking Part 3 Discourse Markers',
    ],
    questionTarget: 200,
  },
  {
    stage: 5,
    title: 'Giai đoạn 5: Chạm đỉnh & Tinh chỉnh',
    band: 'Band 7.5 → 8.0+',
    minLevel: 9,
    maxLevel: null,
    goal: 'Đạt độ tự nhiên bản xứ (C1–C2) và tối ưu chiến thuật phòng thi.',
    modules: [
      'Module 5.1: Idioms học thuật, Phrasal Verbs nâng cao & Academic Register',
      'Module 5.2: Chủ đề hiếm (Triết học, Khảo cổ, Tâm lý học) & Full Mock Test',
    ],
    questionTarget: 200,
  },
];

export function stageForLevel(level: number): CurriculumStage {
  if (level >= 9) return 5;
  if (level >= 7) return 4;
  if (level >= 5) return 3;
  if (level >= 3) return 2;
  return 1;
}

export function getActiveStage(
  level: number,
  override: CurriculumStage | 'auto' | undefined,
): CurriculumStage {
  if (override && override !== 'auto') {
    return override;
  }
  return stageForLevel(level);
}

export function getStageInfo(stage: CurriculumStage): StageDescriptor {
  return STAGE_ROADMAP.find((s) => s.stage === stage) ?? STAGE_ROADMAP[0]!;
}

export interface FarmCropPack {
  tier: VocabTier;
  name: string;
  emoji: string;
  durationSec: number;
  xpBoostLabel: string;
}

export const FARM_CROP_PACKS: readonly FarmCropPack[] = [
  {
    tier: 1,
    name: 'Hạt Cà Rốt',
    emoji: '🥕',
    durationSec: 11,
    xpBoostLabel: 'Nhanh · Vô hạn',
  },
  {
    tier: 2,
    name: 'Cà Chua Tươi',
    emoji: '🍅',
    durationSec: 18,
    xpBoostLabel: '+50% XP cây',
  },
  {
    tier: 3,
    name: 'Táo Cổ Thụ',
    emoji: '🍎',
    durationSec: 26,
    xpBoostLabel: '+100% XP + Rương',
  },
];
