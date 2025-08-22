export async function POST(request, { params }) {
  const { id } = params || {};
  const payload = await request.json().catch(() => ({}));
  // Mock prompt version creation
  const version = Math.floor(Math.random() * 10) + 1;
  return Response.json({ ok: true, id, version, message: `Created prompt version ${version} for context ${id}`, received: payload });
}
