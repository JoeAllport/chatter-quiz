import { Quiz } from "./quiz";

export function scoreQuiz(quiz: Quiz, responses: Record<string, any>) {
  let total = 0, earned = 0;

  for (const item of quiz.items) {
    const pts = item.points ?? 1;
    total += pts;

    const r = responses[item.id];
    const a = item.answer;
    if (!a) continue;

    let gain = 0;

    if (a.type === "mcq") {
      const correct = new Set(a.correctOptionIds);
      const chosen = new Set<string>(r ?? []);
      gain = (correct.size === chosen.size && [...correct].every(id => chosen.has(id))) ? pts : 0;
    }

    if (a.type === "gap") {
      const gaps = item.gaps ?? [];
      let ok = 0;
      gaps.forEach((g, i) => {
        const t = (r?.[i] ?? "").trim().toLowerCase();
        const acc = (a.acceptedByIndex[i] ?? g.accepted ?? []).map(s => s.trim().toLowerCase());
        if (acc.includes(t)) ok++;
      });
      gain = quiz.scoring?.partialCredit ? (ok / gaps.length) * pts : (ok === gaps.length ? pts : 0);
    }

    earned += gain;
  }

  return { earned, total, pct: total ? Math.round((earned / total) * 100) : 0 };
}
