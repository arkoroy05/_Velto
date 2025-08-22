export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") || "").toLowerCase();

  // Mock dataset
  const now = Date.now();
  const data = [
    { id: "1", title: "Prompt engineering tips", snippet: "Try few-shot examples and iterate with feedback...", source: "Claude", ts: now - 1000 * 60 * 5 },
    { id: "2", title: "Refactor auth middleware", snippet: "Support JWT rotation and refresh tokens.", source: "ChatGPT", ts: now - 1000 * 60 * 60 },
    { id: "3", title: "Debugging Next.js RSC hydration", snippet: "Ensure components marked 'use client' where needed.", source: "Cursor", ts: now - 1000 * 60 * 60 * 24 },
    { id: "4", title: "Vector DB selection", snippet: "Choose between pgvector, Pinecone, and Weaviate.", source: "Claude", ts: now - 1000 * 60 * 15 },
  ];

  const filtered = data.filter((d) => {
    if (!query) return true;
    return (
      d.title.toLowerCase().includes(query) ||
      d.snippet.toLowerCase().includes(query) ||
      d.source.toLowerCase().includes(query)
    );
  });

  return Response.json({ items: filtered });
}

export async function POST(request) {
  // Mock create - echo back payload with generated id and timestamp
  const body = await request.json().catch(() => ({}));
  const now = Date.now();
  const created = {
    id: String(Math.floor(Math.random() * 100000)),
    title: body.title || "",
    snippet: body.snippet || "",
    source: body.source || "Cursor",
    ts: now,
  };
  return Response.json({ ok: true, item: created }, { status: 201 });
}
