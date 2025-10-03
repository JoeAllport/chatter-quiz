"use client";
import { QuizItem } from "@/lib/quiz";
import s from "./OptionBars.module.css";

/* ---- MCQ with option bars ---- */
export function MCQ({
  item, value = [], onChange
}:{ item: QuizItem; value?: string[]; onChange:(v:string[])=>void }) {
  const multi = item.answer.type === "mcq" && item.answer.correctOptionIds.length > 1;

  const toggle = (id: string) => {
    if (multi) {
      const set = new Set(value);
      set.has(id) ? set.delete(id) : set.add(id);
      onChange([...set]);
    } else {
      onChange([id]);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLButtonElement>, id: string) => {
    if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(id); }
  };

  return (
    <div>
// inside MCQ()
{item.prompt ? <p className={s.prompt} dangerouslySetInnerHTML={{ __html: item.prompt }} /> : null}
      {multi && <div className={s.multiNote}>Select all that apply</div>}

      <div className={s.list} role={multi ? "group" : "radiogroup"} aria-label="options">
        {item.options?.map((opt) => {
          const selected = value.includes(opt.id);
          return (
            <button
              key={opt.id}
              type="button"
              className={`${s.bar} ${selected ? s.selected : ""}`}
              onClick={() => toggle(opt.id)}
              onKeyDown={(e) => onKey(e, opt.id)}
              aria-pressed={selected}
              role={multi ? "checkbox" : "radio"}
              aria-checked={selected}
            >
              {opt.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---- Gap fill ---- */
export function GapFill({
  item, value = [], onChange
}:{ item: QuizItem; value?: string[]; onChange:(v:string[])=>void }) {
  const parts = (item.body ?? "").split("___");
  const gaps = item.gaps ?? [];

  return (
    <p>
      {parts.map((chunk, i) => (
        <span key={i}>
          {chunk}
          {i < gaps.length && (
            <input
              aria-label={`gap ${i+1}`}
              className={s.gapInput}
              value={value[i] ?? ""}
              onChange={(e) => {
                const next = [...(value ?? [])];
                next[i] = e.currentTarget.value;
                onChange(next);
              }}
            />
          )}
        </span>
      ))}
    </p>
  );
}
