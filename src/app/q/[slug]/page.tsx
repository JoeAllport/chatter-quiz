import QuizRunner from "@/components/QuizRunner";
import type { Quiz } from "@/lib/quiz";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SourcePref = "auto" | "blob" | "local";

async function getOrigin() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${proto}://${host}` : "";
}

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  const text = await res.text();
  return { ok: res.ok, status: res.status, ct: res.headers.get("content-type") ?? "", text };
}

function validateQuizShape(q: unknown): { ok: true; data: Quiz } | { ok: false; reason: string } {
  if (!q || typeof q !== "object") return { ok: false, reason: "Root is not an object" };
  const obj = q as Record<string, unknown>;
  const items = obj.items as unknown;
  if (!Array.isArray(items)) {
    const keys = Object.keys(obj).join(", ");
    return { ok: false, reason: `Missing "items" array. Top-level keys: [${keys}]` };
  }
  return { ok: true, data: q as Quiz };
}

export default async function Page({
  params, searchParams,
}: { params: { slug: string }, searchParams?: { source?: SourcePref } }) {
  const slug = params.slug;
  const pref = (searchParams?.source as SourcePref) ?? "auto";

  // 1) Try Blob first (unless ?source=local)
  let diag = { blobUrl: "", blobStatus: 0, blobErr: "", publicUrl: "", publicStatus: 0, publicErr: "" };
  if (pref !== "local") {
    const base = process.env.NEXT_PUBLIC_BLOB_BASE;
    if (base) {
      const url = `${base}/quizzes/${slug}.json`;
      diag.blobUrl = url;
      try {
        const r = await fetchJson(url);
        diag.blobStatus = r.status;
        if (r.ok) {
          try {
            const parsed = JSON.parse(r.text);
            const v = validateQuizShape(parsed);
            if (v.ok) return <QuizRunner quiz={v.data} />;
            diag.blobErr = v.reason;
          } catch (e) {
            diag.blobErr = (e as Error).message || "JSON parse error";
          }
        } else {
          diag.blobErr = `HTTP ${r.status}`;
        }
      } catch (e) {
        diag.blobErr = (e as Error).message || "Network error";
      }
    }
  }

  // 2) Fallback to /public
  const origin = await getOrigin();
  const pub = origin ? `${origin}/quizzes/${slug}.json` : `/quizzes/${slug}.json`;
  diag.publicUrl = pub;
  try {
    const r = await fetchJson(pub);
    diag.publicStatus = r.status;
    if (r.ok) {
      try {
        const parsed = JSON.parse(r.text);
        const v = validateQuizShape(parsed);
        if (v.ok) return <QuizRunner quiz={v.data} />;
        diag.publicErr = v.reason;
      } catch (e) {
        diag.publicErr = (e as Error).message || "JSON parse error";
      }
    } else {
      diag.publicErr = `HTTP ${r.status}`;
    }
  } catch (e) {
    diag.publicErr = (e as Error).message || "Network error";
  }

  // 3) Diagnostics
  return (
    <div style={{ padding: 24, lineHeight: 1.7, maxWidth: 900 }}>
      <h2>Quiz “{slug}” not found</h2>
      <ul>
        <li>
          <div><strong>Blob:</strong> {diag.blobUrl || "(NEXT_PUBLIC_BLOB_BASE not set)"} </div>
          <small>{diag.blobErr || "—"}</small>
        </li>
        <li>
          <div><strong>Public:</strong> {diag.publicUrl}</div>
          <small>{diag.publicErr || "—"}</small>
        </li>
      </ul>
      <p>Ensure your Blob object path is <code>quizzes/{slug}.json</code> and the JSON has an <code>items</code> array.</p>
    </div>
  );
}
