"use client";
import s from "./FeedbackPanel.module.css";
import { QuizItem, Media } from "@/lib/quiz";

type PerOptionEntry = { text?: string; media?: Media[] };
type PerGapEntry = { text?: string; media?: Media[] };

export function FeedbackPanel({
  item,
  value,
  correct,
  premiumUnlocked = true,
}: {
  item: QuizItem;
  value: string[] | undefined;
  correct: boolean;
  premiumUnlocked?: boolean;
}) {
  const fb = item.feedback;
  if (!fb) return null;

  if (fb.premium && !premiumUnlocked) {
    return (
      <div className={s.wrap}>
        <div className={s.head}><span className={s.badge}>Premium</span> Feedback</div>
        <div className={s.lock}>Upgrade to view explanations and media for this question.</div>
      </div>
    );
  }

  const head = correct ? (fb.correct ?? "Great work!") : (fb.incorrect ?? "Not quite.");
  const showPerOption = item.type === "mcq" && fb.perOption && Array.isArray(value);
  const showPerGap = item.type === "gap-fill" && fb.perGap && Array.isArray(value);

  return (
    <div className={s.wrap}>
      <div className={s.head}>{head}</div>

      {fb.explanation && <div className={s.text} dangerouslySetInnerHTML={{ __html: fb.explanation }} />}

      {showPerOption && (
        <div className={s.text}>
          {value!.map((optId) => {
            const entry = fb.perOption![optId] as PerOptionEntry | undefined;
            if (!entry) return null;
            return (
              <div key={optId} style={{ marginBottom: 8 }}>
                <div className={s.badge}>Your choice</div> {entry.text}
                {entry.media && <MediaGrid media={entry.media} />}
              </div>
            );
          })}
        </div>
      )}

      {showPerGap && (
        <div className={s.text}>
          {Object.entries(fb.perGap!).map(([idx, row]) => {
            const entry = row as PerGapEntry | undefined;
            if (!entry) return null;
            const user = (value?.[Number(idx)] ?? "").toString();
            return (
              <div key={idx} style={{ marginBottom: 8 }}>
                <div className={s.badge}>Gap {Number(idx) + 1}</div> {entry.text}
                <div className={s.subtle}>You wrote: <code>{user || "—"}</code></div>
                {entry.media && <MediaGrid media={entry.media} />}
              </div>
            );
          })}
        </div>
      )}

      {fb.media && <MediaGrid media={fb.media} />}
    </div>
  );
}

function MediaGrid({ media }: { media: NonNullable<QuizItem["feedback"]>["media"] }) {
  if (!media?.length) return null;
  return (
    <div className={s.mediaGrid}>
      {media.map((m, i) => {
        if (m.kind === "image" || m.kind === "gif") {
          return (
            <figure className={s.mediaItem} key={i}>
              <img src={m.src} alt={m.alt ?? ""} loading="lazy" width={m.width} height={m.height} />
              {m.alt && <figcaption className={s.caption}>{m.alt}</figcaption>}
            </figure>
          );
        }
        if (m.kind === "audio") {
          return (
            <figure className={s.mediaItem} key={i} style={{ padding: 10 }}>
              <audio controls preload="none" style={{ width: "100%" }}>
                <source src={m.src} />
              </audio>
              {m.caption && <figcaption className={s.caption}>{m.caption}</figcaption>}
            </figure>
          );
        }
        if (m.kind === "video") {
          return (
            <figure className={s.mediaItem} key={i}>
              <video controls preload="none" poster={m.poster} style={{ width: "100%", display: "block" }}>
                <source src={m.src} />
              </video>
            </figure>
          );
        }
        return null;
      })}
    </div>
  );
}
