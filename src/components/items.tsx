// src/components/items.tsx
"use client";

import React, { useEffect, useMemo } from "react";
import { QuizItem, HotspotRegion } from "@/lib/quiz";
import s from "./OptionBars.module.css";

/* ---------- MCQ (bars) ---------- */
export function MCQ({
  item, value = [], onChange
}: { item: QuizItem; value?: string[]; onChange:(v:string[])=>void }) {
  const multi =
    item.answer.type === "mcq" &&
    item.answer.correctOptionIds.length > 1;

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
      {item.prompt ? (
        <p className={s.prompt} dangerouslySetInnerHTML={{ __html: item.prompt }} />
      ) : null}
      {multi ? <div className={s.multiNote}>Select all that apply</div> : null}

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

/* ---------- Gap fill (typed) ---------- */
export function GapFill({
  item, value = [], onChange
}: { item: QuizItem; value?: string[]; onChange:(v:string[])=>void }) {
  const parts = (item.body ?? "").split("___");
  const gaps = item.gaps ?? [];

  return (
    <p>
      {parts.map((chunk, i) => (
        <span key={i}>
          {chunk}
          {i < gaps.length ? (
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
          ) : null}
        </span>
      ))}
    </p>
  );
}

/* ---------- Orderer (drag to reorder) ---------- */
export function Orderer({
  item, value = [], onChange
}: { item: QuizItem; value?: string[]; onChange:(v:string[])=>void }) {
  const segs = useMemo(() => item.segments ?? [], [item.segments]);

  // Initialize once with the given order if empty
  useEffect(() => {
    if ((!value || value.length === 0) && segs.length) {
      onChange(segs.map(sg => sg.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segs.length]);

  const current = useMemo(
    () => (value?.length ? value : segs.map(sg => sg.id)),
    [value, segs]
  );

  const [dragId, setDragId] = React.useState<string | null>(null);
  const [overId, setOverId] = React.useState<string | null>(null);

  const onDragStart = (id: string, ev: React.DragEvent) => {
    setDragId(id);
    ev.dataTransfer.setData("text/plain", id);
    ev.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (id: string, ev: React.DragEvent) => {
    ev.preventDefault(); // allow drop
    setOverId(id);
  };
  const onDragLeave = () => setOverId(null);
  const onDrop = (id: string, ev: React.DragEvent) => {
    ev.preventDefault();
    setOverId(null);
    const src = dragId ?? ev.dataTransfer.getData("text/plain");
    if (!src || src === id) return;
    const next = [...current];
    const from = next.indexOf(src);
    const to = next.indexOf(id);
    if (from === -1 || to === -1) return;
    next.splice(to, 0, next.splice(from, 1)[0]);
    onChange(next);
  };
  const onDragEnd = () => { setDragId(null); setOverId(null); };

  return (
    <div className={s.list}>
      {current.map((id) => {
        const sg = segs.find(x => x.id === id);
        if (!sg) return null;
        const dragging = dragId === id;
        const hovering = overId === id && !dragging;
        return (
          <div
            key={id}
            className={`${s.bar} ${dragging ? s.dragging : ""} ${hovering ? s.dropHover : ""}`}
            draggable
            onDragStart={(e) => onDragStart(id, e)}
            onDragOver={(e) => onDragOver(id, e)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(id, e)}
            onDragEnd={onDragEnd}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <span className={s.dragHandle} aria-hidden>⋮⋮</span>
            <div style={{ flex: 1 }}>{sg.text}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- TokenSelect (tap words) ---------- */
export function TokenSelect({
  item, value = [], onChange
}: { item: QuizItem; value?: string[]; onChange:(v:string[])=>void }) {
  const tokens = (item.tokens && item.tokens.length)
    ? item.tokens
    : (item.text ?? "").split(/\s+/).filter(Boolean).map((t, i) => ({ id: String(i), text: t }));

  const single = (item.selectMode ?? "single") === "single";

  const toggle = (id: string) => {
    if (single) {
      onChange(value.includes(id) ? [] : [id]);
    } else {
      const set = new Set(value);
      set.has(id) ? set.delete(id) : set.add(id);
      onChange([...set]);
    }
  };

  return (
    <p>
      {tokens.map((tk, i) => {
        const sel = value.includes(tk.id);
        return (
          <button
            key={tk.id}
            type="button"
            className={`${s.token} ${sel ? s.tokenOn : ""}`}
            aria-pressed={sel}
            onClick={() => toggle(tk.id)}
          >
            {tk.text}{i < tokens.length - 1 ? " " : ""}
          </button>
        );
      })}
    </p>
  );
}

/* ---------- MatchPairs (drag right → left with instant correctness) ---------- */
export function MatchPairs({
  item, value = [], onChange
}: { item: QuizItem; value?: string[]; onChange:(v:string[])=>void }) {
  const left = item.left ?? [];
  const right = item.right ?? [];
  const answerPairs = new Set(
    item.answer.type === "match" ? item.answer.pairs.map(([L,R]) => `${L}:${R}`) : []
  );

  // current matches map left->right
  const pairs = new Map<string, string>();
  for (const p of value) {
    const [L, R] = p.split(":");
    if (L && R) pairs.set(L, R);
  }
  const usedRight = new Set([...pairs.values()]);

  const [dragRight, setDragRight] = React.useState<string | null>(null);
  const [hoverLeft, setHoverLeft] = React.useState<string | null>(null);
  const [wrongLeft, setWrongLeft] = React.useState<string | null>(null);

  const handleDragStartRight = (rid: string, ev: React.DragEvent) => {
    setDragRight(rid);
    ev.dataTransfer.setData("text/plain", rid);
    ev.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverLeft = (lid: string, ev: React.DragEvent) => {
    ev.preventDefault();
    setHoverLeft(lid);
  };
  const handleDragLeaveLeft = () => setHoverLeft(null);

  const commitPair = (lid: string, rid: string) => {
    const key = `${lid}:${rid}`;
    const isCorrect = answerPairs.has(key);
    if (!isCorrect) {
      setWrongLeft(lid);
      setTimeout(() => setWrongLeft(null), 320);
      return;
    }
    const next = new Map(pairs);
    // ensure R is unique
    for (const [L2, R2] of next.entries()) {
      if (R2 === rid) next.delete(L2);
    }
    next.set(lid, rid);
    onChange([...next.entries()].map(([L,R]) => `${L}:${R}`));
  };

  const handleDropLeft = (lid: string, ev: React.DragEvent) => {
    ev.preventDefault();
    setHoverLeft(null);
    const rid = dragRight ?? ev.dataTransfer.getData("text/plain");
    if (!rid) return;
    commitPair(lid, rid);
    setDragRight(null);
  };

  const unmatch = (lid: string) => {
    const next = new Map(pairs);
    next.delete(lid);
    onChange([...next.entries()].map(([L,R]) => `${L}:${R}`));
  };

  return (
    <div className={s.columns}>
      <div className={s.col}>
        {left.map((L) => {
          const matchedRight = pairs.get(L.id);
          const isCorrectLocked = matchedRight ? answerPairs.has(`${L.id}:${matchedRight}`) : false;
          const cls =
            `${s.bar} ${hoverLeft === L.id ? s.dropHover : ""} ${isCorrectLocked ? s.correct : ""} ${wrongLeft === L.id ? s.wrongFlash : ""}`;
          return (
            <div
              key={L.id}
              className={cls}
              onDragOver={(e) => handleDragOverLeft(L.id, e)}
              onDragLeave={handleDragLeaveLeft}
              onDrop={(e) => handleDropLeft(L.id, e)}
              aria-label={`Drop on ${L.text}`}
              style={{ display:"flex", alignItems:"center", gap:8 }}
            >
              <div style={{ flex:1 }}>{L.text}</div>
              {isCorrectLocked ? <span className={s.badgeOk}>✓ matched</span> : null}
              {matchedRight ? (
                <button type="button" className={s.smallBtn} onClick={() => unmatch(L.id)} aria-label="Unmatch">✕</button>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className={s.col}>
        {right.map((R) => {
          const taken = usedRight.has(R.id);
          return (
            <div
              key={R.id}
              className={`${s.bar} ${taken ? s.dim : ""}`}
              draggable={!taken}
              onDragStart={(e) => !taken && handleDragStartRight(R.id, e)}
              aria-label={`Drag ${R.text}`}
            >
              <span className={s.dragHandle} aria-hidden>⋮</span>
              {R.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- WordOrder (reorder chips to form a sentence) ---------- */
export function WordOrder({
  item, value = [], onChange
}: { item: QuizItem; value?: string[]; onChange:(v:string[])=>void }) {
  const base = (item.words && item.words.length)
    ? item.words
    : (item.text ?? "").split(/\s+/).filter(Boolean).map((t,i)=>({id:String(i), text:t}));

  useEffect(() => {
    if ((!value || value.length === 0) && base.length) {
      onChange(base.map(w => w.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base.length]);

  const current = useMemo(() => (value?.length ? value : base.map(w => w.id)), [value, base]);
  const [drag, setDrag] = React.useState<string | null>(null);

  const onDropBefore = (targetId: string, ev: React.DragEvent) => {
    ev.preventDefault();
    const src = drag ?? ev.dataTransfer.getData("text/plain");
    if (!src) return;
    const next = [...current];
    const from = next.indexOf(src);
    const to = next.indexOf(targetId);
    if (from === -1 || to === -1) return;
    next.splice(to, 0, next.splice(from, 1)[0]);
    onChange(next);
    setDrag(null);
  };

  return (
    <div>
      <div style={{ display:"flex", flexWrap:"wrap", gap: 6 }}>
        {current.map((id, idx) => {
          const w = base.find(x => x.id === id);
          if (!w) return null;
          return (
            <span
              key={id}
              className={`${s.token} ${drag===id ? s.dragging : ""}`}
              draggable
              onDragStart={(e)=>{ setDrag(id); e.dataTransfer.setData("text/plain", id); }}
              onDragEnd={()=> setDrag(null)}
              onDragOver={(e)=> e.preventDefault()}
              onDrop={(e)=> onDropBefore(id, e)}
              onClick={()=>{
                if (idx < current.length - 1) {
                  const next = [...current];
                  [next[idx], next[idx+1]] = [next[idx+1], next[idx]];
                  onChange(next);
                }
              }}
              style={{ padding:"6px 10px" }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- BankFill (drag words from bank into ___ blanks) ---------- */
export function BankFill({
  item, value = [], onChange
}: { item: QuizItem; value?: string[]; onChange:(v:string[])=>void }) {
  const parts = (item.body ?? "").split("___");
  const blanks = parts.length - 1;
  const bank = item.bank ?? [];

  const dropTo = (i: number, id: string) => {
    const next = [...(value ?? new Array(blanks).fill(""))];
    // ensure uniqueness: clear previous location of this token
    for (let j=0;j<blanks;j++) if (next[j] === id) next[j] = "";
    next[i] = id;
    onChange(next);
  };

  const onDropBlank = (i:number, ev:React.DragEvent) => {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text/plain");
    if (id) dropTo(i, id);
  };

  const chosen = new Set(value.filter(Boolean));

  return (
    <div>
      <p>
        {parts.map((chunk, i) => (
          <span key={i} style={{ display:"inline" }}>
            {chunk}
            {i < blanks ? (
              <span
                onDragOver={(e)=> e.preventDefault()}
                onDrop={(e)=> onDropBlank(i, e)}
                className={s.blank}
                aria-label={`blank ${i+1}`}
              >
                {value[i] ? (
                  <button
                    type="button"
                    className={`${s.token} ${s.tokenOn}`}
                    onClick={() => {
                      const next = [...(value ?? [])];
                      next[i] = "";
                      onChange(next);
                    }}
                  >
                    {bank.find(b => b.id === value[i])?.text ?? "—"}
                  </button>
                ) : (
                  <span className={s.placeholder}>drop here</span>
                )}
              </span>
            ) : null}
          </span>
        ))}
      </p>

      <div className={s.bank}>
        {bank.map((b) => {
          const used = chosen.has(b.id);
          return (
            <div
              key={b.id}
              className={`${s.chip} ${used ? s.dim : ""}`}
              draggable={!used}
              onDragStart={(e)=> { e.dataTransfer.setData("text/plain", b.id); }}
              onClick={()=> {
                const i = (value ?? []).findIndex(v => !v);
                if (i >= 0 && !used) dropTo(i, b.id);
              }}
              title={used ? "Used" : "Drag to a blank or click to place"}
            >
              {b.text}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- DropdownFill (select options for each ___) ---------- */
export function DropdownFill({
  item, value = [], onChange
}: { item: QuizItem; value?: string[]; onChange:(v:string[])=>void }) {
  const parts = (item.body ?? "").split("___");
  const blanks = parts.length - 1;

  return (
    <p>
      {parts.map((chunk, i) => (
        <span key={i}>
          {chunk}
          {i < blanks ? (
            <select
              className={s.select}
              aria-label={`blank ${i+1}`}
              value={value[i] ?? ""}
              onChange={(e) => {
                const next = [...(value ?? [])];
                next[i] = e.currentTarget.value;
                onChange(next);
              }}
            >
              <option value="">— choose —</option>
              {(item.optionsByIndex?.[i] ?? []).map(opt => (
                <option key={opt.id} value={opt.id}>{opt.text}</option>
              ))}
            </select>
          ) : null}
        </span>
      ))}
    </p>
  );
}

/* ---------- Hotspot (click regions on image) ---------- */
export function Hotspot({
  item, value = [], onChange
}: { item: QuizItem; value?: string[]; onChange:(v:string[])=>void }) {
  const img = item.hotspotImage;
  const regions = item.regions ?? [];
  const single = (item.selectMode ?? "single") === "single";
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el || !img) return;
    const update = () => {
      const w = el.clientWidth || img.width;
      setScale(w / img.width);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [img]);

  const toggle = (id: string) => {
    if (single) onChange(value?.includes(id) ? [] : [id]);
    else {
      const set = new Set(value);
      set.has(id) ? set.delete(id) : set.add(id);
      onChange([...set]);
    }
  };

  const renderRegion = (r: HotspotRegion) => {
    const selected = value?.includes(r.id);
    if (r.shape === "rect") {
      const style: React.CSSProperties = {
        position: "absolute",
        left: r.x * scale,
        top: r.y * scale,
        width: r.w * scale,
        height: r.h * scale,
        borderRadius: 10,
      };
      return (
        <button
          key={r.id}
          type="button"
          className={`${s.hotBtn} ${selected ? s.hotOn : ""}`}
          style={style}
          aria-pressed={selected}
          aria-label={r.label ?? "region"}
          onClick={() => toggle(r.id)}
        />
      );
    }
    const d = r.r * 2 * scale;
    const style: React.CSSProperties = {
      position: "absolute",
      left: (r.cx - r.r) * scale,
      top: (r.cy - r.r) * scale,
      width: d,
      height: d,
      borderRadius: "50%"
    };
    return (
      <button
        key={r.id}
        type="button"
        className={`${s.hotBtn} ${selected ? s.hotOn : ""}`}
        style={style}
        aria-pressed={selected}
        aria-label={r.label ?? "region"}
        onClick={() => toggle(r.id)}
      />
    );
  };

  return (
    <div>
      {item.prompt ? (
        <p className={s.prompt} dangerouslySetInnerHTML={{ __html: item.prompt }} />
      ) : null}

      <div className={s.hotWrap} ref={wrapRef} style={{ aspectRatio: img ? `${img.width}/${img.height}` : undefined }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={img?.src ?? ""}
          alt={img?.alt ?? ""}
          className={s.hotImg}
          onLoad={() => {
            const el = wrapRef.current;
            if (!el || !img) return;
            const w = el.clientWidth || img.width;
            setScale(w / img.width);
          }}
        />
        {regions.map(renderRegion)}
      </div>
    </div>
  );
}

export { }
