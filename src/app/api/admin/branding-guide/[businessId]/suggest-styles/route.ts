import { NextRequest, NextResponse } from 'next/server';
import type { StylePackage, ColorPalette } from '../../../../../admin/tabs/branding-guide/sections/style-studio/types';

export async function POST(req: NextRequest, { params }: { params: Promise<{ businessId: string }> }) {
  // TODO: Assert admin auth (e.g., getServerSession)
  const { businessId } = await params;

  // TODO: Fetch brand_assets, customer_inputs for businessId
  // Compile colors, fonts, urls, notes, style, name

  const prompt = `You are a web design expert for local service businesses. Based on the following brand inputs, generate 3 complete website style packages.

Brand colors extracted: []
Brand fonts detected: []
Inspiration websites: []
Inspiration notes: ""
Style preference: ""
Business name: "Test Business"

For each package, return:
- name: A short creative name (e.g., "Clean & Confident")
- palette: { primary, secondary, accent, background, text } as hex codes
- fonts: { heading, body } as Google Font names from this list: [Inter, Montserrat, Poppins, Playfair Display, Lora, DM Sans, Source Sans 3, Nunito Sans, Merriweather, Raleway, Open Sans, Roboto Slab]
- vibe: one of [modern, classic, bold, professional, playful, elegant]

Return ONLY a JSON array of objects with these fields. Ensure palettes have good contrast and are cohesive.`;

  // TODO: Call AI Gateway (gemini-2.5-flash-lite, maxTokens 2048)
  // Parse JSON response

  // Mock response for now
  const mockPackages: StylePackage[] = [
    {
      name: 'Clean Modern',
      palette: {
        id: 'mock1',
        name: 'Clean Modern',
        primary: '#10B981',
        secondary: '#064E3B',
        accent: '#34D399',
        background: '#F8FAFC',
        text: '#1E293B',
        vibes: ['modern'],
        source: 'ai-generated' as const,
      },
      fonts: {
        id: 'mock1',
        name: 'Inter Pair',
        heading: 'Inter',
        body: 'Inter',
        vibes: ['modern'],
        source: 'ai-generated' as const,
      },
      vibe: 'modern',
    },
  ];

  return NextResponse.json({ packages: mockPackages });
}
