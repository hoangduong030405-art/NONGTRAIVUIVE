import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  Brain,
  CheckCircle2,
  Clock,
  Coins,
  GraduationCap,
  Headphones,
  Play,
  RotateCcw,
  Timer,
  Volume2,
  X,
  XCircle,
} from 'lucide-react';
import { AudioEngine } from '../../core/AudioEngine';
import { getActiveStage, STAGE_ROADMAP } from '../../core/curriculum';
import type { CurriculumQuestion, CurriculumStage } from '../../core/types';
import { useGameStore } from '../store/useGameStore';

type ArenaMode = 'mock' | 'srs' | 'audio';
type Phase = 'lobby' | 'playing' | 'summary';

interface SessionQuestion {
  question: CurriculumQuestion;
  optionOrder: number[];
}

interface AnswerLog {
  question: CurriculumQuestion;
  selectedOptionIndex: number | null;
  isCorrect: boolean;
}

function shuffleIndices(n: number): number[] {
  const arr = Array.from({ length: n }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i] as number;
    arr[i] = arr[j] as number;
    arr[j] = tmp;
  }
  return arr;
}

function shuffleList<T>(items: readonly T[]): T[] {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = copy[i] as T;
    copy[i] = copy[j] as T;
    copy[j] = tmp;
  }
  return copy;
}

