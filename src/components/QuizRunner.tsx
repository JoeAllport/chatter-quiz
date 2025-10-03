"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Quiz, QuizItem } from "@/lib/quiz";
import { scoreQuiz } from "@/lib/scoring";
import { MCQ, GapFill } from "./items";
import { FeedbackPanel } from "./FeedbackPanel";
import s from "./QuizRunner.module.css";

export default function QuizRunner({ quiz }: { quiz: Quiz }) {
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [step, setStep] = useState(0);
  const [result, setResult] = useState<{ earned: number; total: number; pct: number } | null>(null);

  const item = quiz.items[step];
  const totalItems = quiz.items.length;
  const pct = totalItems > 0 ? Math.round((step / totalItems) * 100) : 0;

  // Focus the first interactive element on step change
  const stepRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = stepRef.current?.querySelector("input,button,select,textarea") as HTMLElement | null;
    el?.focus?.();
  }, [step]);

  const set = (id: string, v: any) => setAnswers((a) => ({ ...a, [id]: v }));

  function renderItem(item: QuizItem) {
    if (item.type === "mcq") {
      return <MCQ item={item} value={answers[item.id] ?? []} onChange={(v) => set(item.id, v)} />;
    }
    if (item.type === "gap-fill") {
      return <GapFill item={item} value={answers[item.id] ?? []} onChange={(v) => set(item.id, v)} />;
    }
    return <p>Unsupported type</p>;
  }

  const answered = useMemo(() => isAnswered(item, answers[item?.id]), [item, answers]);

  function handleNext() {
    if (step < totalItems - 1) setStep(step + 1);
  }

  function handlePrev() {
    if (step > 0) setStep(step - 1);
  }

  function handleSubmit() {
    const r = scoreQuiz(quiz, answers);
    setResult(r);
  }

  return (
    <div className={s.wrapper}>
      <div className={s.title}>{quiz.title}</div>

      <div className={s.progressWrap} aria-label="progress">
        <div className={s.progressBar} style={{ width: `${pct}%` }} />
      </div>

      <div className={s.card} ref={stepRef} aria-live="polite">
        <div style={{ marginBottom: 8, opacity: 0.7 }}>
          Question {Math.min(step + 1, totalItems)} of {totalItems}
        </div>

        {renderItem(item)}

        {result && (
          <FeedbackPanel
            item={item}
            value={answers[item?.id]}
            correct={isItemCorrect(item, answers[item?.id])}
            premiumUnlocked={true} // wire to real auth/flag later
          />
        )}

        <div className={s.actions}>
          <button className={s.btn} onClick={handlePrev} disabled={step === 0}>
            Back
          </button>

          {step < totalItems - 1 ? (
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={handleNext} disabled={!answered}>
              Next
            </button>
          ) : (
            <button className={`${s.btn} ${s.btnPrimary}`} onClick={handleSubmit} disabled={!answered}>
              Finish &amp; Score
            </button>
          )}
        </div>
      </div>

      {result && (
        <div className={s.score}>
          <strong>Score:</strong> {result.earned}/{result.total} ({result.pct}%)
          <div style={{ marginTop: 8 }}>
            <button className={s.btn} onClick={() => setStep(0)}>
              Review
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function isAnswered(item: QuizItem | undefined, val: any) {
  if (!item) return false;
  if (item.type === "mcq") return Array.isArray(val) && val.length > 0;
  if (item.type === "gap-fill") {
    const gaps = item.gaps ?? [];
    if (!Array.isArray(val)) return false;
    return gaps.every((_, i) => (val[i] ?? "").toString().trim().length > 0);
  }
  return false;
}

function isItemCorrect(item: QuizItem | undefined, val: any): boolean {
  if (!item) return false;

  if (item.answer.type === "mcq") {
    const correct = new Set(item.answer.correctOptionIds);
    const chosen = new Set<string>(val ?? []);
    if (correct.size !== chosen.size) return false;
    for (const id of correct) if (!chosen.has(id)) return false;
    return true;
  }

  if (item.answer.type === "gap") {
    const gaps = item.gaps ?? [];
    if (!Array.isArray(val)) return false;
    // Type guard to ensure acceptedByIndex exists
    const answer = item.answer as { type: "gap"; acceptedByIndex: Record<number, string[]> };
    return gaps.every((g, i) => {
      const t = (val?.[i] ?? "").toString().trim().toLowerCase();
      const acc = (answer.acceptedByIndex[i] ?? g.accepted ?? []).map((s: string) =>
        s.trim().toLowerCase()
      );
      return acc.includes(t);
    });
  }

  return false;
}
