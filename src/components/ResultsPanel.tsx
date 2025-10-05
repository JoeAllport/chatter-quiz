"use client";
import React from "react";
import s from "./ResultsPanel.module.css";
import type { Quiz, QuizItem } from "@/lib/quiz";

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
    const byIndex =
      "acceptedByIndex" in it.answer && it.answer.acceptedByIndex
        ? it.answer.acceptedByIndex
        : {};
    correct = v.every((val, i) => {
      const bucket = byIndex[i];
      if (!Array.isArray(bucket)) return false;
      const norm = String(val ?? "").toLowerCase().trim();
      return bucket.some((s) => String(s).toLowerCase().trim() === norm);
    });
  } else if (it.type === "order") {
    const ids =
      "correctOrder" in it.answer && Array.isArray(it.answer.correctOrder)
        ? it.answer.correctOrder
        : [];
    correct = eqSeq(v, ids);
  } else if (it.type === "token-select") {
    const ids =
      "correctTokenIds" in it.answer && Array.isArray(it.answer.correctTokenIds)
        ? it.answer.correctTokenIds
        : [];
    correct = eqSet(v, ids);
  } else if (it.type === "match") {
    const pairs = Array.isArray((it.answer as { pairs?: [string, string][] }).pairs)
      ? (it.answer as { pairs: [string, string][] }).pairs
      : [];
    const expected = pairs.map(([l, r]) => `${l}::${r}`);
    correct = eqSet(v.map(String), expected);
  } else if (it.type === "word-order") {
    const ids =
      "correctOrder" in it.answer && Array.isArray(it.answer.correctOrder)
        ? it.answer.correctOrder
        : [];
    correct = eqSeq(v, ids);
  } else if (it.type === "bank-fill") {
    let byIndex: Record<number, string[] | string> = {};
    if (
      it.answer &&
      typeof it.answer === "object" &&
      "correctTokenIdByIndex" in it.answer &&
      it.answer.correctTokenIdByIndex
    ) {
      byIndex = it.answer.correctTokenIdByIndex as Record<number, string[] | string>;
    }
    correct = v.every((val, i) => {
      const bucket = byIndex[i];
      return Array.isArray(bucket) ? bucket.includes(String(val)) : String(val) === String(bucket);
    });
  } else if (it.type === "dropdown-fill") {
    const byIndex =
      typeof it.answer === "object" && "correctOptionIdByIndex" in it.answer
        ? (it.answer as { correctOptionIdByIndex?: Record<number, string> }).correctOptionIdByIndex ?? {}
        : {};
    correct = v.every((val, i) => String(val) === String(byIndex[i]));
  } else if (it.type === "hotspot") {
    const ids =
      typeof it.answer === "object" && "correctRegionIds" in it.answer && Array.isArray((it.answer as { correctRegionIds?: string[] }).correctRegionIds)
        ? (it.answer as { correctRegionIds?: string[] }).correctRegionIds ?? []
        : [];
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

  // Staggered reveal for tiles (0.75s per tile), then reveal score
  const stepMs = 750;
  const [revealDone, setRevealDone] = React.useState(false);

  React.useEffect(() => {
    const t = setTimeout(() => {
      setRevealDone(true);
      if (typeof navigator !== "undefined" && "vibrate" in navigator && pct >= 80) {
        // small celebratory vibration pattern on capable devices
        (navigator as unknown as { vibrate: (pattern: number | number[]) => void })
          .vibrate([35, 70, 35]);
      }
    }, lines.length * stepMs + 250);
    return () => clearTimeout(t);
  }, [lines.length, stepMs, pct]);

  // Email subscribe (prominent inline)
  const [email, setEmail] = React.useState("");
  const [state, setState] = React.useState<"idle" | "saving" | "ok" | "err">("idle");
  const [msg, setMsg] = React.useState("");

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
      setState("ok"); setMsg("Nice! You’ll get your weekly review 🎉");
    } catch (e) {
      setState("err"); setMsg(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  // Optional celebration image from quiz meta
  const meta = (quiz as unknown as { meta?: { celebrationImage?: string } }).meta ?? {};
  const celebImg = meta.celebrationImage;

  return (
    <div className={s.wrap}>
      <div className={s.head}>
        <div className={s.title}>Results</div>
        <div className={s.meta}>{quiz.title}</div>
      </div>

      {/* Celebration */}
      <div className={s.celebrate}>
        {celebImg ? (
          <img src={celebImg} alt="Celebration" />
        ) : (
          <span className={s.emoji} aria-hidden>🎆</span>
        )}
        <div className={s.praise}>
          {pct >= 90 ? "Phenomenal!" : pct >= 75 ? "Great job!" : pct >= 50 ? "Nice work!" : "Good effort — keep going!"}
        </div>
      </div>

      {/* Animated tiles */}
      <div className={s.tiles} role="list" aria-label="Question results">
        {lines.map((l, i) => (
          <div
            role="listitem"
            key={l.id}
            className={`${s.tile} ${l.correct ? s.ok : s.bad}`}
            style={{ animationDelay: `${i * (stepMs / 1000)}s` }}
            aria-label={`Q${i + 1} ${l.correct ? "correct" : "incorrect"}`}
          />
        ))}
      </div>

      {/* Score reveal */}
      <div className={`${s.scoreBig} ${revealDone ? s.show : ""}`}>
        {earned} / {total} <span className={s.subtle}>({pct}%)</span>
      </div>

      {/* Actions + prominent email capture */}
      <div className={s.actions}>
        <button className={`${s.btn} ${s.ghost}`} onClick={onRestart}>Restart</button>
        <form className={s.cta} onSubmit={(e) => { e.preventDefault(); subscribe(); }}>
          <div className={s.ctaTitle}>Get a weekly review to stay sharp</div>
          <div className={s.row}>
            <input
              className={s.input}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button className={`${s.btn} ${s.primary}`} disabled={state === "saving"}>
              {state === "saving" ? "Saving…" : "Send it to me"}
            </button>
          </div>
          {state === "ok" && <div className={s.success}>{msg}</div>}
          {state === "err" && <div className={s.error}>{msg}</div>}
          <div className={s.help}>Unsubscribe anytime. We’ll never share your email.</div>
        </form>
      </div>
    </div>
  );
}
