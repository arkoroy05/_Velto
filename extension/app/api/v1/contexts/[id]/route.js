export async function PUT(request, { params }) {
  const { id } = params || {};
  const body = await request.json().catch(() => ({}));
  // Mock update – echo back the id and incoming fields
  const updated = {
    id: String(id ?? "0"),
    title: body.title || "",
    snippet: body.snippet || "",
    source: body.source || "Cursor",
    ts: Date.now(),
  };
  return Response.json({ ok: true, item: updated });
}
