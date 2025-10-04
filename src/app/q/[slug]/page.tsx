import QuizRunner from "@/components/QuizRunner";
import type { Quiz } from "@/lib/quiz";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";   // never pre-render
export const revalidate = 0;              // no cache for this route

type SourcePref = "auto" | "blob" | "local";

async function getOrigin() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${proto}://${host}` : "";
}

async function tryFetchJson(url: string): Promise<
  | { ok: true; data: Quiz }
  | { ok: false; status?: number; err?: string; contentType?: string; sample?: string }
> {
  try {
    const res = await fetch(url, { cache: "no-store" });
    const ct = res.headers.get("content-type") ?? "";
    const text = await res.text(); // read once so we can show a sample if JSON fails

    if (!res.ok) {
      return { ok: false, status: res.status, contentType: ct, sample: text.slice(0, 200) };
    }
    try {
      const data = JSON.parse(text) as Quiz;
      return { ok: true, data };
    } catch (e) {
      return {
        ok: false,
        status: res.status,
        contentType: ct,
        err: (e as Error).message || "JSON parse error",
        sample: text.slice(0, 200),
      };
    }
  } catch (e) {
    return { ok: false, err: (e as Error).message || "Network error" };
  }
}

export default async function Page({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { source?: SourcePref };
}) {
  const slug = params.slug;
  const pref: SourcePref = (searchParams?.source as SourcePref) ?? "auto";

  const diag: {
    blobUrl?: string;
    blobStatus?: number;
    blobErr?: string;
    blobCT?: string;
    blobSample?: string;
    publicUrl?: string;
    publicStatus?: number;
    publicErr?: string;
    publicCT?: string;
    publicSample?: string;
  } = {};

  // 1) Blob first (unless forced local)
  if (pref !== "local") {
    const base = process.env.NEXT_PUBLIC_BLOB_BASE;
    if (base) {
      const url = `${base}/quizzes/${slug}.json`;
      diag.blobUrl = url;
      const r = await tryFetchJson(url);
      if (r.ok) {
        return <QuizRunner quiz={r.data} />;
      } else {
        diag.blobStatus = r.status;
        diag.blobErr = r.err;
        diag.blobCT = r.contentType;
        diag.blobSample = r.sample;
      }
    }
  }

  // 2) Fallback to /public
  const origin = await getOrigin();
  const publicUrl = origin ? `${origin}/quizzes/${slug}.json` : `/quizzes/${slug}.json`;
  diag.publicUrl = publicUrl;
  const pr = await tryFetchJson(publicUrl);
  if (pr.ok) {
    return <QuizRunner quiz={pr.data} />;
  } else {
    diag.publicStatus = pr.status;
    diag.publicErr = pr.err;
    diag.publicCT = pr.contentType;
    diag.publicSample = pr.sample;
  }

  // 3) Diagnostics UI
  return (
    <div style={{ padding: 24, lineHeight: 1.7, maxWidth: 900, fontFamily: "system-ui, Arial, sans-serif" }}>
      <h2>Quiz “{slug}” not found</h2>
      <p>Looked for:</p>
      <ul>
        <li>
          <div><strong>Blob:</strong> {diag.blobUrl ?? "(NEXT_PUBLIC_BLOB_BASE not set)"}</div>
          <small>
            {diag.blobStatus ? `Status ${diag.blobStatus} • ` : ""}
            {diag.blobCT ? `${diag.blobCT} • ` : ""}
            {diag.blobErr ?? "—"}
          </small>
          {diag.blobSample ? (
            <pre style={{ whiteSpace: "pre-wrap", background: "#f6f7fb", padding: 10, borderRadius: 8 }}>
              {diag.blobSample}
            </pre>
          ) : null}
        </li>
        <li>
          <div><strong>Public:</strong> {diag.publicUrl}</div>
          <small>
            {diag.publicStatus ? `Status ${diag.publicStatus} • ` : ""}
            {diag.publicCT ? `${diag.publicCT} • ` : ""}
            {diag.publicErr ?? "—"}
          </small>
          {diag.publicSample ? (
            <pre style={{ whiteSpace: "pre-wrap", background: "#f6f7fb", padding: 10, borderRadius: 8 }}>
              {diag.publicSample}
            </pre>
          ) : null}
        </li>
      </ul>
      <p>
        Tip: Ensure the Blob object path is <code>quizzes/{slug}.json</code> (lowercase). Visit this page as{" "}
        <code>/q/{slug}</code> (no <code>?source=local</code>). If Blob works directly in the browser but fails here,
        the JSON may have trailing commas or other invalid syntax.
      </p>
    </div>
  );
}