function isPureEnglish(word: string): boolean {
  return /^[A-Za-z][A-Za-z0-9\s\-'()]+$/.test(word.trim());
}

function formatSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function MockTestModal() {
  const open = useGameStore((s) => s.mockTestOpen);
  const setOpen = useGameStore((s) => s.setMockTestOpen);
  if (!open) return null;
  return <MockTestBody onClose={() => setOpen(false)} />;
}

function MockTestBody({ onClose }: { onClose: () => void }) {
  const profile = useGameStore((s) => s.profile);
  const mastery = useGameStore((s) => s.mastery);
  const stageQuestions = useGameStore((s) => s.stageQuestions);
  const questionMap = useGameStore((s) => s.questionMap);
  const ensureStageLoaded = useGameStore((s) => s.ensureStageLoaded);
  const loadingStage = useGameStore((s) => s.loadingStage);
  const recordMockTestResults = useGameStore((s) => s.recordMockTestResults);

  const defaultStage = getActiveStage(profile?.level ?? 1, profile?.stageOverride);
  const [selectedStage, setSelectedStage] = useState<CurriculumStage>(defaultStage);
  const [mode, setMode] = useState<ArenaMode>('mock');
  const [phase, setPhase] = useState<Phase>('lobby');
  const [sessionItems, setSessionItems] = useState<SessionQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOriginalIdx, setSelectedOriginalIdx] = useState<number | null>(null);
  const [logs, setLogs] = useState<AnswerLog[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [rewardedSummary, setRewardedSummary] = useState<{ xp: number; coins: number } | null>(null);

  useEffect(() => {
    void ensureStageLoaded(selectedStage);
  }, [selectedStage, ensureStageLoaded]);

  // Preload stages present in mastery so SRS review can surface due questions from any stage
  useEffect(() => {
    const stagesInMastery = new Set<CurriculumStage>();
    for (const id of Object.keys(mastery)) {
      const m = /^s([1-5])_\d+$/.exec(id);
      if (m?.[1]) stagesInMastery.add(Number(m[1]) as CurriculumStage);
    }
    for (const st of stagesInMastery) {
      if (!stageQuestions[st]) void ensureStageLoaded(st);
    }
  }, [mastery, stageQuestions, ensureStageLoaded]);

  const srsDueQuestions = useMemo(() => {
    const now = Date.now();
    const list: CurriculumQuestion[] = [];
    for (const rec of Object.values(mastery)) {
      const q = questionMap[rec.vocabId];
      if (!q) continue;
      const hasMistake = rec.correctCount < rec.attemptCount;
      const isDue = rec.srsLevel === 0 || rec.nextReviewAt <= now;
      if (hasMistake || isDue) {
        list.push(q);
      }
    }
    return list;
  }, [mastery, questionMap]);

  const finishSession = useCallback(
    (finalLogs: AnswerLog[]) => {
      const correctCount = finalLogs.filter((l) => l.isCorrect).length;
      const xp = correctCount * 18 + (correctCount >= 8 ? 45 : correctCount >= 5 ? 20 : 10);
      const coins = correctCount * 10 + (correctCount >= 8 ? 35 : correctCount >= 5 ? 15 : 5);
      setRewardedSummary({ xp, coins });
      setPhase('summary');
      if (finalLogs.length > 0) {
        recordMockTestResults(
          finalLogs.map((l) => ({ questionId: l.question.id, isCorrect: l.isCorrect })),
          xp,
          coins,
        );
      }
    },
    [recordMockTestResults],
  );

  // Countdown timer during timed Mock / Audio modes
  useEffect(() => {
    if (phase !== 'playing' || mode === 'srs') return undefined;
    const id = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, mode]);

  // Handle time-up completion safely
  useEffect(() => {
    if (phase === 'playing' && mode !== 'srs' && secondsLeft === 0) {
      const remaining = sessionItems.slice(logs.length).map<AnswerLog>((item) => ({
        question: item.question,
        selectedOptionIndex: null,
        isCorrect: false,
      }));
      finishSession([...logs, ...remaining]);
    }
  }, [phase, mode, secondsLeft, sessionItems, logs, finishSession]);

  const currentItem = sessionItems[currentIdx];

  // Auto-play audio in Audio Blitz mode when moving to next question
  useEffect(() => {
    if (phase === 'playing' && mode === 'audio' && currentItem && profile) {
      if (isPureEnglish(currentItem.question.word)) {
        AudioEngine.speakWord(currentItem.question.word, profile.accent);
      }
    }
  }, [phase, mode, currentIdx, currentItem, profile]);

  const startSession = async (chosenMode: ArenaMode) => {
    if (!profile) return;
    const bank =
      stageQuestions[selectedStage] && stageQuestions[selectedStage]!.length > 0
        ? stageQuestions[selectedStage]!
        : await ensureStageLoaded(selectedStage);

    const completedSet = new Set(profile.completedQuestionIds ?? []);
    let picked: CurriculumQuestion[] = [];

    if (chosenMode === 'srs') {
      if (srsDueQuestions.length > 0) {
        picked = shuffleList(srsDueQuestions).slice(0, 10);
      } else {
        picked = shuffleList(bank).slice(0, 10);
      }
    } else if (chosenMode === 'audio') {
      const englishPool = bank.filter(
        (q) =>
          (q.quizType === 'simple_translation' || q.quizType === 'listening_challenge') &&
          isPureEnglish(q.word),
      );
      const source = englishPool.length >= 6 ? englishPool : bank.filter((q) => isPureEnglish(q.word));
      picked = shuffleList(source.length > 0 ? source : bank).slice(0, 8);
    } else {
      const unseen = bank.filter((q) => !completedSet.has(q.id));
      const pool = unseen.length >= 10 ? unseen : bank;
      picked = shuffleList(pool).slice(0, 10);
    }

    if (picked.length === 0) return;

    setMode(chosenMode);
    setSessionItems(
      picked.map((q) => ({
        question: q,
        optionOrder: shuffleIndices(q.quiz.options.length),
      })),
    );
    setCurrentIdx(0);
    setSelectedOriginalIdx(null);
    setLogs([]);
    setRewardedSummary(null);
    setSecondsLeft(chosenMode === 'audio' ? 90 : 120);
    setPhase('playing');
  };

  const handleSelectOption = useCallback(
    (origIdx: number) => {
      if (!currentItem || selectedOriginalIdx !== null) return;
      const isCorrect = origIdx === currentItem.question.quiz.correctIndex;
      setSelectedOriginalIdx(origIdx);
      setLogs((prev) => [
        ...prev,
        { question: currentItem.question, selectedOptionIndex: origIdx, isCorrect },
      ]);
      if (isCorrect) {
        AudioEngine.playCorrect(false);
      } else {
        AudioEngine.playError();
      }
    },
    [currentItem, selectedOriginalIdx],
  );

  const handleNext = useCallback(() => {
    if (currentIdx + 1 >= sessionItems.length) {
      finishSession(logs);
      return;
    }
    setCurrentIdx((n) => n + 1);
    setSelectedOriginalIdx(null);
  }, [currentIdx, sessionItems.length, logs, finishSession]);

  // Keyboard shortcuts 1–4 & Enter while playing
  useEffect(() => {
    if (phase !== 'playing' || !currentItem) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (selectedOriginalIdx !== null && e.key === 'Enter') {
        e.preventDefault();
        handleNext();
        return;
      }
      const num = Number.parseInt(e.key, 10);
      if (selectedOriginalIdx === null && num >= 1 && num <= currentItem.optionOrder.length) {
        const orig = currentItem.optionOrder[num - 1];
        if (orig !== undefined) handleSelectOption(orig);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, currentItem, selectedOriginalIdx, handleNext, handleSelectOption]);

  if (!profile) return null;

  const activeStageInfo = STAGE_ROADMAP.find((s) => s.stage === selectedStage) ?? STAGE_ROADMAP[0]!;
  const isStageLoading = loadingStage === selectedStage && !(stageQuestions[selectedStage]?.length);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mock-arena-title"
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="panel relative flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-b-none border-2 border-indigo-500/30 bg-surface shadow-2xl md:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line bg-indigo-500/10 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow">
              <GraduationCap size={22} />
            </div>
            <div>
              <h2 id="mock-arena-title" className="font-display text-lg font-black text-ink">
                Phòng Thi Thử IELTS & Ôn Tập SRS
              </h2>
              <p className="text-xs font-semibold text-muted">
                Luyện tốc độ 10 câu tính giờ · Ôn câu từng sai & đến hạn SRS · Thưởng Xu & XP
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-surface-2"
            aria-label="Đóng phòng thi thử"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="scrollbar-thin flex-1 overflow-y-auto p-4 md:p-5">
          {phase === 'lobby' && (
            <div className="space-y-4">
              {/* Stage Selector */}
              <div className="rounded-2xl border border-line bg-surface-2 p-3.5">
                <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted">
                  Chọn Giai đoạn luyện đề ({STAGE_ROADMAP.reduce((a, b) => a + b.questionTarget, 0)} câu tổng)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {STAGE_ROADMAP.map((s) => (
                    <button
                      key={s.stage}
                      type="button"
                      onClick={() => setSelectedStage(s.stage)}
                      className={`btn min-h-[34px] px-3 text-xs font-bold ${
                        selectedStage === s.stage ? 'btn-primary' : 'btn-ghost'
                      }`}
                    >
                      GĐ {s.stage} · {s.band.replace('Band ', '')}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted">
                  <strong className="text-ink">{activeStageInfo.title}:</strong> {activeStageInfo.goal}
                </p>
              </div>

              {/* 3 Arena Mode Cards */}
              <div className="grid gap-3 md:grid-cols-3">
                {/* Mode 1: Timed Mock Test */}
                <div className="flex flex-col justify-between rounded-2xl border-2 border-indigo-500/40 bg-surface p-4 shadow-sm">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-600">
                        <Timer size={20} />
                      </span>
                      <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-[10px] font-bold text-indigo-600">
                        10 câu · 120s
                      </span>
                    </div>
                    <h3 className="text-sm font-black">Thi Thử Theo Giai Đoạn</h3>
                    <p className="mt-1 text-xs text-muted">
                      Bốc ngẫu nhiên 10 câu từ GĐ {selectedStage} dưới áp lực thời gian như phòng thi thật.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isStageLoading}
                    onClick={() => void startSession('mock')}
                    className="btn btn-primary mt-4 min-h-[38px] w-full text-xs font-bold"
                  >
                    <Play size={14} /> {isStageLoading ? 'Đang tải đề…' : 'Bắt đầu Thi Thử'}
                  </button>
                </div>

                {/* Mode 2: Smart SRS Review */}
                <div className="flex flex-col justify-between rounded-2xl border-2 border-emerald-500/40 bg-surface p-4 shadow-sm">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600">
                        <Brain size={20} />
                      </span>
                      <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                        {srsDueQuestions.length > 0 ? `${srsDueQuestions.length} câu cần ôn` : 'Ôn tập tự do'}
                      </span>
                    </div>
                    <h3 className="text-sm font-black">Ôn Tập Thông Minh (SRS)</h3>
                    <p className="mt-1 text-xs text-muted">
                      {srsDueQuestions.length > 0
                        ? 'Ưu tiên các câu bạn từng làm sai hoặc đã đến hạn ôn trí nhớ dài hạn.'
                        : 'Bạn chưa có câu sai tồn đọng! Chế độ sẽ chọn 10 câu ngẫu nhiên không giới hạn giờ.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isStageLoading}
                    onClick={() => void startSession('srs')}
                    className="btn mt-4 min-h-[38px] w-full bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                  >
                    <Brain size={14} /> Ôn Tập Ngay
                  </button>
                </div>

                {/* Mode 3: Audio Blitz */}
                <div className="flex flex-col justify-between rounded-2xl border-2 border-amber-500/40 bg-surface p-4 shadow-sm">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600">
                        <Headphones size={20} />
                      </span>
                      <span className="rounded-md bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                        8 câu · 90s
                      </span>
                    </div>
                    <h3 className="text-sm font-black">Luyện Nghe & Từ Nhanh</h3>
                    <p className="mt-1 text-xs text-muted">
                      Tự động đọc chuẩn Anh-Anh / Anh-Mỹ cho câu hỏi từ vựng & nghe hiểu ở GĐ {selectedStage}.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isStageLoading}
                    onClick={() => void startSession('audio')}
                    className="btn mt-4 min-h-[38px] w-full bg-amber-500 text-xs font-bold text-black hover:bg-amber-600"
                  >
                    <Headphones size={14} /> Luyện Nghe Nhanh
                  </button>
                </div>
              </div>
            </div>
          )}

          {phase === 'playing' && currentItem && (
            <div className="space-y-4">
              {/* Progress + Timer bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3.5 py-2 text-xs font-bold">
                <span>
                  Câu {currentIdx + 1} / {sessionItems.length} ·{' '}
                  <span className="text-accent">GĐ {currentItem.question.stage}</span>
                </span>
                <span className="truncate text-muted">{currentItem.question.topic}</span>
                {mode !== 'srs' ? (
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono ${
                      secondsLeft <= 15 ? 'bg-danger text-white animate-pulse' : 'bg-surface text-ink'
                    }`}
                  >
                    <Clock size={13} /> {formatSec(secondsLeft)}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-emerald-600">
                    🧠 Không giới hạn giờ
                  </span>
                )}
              </div>

              {/* Question Box */}
              <div className="rounded-2xl border border-line bg-surface p-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-muted">{currentItem.question.module}</span>
                  {isPureEnglish(currentItem.question.word) && (
                    <button
                      type="button"
                      onClick={() => AudioEngine.speakWord(currentItem.question.word, profile.accent)}
                      className="btn btn-ghost min-h-[30px] px-2.5 py-1 text-xs font-bold text-accent"
                    >
                      <Volume2 size={14} /> Nghe ({profile.accent === 'en-GB' ? 'UK' : 'US'})
                    </button>
                  )}
                </div>

                <p className="text-base font-extrabold text-ink">{currentItem.question.quiz.prompt}</p>
                <p className="mt-2 rounded-xl bg-surface-2 px-3 py-2 text-sm text-ink">
                  {currentItem.question.quiz.sentence}
                </p>

                {/* Shuffled Options */}
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {currentItem.optionOrder.map((origIdx, dispIdx) => {
                    const text = currentItem.question.quiz.options[origIdx] ?? '';
                    const isAnswered = selectedOriginalIdx !== null;
                    const isCorrectOpt = origIdx === currentItem.question.quiz.correctIndex;
                    const isPicked = origIdx === selectedOriginalIdx;

                    let cls = 'btn-ghost hover:border-accent';
                    if (isAnswered) {
                      if (isCorrectOpt) cls = 'bg-success text-white border-success';
                      else if (isPicked) cls = 'bg-danger text-white border-danger';
                      else cls = 'btn-ghost opacity-50';
                    }

                    return (
                      <button
                        key={origIdx}
                        type="button"
                        disabled={isAnswered}
                        onClick={() => handleSelectOption(origIdx)}
                        className={`btn h-auto min-h-[44px] justify-start border-2 px-3 py-2 text-left text-sm ${cls}`}
                      >
                        <span className="font-mono text-[10px] opacity-65">{dispIdx + 1}</span>
                        <span className="flex-1">{text}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Explanation & Next Button */}
                {selectedOriginalIdx !== null && (
                  <div className="mt-4 flex flex-col gap-3 rounded-xl border border-line bg-surface-2 p-3">
                    <div className="flex items-start gap-2 text-sm">
                      {selectedOriginalIdx === currentItem.question.quiz.correctIndex ? (
                        <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-success" />
                      ) : (
                        <XCircle size={18} className="mt-0.5 shrink-0 text-danger" />
                      )}
                      <div>
                        <p className="font-bold">
                          {currentItem.question.word}{' '}
                          <span className="font-mono text-xs text-muted">{currentItem.question.ipa}</span> —{' '}
                          {currentItem.question.meaning}
                        </p>
                        <p className="mt-0.5 text-xs text-muted">{currentItem.question.quiz.explanation}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleNext}
                      className="btn btn-primary ml-auto px-5 text-xs font-bold"
                    >
                      {currentIdx + 1 >= sessionItems.length ? 'Xem Tổng Kết 🏆' : 'Câu tiếp theo →'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {phase === 'summary' && rewardedSummary && (
            <div className="space-y-4">
              {(() => {
                const total = logs.length;
                const correct = logs.filter((l) => l.isCorrect).length;
                const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
                return (
                  <>
                    <div className="rounded-2xl border-2 border-accent/40 bg-surface-2 p-5 text-center">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-accent">
                        Kết quả {mode === 'srs' ? 'Ôn tập SRS' : mode === 'audio' ? 'Luyện Nghe' : 'Thi Thử IELTS'}
                      </p>
                      <p className="mt-1 font-display text-4xl font-black text-ink">
                        {correct} / {total}{' '}
                        <span className="text-xl font-bold text-muted">({pct}%)</span>
                      </p>
                      <div className="mt-3 flex flex-wrap items-center justify-center gap-3 text-sm font-bold">
                        <span className="inline-flex items-center gap-1 rounded-xl bg-surface px-3 py-1.5 text-accent shadow-sm">
                          <Award size={16} /> +{rewardedSummary.xp} XP
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-xl bg-surface px-3 py-1.5 text-amber-600 shadow-sm">
                          <Coins size={16} /> +{rewardedSummary.coins} Xu vàng
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-extrabold uppercase tracking-wide text-muted">
                        Chi tiết câu trả lời
                      </p>
                      {logs.map((item, i) => (
                        <div
                          key={`${item.question.id}-${i}`}
                          className={`rounded-xl border p-3 text-xs ${
                            item.isCorrect ? 'border-line bg-surface' : 'border-danger/50 bg-danger/5'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2">
                              {item.isCorrect ? (
                                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />
                              ) : (
                                <XCircle size={16} className="mt-0.5 shrink-0 text-danger" />
                              )}
                              <div>
                                <p className="font-bold text-ink">
                                  Câu {i + 1}: {item.question.word} ({item.question.meaning})
                                </p>
                                <p className="mt-0.5 text-muted">
                                  Đáp án chuẩn:{' '}
                                  <strong className="text-success">
                                    {item.question.quiz.options[item.question.quiz.correctIndex]}
                                  </strong>
                                  {' · '}
                                  {item.question.quiz.explanation}
                                </p>
                              </div>
                            </div>
                            {isPureEnglish(item.question.word) && (
                              <button
                                type="button"
                                onClick={() => AudioEngine.speakWord(item.question.word, profile.accent)}
                                className="btn btn-ghost h-8 w-8 shrink-0 !min-h-0 p-0"
                                title="Nghe phát âm"
                              >
                                <Volume2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setPhase('lobby')}
                        className="btn btn-ghost px-4 text-xs font-bold"
                      >
                        <RotateCcw size={14} /> Làm đề khác
                      </button>
                      <button
                        type="button"
                        onClick={onClose}
                        className="btn btn-primary px-5 text-xs font-bold"
                      >
                        Về Nông trại
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
