import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

interface DiscoveryInput {
  sessionId: string;
  userId: string;
  entryType: 'phone' | 'name_city' | 'website' | 'facebook' | 'gbp';
  entryValue: string;
  entryValueSecondary?: string;
}

interface DiscoveredItem {
  field_type: string;
  field_value: any;
  source: string;
  source_url?: string;
  confidence: number;
}

// URL normalization helper - must be defined before use
function normalizeUrl(url: string): string {
  let normalized = url.trim();

  // Add https:// if no protocol
  if (!normalized.startsWith('http://') && !normalized.startsWith('https://')) {
    normalized = 'https://' + normalized;
  }

  // Remove trailing slash
  if (normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

// Helper to add a progress status item that shows in the UI
async function addProgressItem(sessionId: string, message: string) {
  await supabaseAdminClient.from('onboarding_discovery_items').insert({
    session_id: sessionId,
    field_type: '_progress',
    field_value: message,
    source: 'system',
    confidence: 1,
    status: 'confirmed',
  });
}

// Helper to remove progress items when done
async function clearProgressItems(sessionId: string) {
  await supabaseAdminClient
    .from('onboarding_discovery_items')
    .delete()
    .eq('session_id', sessionId)
    .eq('field_type', '_progress');
}

// Direct runner function that bypasses Workflow DevKit for local dev
export async function runDiscoveryWorkflow(input: DiscoveryInput) {
  return discoverBusinessWorkflowImpl(input);
}

export async function discoverBusinessWorkflow(input: DiscoveryInput) {
  return discoverBusinessWorkflowImpl(input);
}

async function discoverBusinessWorkflowImpl(input: DiscoveryInput) {

  const { sessionId, entryType, entryValue, entryValueSecondary } = input;

  console.log('[Discovery] Starting workflow for session:', sessionId, 'entryType:', entryType, 'entryValue:', entryValue);

  try {
    // Step 1: Discover sources based on entry type
    await addProgressItem(sessionId, '🔍 Analyzing entry point...');
    console.log('[Discovery] Step 1: Discovering sources...');
    const sources = await discoverSources(entryType, entryValue, entryValueSecondary);
    console.log('[Discovery] Discovered sources:', sources);

    // Update session with discovered sources
    await supabaseAdminClient
      .from('onboarding_discovery_sessions')
      .update({ discovered_sources: JSON.parse(JSON.stringify(sources)) })
      .eq('id', sessionId);

    // Step 2: Scrape each source
    console.log('[Discovery] Step 2: Scraping sources...');
    const allItems: DiscoveredItem[] = [];

    if (sources.website) {
      await addProgressItem(sessionId, `🌐 Fetching website: ${sources.website}`);
      console.log('[Discovery] Scraping website:', sources.website);
      const websiteItems = await scrapeWebsite(sources.website);
      allItems.push(...websiteItems);
      if (websiteItems.length > 0) {
        await addProgressItem(sessionId, `✅ Found ${websiteItems.length} items from website`);
      }
    }
    
    if (sources.gbp) {
      await addProgressItem(sessionId, `📍 Checking Google Business Profile...`);
      console.log('[Discovery] Scraping GBP:', sources.gbp);
      const gbpItems = await scrapeGoogleBusiness(sources.gbp);
      allItems.push(...gbpItems);
      if (gbpItems.length > 0) {
        await addProgressItem(sessionId, `✅ Found ${gbpItems.length} items from Google`);
      }
    }
    
    if (sources.facebook) {
      await addProgressItem(sessionId, `📘 Checking Facebook page...`);
      console.log('[Discovery] Scraping Facebook:', sources.facebook);
      const fbItems = await scrapeFacebook(sources.facebook);
      allItems.push(...fbItems);
      if (fbItems.length > 0) {
        await addProgressItem(sessionId, `✅ Found ${fbItems.length} items from Facebook`);
      }
    }

    if (allItems.length === 0 && !sources.website && !sources.gbp && !sources.facebook) {
      await addProgressItem(sessionId, '⚠️ No sources found to analyze');
    }

    console.log('[Discovery] Scraped items count:', allItems.length);

    // Step 3: Merge and dedupe items
    await addProgressItem(sessionId, '🔄 Processing discovered information...');
    const mergedItems = mergeDiscoveredItems(allItems);

    // Clear progress items before adding real items
    await clearProgressItems(sessionId);

    // Step 4: Insert items into database
    if (mergedItems.length > 0) {
      await supabaseAdminClient.from('onboarding_discovery_items').insert(
        mergedItems.map((item) => ({
          session_id: sessionId,
          field_type: item.field_type,
          field_value: item.field_value,
          source: item.source,
          source_url: item.source_url,
          confidence: item.confidence,
          status: 'pending',
        }))
      );
    }

    // Update session status
    await supabaseAdminClient
      .from('onboarding_discovery_sessions')
      .update({ status: 'awaiting_confirmation' })
      .eq('id', sessionId);

    return { success: true, itemCount: mergedItems.length };
  } catch (error) {
    console.error('Discovery workflow error:', error);

    // Clear progress and add error message
    await clearProgressItems(sessionId);
    await addProgressItem(sessionId, `❌ Discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

    await supabaseAdminClient
      .from('onboarding_discovery_sessions')
      .update({ status: 'failed' })
      .eq('id', sessionId);

    throw error;
  }
}

interface DiscoveredSources {
  website?: string;
  gbp?: string;
  facebook?: string;
  yelp?: string;
}

async function discoverSources(
  entryType: string,
  entryValue: string,
  entryValueSecondary?: string
): Promise<DiscoveredSources> {

  const sources: DiscoveredSources = {};
  console.log('[Discovery] discoverSources called with:', entryType, entryValue);

  switch (entryType) {
    case 'website':
      sources.website = normalizeUrl(entryValue);
      // Extract social links from website
      const socialLinks = await extractSocialLinksFromWebsite(sources.website);
      if (socialLinks.facebook) sources.facebook = socialLinks.facebook;
      if (socialLinks.gbp) sources.gbp = socialLinks.gbp;
      break;

    case 'phone':
      // Search Google for the phone number to find GBP, website
      const phoneResults = await searchGoogleForBusiness(entryValue);
      if (phoneResults.gbp) sources.gbp = phoneResults.gbp;
      if (phoneResults.website) sources.website = phoneResults.website;
      if (phoneResults.facebook) sources.facebook = phoneResults.facebook;
      break;

    case 'name_city':
      // Search Google for "business name city" to find GBP, website
      const searchQuery = `${entryValue} ${entryValueSecondary || ''}`.trim();
      const nameResults = await searchGoogleForBusiness(searchQuery);
      if (nameResults.gbp) sources.gbp = nameResults.gbp;
      if (nameResults.website) sources.website = nameResults.website;
      if (nameResults.facebook) sources.facebook = nameResults.facebook;
      break;

    case 'facebook':
      sources.facebook = normalizeUrl(entryValue);
      // TODO: Extract website link from Facebook page
      break;

    case 'gbp':
      sources.gbp = normalizeUrl(entryValue);
      // TODO: Extract website from GBP
      break;
  }

  return sources;
}

function extractBasicDataFromHtml(html: string, url: string): DiscoveredItem[] {
  const items: DiscoveredItem[] = [];

  // Extract title as business name
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1]) {
    const title = titleMatch[1].trim().split('|')[0].split('-')[0].trim();
    if (title && title.length > 2 && title.length < 100) {
      items.push({
        field_type: 'business_name',
        field_value: title,
        source: 'website',
        source_url: url,
        confidence: 0.7,
      });
    }
  }

  // Extract phone numbers
  const phoneRegex = /(?:\+1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;
  const phones = html.match(phoneRegex);
  if (phones && phones.length > 0) {
    // Get the first unique phone
    const uniquePhone = phones[0].replace(/[^\d+]/g, '');
    if (uniquePhone.length >= 10) {
      items.push({
        field_type: 'phone',
        field_value: phones[0],
        source: 'website',
        source_url: url,
        confidence: 0.8,
      });
    }
  }

  // Extract email addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = html.match(emailRegex);
  if (emails && emails.length > 0) {
    // Filter out common non-business emails
    const businessEmail = emails.find(
      (e) => !e.includes('example.com') && !e.includes('sentry.io') && !e.includes('schema.org')
    );
    if (businessEmail) {
      items.push({
        field_type: 'email',
        field_value: businessEmail,
        source: 'website',
        source_url: url,
        confidence: 0.85,
      });
    }
  }

  // Extract meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  if (descMatch && descMatch[1]) {
    items.push({
      field_type: 'description',
      field_value: descMatch[1].trim(),
      source: 'website',
      source_url: url,
      confidence: 0.75,
    });
  }

  return items;
}

async function scrapeWebsite(url: string): Promise<DiscoveredItem[]> {

  console.log('[Discovery] scrapeWebsite called for:', url);
  const items: DiscoveredItem[] = [];

  try {
    // Fetch the website HTML with timeout
    console.log('[Discovery] Fetching website HTML...');
    const { getPageHtml } = await import('@/libs/agent-browser/browser');
    const html = await getPageHtml(url, 15000); // 15 second timeout
    console.log('[Discovery] Fetched HTML, length:', html.length);

    // Always extract basic data using regex (fallback)
    const basicItems = extractBasicDataFromHtml(html, url);
    items.push(...basicItems);
    console.log('[Discovery] Extracted basic items:', basicItems.length);

    // Check if AI Gateway API key is configured for enhanced extraction
    if (!process.env.AI_GATEWAY_API_KEY) {
      console.log('[Discovery] AI_GATEWAY_API_KEY not configured - using basic extraction only');
      return items;
    }

    // Use AI to extract structured data
    const { generateObject } = await import('ai');
    const { gateway } = await import('@ai-sdk/gateway');
    const { z } = await import('zod');

    const extractionSchema = z.object({
      businessName: z.string().optional(),
      tagline: z.string().optional(),
      description: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      address: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zip: z.string().optional(),
          country: z.string().optional(),
        })
        .optional(),
      socialFacebook: z.string().optional(),
      socialInstagram: z.string().optional(),
      socialYoutube: z.string().optional(),
      socialLinkedin: z.string().optional(),
      socialX: z.string().optional(),
      services: z.array(z.string()).optional(),
    });

    console.log('[Discovery] Calling AI extraction...');
    const { object } = await generateObject({
      model: gateway('openai/gpt-4o-mini'),
      schema: extractionSchema,
      prompt: `Extract business information from this website HTML. Look for:
- Business name (from title, logo, header)
- Tagline or slogan
- Description or about text
- Phone number
- Email address
- Physical address
- Social media links (Facebook, Instagram, YouTube, LinkedIn, X/Twitter)
- List of services offered

HTML (truncated):
${html.slice(0, 30000)}`,
    });
    console.log('[Discovery] AI extraction result:', JSON.stringify(object, null, 2));

    // Convert extracted data to discovery items
    if (object.businessName) {
      items.push({
        field_type: 'business_name',
        field_value: object.businessName,
        source: 'website',
        source_url: url,
        confidence: 0.9,
      });
    }

    if (object.tagline) {
      items.push({
        field_type: 'tagline',
        field_value: object.tagline,
        source: 'website',
        source_url: url,
        confidence: 0.8,
      });
    }

    if (object.description) {
      items.push({
        field_type: 'description',
        field_value: object.description,
        source: 'website',
        source_url: url,
        confidence: 0.8,
      });
    }

    if (object.phone) {
      items.push({
        field_type: 'phone',
        field_value: object.phone,
        source: 'website',
        source_url: url,
        confidence: 0.9,
      });
    }

    if (object.email) {
      items.push({
        field_type: 'email',
        field_value: object.email,
        source: 'website',
        source_url: url,
        confidence: 0.9,
      });
    }

    if (object.address && Object.values(object.address).some(Boolean)) {
      items.push({
        field_type: 'address',
        field_value: object.address,
        source: 'website',
        source_url: url,
        confidence: 0.85,
      });
    }

    if (object.socialFacebook) {
      items.push({
        field_type: 'social_facebook',
        field_value: object.socialFacebook,
        source: 'website',
        source_url: url,
        confidence: 0.95,
      });
    }

    if (object.socialInstagram) {
      items.push({
        field_type: 'social_instagram',
        field_value: object.socialInstagram,
        source: 'website',
        source_url: url,
        confidence: 0.95,
      });
    }

    if (object.socialYoutube) {
      items.push({
        field_type: 'social_youtube',
        field_value: object.socialYoutube,
        source: 'website',
        source_url: url,
        confidence: 0.95,
      });
    }

    if (object.socialLinkedin) {
      items.push({
        field_type: 'social_linkedin',
        field_value: object.socialLinkedin,
        source: 'website',
        source_url: url,
        confidence: 0.95,
      });
    }

    if (object.socialX) {
      items.push({
        field_type: 'social_x',
        field_value: object.socialX,
        source: 'website',
        source_url: url,
        confidence: 0.95,
      });
    }

    if (object.services && object.services.length > 0) {
      items.push({
        field_type: 'services',
        field_value: object.services,
        source: 'website',
        source_url: url,
        confidence: 0.8,
      });
    }
  } catch (error) {
    console.error(`Error scraping website ${url}:`, error);
  }

  return items;
}

async function scrapeGoogleBusiness(url: string): Promise<DiscoveredItem[]> {

  console.log('[Discovery] scrapeGoogleBusiness called for:', url);
  const items: DiscoveredItem[] = [];

  // Check if AI Gateway API key is configured (needed for extraction)
  if (!process.env.AI_GATEWAY_API_KEY) {
    console.error('AI_GATEWAY_API_KEY not configured - skipping GBP scraping');
    return items;
  }

  try {
    const { getPageHtml } = await import('@/libs/agent-browser/browser');
    const html = await getPageHtml(url);

    // Use AI to extract structured data from GBP page
    const { generateObject } = await import('ai');
    const { gateway } = await import('@ai-sdk/gateway');
    const { z } = await import('zod');

    const gbpSchema = z.object({
      businessName: z.string().optional(),
      category: z.string().optional(),
      rating: z.number().optional(),
      reviewCount: z.number().optional(),
      phone: z.string().optional(),
      address: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zip: z.string().optional(),
          country: z.string().optional(),
        })
        .optional(),
      website: z.string().optional(),
      hours: z.record(z.string()).optional(),
      description: z.string().optional(),
      services: z.array(z.string()).optional(),
    });

    const { object } = await generateObject({
      model: gateway('openai/gpt-4o-mini'),
      schema: gbpSchema,
      prompt: `Extract business information from this Google Business Profile page HTML. Look for:
- Business name
- Business category/type
- Rating and review count
- Phone number
- Full address
- Website URL
- Business hours
- Description or about text
- Services offered

HTML (truncated):
${html.slice(0, 40000)}`,
    });

    // Convert extracted data to discovery items
    if (object.businessName) {
      items.push({
        field_type: 'business_name',
        field_value: object.businessName,
        source: 'google_business',
        source_url: url,
        confidence: 0.95,
      });
    }

    if (object.category) {
      items.push({
        field_type: 'industry',
        field_value: object.category,
        source: 'google_business',
        source_url: url,
        confidence: 0.9,
      });
    }

    if (object.phone) {
      items.push({
        field_type: 'phone',
        field_value: object.phone,
        source: 'google_business',
        source_url: url,
        confidence: 0.95,
      });
    }

    if (object.address && Object.values(object.address).some(Boolean)) {
      items.push({
        field_type: 'address',
        field_value: object.address,
        source: 'google_business',
        source_url: url,
        confidence: 0.95,
      });
    }

    if (object.website) {
      items.push({
        field_type: 'website',
        field_value: object.website,
        source: 'google_business',
        source_url: url,
        confidence: 0.95,
      });
    }

    if (object.hours && Object.keys(object.hours).length > 0) {
      items.push({
        field_type: 'hours',
        field_value: object.hours,
        source: 'google_business',
        source_url: url,
        confidence: 0.9,
      });
    }

    if (object.description) {
      items.push({
        field_type: 'description',
        field_value: object.description,
        source: 'google_business',
        source_url: url,
        confidence: 0.85,
      });
    }

    if (object.services && object.services.length > 0) {
      items.push({
        field_type: 'services',
        field_value: object.services,
        source: 'google_business',
        source_url: url,
        confidence: 0.85,
      });
    }

    if (object.rating) {
      items.push({
        field_type: 'rating',
        field_value: { rating: object.rating, reviewCount: object.reviewCount },
        source: 'google_business',
        source_url: url,
        confidence: 0.95,
      });
    }
  } catch (error) {
    console.error(`Error scraping Google Business ${url}:`, error);
  }

  return items;
}

async function scrapeFacebook(url: string): Promise<DiscoveredItem[]> {

  console.log('[Discovery] scrapeFacebook called for:', url);
  const items: DiscoveredItem[] = [];

  // Check if AI Gateway API key is configured (needed for extraction)
  if (!process.env.AI_GATEWAY_API_KEY) {
    console.error('AI_GATEWAY_API_KEY not configured - skipping Facebook scraping');
    return items;
  }

  try {
    const { getPageHtml } = await import('@/libs/agent-browser/browser');
    
    // Normalize Facebook URL to ensure we hit the About page for more info
    let targetUrl = url;
    if (!url.includes('/about')) {
      targetUrl = url.replace(/\/$/, '') + '/about';
    }

    const html = await getPageHtml(targetUrl);

    // Use AI to extract structured data from Facebook page
    const { generateObject } = await import('ai');
    const { gateway } = await import('@ai-sdk/gateway');
    const { z } = await import('zod');

    const facebookSchema = z.object({
      businessName: z.string().optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      website: z.string().optional(),
      address: z
        .object({
          street: z.string().optional(),
          city: z.string().optional(),
          state: z.string().optional(),
          zip: z.string().optional(),
          country: z.string().optional(),
        })
        .optional(),
      hours: z.record(z.string()).optional(),
      instagram: z.string().optional(),
      followerCount: z.number().optional(),
    });

    const { object } = await generateObject({
      model: gateway('openai/gpt-4o-mini'),
      schema: facebookSchema,
      prompt: `Extract business information from this Facebook page HTML. Look for:
- Business/Page name
- Category or business type
- About/Description text
- Phone number
- Email address
- Website URL
- Physical address
- Business hours
- Linked Instagram account
- Follower count

HTML (truncated):
${html.slice(0, 40000)}`,
    });

    // Convert extracted data to discovery items
    if (object.businessName) {
      items.push({
        field_type: 'business_name',
        field_value: object.businessName,
        source: 'facebook',
        source_url: url,
        confidence: 0.9,
      });
    }

    if (object.category) {
      items.push({
        field_type: 'industry',
        field_value: object.category,
        source: 'facebook',
        source_url: url,
        confidence: 0.85,
      });
    }

    if (object.description) {
      items.push({
        field_type: 'description',
        field_value: object.description,
        source: 'facebook',
        source_url: url,
        confidence: 0.85,
      });
    }

    if (object.phone) {
      items.push({
        field_type: 'phone',
        field_value: object.phone,
        source: 'facebook',
        source_url: url,
        confidence: 0.9,
      });
    }

    if (object.email) {
      items.push({
        field_type: 'email',
        field_value: object.email,
        source: 'facebook',
        source_url: url,
        confidence: 0.9,
      });
    }

    if (object.website) {
      items.push({
        field_type: 'website',
        field_value: object.website,
        source: 'facebook',
        source_url: url,
        confidence: 0.9,
      });
    }

    if (object.address && Object.values(object.address).some(Boolean)) {
      items.push({
        field_type: 'address',
        field_value: object.address,
        source: 'facebook',
        source_url: url,
        confidence: 0.85,
      });
    }

    if (object.hours && Object.keys(object.hours).length > 0) {
      items.push({
        field_type: 'hours',
        field_value: object.hours,
        source: 'facebook',
        source_url: url,
        confidence: 0.85,
      });
    }

    if (object.instagram) {
      items.push({
        field_type: 'social_instagram',
        field_value: object.instagram,
        source: 'facebook',
        source_url: url,
        confidence: 0.95,
      });
    }

    // Store Facebook URL itself as a social link
    items.push({
      field_type: 'social_facebook',
      field_value: url,
      source: 'facebook',
      source_url: url,
      confidence: 1.0,
    });
  } catch (error) {
    console.error(`Error scraping Facebook ${url}:`, error);
  }

  return items;
}

function mergeDiscoveredItems(items: DiscoveredItem[]): DiscoveredItem[] {
  // Group items by field_type
  const grouped = new Map<string, DiscoveredItem[]>();

  for (const item of items) {
    const existing = grouped.get(item.field_type) || [];
    existing.push(item);
    grouped.set(item.field_type, existing);
  }

  // For each field type, pick the highest confidence item
  const merged: DiscoveredItem[] = [];

  for (const [, fieldItems] of grouped) {
    // Sort by confidence descending
    fieldItems.sort((a, b) => b.confidence - a.confidence);
    // Take the highest confidence item
    merged.push(fieldItems[0]);
  }

  return merged;
}

interface SocialLinks {
  facebook?: string;
  instagram?: string;
  youtube?: string;
  linkedin?: string;
  x?: string;
  tiktok?: string;
  gbp?: string;
  yelp?: string;
  bbb?: string;
}

async function extractSocialLinksFromWebsite(url: string): Promise<SocialLinks> {
  const links: SocialLinks = {};

  try {
    // Fetch the website HTML
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FreeWebsiteBot/1.0)',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch ${url} for social links: ${response.status}`);
      return links;
    }

    const html = await response.text();

    // Extract links using regex
    const hrefMatches = html.match(/href="([^"]+)"/g) || [];
    const hrefs = hrefMatches.map((match) => match.replace(/href="([^"]+)"/, '$1'));

    for (const href of hrefs) {
      // Facebook
      if (href.includes('facebook.com') && !href.includes('facebook.com/sharer') && !links.facebook) {
        const fbMatch = href.match(/facebook\.com\/[^/?&"]+/);
        if (fbMatch) {
          links.facebook = 'https://www.' + fbMatch[0];
        }
      }

      // Instagram
      if (href.includes('instagram.com') && !links.instagram) {
        const igMatch = href.match(/instagram\.com\/[^/?&"]+/);
        if (igMatch) {
          links.instagram = 'https://www.' + igMatch[0];
        }
      }

      // YouTube
      if ((href.includes('youtube.com') || href.includes('youtu.be')) && !links.youtube) {
        if (href.includes('youtube.com/channel') || href.includes('youtube.com/c/') || href.includes('youtube.com/@')) {
          links.youtube = href.startsWith('http') ? href : 'https://' + href;
        }
      }

      // LinkedIn
      if (href.includes('linkedin.com/company') && !links.linkedin) {
        links.linkedin = href.startsWith('http') ? href : 'https://' + href;
      }

      // X/Twitter
      if ((href.includes('twitter.com') || href.includes('x.com')) && !links.x) {
        const xMatch = href.match(/(twitter\.com|x\.com)\/[^/?&"]+/);
        if (xMatch) {
          links.x = 'https://' + xMatch[0];
        }
      }

      // TikTok
      if (href.includes('tiktok.com/@') && !links.tiktok) {
        const ttMatch = href.match(/tiktok\.com\/@[^/?&"]+/);
        if (ttMatch) {
          links.tiktok = 'https://www.' + ttMatch[0];
        }
      }

      // Google Business Profile
      if ((href.includes('g.co/kgs') || href.includes('google.com/maps') || href.includes('maps.google.com')) && !links.gbp) {
        links.gbp = href.startsWith('http') ? href : 'https://' + href;
      }

      // Yelp
      if (href.includes('yelp.com/biz') && !links.yelp) {
        links.yelp = href.startsWith('http') ? href : 'https://' + href;
      }

      // Better Business Bureau
      if (href.includes('bbb.org/') && !links.bbb) {
        links.bbb = href.startsWith('http') ? href : 'https://' + href;
      }
    }
  } catch (error) {
    console.error(`Error extracting social links from ${url}:`, error);
  }

  return links;
}

interface GoogleSearchResults {
  gbp?: string;
  website?: string;
  facebook?: string;
}

async function searchGoogleForBusiness(query: string): Promise<GoogleSearchResults> {
  const results: GoogleSearchResults = {};

  try {
    const { launchBrowser } = await import('@/libs/puppeteer/browser');
    const browser = await launchBrowser();
    const page = await browser.newPage();

    // Set a realistic user agent
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    // Search Google
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for results
    await page.waitForSelector('body', { timeout: 10000 });

    // Get the page HTML and extract links
    const html = await page.content();
    
    // Extract links using regex (simpler than evaluate for type safety)
    const linkMatches = html.match(/href="([^"]+)"/g) || [];
    const links: string[] = linkMatches
      .map((match) => match.replace(/href="([^"]+)"/, '$1'))
      .filter((href) => href.startsWith('http'));

    await browser.close();

    // Parse links to find GBP, website, Facebook
    for (const link of links) {
      // Google Business Profile links
      if (
        (link.includes('google.com/maps') || link.includes('g.co/kgs') || link.includes('maps.google.com')) &&
        !results.gbp
      ) {
        results.gbp = link;
      }

      // Facebook links
      if (link.includes('facebook.com') && !link.includes('facebook.com/sharer') && !results.facebook) {
        // Clean up Facebook URL
        const fbMatch = link.match(/facebook\.com\/[^/?&]+/);
        if (fbMatch) {
          results.facebook = 'https://www.' + fbMatch[0];
        }
      }

      // Website links (not Google, Facebook, Yelp, etc.)
      if (
        link.startsWith('http') &&
        !link.includes('google.') &&
        !link.includes('facebook.') &&
        !link.includes('yelp.') &&
        !link.includes('yellowpages.') &&
        !link.includes('bbb.org') &&
        !link.includes('linkedin.') &&
        !link.includes('instagram.') &&
        !link.includes('twitter.') &&
        !link.includes('youtube.') &&
        !results.website
      ) {
        // This might be the business website
        try {
          const url = new URL(link);
          // Skip if it's a Google redirect URL
          if (!url.hostname.includes('google')) {
            results.website = link;
          }
        } catch {
          // Invalid URL, skip
        }
      }
    }

    // If we found a GBP link but no website, try to extract website from GBP page
    // (This will be done by the GBP scraper later)

  } catch (error) {
    console.error(`Error searching Google for "${query}":`, error);
  }

  return results;
}
