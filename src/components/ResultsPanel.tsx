"use client";
import React from "react";
import s from "./ResultsPanel.module.css";
import type { Quiz, QuizItem } from "@/lib/quiz";
import EmailModal from "./EmailModal";

type ScoreLine = { id: string; correct: boolean; points: number; earned: number };

function getPoints(it: QuizItem) {
  return (it as { points?: number }).points ?? 1;
}
function eqSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const A = [...a].sort(), B = [...b].sort();
  return A.every((x, i) => x === B[i]);
}
function eqSeq(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function scoreItem(it: QuizItem, given: string[] | undefined): ScoreLine {
  const v = Array.isArray(given) ? given : [];
  let correct = false;

  if (it.type === "mcq") {
    const ids = (it.answer as { correctOptionIds?: string[] }).correctOptionIds ?? [];
    correct = eqSet(v, ids);
  } else if (it.type === "gap-fill") {
    const byIndex = (it.answer as { acceptedByIndex?: Record<number, string[]> }).acceptedByIndex ?? {};
    correct = v.every((val, i) => {
      const bucket = byIndex[i];
      if (!Array.isArray(bucket)) return false;
      const norm = String(val ?? "").toLowerCase().trim();
      return bucket.some((s) => String(s).toLowerCase().trim() === norm);
    });
  } else if (it.type === "order") {
    const ids = (it.answer as { correctOrder?: string[] }).correctOrder ?? [];
    correct = eqSeq(v, ids);
  } else if (it.type === "token-select") {
    const ids = (it.answer as { correctTokenIds?: string[] }).correctTokenIds ?? [];
    correct = eqSet(v, ids);
  } else if (it.type === "match") {
    const pairs = (it.answer as { pairs?: [string, string][] }).pairs ?? [];
    const expected = pairs.map(([l, r]) => `${l}::${r}`);
    correct = eqSet(v.map(String), expected);
  } else if (it.type === "word-order") {
    const ids = (it.answer as { correctOrder?: string[] }).correctOrder ?? [];
    correct = eqSeq(v, ids);
  } else if (it.type === "bank-fill") {
    const byIndex = (it.answer as { correctTokenIdByIndex?: Record<number, string | string[]> }).correctTokenIdByIndex ?? {};
    correct = v.every((val, i) => {
      const bucket = byIndex[i];
      return Array.isArray(bucket) ? bucket.includes(String(val)) : String(val) === String(bucket);
    });
  } else if (it.type === "dropdown-fill") {
    const byIndex = (it.answer as { correctOptionIdByIndex?: Record<number, string> }).correctOptionIdByIndex ?? {};
    correct = v.every((val, i) => String(val) === String(byIndex[i]));
  } else if (it.type === "hotspot") {
    const ids = (it.answer as { correctRegionIds?: string[] }).correctRegionIds ?? [];
    correct = eqSet(v, ids);
  }

  const points = getPoints(it);
  return { id: it.id, correct, points, earned: correct ? points : 0 };
}

function scoreQuiz(quiz: Quiz, answers: Record<string, unknown>) {
  const items = Array.isArray(quiz.items) ? quiz.items : [];
  const lines = items.map((it) => scoreItem(it, (answers[it.id] as string[]) ?? []));
  const total = lines.reduce((s, l) => s + l.points, 0);
  const earned = lines.reduce((s, l) => s + l.earned, 0);
  return { total, earned, lines };
}

export default function ResultsPanel({
  quiz,
  answers,
  onRestart,
}: {
  quiz: Quiz;
  answers: Record<string, unknown>;
  onRestart: () => void;
}) {
  const { total, earned, lines } = React.useMemo(() => scoreQuiz(quiz, answers), [quiz, answers]);
  const pct = Math.round((earned / Math.max(1, total)) * 100);

  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "saving" | "ok" | "err">("idle");
  const [msg, setMsg] = React.useState("");
  const [openModal, setOpenModal] = React.useState(false);

  <form className={s.form} onSubmit={(e) => { e.preventDefault(); subscribe(); }}>
  <input
    className={s.input}
    type="email"
    placeholder="Your email for weekly review"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    required
  />
  <button
    type="button"
    className={`${s.btn} ${s.primary}`}
    onClick={() => setOpenModal(true)}
  >
    Get weekly review
  </button>
  {state === "ok" && <div className={s.success}>{msg}</div>}
  {state === "err" && <div className={s.error}>{msg}</div>}
  <div className={s.help}>Press Enter to submit here, or use the pop-up.</div>
</form>


  async function subscribe() {
    setState("saving"); setMsg("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email, quizId: quiz.id, score: earned, total, answers,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setState("ok"); setMsg("Thanks! You’re on the list for weekly reviews.");
    } catch (e) {
      setState("err"); setMsg(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <div className={s.wrap}>
      <div className={s.head}>
        <div className={s.title}>Results</div>
        <div className={s.meta}>{quiz.title}</div>
      </div>

      <div className={s.score}>
        <div className={s.badge}>{earned} / {total}</div>
        <div className={s.subtle}>{pct}%</div>
      </div>

      <table className={s.table}>
        <tbody>
          {lines.map((l, i) => (
            <tr className={s.row} key={l.id}>
              <td className={s.cell}>Q{i + 1}</td>
              <td className={s.cell}>{l.id}</td>
              <td className={s.cell}>{l.points} pt</td>
              <td className={s.cell}>{l.correct ? <span className={s.ok}>Correct</span> : <span className={s.bad}>Incorrect</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className={s.actions}>
        <button className={`${s.btn} ${s.ghost}`} onClick={onRestart}>Restart</button>

        <form className={s.form} onSubmit={(e) => { e.preventDefault(); subscribe(); }}>
          <input
            className={s.input}
            type="email"
            placeholder="Your email for weekly review"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className={`${s.btn} ${s.primary}`} disabled={state === "saving"}>
            {state === "saving" ? "Saving…" : "Get weekly review"}
          </button>
          {state === "ok" && <div className={s.success}>{msg}</div>}
          {state === "err" && <div className={s.error}>{msg}</div>}
          <div className={s.help}>We’ll send tips & a recap once a week. Unsubscribe anytime.</div>
        </form>
      </div>
    </div>
  );
  <EmailModal
  open={openModal}
  defaultEmail={email}
  quizId={quiz.id}
  earned={earned}
  total={total}
  answers={answers}
  onClose={() => setOpenModal(false)}
/>
}
