"use client";
import React from "react";
import type { Quiz, QuizItem } from "@/lib/quiz";
import s from "./QuizRunner.module.css";
import { MCQ, GapFill, Orderer, TokenSelect, MatchPairs, WordOrder, BankFill, DropdownFill, Hotspot } from "./items";
import { FeedbackPanel } from "./FeedbackPanel";

export default function QuizRunner({ quiz }: { quiz: Quiz }) {
  const items: QuizItem[] = Array.isArray(quiz.items) ? quiz.items : [];
  const total = items.length;

  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, unknown>>({});
  const [checked, setChecked] = React.useState<Record<string, boolean>>({});
  const [last, setLast] = React.useState<{ itemId: string; correct: boolean } | null>(null);

  const setVal = (id: string, v: unknown) => setAnswers((a) => ({ ...a, [id]: v }));

  if (total === 0) {
    return (
      <div className={s.wrapper}>
        <div className={s.title}>{quiz.title ?? "Untitled quiz"}</div>
        <p>No items to show. Make sure your JSON has an <code>items</code> array.</p>
      </div>
    );
  }

  const item = items[Math.max(0, Math.min(step, total - 1))];

  const isAnswered = (it: QuizItem, v: unknown) => {
    const arr = Array.isArray(v) ? v : [];
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
    // super-safe correctness check (doesn't assume shapes)
    let correct = false;
    const v = answers[item.id];
    const arr = Array.isArray(v) ? (v as string[]) : [];
    const a = item.answer as any;

    try {
      if (item.type === "mcq" && a?.type === "mcq" && Array.isArray(a.correctOptionIds)) {
        correct = a.correctOptionIds.length === arr.length && a.correctOptionIds.every((x: string) => arr.includes(x));
      } else if (item.type === "hotspot" && a?.type === "hotspot" && Array.isArray(a.correctRegionIds)) {
        correct = a.correctRegionIds.length === arr.length && a.correctRegionIds.every((x: string) => arr.includes(x));
      } else if (item.type === "gap-fill" && a?.type === "gap" && a.acceptedByIndex) {
        correct = arr.every((val, i) =>
          Array.isArray(a.acceptedByIndex[i]) &&
          a.acceptedByIndex[i].some((s: string) => s.toLowerCase().trim() === String(val ?? "").toLowerCase().trim())
        );
      }
      // (others use end-of-quiz scoring; safe default for now)
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
      case "mcq": return <MCQ item={it} value={arr} onChange={(nv) => setVal(it.id, nv)} />;
      case "gap-fill": return <GapFill item={it} value={arr} onChange={(nv) => setVal(it.id, nv)} />;
      case "order": return <Orderer item={it} value={arr} onChange={(nv) => setVal(it.id, nv)} />;
      case "token-select": return <TokenSelect item={it} value={arr} onChange={(nv) => setVal(it.id, nv)} />;
      case "match": return <MatchPairs item={it} value={arr} onChange={(nv) => setVal(it.id, nv)} />;
      case "word-order": return <WordOrder item={it} value={arr} onChange={(nv) => setVal(it.id, nv)} />;
      case "bank-fill": return <BankFill item={it} value={arr} onChange={(nv) => setVal(it.id, nv)} />;
      case "dropdown-fill": return <DropdownFill item={it} value={arr} onChange={(nv) => setVal(it.id, nv)} />;
      case "hotspot": return <Hotspot item={it} value={arr} onChange={(nv) => setVal(it.id, nv)} />;
      default: return <p>Unsupported type: {it.type}</p>;
    }
  };

  const answered = isAnswered(item, answers[item.id]);

  return (
    <div className={s.wrapper}>
      <div className={s.title}>{quiz.title}</div>

      <div className={s.card}>
        {render(item)}
        <div className={s.controls}>
          <button className={s.navBtn} onClick={() => setStep((n) => Math.max(0, n - 1))} disabled={step === 0}>Back</button>
          <button className={s.checkBtn} onClick={onCheck} disabled={!answered}>Check</button>
          <button className={s.navBtn} onClick={() => setStep((n) => Math.min(total - 1, n + 1))} disabled={step >= total - 1}>Next</button>
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
