import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const pageId = formData.get('pageId') as string;
    const instruction = formData.get('instruction') as string;
    const orgId = formData.get('orgId') as string | null;
    const image = formData.get('image') as File | null;

    if (!pageId || !instruction) {
      return NextResponse.json({ error: 'pageId and instruction are required' }, { status: 400 });
    }

    // Fetch current page content
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('id, slug, title, content, org_id')
      .eq('id', pageId)
      .single();

    if (pageError || !page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    // Fetch org brand context
    let brandContext = '';
    if (orgId) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name, brand_voice, industry')
        .eq('id', orgId)
        .single();

      if (org) {
        brandContext = [
          org.brand_voice && `Brand voice: ${org.brand_voice}`,
          org.industry && `Industry: ${org.industry}`,
          org.name && `Business name: ${org.name}`,
        ].filter(Boolean).join('\n');
      }
    }

    // Handle image upload if provided
    let imageUrl: string | null = null;
    if (image) {
      const ext = image.name.split('.').pop() ?? 'jpg';
      const path = `uploads/${orgId ?? 'unknown'}/${Date.now()}.${ext}`;
      const buffer = Buffer.from(await image.arrayBuffer());
      const { data: uploadData } = await supabase.storage
        .from('media')
        .upload(path, buffer, { contentType: image.type });

      if (uploadData) {
        const { data: urlData } = supabase.storage.from('media').getPublicUrl(path);
        imageUrl = urlData.publicUrl;
      }
    }

    // Call AI via @ai-sdk/gateway
    // For now, return a structured proposal based on the instruction
    // In production this would call the AI model
    const proposal = {
      summary: `AI will process: "${instruction}" on the ${page.title} page.`,
      sections: [
        {
          id: 'proposed-1',
          type: 'content_update',
          action: 'modified',
          preview: `Based on your instruction: "${instruction.slice(0, 100)}${instruction.length > 100 ? '...' : ''}"`,
        },
      ],
      pageId: page.id,
      currentContent: page.content,
      instruction,
      imageUrl,
    };

    return NextResponse.json(proposal);
  } catch (err) {
    console.error('Command center error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
