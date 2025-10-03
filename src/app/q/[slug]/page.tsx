import QuizRunner from "@/components/QuizRunner";
import { Quiz } from "@/lib/quiz";
import fs from "node:fs/promises";
import path from "node:path";

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { source?: "auto" | "blob" | "local" };
}) {
  const slug = params.slug;
  const preferred = searchParams?.source ?? (process.env.NEXT_PUBLIC_SOURCE as any) ?? "auto";

  // 1) Try Blob (if configured)
  let quiz: Quiz | null = null;
  if ((preferred === "auto" || preferred === "blob") && process.env.NEXT_PUBLIC_BLOB_BASE) {
    try {
      const url = `${process.env.NEXT_PUBLIC_BLOB_BASE}/quizzes/${slug}.json`;
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok) quiz = (await res.json()) as Quiz;
    } catch {
      // ignore and fall back
    }
  }

  // 2) Fallback to local /public
  if (!quiz && (preferred === "auto" || preferred === "local")) {
    try {
      const file = path.join(process.cwd(), "public", "quizzes", `${slug}.json`);
      const raw = await fs.readFile(file, "utf-8");
      quiz = JSON.parse(raw) as Quiz;
    } catch {
      // ignore
    }
  }

  if (!quiz) return <div>Quiz “{slug}” not found.</div>;
  return <QuizRunner quiz={quiz} />;
}
