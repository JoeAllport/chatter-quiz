import QuizRunner from "@/components/QuizRunner";
import { Quiz } from "@/lib/quiz";
import { headers } from "next/headers";

type SourcePref = "auto" | "blob" | "local";

async function fetchFromBlob(slug: string): Promise<Quiz | null> {
  const base = process.env.NEXT_PUBLIC_BLOB_BASE;
  if (!base) return null;
  try {
    const res = await fetch(`${base}/quizzes/${slug}.json`, { cache: "no-store" });
    if (res.ok) return (await res.json()) as Quiz;
  } catch {}
  return null;
}

async function getOrigin() {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  return host ? `${proto}://${host}` : "";
}

async function fetchFromPublic(slug: string): Promise<Quiz | null> {
  const origin = await getOrigin();
  try {
    const url = origin ? `${origin}/quizzes/${slug}.json` : `/quizzes/${slug}.json`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) return (await res.json()) as Quiz;
  } catch {}
  return null;
}

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { source?: SourcePref };
}) {
  const slug = params.slug;
  const pref: SourcePref = searchParams?.source ?? "auto";

  let quiz: Quiz | null = null;
  if (pref !== "local") {
    quiz = await fetchFromBlob(slug);
  }
  if (!quiz) {
    quiz = await fetchFromPublic(slug);
  }

  if (!quiz) {
    return (
      <div style={{ padding: 24 }}>
        Quiz “{slug}” not found. Make sure you committed{" "}
        <code>public/quizzes/{slug}.json</code> or uploaded it to Blob.
      </div>
    );
  }

  return <QuizRunner quiz={quiz} />;
}
