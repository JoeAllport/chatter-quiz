// app/api/admin/upload-media/route.ts
import { NextRequest } from "next/server";
import { put } from "@vercel/blob";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  if (req.headers.get("x-admin-key") !== process.env.ADMIN_KEY) {
    return new Response("Unauthorized", { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const slug = (form.get("slug") as string | null)?.trim();

  if (!file || !slug) return new Response("Missing file or slug", { status: 400 });

  // content hash → stable deduped filename
  const buf = Buffer.from(await file.arrayBuffer());
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-1", buf)))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 8);

  const [base, ext = "bin"] = (file.name.split(".") as [string, string?]);
  const safeBase = base.replace(/[^a-z0-9-_]+/gi, "-").toLowerCase();
  const path = `media/${slug}/${safeBase}-${hash}.${ext}`;

  const blob = await put(path, buf, {
    access: "public",
    contentType: file.type || "application/octet-stream",
    addRandomSuffix: false
  });

  return Response.json({ url: blob.url, path });
}
