import QuizRunner from "@/components/QuizRunner";
import type { Quiz, QuizItem } from "@/lib/quiz";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SourcePref = "auto" | "blob" | "local"; // kept for compatibility, but "local" is ignored

function getBlobBase() {
  const base = process.env.NEXT_PUBLIC_BLOB_BASE;
  if (!base) throw new Error("NEXT_PUBLIC_BLOB_BASE is not set on this deployment.");
  return base.replace(/\/+$/, "");
}

async function fetchText(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  return { ok: res.ok, status: res.status, ct: res.headers.get("content-type") ?? "", text };
}

function coerceAndValidate(parsed: unknown, slug: string):
  | { ok: true; data: Quiz }
  | { ok: false; reason: string } {
  // standard form: object with items[]
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.items)) return { ok: true, data: parsed as Quiz };
    const keys = Object.keys(obj).join(", ");
    return { ok: false, reason: `Missing "items" array. Top-level keys: [${keys}]` };
  }
  // reject arrays to enforce standard
  return { ok: false, reason: "Root must be an object with an `items` array (not a top-level array)." };
}

export default async function Page({
  params,
}: { params: { slug: string }; searchParams?: { source?: SourcePref } }) {
  const slug = params.slug;
  const base = getBlobBase();
  const url = `${base}/quizzes/${slug}.json`;

  const r = await fetchText(url);
  if (r.ok) {
    try {
      const parsed = JSON.parse(r.text);
      const v = coerceAndValidate(parsed, slug);
      if (v.ok) return <QuizRunner quiz={v.data} />;
      return diag(`Quiz “${slug}” invalid`, [
        `Blob: ${url}`,
        v.reason,
      ]);
    } catch (e) {
      return diag(`Quiz “${slug}” invalid JSON`, [
        `Blob: ${url}`,
        (e as Error).message,
        `Sample: ${r.text.slice(0, 200)}…`,
      ]);
    }
  }
  return diag(`Quiz “${slug}” not found`, [
    `Blob: ${url}`,
    `HTTP ${r.status} • ${r.ct}`,
    `Sample: ${r.text.slice(0, 200)}…`,
  ]);
}

function diag(title: string, lines: string[]) {
  return (
    <div style={{ padding: 24, lineHeight: 1.7, maxWidth: 900 }}>
      <h2>{title}</h2>
      <ul>{lines.map((l, i) => <li key={i}><code>{l}</code></li>)}</ul>
      <p>Ensure the Blob object path is <code>quizzes/&lt;slug&gt;.json</code> and the JSON has an <code>items</code> array.</p>
    </div>
  );
}
