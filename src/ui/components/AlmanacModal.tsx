import { useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Compass,
  Download,
  Gift,
  Layers,
  Lock,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { AudioEngine } from '../../core/AudioEngine';
import { WATERING_CAN_LABELS } from '../../core/ComboEngine';
import { getActiveStage, STAGE_ROADMAP, stageForLevel } from '../../core/curriculum';
import type { CurriculumQuestion, CurriculumStage } from '../../core/types';
import { useGameStore } from '../store/useGameStore';

type Tab = 'roadmap' | 'vocab' | 'tips' | 'settings';

const TABS: Array<{ id: Tab; label: string; Icon: typeof BookOpen }> = [
  { id: 'roadmap', label: 'Lộ trình 5 GĐ', Icon: Compass },
  { id: 'vocab', label: 'Kho câu hỏi', Icon: BookOpen },
  { id: 'tips', label: 'Tip Cards', Icon: Layers },
  { id: 'settings', label: 'Cài đặt', Icon: Settings },
];

function MasteryDots({ level }: { level: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`Mastery level ${level} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={`h-1.5 w-3 rounded-full ${n <= level ? 'bg-success' : 'bg-line'}`} />
      ))}
    </span>
  );
}

export function AlmanacModal() {
  const open = useGameStore((s) => s.almanacOpen);
  const setOpen = useGameStore((s) => s.setAlmanacOpen);
  if (!open) return null;
  return <AlmanacBody onClose={() => setOpen(false)} />;
}

function AlmanacBody({ onClose }: { onClose: () => void }) {
  const vocabMap = useGameStore((s) => s.vocabMap);
  const stageQuestions = useGameStore((s) => s.stageQuestions);
  const loadingStage = useGameStore((s) => s.loadingStage);
  const ensureStageLoaded = useGameStore((s) => s.ensureStageLoaded);
  const setStageOverride = useGameStore((s) => s.setStageOverride);
  const mastery = useGameStore((s) => s.mastery);
  const profile = useGameStore((s) => s.profile);
  const allTipCards = useGameStore((s) => s.allTipCards);
  const setAccent = useGameStore((s) => s.setAccent);
  const toggleSfx = useGameStore((s) => s.toggleSfx);
  const exportBackup = useGameStore((s) => s.exportBackup);
  const importBackup = useGameStore((s) => s.importBackup);
  const resetFarm = useGameStore((s) => s.resetFarm);
  const pushToast = useGameStore((s) => s.pushToast);

  const activeStage = getActiveStage(profile?.level ?? 1, profile?.stageOverride);
  const autoStage = stageForLevel(profile?.level ?? 1);

  const [tab, setTab] = useState<Tab>('roadmap');
  const [browseStage, setBrowseStage] = useState<CurriculumStage>(activeStage);
  const [query, setQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(40);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const completedSet = useMemo(
    () => new Set(profile?.completedQuestionIds ?? []),
    [profile?.completedQuestionIds],
  );

  const stageList: CurriculumQuestion[] = useMemo(
    () => stageQuestions[browseStage] ?? [],
    [stageQuestions, browseStage],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return stageList.filter(
      (v) =>
        !q ||
        v.word.toLowerCase().includes(q) ||
        v.meaning.toLowerCase().includes(q) ||
        v.topic.toLowerCase().includes(q) ||
        v.module.toLowerCase().includes(q),
    );
  }, [stageList, query]);

  if (!profile) return null;
  const unlocked = new Set(profile.unlockedTipCardIds);

  const switchBrowseStage = (s: CurriculumStage) => {
    setBrowseStage(s);
    setVisibleCount(40);
    void ensureStageLoaded(s);
  };

  const handleExport = async () => {
    try {
      const json = await exportBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lexifarm-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      pushToast({ variant: 'info', title: 'Backup exported', subtitle: a.download });
    } catch (err) {
      pushToast({ variant: 'info', title: 'Export failed', subtitle: err instanceof Error ? err.message : 'Unknown error' });
    }
  };

  const handleImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      await importBackup(await file.text());
      pushToast({ variant: 'info', title: 'Backup restored', subtitle: file.name });
    } catch (err) {
      pushToast({ variant: 'info', title: 'Import failed', subtitle: err instanceof Error ? err.message : 'Invalid file' });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center md:items-center md:p-6" role="dialog" aria-modal="true" aria-labelledby="almanac-title">
      <div className="absolute inset-0 animate-pop-in" style={{ background: 'var(--overlay)' }} onClick={onClose} />
      <div className="panel gpu relative flex h-[90dvh] w-full animate-pop-in flex-col overflow-hidden rounded-b-none md:h-[84vh] md:max-w-4xl md:rounded-b-[var(--radius)]">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-line px-4 py-3">
          <BookOpen size={22} className="text-accent" />
          <h2 id="almanac-title" className="font-display text-xl font-bold">
            Sổ tay & Lộ trình IELTS
          </h2>
          <span className="hidden text-xs font-semibold text-muted sm:inline">
            {completedSet.size}/1.005 câu đã làm · {unlocked.size}/{allTipCards.length} tip cards
          </span>
          <button
            type="button"
            onClick={onClose}
            className="focus-ring ml-auto flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-2"
            aria-label="Close almanac"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs (bottom on mobile for thumb reach, top on desktop) */}
        <div className="order-last flex border-t border-line md:order-none md:border-b md:border-t-0" role="tablist">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => {
                setTab(id);
                if (id === 'vocab') void ensureStageLoaded(browseStage);
              }}
              className={`focus-ring pb-safe flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-bold md:flex-row md:gap-2 md:pb-0 md:text-sm ${
                tab === id ? 'text-accent md:border-b-2 md:border-accent' : 'text-muted'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-4">
          {tab === 'roadmap' && (
            <div className="flex flex-col gap-3">
              {/* Auto mode header */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-surface-2 p-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-extrabold">
                    <Sparkles size={16} className="text-amber-500" />
                    Hệ thống tự động đẩy câu hỏi theo Level (Hiện tại: Lv.{profile.level})
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    Mỗi Giai đoạn gồm ~200 câu hỏi từ dễ đến khó (Band 3.0 → 8.0+). Bạn có thể để Tự động tăng theo Level hoặc chọn thủ công một Giai đoạn bên dưới.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void setStageOverride('auto')}
                  className={`btn shrink-0 px-3 text-xs font-bold ${
                    !profile.stageOverride || profile.stageOverride === 'auto' ? 'btn-primary' : 'btn-ghost'
                  }`}
                >
                  {!profile.stageOverride || profile.stageOverride === 'auto'
                    ? `✓ Đang bật Tự động (GĐ ${autoStage})`
                    : `Bật lại Tự động (GĐ ${autoStage})`}
                </button>
              </div>

              {/* 5 Stage Cards */}
              <div className="grid gap-3">
                {STAGE_ROADMAP.map((stageItem) => {
                  const isCurrentActive = activeStage === stageItem.stage;
                  const isUnlockedByLevel = profile.level >= stageItem.minLevel;
                  const prefix = `s${stageItem.stage}_`;
                  const doneInStage = (profile.completedQuestionIds ?? []).filter((id) =>
                    id.startsWith(prefix),
                  ).length;
                  const pct = Math.min(100, Math.round((doneInStage / stageItem.questionTarget) * 100));

                  return (
                    <div
                      key={stageItem.stage}
                      className={`rounded-2xl border-2 p-4 transition-colors ${
                        isCurrentActive
                          ? 'border-accent bg-surface shadow-sm'
                          : 'border-line bg-surface'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-lg bg-accent/15 px-2 py-0.5 text-xs font-extrabold text-accent">
                              {stageItem.band}
                            </span>
                            <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted">
                              Lv.{stageItem.minLevel}
                              {stageItem.maxLevel ? `–${stageItem.maxLevel}` : '+'}
                            </span>
                            {isCurrentActive && (
                              <span className="rounded-lg bg-success px-2 py-0.5 text-[11px] font-bold text-white">
                                Đang đẩy câu hỏi
                              </span>
                            )}
                            {!isUnlockedByLevel && (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
                                <Lock size={11} /> Mở khóa tự động ở Lv.{stageItem.minLevel}
                              </span>
                            )}
                          </div>
                          <h3 className="mt-1.5 font-display text-base font-extrabold md:text-lg">
                            {stageItem.title}
                          </h3>
                          <p className="text-xs text-muted">{stageItem.goal}</p>
                        </div>

                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => void setStageOverride(stageItem.stage)}
                            className={`btn px-3 text-xs font-bold min-h-[34px] ${
                              profile.stageOverride === stageItem.stage ? 'btn-primary' : 'btn-ghost'
                            }`}
                          >
                            {profile.stageOverride === stageItem.stage ? 'Đang chọn ✓' : 'Chọn GĐ này'}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              switchBrowseStage(stageItem.stage);
                              setTab('vocab');
                            }}
                            className="btn btn-ghost px-3 text-xs font-bold min-h-[34px]"
                          >
                            Xem {stageItem.questionTarget} câu
                          </button>
                        </div>
                      </div>

                      <ul className="mt-2.5 grid gap-1 text-xs text-ink/90 sm:grid-cols-1">
                        {stageItem.modules.map((mod) => (
                          <li key={mod} className="flex items-start gap-1.5">
                            <span className="text-accent">•</span>
                            <span>{mod}</span>
                          </li>
                        ))}
                      </ul>

                      {/* Completion progress */}
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-[11px] font-bold text-muted">
                          <span>Tiến độ hoàn thành</span>
                          <span>
                            {doneInStage}/{stageItem.questionTarget} câu ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                          <div
                            className="h-full rounded-full bg-success transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {tab === 'vocab' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                {STAGE_ROADMAP.map((s) => (
                  <button
                    key={s.stage}
                    type="button"
                    onClick={() => switchBrowseStage(s.stage)}
                    className={`btn px-3 text-xs font-bold min-h-[36px] ${
                      browseStage === s.stage ? 'btn-primary' : 'btn-ghost'
                    }`}
                  >
                    GĐ {s.stage} ({s.questionTarget})
                  </button>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-surface-2 px-3">
                  <Search size={16} className="text-muted" />
                  <input
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setVisibleCount(40);
                    }}
                    placeholder="Tìm từ vựng, chủ đề hoặc nghĩa tiếng Việt…"
                    className="min-h-[44px] w-full bg-transparent text-sm outline-none placeholder:text-muted"
                    aria-label="Tìm câu hỏi"
                  />
                </label>
                <span className="text-xs font-semibold text-muted">
                  Tìm thấy {filtered.length} câu hỏi
                </span>
              </div>

              {loadingStage === browseStage && stageList.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">
                  Đang tải bộ câu hỏi Giai đoạn {browseStage}…
                </p>
              ) : (
                <>
                  <ul className="grid gap-2 md:grid-cols-2">
                    {filtered.slice(0, visibleCount).map((v) => {
                      const m = mastery[v.id];
                      const done = completedSet.has(v.id);
                      const isEnglish = /^[A-Za-z][A-Za-z0-9\s\-'()]+$/.test(v.word.trim());
                      return (
                        <li key={v.id} className="rounded-xl border border-line bg-surface p-3">
                          <div className="flex items-start gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="flex items-center gap-1.5 font-bold leading-tight">
                                <span>{v.word}</span>
                                {done && <CheckCircle2 size={14} className="shrink-0 text-success" />}
                              </p>
                              <p className="font-mono text-xs text-muted">
                                {v.ipa} · {v.partOfSpeech}
                              </p>
                            </div>
                            {isEnglish && (
                              <button
                                type="button"
                                onClick={() => AudioEngine.speakWord(v.word, profile.accent)}
                                className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2"
                                aria-label={`Pronounce ${v.word}`}
                              >
                                <Volume2 size={15} />
                              </button>
                            )}
                          </div>
                          <p className="mt-1 text-sm">{v.meaning}</p>
                          <p className="mt-1 text-xs italic text-muted">{v.example}</p>
                          <div className="mt-2 flex items-center justify-between gap-2 text-[11px] font-semibold text-muted">
                            <span className="truncate">{v.topic}</span>
                            <span className="flex shrink-0 items-center gap-2">
                              {m ? `${m.correctCount}/${m.attemptCount}` : 'Chưa làm'}
                              <MasteryDots level={m?.srsLevel ?? 0} />
                            </span>
                          </div>
                        </li>
                      );
                    })}
                    {filtered.length === 0 && (
                      <li className="text-sm text-muted">Không có câu hỏi phù hợp.</li>
                    )}
                  </ul>
                  {filtered.length > visibleCount && (
                    <button
                      type="button"
                      onClick={() => setVisibleCount((n) => n + 50)}
                      className="btn btn-ghost mx-auto px-6 text-xs font-bold"
                    >
                      Hiển thị thêm ({filtered.length - visibleCount} câu nữa)
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {tab === 'tips' && (
            <ul className="grid gap-3 md:grid-cols-2">
              {allTipCards.map((card) => {
                const isUnlocked = unlocked.has(card.id);
                const isChest = card.sourceVocabId === 'lexi_chest';
                const source = vocabMap[card.sourceVocabId];
                if (!isUnlocked) {
                  return (
                    <li key={card.id} className="flex items-center gap-3 rounded-xl border border-dashed border-line bg-surface-2 p-3 text-muted">
                      {isChest ? <Gift size={22} /> : <Lock size={22} />}
                      <div className="min-w-0">
                        <p className="text-sm font-bold">Locked {isChest ? 'Lexi Chest Exclusive' : 'Tip Card'}</p>
                        <p className="text-xs">
                          {isChest
                            ? 'Answer a Tier 3 quiz perfectly on the first try.'
                            : `Harvest "${source?.word ?? 'this crop'}" to unlock.`}
                        </p>
                      </div>
                    </li>
                  );
                }
                return (
                  <li key={card.id} className="rounded-xl border border-line bg-surface p-3">
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-accent">
                      {isChest && <Gift size={12} />}
                      {card.skill} · {card.bandTarget}
                    </div>
                    <p className="mt-1 font-bold">{card.title}</p>
                    <p className="mt-1 text-sm">
                      <span className="text-muted line-through">{card.upgradeFrom}</span>
                      {' → '}
                      <span className="font-bold text-success">{card.upgradeTo}</span>
                    </p>
                    <p className="mt-1 text-sm text-muted">{card.tip}</p>
                  </li>
                );
              })}
            </ul>
          )}

          {tab === 'settings' && (
            <div className="mx-auto flex max-w-lg flex-col gap-4">
              <section className="rounded-xl border border-line bg-surface p-3">
                <h3 className="mb-2 text-sm font-bold">Pronunciation accent</h3>
                <div className="flex gap-2">
                  {(['en-GB', 'en-US'] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAccent(a)}
                      className={`btn flex-1 ${profile.accent === a ? 'btn-primary' : 'btn-ghost'}`}
                    >
                      {a === 'en-GB' ? '🇬🇧 British (UK)' : '🇺🇸 American (US)'}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-line bg-surface p-3">
                <h3 className="mb-2 text-sm font-bold">Sound effects</h3>
                <button type="button" onClick={toggleSfx} className="btn btn-ghost w-full">
                  {profile.sfxEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  {profile.sfxEnabled ? 'Sound ON' : 'Sound OFF'}
                </button>
              </section>

              <section className="rounded-xl border border-line bg-surface p-3 text-sm">
                <h3 className="mb-2 font-bold">Progress</h3>
                <dl className="grid grid-cols-2 gap-1 text-muted">
                  <dt>Total XP</dt>
                  <dd className="text-right font-bold text-ink">{profile.xp}</dd>
                  <dt>Best streak</dt>
                  <dd className="text-right font-bold text-ink">{profile.bestStreak}x</dd>
                  <dt>Critical answers (≤4s)</dt>
                  <dd className="text-right font-bold text-ink">{profile.criticalAnswers}</dd>
                  <dt>Watering can</dt>
                  <dd className="text-right font-bold text-ink">{WATERING_CAN_LABELS[profile.wateringCanTier]}</dd>
                </dl>
              </section>

              <section className="rounded-xl border border-line bg-surface p-3">
                <h3 className="mb-1 text-sm font-bold">Offline backup (JSON)</h3>
                <p className="mb-2 text-xs text-muted">
                  Progress is stored locally in IndexedDB on this device. Export a file to move it to another device.
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => void handleExport()} className="btn btn-ghost flex-1">
                    <Download size={16} /> Export
                  </button>
                  <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-ghost flex-1">
                    <Upload size={16} /> Import
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/json,.json"
                    className="hidden"
                    onChange={(e) => void handleImport(e.target.files?.[0])}
                  />
                </div>
              </section>

              <section className="rounded-xl border border-danger p-3">
                <h3 className="mb-2 text-sm font-bold text-danger">Danger zone</h3>
                {confirmReset ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        void resetFarm().then(() => {
                          setConfirmReset(false);
                          pushToast({ variant: 'info', title: 'Farm reset', subtitle: 'Fresh start — good luck!' });
                        });
                      }}
                      className="btn flex-1 bg-danger text-white"
                    >
                      Yes, erase everything
                    </button>
                    <button type="button" onClick={() => setConfirmReset(false)} className="btn btn-ghost flex-1">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmReset(true)} className="btn btn-ghost w-full text-danger">
                    <RotateCcw size={16} /> Reset farm progress
                  </button>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
