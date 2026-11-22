import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import {
  Award,
  BookMarked,
  CheckCircle2,
  ChevronDown,
  Clock,
  Droplets,
  Flame,
  Gift,
  Sparkles,
  Volume2,
  X,
  XCircle,
} from 'lucide-react';
import { AudioEngine } from '../../core/AudioEngine';
import { WATERING_CAN_LABELS } from '../../core/ComboEngine';
import type { VocabItem } from '../../core/types';
import { useGameStore, type QuizOutcome } from '../store/useGameStore';

const TIER_STYLE: Record<number, { label: string; cls: string }> = {
  1: { label: 'Tier 1 · Basic Seed', cls: 'bg-success text-white' },
  2: { label: 'Tier 2 · Collocation Sapling', cls: 'bg-info text-white' },
  3: { label: 'Tier 3 · Ancient Paraphrase Tree', cls: 'bg-gold text-black' },
};

/** Fisher–Yates shuffle of option indices (correct answer is index 0 in seed data). */
function shuffledOrder(length: number): number[] {
  const order = Array.from({ length }, (_, i) => i);
  for (let i = order.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = order[i] as number;
    order[i] = order[j] as number;
    order[j] = tmp;
  }
  return order;
}

/** Renders the IELTS context sentence, filling `_____` or `[basic phrase]`. */
function ContextSentence({
  vocab,
  filled,
  slotRef,
  dragOver,
}: {
  vocab: VocabItem;
  filled: string | null;
  slotRef?: React.RefObject<HTMLSpanElement>;
  dragOver?: boolean;
}) {
  const s = vocab.quiz.sentence;

  if (vocab.quizType === 'paraphrase_upgrade') {
    const parts = s.split(/\[(.+?)\]/);
    return (
      <p className="text-base leading-relaxed md:text-lg">
        {parts.map((part, i) =>
          i % 2 === 1 ? (
            filled ? (
              <span key={i} className="whitespace-nowrap">
                <span className="mr-1 text-muted line-through">{part}</span>
                <mark className="rounded-md bg-gold px-1.5 font-bold text-black">{filled}</mark>
              </span>
            ) : (
              <mark key={i} className="rounded-md px-1 font-bold text-danger underline decoration-wavy">
                {part}
              </mark>
            )
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </p>
    );
  }

  const [before, after] = s.split('_____');
  return (
    <p className="text-base leading-relaxed md:text-lg">
      {before}
      <span
        ref={slotRef}
        className={`mx-1 inline-flex min-w-[7.5rem] items-center justify-center rounded-lg border-2 border-dashed px-2 py-0.5 align-middle font-bold transition-colors ${
          filled
            ? 'border-success bg-success text-white'
            : dragOver
              ? 'border-accent bg-surface-2 text-accent'
              : 'border-line text-muted'
        }`}
      >
        {filled ?? (vocab.quizType === 'collocation_match' ? 'drop here' : '?')}
      </span>
      {after ?? ''}
    </p>
  );
}

export function IeltsQuizModal() {
  const activeQuiz = useGameStore((s) => s.activeQuiz);
  const outcome = useGameStore((s) => s.quizOutcome);
  const vocab = useGameStore((s) => (s.activeQuiz ? s.vocabMap[s.activeQuiz.vocabId] : undefined));
  const accent = useGameStore((s) => s.profile?.accent ?? 'en-GB');
  const submitQuizAnswer = useGameStore((s) => s.submitQuizAnswer);
  const closeQuiz = useGameStore((s) => s.closeQuiz);
  const markQuizVisible = useGameStore((s) => s.markQuizVisible);

  if (!activeQuiz || !vocab) return null;

  return (
    <QuizBody
      key={`${activeQuiz.plotIndex}-${vocab.id}`}
      vocab={vocab}
      outcome={outcome}
      isFirstAttempt={activeQuiz.isFirstAttempt}
      accent={accent}
      onSubmit={submitQuizAnswer}
      onClose={closeQuiz}
      onVisible={markQuizVisible}
    />
  );
}

function QuizBody({
  vocab,
  outcome,
  isFirstAttempt,
  accent,
  onSubmit,
  onClose,
  onVisible,
}: {
  vocab: VocabItem;
  outcome: QuizOutcome | null;
  isFirstAttempt: boolean;
  accent: 'en-GB' | 'en-US';
  onSubmit: (optionIndex: number) => QuizOutcome | null;
  onClose: () => void;
  onVisible: () => void;
}) {
  const order = useMemo(() => shuffledOrder(vocab.quiz.options.length), [vocab]);
  const [tipOpen, setTipOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const slotRef = useRef<HTMLSpanElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ optionIndex: number; startX: number; startY: number; dragging: boolean } | null>(null);
  const continueRef = useRef<HTMLButtonElement>(null);

  const answered = outcome !== null;
  const correctIdx = vocab.quiz.correctIndex;
  const correctText = vocab.quiz.options[correctIdx] ?? '';
  const isCollocation = vocab.quizType === 'collocation_match';
  const revealWord = answered || vocab.quizType === 'phonetic_meaning';
  const tier = TIER_STYLE[vocab.tier] ?? TIER_STYLE[1]!;

  // Start the 4s critical-speed clock only once the modal is actually painted.
  useEffect(() => {
    const id = requestAnimationFrame(() => onVisible());
    return () => cancelAnimationFrame(id);
  }, [onVisible]);

  useEffect(() => {
    if (answered) continueRef.current?.focus();
  }, [answered]);

  const submit = useCallback(
    (optionIndex: number) => {
      if (answered) return;
      onSubmit(optionIndex);
    },
    [answered, onSubmit],
  );

  // Keyboard: 1–4 answer, Enter/Escape continue/close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (answered && e.key === 'Enter') {
        e.preventDefault();
        onClose();
        return;
      }
      const n = Number.parseInt(e.key, 10);
      if (!answered && n >= 1 && n <= order.length) {
        const original = order[n - 1];
        if (original !== undefined) submit(original);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [answered, order, submit, onClose]);

  const speak = () => AudioEngine.speakWord(vocab.word, accent);

  // ---- Pointer-based drag & drop (mouse + touch + pen); tap also places ----
  const overSlot = (x: number, y: number): boolean => {
    const r = slotRef.current?.getBoundingClientRect();
    if (!r) return false;
    const pad = 24;
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  };

  const onChipDown = (e: ReactPointerEvent<HTMLButtonElement>, optionIndex: number) => {
    if (answered) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { optionIndex, startX: e.clientX, startY: e.clientY, dragging: false };
  };

  const onChipMove = (e: ReactPointerEvent<HTMLButtonElement>, label: string) => {
    const d = dragRef.current;
    const ghost = ghostRef.current;
    if (!d || !ghost) return;
    if (!d.dragging && Math.abs(e.clientX - d.startX) + Math.abs(e.clientY - d.startY) > 8) {
      d.dragging = true;
      ghost.textContent = label;
      ghost.style.display = 'block';
    }
    if (d.dragging) {
      ghost.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      const over = overSlot(e.clientX, e.clientY);
      if (over !== dragOver) setDragOver(over);
    }
  };

  const onChipUp = (e: ReactPointerEvent<HTMLButtonElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (ghostRef.current) ghostRef.current.style.display = 'none';
    setDragOver(false);
    if (!d) return;
    if (!d.dragging || overSlot(e.clientX, e.clientY)) submit(d.optionIndex);
  };

  const optionState = (originalIdx: number): string => {
    if (!answered) return 'btn-ghost hover:border-accent';
    if (originalIdx === correctIdx) return 'bg-success text-white border-success';
    if (originalIdx === outcome?.selectedIndex) return 'bg-danger text-white border-danger';
    return 'btn-ghost opacity-50';
  };

  const reward = outcome?.reward;

  const tipBlock: ReactNode = vocab.tipCard ? (
    <div className="rounded-xl border border-line bg-surface-2 p-3">
      <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-accent">
        <BookMarked size={14} /> IELTS {vocab.tipCard.skill} · {vocab.tipCard.bandTarget}
      </div>
      <p className="text-sm font-bold">{vocab.tipCard.title}</p>
      <p className="mt-1 text-sm">
        <span className="text-muted line-through">{vocab.tipCard.upgradeFrom}</span>
        {' → '}
        <span className="font-bold text-success">{vocab.tipCard.upgradeTo}</span>
      </p>
      <p className="mt-1 text-sm text-muted">{vocab.tipCard.tip}</p>
    </div>
  ) : (
    <div className="rounded-xl border border-line bg-surface-2 p-3 text-sm text-muted">
      <span className="font-bold text-ink">Example: </span>
      {vocab.example}
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center md:items-center md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quiz-title"
    >
      <div className="absolute inset-0 animate-pop-in" style={{ background: 'var(--overlay)' }} onClick={onClose} />

      <div className="panel gpu relative flex max-h-[92dvh] w-full animate-pop-in flex-col overflow-hidden rounded-b-none md:max-w-4xl md:rounded-b-[var(--radius)]">
        {/* Critical speed window (4s) */}
        {!answered && (
          <div className="h-1.5 w-full bg-surface-2" aria-hidden>
            <div className="critical-bar h-full w-full bg-gold" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <span className={`rounded-lg px-2 py-1 text-[11px] font-bold ${tier.cls}`}>{tier.label}</span>
          <span className="text-xs font-semibold text-muted">{vocab.band}</span>
          {!isFirstAttempt && !answered && (
            <span className="text-[11px] font-semibold text-muted">· retry (no chest)</span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="focus-ring ml-auto flex h-10 w-10 items-center justify-center rounded-lg hover:bg-surface-2"
            aria-label="Close quiz"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body: 2 columns on ≥768px, stacked on mobile */}
        <div className="scrollbar-thin grid flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-6 md:p-6">
          {/* LEFT: Word / IPA / Audio */}
          <section className="flex flex-col gap-3">
            <div className="rounded-2xl bg-surface-strong p-4 text-on-strong">
              <p className="text-[11px] font-bold uppercase tracking-wider opacity-70">{vocab.partOfSpeech}</p>
              <h2 id="quiz-title" className="mt-1 font-display text-2xl font-bold leading-tight md:text-3xl">
                {revealWord ? vocab.word : '• • • ?'}
              </h2>
              <div className="mt-2 flex items-center gap-2">
                <span className="font-mono text-sm opacity-90">{revealWord ? vocab.ipa : '/ ? /'}</span>
                {revealWord && (
                  <button
                    type="button"
                    onClick={speak}
                    className="focus-ring ml-auto flex h-10 items-center gap-1 rounded-lg bg-white/15 px-3 text-xs font-bold hover:bg-white/25"
                    aria-label={`Pronounce ${vocab.word} (${accent === 'en-GB' ? 'UK' : 'US'})`}
                  >
                    <Volume2 size={16} /> {accent === 'en-GB' ? 'UK' : 'US'}
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-muted">
              <span className="font-bold text-ink">Meaning: </span>
              {vocab.meaning}
            </p>
            {answered && (
              <p className="text-sm text-muted">
                <span className="font-bold text-ink">Example: </span>
                <em>{vocab.example}</em>
              </p>
            )}
          </section>

          {/* RIGHT: IELTS context + interaction + tip */}
          <section className="flex flex-col gap-4">
            <div>
              <p className="mb-2 text-sm font-bold">{vocab.quiz.prompt}</p>
              <div className="rounded-xl border border-line bg-surface p-3">
                <ContextSentence
                  vocab={vocab}
                  filled={answered ? correctText : null}
                  slotRef={slotRef}
                  dragOver={dragOver}
                />
              </div>
            </div>

            {/* Options */}
            {isCollocation ? (
              <div className="flex flex-wrap gap-2" aria-label="Drag a verb into the blank, or tap it">
                {order.map((originalIdx, displayIdx) => {
                  const label = vocab.quiz.options[originalIdx] ?? '';
                  return (
                    <button
                      key={originalIdx}
                      type="button"
                      disabled={answered}
                      onPointerDown={(e) => onChipDown(e, originalIdx)}
                      onPointerMove={(e) => onChipMove(e, label)}
                      onPointerUp={onChipUp}
                      onPointerCancel={() => {
                        dragRef.current = null;
                        if (ghostRef.current) ghostRef.current.style.display = 'none';
                        setDragOver(false);
                      }}
                      style={{ touchAction: 'none' }}
                      className={`btn border-2 px-4 ${optionState(originalIdx)}`}
                    >
                      <span className="font-mono text-[10px] opacity-60">{displayIdx + 1}</span>
                      {label}
                    </button>
                  );
                })}
                <div
                  ref={ghostRef}
                  className="pointer-events-none fixed left-0 top-0 z-50 hidden rounded-xl bg-accent px-4 py-2 font-bold text-accent-contrast shadow-lg"
                  style={{ willChange: 'transform' }}
                  aria-hidden
                />
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {order.map((originalIdx, displayIdx) => (
                  <button
                    key={originalIdx}
                    type="button"
                    disabled={answered}
                    onClick={() => submit(originalIdx)}
                    className={`btn justify-start border-2 px-3 py-2 text-left text-sm ${optionState(originalIdx)}`}
                  >
                    <span className="font-mono text-[10px] opacity-60">{displayIdx + 1}</span>
                    <span className="flex-1">{vocab.quiz.options[originalIdx]}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Feedback */}
            {answered && reward && (
              <div
                className={`rounded-xl border-2 p-3 ${reward.isCorrect ? 'border-success' : 'border-danger'}`}
                role="status"
                aria-live="polite"
              >
                <div className="flex items-center gap-2 font-bold">
                  {reward.isCorrect ? (
                    <CheckCircle2 className="text-success" size={20} />
                  ) : (
                    <XCircle className="text-danger" size={20} />
                  )}
                  {reward.isCorrect ? 'Correct — crop fertilized!' : 'Not quite — streak reset'}
                  <span className="ml-auto flex items-center gap-1 font-mono text-xs text-muted">
                    <Clock size={12} /> {(reward.elapsedMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted">{vocab.quiz.explanation}</p>
                {!reward.isCorrect && (
                  <p className="mt-1 text-sm">
                    Answer: <span className="font-bold text-success">{correctText}</span>. Tap the plot again to retry.
                  </p>
                )}
                {reward.isCorrect && (
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-bold">
                    <span className="flex items-center gap-1 rounded-md bg-surface-2 px-2 py-1">
                      <Award size={12} /> +{reward.xpEarned} XP ×{reward.xpMultiplier}
                    </span>
                    {reward.isCriticalSpeed && (
                      <span className="flex items-center gap-1 rounded-md bg-gold px-2 py-1 text-black">
                        <Sparkles size={12} /> Critical ≤4s
                      </span>
                    )}
                    {reward.fastGrowReductionRatio > 0 && (
                      <span className="flex items-center gap-1 rounded-md bg-info px-2 py-1 text-white">
                        <Droplets size={12} /> Fast-Grow Water −30%
                      </span>
                    )}
                    {reward.goldenFertilizerGranted && (
                      <span className="flex items-center gap-1 rounded-md bg-gold px-2 py-1 text-black">
                        <Sparkles size={12} /> Golden Fertilizer
                      </span>
                    )}
                    {reward.feverTimeTriggered && (
                      <span className="flex items-center gap-1 rounded-md bg-danger px-2 py-1 text-white">
                        <Flame size={12} /> Fever Time 60s
                      </span>
                    )}
                    {reward.lexiChestDropped && (
                      <span className="flex items-center gap-1 rounded-md bg-accent px-2 py-1 text-accent-contrast">
                        <Gift size={12} /> Lexi Chest
                        {reward.newWateringCanTier ? ` · ${WATERING_CAN_LABELS[reward.newWateringCanTier]}` : ''}
                      </span>
                    )}
                  </div>
                )}
                {outcome?.chestTip && (
                  <div className="mt-2 rounded-lg bg-surface-2 p-2 text-sm">
                    <p className="font-bold">🎁 {outcome.chestTip.title}</p>
                    <p className="text-muted">{outcome.chestTip.tip}</p>
                  </div>
                )}
              </div>
            )}

            {/* Tip: always visible on desktop, collapsible accordion on mobile */}
            <div className="hidden md:block">{tipBlock}</div>
            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setTipOpen((o) => !o)}
                aria-expanded={tipOpen}
                className="focus-ring flex min-h-[44px] w-full items-center justify-between rounded-xl bg-surface-2 px-3 text-sm font-bold"
              >
                <span className="flex items-center gap-2">
                  <BookMarked size={16} /> IELTS Writing / Speaking Tip
                </span>
                <ChevronDown size={18} className={`transition-transform ${tipOpen ? 'rotate-180' : ''}`} />
              </button>
              {tipOpen && <div className="mt-2">{tipBlock}</div>}
            </div>
          </section>
        </div>

        {/* Bottom-anchored action bar (thumb zone on mobile) */}
        <div className="pb-safe flex gap-2 border-t border-line px-4 pt-3 md:justify-end md:pb-3">
          {answered ? (
            <button ref={continueRef} type="button" onClick={onClose} className="btn btn-primary w-full md:w-auto md:px-8">
              Continue farming
            </button>
          ) : (
            <>
              <button type="button" onClick={speak} className="btn btn-ghost flex-1 md:flex-none md:px-4" disabled={!revealWord}>
                <Volume2 size={16} /> Listen
              </button>
              <button type="button" onClick={onClose} className="btn btn-ghost flex-1 md:flex-none md:px-4">
                Later
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
