// Stripe integration removed - this route is no longer used
export async function POST() {
  return Response.json({ error: 'Webhooks not configured' }, { status: 503 });
}
