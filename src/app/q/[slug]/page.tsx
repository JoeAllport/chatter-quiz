import QuizRunner from "@/components/QuizRunner";
import { Quiz } from "@/lib/quiz";

type SourcePref = "auto" | "blob" | "local";

export default async function QuizPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams?: { source?: SourcePref };
}) {
  const slug = params.slug;

  const envPreferred = process.env.NEXT_PUBLIC_SOURCE as SourcePref | undefined;
  const preferred: SourcePref = searchParams?.source ?? envPreferred ?? "auto";

  // Try Blob first
  if ((preferred === "auto" || preferred === "blob") && process.env.NEXT_PUBLIC_BLOB_BASE) {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BLOB_BASE}/quizzes/${slug}.json`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const quiz = (await res.json()) as Quiz;
        return <QuizRunner quiz={quiz} />;
      }
    } catch {}
  }

  // Fallback to public asset
  const resLocal = await fetch(`/quizzes/${slug}.json`, { cache: "no-store" });
  if (resLocal.ok) {
    const quiz = (await resLocal.json()) as Quiz;
    return <QuizRunner quiz={quiz} />;
  }

  return <div>Quiz “{slug}” not found.</div>;
}
