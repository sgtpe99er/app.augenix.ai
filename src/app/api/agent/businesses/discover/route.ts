import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

function verifyAgentApiKey(request: NextRequest): boolean {
  const key = process.env.FREEWEBSITE_AGENT_API_KEY;
  if (!key) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${key}`;
}

interface BusinessDiscoveryResult {
  name: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  facebookUrl: string | null;
  googleRating: number | null;
  reviewCount: number | null;
  category: string | null;
  photos: string[];
  description: string | null;
  hours: Record<string, string> | null;
  services: string[] | null;
}

export async function POST(request: NextRequest) {
  if (!verifyAgentApiKey(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { businessName, city, state } = body;

  if (!businessName || typeof businessName !== 'string') {
    return NextResponse.json({ error: 'businessName is required' }, { status: 400 });
  }

  const location = [city, state].filter(Boolean).join(', ');
  const searchQuery = location ? `${businessName} ${location}` : businessName;

  try {
    // Use Perplexity sonar model via AI Gateway for business discovery
    const { generateText, createGateway } = await import('ai');

    if (!process.env.AI_GATEWAY_API_KEY) {
      return NextResponse.json(
        { error: 'AI Gateway not configured' },
        { status: 503 }
      );
    }

    const gw = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY });

    const { text } = await generateText({
      model: gw('perplexity/sonar'),
      prompt: `Find detailed business information for: ${searchQuery}

Return the following details in this exact format (use "unknown" for fields you cannot find):
BUSINESS_NAME: [official business name]
ADDRESS: [full street address with city, state, zip]
PHONE: [phone number with area code]
EMAIL: [business email]
WEBSITE: [full URL starting with http]
FACEBOOK: [full Facebook URL]
GOOGLE_RATING: [number like 4.5, or unknown]
REVIEW_COUNT: [number of Google reviews, or unknown]
CATEGORY: [business category/industry, e.g. "Gutter Installation"]
DESCRIPTION: [1-2 sentence description of what the business does]
SERVICES: [comma-separated list of services offered]
HOURS_MON: [e.g. "8:00 AM - 5:00 PM" or "Closed"]
HOURS_TUE: [hours]
HOURS_WED: [hours]
HOURS_THU: [hours]
HOURS_FRI: [hours]
HOURS_SAT: [hours]
HOURS_SUN: [hours]
PHOTOS: [comma-separated URLs of business photos, or "none"]
YEAR_ESTABLISHED: [year or unknown]`,
    });

    // Parse the structured response
    const result: BusinessDiscoveryResult = {
      name: null,
      address: null,
      phone: null,
      email: null,
      website: null,
      facebookUrl: null,
      googleRating: null,
      reviewCount: null,
      category: null,
      photos: [],
      description: null,
      hours: null,
      services: null,
    };

    const extract = (pattern: RegExp): string | null => {
      const match = text.match(pattern);
      if (!match || !match[1] || match[1].trim().toLowerCase() === 'unknown') return null;
      return match[1].trim();
    };

    result.name = extract(/BUSINESS_NAME:\s*(.+)/i) || businessName;
    result.address = extract(/ADDRESS:\s*(.+)/i);
    result.email = extract(/EMAIL:\s*(.+)/i);
    result.website = extract(/WEBSITE:\s*(https?:\/\/[^\s\])\[]+)/i);
    result.facebookUrl = extract(/FACEBOOK:\s*(https?:\/\/[^\s\])\[]+)/i);
    result.category = extract(/CATEGORY:\s*(.+)/i);
    result.description = extract(/DESCRIPTION:\s*(.+)/i);

    // Phone — normalize to (xxx) xxx-xxxx
    const phoneRaw = extract(/PHONE:\s*(.+)/i);
    if (phoneRaw) {
      const digits = phoneRaw.replace(/\D/g, '');
      const normalized = digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits;
      if (normalized.length === 10) {
        result.phone = `(${normalized.slice(0, 3)}) ${normalized.slice(3, 6)}-${normalized.slice(6)}`;
      } else {
        result.phone = phoneRaw;
      }
    }

    // Numeric fields
    const ratingStr = extract(/GOOGLE_RATING:\s*(.+)/i);
    if (ratingStr) {
      const rating = parseFloat(ratingStr);
      if (!isNaN(rating)) result.googleRating = rating;
    }
    const reviewStr = extract(/REVIEW_COUNT:\s*(.+)/i);
    if (reviewStr) {
      const count = parseInt(reviewStr.replace(/[^0-9]/g, ''));
      if (!isNaN(count)) result.reviewCount = count;
    }

    // Services
    const servicesStr = extract(/SERVICES:\s*(.+)/i);
    if (servicesStr) {
      result.services = servicesStr.split(',').map(s => s.trim()).filter(Boolean);
    }

    // Hours
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const hours: Record<string, string> = {};
    let hasHours = false;
    for (let i = 0; i < days.length; i++) {
      const h = extract(new RegExp(`HOURS_${days[i]}:\\s*(.+)`, 'i'));
      if (h) {
        hours[dayNames[i]] = h;
        hasHours = true;
      }
    }
    if (hasHours) result.hours = hours;

    // Photos
    const photosStr = extract(/PHOTOS:\s*(.+)/i);
    if (photosStr && photosStr.toLowerCase() !== 'none') {
      result.photos = photosStr
        .split(',')
        .map(u => u.trim())
        .filter(u => u.startsWith('http'));
    }

    // Year established
    const yearStr = extract(/YEAR_ESTABLISHED:\s*(.+)/i);
    const yearsInBusiness = yearStr ? new Date().getFullYear() - parseInt(yearStr) : null;

    return NextResponse.json({
      ...result,
      yearsInBusiness: yearsInBusiness && yearsInBusiness > 0 ? yearsInBusiness : null,
      rawSearchText: text,
    });
  } catch (error) {
    console.error('[Agent Discovery] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Discovery failed' },
      { status: 500 }
    );
  }
}
