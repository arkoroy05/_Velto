export async function POST(request, { params }) {
  const { id } = params || {};
  const payload = await request.json().catch(() => ({}));
  // Mock analyze: return a simple analysis message
  return Response.json({ ok: true, id, analysis: `Re-analyzed context ${id}`, received: payload });
}
