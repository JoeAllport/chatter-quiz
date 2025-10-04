"use client";
import React from "react";
import type { Quiz, QuizItem } from "@/lib/quiz";
import s from "./QuizRunner.module.css";
import {
  MCQ,
  GapFill,
  Orderer,
  TokenSelect,
  MatchPairs,
  WordOrder,
  BankFill,
  DropdownFill,
  Hotspot,
} from "./items";
import { FeedbackPanel } from "./FeedbackPanel";
import ResultsPanel from "./ResultsPanel"; // ← NEW

export default function QuizRunner({ quiz }: { quiz: Quiz }) {
  const items: QuizItem[] = Array.isArray(quiz.items) ? quiz.items : [];
  const total = items.length;

  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, unknown>>({});
  const [checked, setChecked] = React.useState<Record<string, boolean>>({});
  const [last, setLast] = React.useState<{ itemId: string; correct: boolean } | null>(null);
  const [showResults, setShowResults] = React.useState(false); // ← NEW

  const setVal = (id: string, v: unknown) => setAnswers((a) => ({ ...a, [id]: v }));

  if (total === 0) {
    return (
      <div className={s.wrapper}>
        <div className={s.title}>{quiz.title ?? "Untitled quiz"}</div>
        <p>No items to show. Make sure your JSON has an <code>items</code> array.</p>
      </div>
    );
  }

  const restart = () => {                 // ← NEW
    setStep(0);
    setAnswers({});
    setChecked({});
    setLast(null);
    setShowResults(false);
  };

  if (showResults) {                       // ← NEW
    return (
      <div className={s.wrapper}>
        <div className={s.title}>{quiz.title}</div>
        <div className={s.card}>
          <ResultsPanel quiz={quiz} answers={answers} onRestart={restart} />
        </div>
      </div>
    );
  }

  const item = items[Math.max(0, Math.min(step, total - 1))];

  const isAnswered = (it: QuizItem, v: unknown) => {
    const arr = Array.isArray(v) ? (v as string[]) : [];
    switch (it.type) {
      case "mcq":
      case "token-select":
      case "match":
      case "order":
      case "word-order":
      case "bank-fill":
      case "dropdown-fill":
      case "hotspot":
        return arr.length > 0;
      case "gap-fill":
        return arr.some((x) => String(x ?? "").trim().length > 0);
      default:
        return arr.length > 0;
    }
  };

  const onCheck = () => {
    let correct = false;
    const v = answers[item.id];
    const arr = Array.isArray(v) ? (v as string[]) : [];
    const ans = item.answer; // discriminated union by `type`

    // instant-check for the main three types (others use end-of-quiz scoring)
    try {
      if (item.type === "mcq" && ans.type === "mcq") {
        const ids: string[] = ans.correctOptionIds ?? [];
        correct = ids.length === arr.length && ids.every((x) => arr.includes(x));
      } else if (item.type === "hotspot" && ans.type === "hotspot") {
        const ids: string[] = ans.correctRegionIds ?? [];
        correct = ids.length === arr.length && ids.every((x) => arr.includes(x));
      } else if (item.type === "gap-fill" && ans.type === "gap") {
        const byIndex: Record<number, string[]> = ans.acceptedByIndex ?? {};
        correct = arr.every((val, i) => {
          const bucket = byIndex[i];
          if (!Array.isArray(bucket)) return false;
          const norm = String(val ?? "").toLowerCase().trim();
          return bucket.some((s) => String(s).toLowerCase().trim() === norm);
        });
      }
    } catch {
      correct = false;
    }

    setChecked((c) => ({ ...c, [item.id]: true }));
    setLast({ itemId: item.id, correct });
  };

  const render = (it: QuizItem) => {
    const v = answers[it.id];
    const arr = Array.isArray(v) ? (v as string[]) : [];
    switch (it.type) {
      case "mcq":
        return <MCQ item={it} value={arr} onChange={(nv) => setVal(it.id, nv)} />;
      case "gap-fill":
        return <GapFill item={it} value={arr} onChange={(nv) => setVal(it.id, nv)} />;
      case "order":
        return <Orderer item={it} value={arr} onChange={(nv) => setVal(it.id, nv)} />;
      case "token-select":
        return <TokenSelect item={it} value={arr} onChange={(nv) => setVal(it.id, nv)} />;
      case "match":
        return <MatchPairs item={it} value={arr} onChange={(nv) => setVal(it.id, nv)} />;
      case "word-order":
        return <WordOrder item={it} value={arr} onChange={(nv) => setVal(it.id, nv)} />;
      case "bank-fill":
        return <BankFill item={it} value={arr} onChange={(nv) => setVal(it.id, nv)} />;
      case "dropdown-fill":
        return <DropdownFill item={it} value={arr} onChange={(nv) => setVal(it.id, nv)} />;
      case "hotspot":
        return <Hotspot item={it} value={arr} onChange={(nv) => setVal(it.id, nv)} />;
      default:
        return <p>Unsupported type: {it.type}</p>;
    }
  };

  const answered = isAnswered(item, answers[item.id]);

  return (
    <div className={s.wrapper}>
      <div className={s.title}>{quiz.title}</div>

      <div className={s.card}>
        {render(item)}
        <div className={s.controls}>
          {step > 0 && (
            <button className={s.navBtn} onClick={() => setStep((n) => Math.max(0, n - 1))}>
              Back
            </button>
          )}

          {!checked[item.id] ? (
            <button className={s.checkBtn} onClick={onCheck} disabled={!answered}>
              Check
            </button>
          ) : step < total - 1 ? (
            <button
              className={s.nextBtn}
              onClick={() => setStep((n) => Math.min(total - 1, n + 1))}
              aria-label="Next question"
            >
              Next →
            </button>
          ) : (
            <button className={s.nextBtn} onClick={() => setShowResults(true)}>
              See results →
            </button>
          )}
        </div>

        {checked[item.id] ? (
          <FeedbackPanel
            item={item}
            value={Array.isArray(answers[item.id]) ? (answers[item.id] as string[]) : []}
            correct={!!last?.correct && last.itemId === item.id}
          />
        ) : null}
      </div>

      <div className={s.progress}>
        Question {step + 1} / {total}
      </div>
    </div>
  );
}
