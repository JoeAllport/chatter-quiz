import { NextResponse } from "next/server";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Optional: allow multiple group IDs via comma, e.g. "123,456"
function parseGroups(raw?: string) {
  if (!raw) return [];
  return raw.split(",").map(s => s.trim()).filter(Boolean);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body?.email ?? "").trim().toLowerCase();
    const quizId = String(body?.quizId ?? "unknown");
    const score = Number(body?.score ?? 0);
    const total = Number(body?.total ?? 0);

    if (!EMAIL_RX.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const API_KEY = process.env.MAILERLITE_API_KEY;
    const GROUPS = parseGroups(process.env.MAILERLITE_GROUP_ID); // optional

    if (!API_KEY) {
      return NextResponse.json({ error: "Missing MAILERLITE_API_KEY" }, { status: 500 });
    }

    // Build payload for MailerLite “create/upsert subscriber”
    // Docs: POST https://connect.mailerlite.com/api/subscribers
    // Auth: Authorization: Bearer <API_KEY>
    // You can include groups here to add the subscriber to specific groups.
    const payload: Record<string, unknown> = {
      email,
    };

    if (GROUPS.length) payload.groups = GROUPS;

    // Optional custom fields (ONLY include if you created these custom fields in MailerLite)
    // Create fields in ML UI, then set env names to match their "key" (e.g., quiz_id, quiz_score, quiz_total).
    const F_QUIZ_ID = process.env.ML_FIELD_QUIZ_ID;
    const F_SCORE = process.env.ML_FIELD_SCORE;
    const F_TOTAL = process.env.ML_FIELD_TOTAL;
    const fields: Record<string, string | number> = {};
    if (F_QUIZ_ID) fields[F_QUIZ_ID] = quizId;
    if (F_SCORE) fields[F_SCORE] = score;
    if (F_TOTAL) fields[F_TOTAL] = total;
    if (Object.keys(fields).length) payload.fields = fields;

    const res = await fetch("https://connect.mailerlite.com/api/subscribers", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${API_KEY}`,
        "content-type": "application/json",
        "accept": "application/json",
        // Optional: pin API version as a date (recommended by ML docs)
        // "X-Version": "2025-10-04",
      },
      body: JSON.stringify(payload),
    });

    // 201 Created (new) or 200 OK (upsert) are both success
    if (res.status === 200 || res.status === 201) {
      return NextResponse.json({ ok: true });
    }

    const text = await res.text();
    return NextResponse.json({ error: `MailerLite error ${res.status}: ${text}` }, { status: 502 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
