import { NextRequest, NextResponse } from 'next/server';
import type { ColorPalette } from '../../../../../admin/tabs/branding-guide/sections/style-studio/types';

export async function POST(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  // TODO: Assert admin auth
  const { businessId } = await params;

  // TODO: Fetch brand_assets.inspiration_urls (max 3)
  // For each, Firecrawl scrape with formats: ['branding'] or AI extract colors
  // Build 1-2 palettes

  // Mock
  const mockPalettes: ColorPalette[] = [
    {
      id: 'inspo1',
      name: 'From Inspiration',
      primary: '#1D4ED8',
      secondary: '#1E3A5F',
      accent: '#3B82F6',
      background: '#F8FAFC',
      text: '#334155',
      vibes: ['professional'],
      source: 'inspiration' as const,
    },
  ];

  return NextResponse.json({ palettes: mockPalettes });
}
