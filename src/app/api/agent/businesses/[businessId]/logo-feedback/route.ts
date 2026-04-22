import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

function verifyAgentApiKey(request: NextRequest): boolean {
  const key = process.env.FREEWEBSITE_AGENT_API_KEY;
  if (!key) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${key}`;
}

// GET /api/agent/businesses/[businessId]/logo-feedback
// Returns all feedback for the latest round, grouped by asset (with asset URLs)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  if (!verifyAgentApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { businessId } = await params;

  // Get the latest feedback_round for this business
  const { data: latestRoundRow, error: roundError } = await supabaseAdminClient
    .from('logo_feedback' as any)
    .select('feedback_round')
    .eq('business_id', businessId)
    .order('feedback_round', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (roundError) {
    return NextResponse.json({ error: roundError.message }, { status: 500 });
  }

  const latestRound = (latestRoundRow as { feedback_round: number } | null)?.feedback_round ?? 1;

  // Fetch all feedback for the latest round with asset details
  const { data: feedbackRows, error: feedbackError } = await supabaseAdminClient
    .from('logo_feedback' as any)
    .select(`
      id,
      asset_id,
      overall_rating,
      category_ratings,
      notes,
      feedback_round,
      created_at,
      updated_at,
      generated_assets!asset_id (
        id,
        storage_url,
        asset_type,
        status,
        is_selected,
        metadata
      )
    `)
    .eq('business_id', businessId)
    .eq('feedback_round', latestRound);

  if (feedbackError) {
    return NextResponse.json({ error: feedbackError.message }, { status: 500 });
  }

  const feedbacks = ((feedbackRows ?? []) as any[]).map((row) => ({
    id: row.id,
    assetId: row.asset_id,
    overallRating: row.overall_rating,
    categoryRatings: row.category_ratings,
    notes: row.notes,
    feedbackRound: row.feedback_round,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    asset: row.generated_assets
      ? {
          id: row.generated_assets.id,
          storageUrl: row.generated_assets.storage_url,
          assetType: row.generated_assets.asset_type,
          status: row.generated_assets.status,
          isSelected: row.generated_assets.is_selected,
          metadata: row.generated_assets.metadata,
        }
      : null,
  }));

  return NextResponse.json({ feedbackRound: latestRound, feedbacks });
}
