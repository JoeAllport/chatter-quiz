"use client";
import * as React from "react";
import s from "./EmailModal.module.css";

type Props = {
  open: boolean;
  defaultEmail?: string;
  quizId: string;
  earned: number;
  total: number;
  answers: Record<string, unknown>;
  onClose: () => void;
};

export default function EmailModal({
  open, defaultEmail, quizId, earned, total, answers, onClose
}: Props) {
  const [email, setEmail] = React.useState(defaultEmail ?? "");
  const [state, setState] = React.useState<"idle" | "saving" | "ok" | "err">("idle");
  const [msg, setMsg] = React.useState("");

  React.useEffect(() => { setEmail(defaultEmail ?? ""); }, [defaultEmail]);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function subscribe() {
    setState("saving"); setMsg("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, quizId, score: earned, total, answers }),
      });
      if (!res.ok) throw new Error(await res.text());
      setState("ok"); setMsg("Nice! You’ll get your weekly review 🎉");
    } catch (e) {
      setState("err"); setMsg(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <div className={s.overlay} role="dialog" aria-modal="true" aria-label="Signup">
      <div className={s.modal}>
        <button className={s.close} onClick={onClose} aria-label="Close">✕</button>
        <div className={s.h}>
          <div className={s.emoji}>🏅</div>
          <div className={s.title}>Great work!</div>
        </div>
        <div className={s.copy}>
          You scored <strong>{earned} / {total}</strong>. Pop your email in and we’ll send a short weekly review to keep the streak going.
        </div>
        <form className={s.form} onSubmit={(e) => { e.preventDefault(); subscribe(); }}>
          <input
            className={s.input}
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button className={s.primary} disabled={state === "saving"}>
            {state === "saving" ? "Saving…" : "Send me weekly reviews"}
          </button>
          {state === "ok" && <span className={s.stateOk}>{msg}</span>}
          {state === "err" && <span className={s.stateErr}>{msg}</span>}
        </form>
        <div className={s.meta}>Unsubscribe anytime. We’ll never share your email.</div>
      </div>
    </div>
  );
}
