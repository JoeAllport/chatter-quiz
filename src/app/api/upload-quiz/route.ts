// app/api/admin/upload-quiz/route.ts
import { NextRequest } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { slug, quiz } = await req.json();
  if (!slug || !quiz) return new Response("Missing slug or quiz", { status: 400 });

  const json = JSON.stringify(quiz, null, 2);
  const path = `quizzes/${slug}.json`;

  const blob = await put(path, json, {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false
  });

  return Response.json({ url: blob.url, path });
}
