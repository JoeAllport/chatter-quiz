"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Quiz, QuizItem } from "@/lib/quiz";
import { ResponseMap } from "@/lib/scoring";
import { MCQ, GapFill } from "./items";
import { FeedbackPanel } from "./FeedbackPanel";
import s from "./QuizRunner.module.css";

export default function QuizRunner({ quiz }: { quiz: Quiz }) {
  const [answers, setAnswers] = useState<ResponseMap>({});
  const [step, setStep] = useState(0);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [earnedByItem, setEarnedByItem] = useState<Record<string, number>>({});

  const item = quiz.items[step];
  const totalItems = quiz.items.length;
  const totalPoints = useMemo(
    () => quiz.items.reduce((acc, it) => acc + (it.points ?? 1), 0),
    [quiz.items]
  );
  const pct = totalItems > 0 ? Math.round((step / totalItems) * 100) : 0;

  const stepRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = stepRef.current?.querySelector("input,button,select,textarea") as HTMLElement | null;
    el?.focus?.();
  }, [step]);

  const set = (id: string, v: string[]) => {
    setAnswers((a) => ({ ...a, [id]: v }));
    setChecked((c) => ({ ...c, [id]: false }));
  };

  function renderItem(q: QuizItem) {
    if (q.type === "mcq")
      return <MCQ item={q} value={answers[q.id] ?? []} onChange={(v) => set(q.id, v)} />;
    if (q.type === "gap-fill")
      return <GapFill item={q} value={answers[q.id] ?? []} onChange={(v) => set(q.id, v)} />;
    return <p>Unsupported type</p>;
  }

  const answered = useMemo(() => isAnswered(item, answers[item?.id]), [item, answers]);
  const isChecked = !!checked[item?.id];
  const thisEarned = earnedByItem[item?.id] ?? 0;
  const earnedSoFar = useMemo(
    () => Object.values(earnedByItem).reduce((a, b) => a + (b || 0), 0),
    [earnedByItem]
  );

  function handleCheck() {
    if (!item) return;
    const val = answers[item.id];
    const pts = scoreOneItem(quiz, item, val);
    setChecked((c) => ({ ...c, [item.id]: true }));
    setEarnedByItem((m) => ({ ...m, [item.id]: pts }));
  }

  function handleNext() { if (step < totalItems - 1) setStep(step + 1); }
  function handlePrev() { if (step > 0) setStep(step - 1); }

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

        {isChecked && (
          <div className={s.score} style={{ marginTop: 12 }}>
            <strong>
              This question:&nbsp;{thisEarned}/{item?.points ?? 1} point{(item?.points ?? 1) === 1 ? "" : "s"}
            </strong>
          </div>
        )}

        {isChecked && (
          <FeedbackPanel
            item={item}
            value={answers[item?.id]}
            correct={isItemCorrect(item, answers[item?.id])}
            premiumUnlocked={true}
          />
        )}

        <div className={s.actions}>
          <button className={s.btn} onClick={handlePrev} disabled={step === 0}>Back</button>
          <button className={`${s.btn} ${s.btnPrimary}`} onClick={handleCheck} disabled={!answered}>
            {isChecked ? "Re-check" : "Check"}
          </button>
          <button className={s.btn} onClick={handleNext} disabled={step >= totalItems - 1 || !isChecked}>
            Next
          </button>
        </div>
      </div>

      <div className={s.score}>
        <strong>Score so far:</strong> {earnedSoFar}/{totalPoints}
      </div>
    </div>
  );
}

/* helpers */
function isAnswered(item: QuizItem | undefined, val: string[] | undefined) {
  if (!item) return false;
  if (item.type === "mcq") return Array.isArray(val) && val.length > 0;
  if (item.type === "gap-fill") {
    const gaps = item.gaps ?? [];
    const vv = val ?? [];
    return gaps.every((_, i) => (vv[i] ?? "").toString().trim().length > 0);
  }
  return false;
}

function isItemCorrect(item: QuizItem | undefined, val: string[] | undefined): boolean {
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
    const vv = val ?? [];
    return gaps.every((g, i) => {
      const t = (vv[i] ?? "").toString().trim().toLowerCase();
      let acc: string[] = [];
      if (item.answer.type === "gap") {
        acc = (item.answer.acceptedByIndex[i] ?? g.accepted ?? []).map((s) => s.trim().toLowerCase());
      } else {
        acc = (g.accepted ?? []).map((s) => s.trim().toLowerCase());
      }
      return acc.includes(t);
    });
  }

  return false;
}

function scoreOneItem(quiz: Quiz, item: QuizItem, val: string[] | undefined): number {
  const pts = item.points ?? 1;

  if (item.answer.type === "mcq") {
    const correct = new Set(item.answer.correctOptionIds);
    const chosen = new Set<string>(val ?? []);
    const exact = correct.size === chosen.size && [...correct].every((id) => chosen.has(id));
    return exact ? pts : 0;
  }

  if (item.answer.type === "gap") {
    const gaps = item.gaps ?? [];
    const vv = val ?? [];
    let ok = 0;
    gaps.forEach((g, i) => {
      const t = (vv[i] ?? "").toString().trim().toLowerCase();
      const acc =
        item.answer.type === "gap"
          ? (item.answer.acceptedByIndex[i] ?? g.accepted ?? []).map((s) => s.trim().toLowerCase())
          : (g.accepted ?? []).map((s) => s.trim().toLowerCase());
      if (acc.includes(t)) ok++;
    });
    return quiz.scoring?.partialCredit ? (ok / gaps.length) * pts : ok === gaps.length ? pts : 0;
  }

  return 0;
}
