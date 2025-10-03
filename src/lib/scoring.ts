import { Quiz } from "./quiz";

// All responses are string arrays keyed by item id.
// - For bank-fill & dropdown-fill: index i of the array = blank i (value is tokenId / optionId)
export type ResponseMap = Record<string, string[] | undefined>;

export function scoreQuiz(quiz: Quiz, responses: ResponseMap) {
  let total = 0, earned = 0;

  for (const item of quiz.items) {
    const pts = item.points ?? 1;
    total += pts;
    const r = responses[item.id] ?? [];
    const a = item.answer;

    let gain = 0;

    if (a.type === "mcq") {
      const correct = new Set(a.correctOptionIds);
      const chosen = new Set(r);
      gain = (correct.size === chosen.size && [...correct].every(id => chosen.has(id))) ? pts : 0;
    }

    if (a.type === "gap") {
      const gaps = item.gaps ?? [];
      let ok = 0;
      gaps.forEach((g, i) => {
        const t = (r[i] ?? "").trim().toLowerCase();
        const acc = (a.acceptedByIndex[i] ?? g.accepted ?? []).map(s => s.trim().toLowerCase());
        if (acc.includes(t)) ok++;
      });
      gain = quiz.scoring?.partialCredit ? (ok / Math.max(1, gaps.length)) * pts : (ok === gaps.length ? pts : 0);
    }

    if (a.type === "order") {
      const correct = a.correctOrder;
      const inPlace = correct.reduce((c, id, i) => c + (r[i] === id ? 1 : 0), 0);
      gain = quiz.scoring?.partialCredit ? (inPlace / Math.max(1, correct.length)) * pts : (inPlace === correct.length ? pts : 0);
    }

    if (a.type === "tokens") {
      const correct = new Set(a.correctTokenIds);
      const chosen = new Set(r);
      if (quiz.scoring?.partialCredit) {
        const hits = [...chosen].filter(x => correct.has(x)).length;
        const wrong = [...chosen].filter(x => !correct.has(x)).length;
        const frac = Math.max(0, (hits - wrong) / Math.max(1, correct.size));
        gain = frac * pts;
      } else {
        gain = (correct.size === chosen.size && [...correct].every(x => chosen.has(x))) ? pts : 0;
      }
    }

    if (a.type === "match") {
      const correctPairs = new Set(a.pairs.map(([L, R]) => `${L}:${R}`));
      const totalPairs = a.pairs.length;
      const userPairs = new Set(r);
      const hits = [...userPairs].filter(p => correctPairs.has(p)).length;
      gain = quiz.scoring?.partialCredit ? (hits / Math.max(1, totalPairs)) * pts : (hits === totalPairs ? pts : 0);
    }

    if (a.type === "word-order") {
      const correct = a.correctOrder;
      const inPlace = correct.reduce((c, id, i) => c + (r[i] === id ? 1 : 0), 0);
      gain = quiz.scoring?.partialCredit ? (inPlace / Math.max(1, correct.length)) * pts : (inPlace === correct.length ? pts : 0);
    }

    if (a.type === "bank") {
      const blanks = Object.keys(a.correctTokenIdByIndex).length;
      let ok = 0;
      for (const [k, arr] of Object.entries(a.correctTokenIdByIndex)) {
        const i = Number(k);
        const chosen = r[i] ?? "";
        const accepted = arr ?? [];
        if (accepted.includes(chosen)) ok++;
      }
      gain = quiz.scoring?.partialCredit ? (ok / Math.max(1, blanks)) * pts : (ok === blanks ? pts : 0);
    }

    if (a.type === "dropdown") {
      const blanks = Object.keys(a.correctOptionIdByIndex).length;
      let ok = 0;
      for (const [k, id] of Object.entries(a.correctOptionIdByIndex)) {
        const i = Number(k);
        if ((r[i] ?? "") === id) ok++;
      }
      gain = quiz.scoring?.partialCredit ? (ok / Math.max(1, blanks)) * pts : (ok === blanks ? pts : 0);
    }

    if (a.type === "hotspot") {
  const correct = new Set(a.correctRegionIds);
  const chosen = new Set(r);
  if (quiz.scoring?.partialCredit) {
    const hits = [...chosen].filter(x => correct.has(x)).length;
    const wrong = [...chosen].filter(x => !correct.has(x)).length;
    const frac = Math.max(0, (hits - wrong) / Math.max(1, correct.size));
    gain = frac * pts;
  } else {
    gain = (correct.size === chosen.size && [...correct].every(x => chosen.has(x))) ? pts : 0;
  }
}


    earned += gain;
  }

  return { earned, total, pct: total ? Math.round((earned / total) * 100) : 0 };
}


