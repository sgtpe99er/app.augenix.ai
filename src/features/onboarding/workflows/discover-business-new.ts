import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';

export interface DiscoveryInput {
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

// ─── Utilities ──────────────────────────────────────────────────────────────

function normalizeUrl(url: string): string {
  let u = url.trim();
  if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
  if (u.endsWith('/')) u = u.slice(0, -1);
  return u;
}

async function fetchHtml(url: string, timeoutMs = 15000): Promise<string> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw new Error(`Timeout fetching ${url}`);
    throw e;
  } finally {
    clearTimeout(id);
  }
}

async function addProgress(sessionId: string, message: string) {
  await supabaseAdminClient.from('onboarding_discovery_items').insert({
    session_id: sessionId,
    field_type: '_progress',
    field_value: message,
    source: 'system',
    confidence: 1,
    status: 'confirmed',
  });
}

async function clearProgress(sessionId: string) {
  await supabaseAdminClient
    .from('onboarding_discovery_items')
    .delete()
    .eq('session_id', sessionId)
    .eq('field_type', '_progress');
}

// ─── Web Search (via Perplexity sonar model through AI Gateway) ─────────────

interface RelatedBusiness {
  name: string;
  websiteUrl: string | null;
  source: string; // where we found this name
}

interface WebSearchResults {
  websiteUrl: string | null;
  facebookUrl: string | null;
  businessName: string | null;
  address: string | null;
  phone: string | null;
  relatedBusinesses: RelatedBusiness[];
  rawText: string;
}

const SKIP_DOMAINS = ['google.com', 'youtube.com', 'facebook.com', 'instagram.com', 'yelp.com', 'bbb.org', 'linkedin.com', 'twitter.com', 'x.com', 'tiktok.com', 'pinterest.com', 'yellowpages.com', 'mapquest.com', 'angi.com', 'thumbtack.com', 'nextdoor.com', 'manta.com', 'perplexity.ai', 'openai', 'whitepages.com', 'spokeo.com', 'scribd.com', 'simplysoldtexas.com', 'numlooker.com', 'dswd.gov.ph'];

function cleanUrl(url: string): string {
  return url.replace(/[.,;:!?)]+$/, '').split('?')[0];
}

function extractUrlFromText(text: string, skipDomains: string[]): string | null {
  const urls = text.match(/https?:\/\/[^\s,)"\]>]+/g) || [];
  for (const url of urls) {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      if (!skipDomains.some(d => domain.includes(d))) return cleanUrl(url);
    } catch { /* skip */ }
  }
  return null;
}

async function searchWeb(query: string): Promise<WebSearchResults> {
  console.log('[Discovery] Web search for:', query);
  const results: WebSearchResults = { websiteUrl: null, facebookUrl: null, businessName: null, address: null, phone: null, relatedBusinesses: [], rawText: '' };

  if (!process.env.AI_GATEWAY_API_KEY) {
    console.log('[Discovery] No AI_GATEWAY_API_KEY — skipping web search');
    return results;
  }

  try {
    const { generateText, createGateway } = await import('ai');
    const gw = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY });

    // Use Perplexity sonar model — it has built-in web search and is
    // far more reliable for business lookups than tool-based search
    const { text } = await generateText({
      model: gw('perplexity/sonar'),
      prompt: `Find the business associated with: ${query}

Return ONLY these details in this exact format (use "unknown" if not found):
BUSINESS_NAME: [name]
WEBSITE: [full URL starting with http]
FACEBOOK: [full Facebook URL]
ADDRESS: [full street address with city, state, zip]
PHONE: [phone number]
OTHER_BUSINESSES: [list any other business names associated with this query, separated by semicolons, with their websites if known in format "Name (url)" — or "none"]`,
    });

    results.rawText = text;
    console.log('[Discovery] Perplexity sonar response:', text.substring(0, 600));

    // Parse structured response
    const nameMatch = text.match(/BUSINESS_NAME:\s*(.+)/i);
    if (nameMatch && !nameMatch[1].includes('unknown')) results.businessName = nameMatch[1].trim();

    const websiteMatch = text.match(/WEBSITE:\s*(https?:\/\/[^\s\])\[]+)/i);
    if (websiteMatch) results.websiteUrl = cleanUrl(websiteMatch[1]);

    const fbMatch = text.match(/FACEBOOK:\s*(https?:\/\/[^\s\])\[]+)/i);
    if (fbMatch && fbMatch[1].includes('facebook.com')) results.facebookUrl = cleanUrl(fbMatch[1]);

    const addrMatch = text.match(/ADDRESS:\s*(.+)/i);
    if (addrMatch && !addrMatch[1].includes('unknown')) results.address = addrMatch[1].trim();

    const phoneMatch = text.match(/PHONE:\s*(.+)/i);
    if (phoneMatch && !phoneMatch[1].includes('unknown')) {
      const digits = phoneMatch[1].replace(/\D/g, '');
      if (digits.length === 10) {
        results.phone = `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
      } else {
        results.phone = phoneMatch[1].trim();
      }
    }

    // Parse OTHER_BUSINESSES
    const otherMatch = text.match(/OTHER_BUSINESSES:\s*(.+)/i);
    if (otherMatch && !otherMatch[1].toLowerCase().includes('none') && !otherMatch[1].includes('unknown')) {
      const entries = otherMatch[1].split(';').map(s => s.trim()).filter(Boolean);
      for (const entry of entries) {
        const nameUrl = entry.match(/^(.+?)\s*\((https?:\/\/[^\s)]+)\)/);
        if (nameUrl) {
          results.relatedBusinesses.push({ name: nameUrl[1].trim(), websiteUrl: cleanUrl(nameUrl[2]), source: 'web_search' });
        } else if (entry.length > 2 && entry.length < 100) {
          results.relatedBusinesses.push({ name: entry, websiteUrl: null, source: 'web_search' });
        }
      }
    }

    // Fallback: if structured parsing missed URLs, try regex on full text
    if (!results.websiteUrl) results.websiteUrl = extractUrlFromText(text, SKIP_DOMAINS);

    if (!results.facebookUrl) {
      const fbUrlMatch = text.match(/https?:\/\/(?:www\.)?facebook\.com\/[^\s,)"\]>?]+/i);
      if (fbUrlMatch) results.facebookUrl = cleanUrl(fbUrlMatch[0]);
    }

    // Fallback: extract business name from bold markdown
    if (!results.businessName) {
      const boldMatch = text.match(/\*\*([^*]+)\*\*/);
      if (boldMatch) results.businessName = boldMatch[1].trim();
    }

    console.log('[Discovery] Search results:', JSON.stringify(results));
  } catch (error) {
    console.error('[Discovery] Web search failed:', error instanceof Error ? error.message : String(error));
  }

  return results;
}

// Specialized search for phone number — finds all businesses/pages linked to a phone
async function searchPhone(phone: string): Promise<WebSearchResults> {
  console.log('[Discovery] Phone-specific search for:', phone);
  const results: WebSearchResults = { websiteUrl: null, facebookUrl: null, businessName: null, address: null, phone: null, relatedBusinesses: [], rawText: '' };

  if (!process.env.AI_GATEWAY_API_KEY) return results;

  try {
    const { generateText, createGateway } = await import('ai');
    const gw = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY });

    const { text } = await generateText({
      model: gw('perplexity/sonar'),
      prompt: `Search for the phone number ${phone}. Find ALL businesses, people, and online listings associated with this phone number.

For each business or listing found, provide:
- Business name
- Website URL (if found)
- Whether it appears to be the current/primary business or an old/previous listing

Return in this exact format:
PRIMARY_BUSINESS: [name]
PRIMARY_WEBSITE: [URL]
PRIMARY_ADDRESS: [address]
FACEBOOK: [URL]
ALL_LISTINGS:
- [Name] | [URL or "no website"] | [current/old/unknown]
- [Name] | [URL or "no website"] | [current/old/unknown]`,
    });

    results.rawText = text;
    console.log('[Discovery] Phone search response:', text.substring(0, 600));

    // Parse primary business
    const primaryName = text.match(/PRIMARY_BUSINESS:\s*(.+)/i);
    if (primaryName && !primaryName[1].includes('unknown')) results.businessName = primaryName[1].trim();

    const primaryUrl = text.match(/PRIMARY_WEBSITE:\s*(https?:\/\/[^\s\])\[]+)/i);
    if (primaryUrl) results.websiteUrl = cleanUrl(primaryUrl[1]);

    const primaryAddr = text.match(/PRIMARY_ADDRESS:\s*(.+)/i);
    if (primaryAddr && !primaryAddr[1].includes('unknown')) results.address = primaryAddr[1].trim();

    const fbMatch = text.match(/FACEBOOK:\s*(https?:\/\/[^\s\])\[]+)/i);
    if (fbMatch && fbMatch[1].includes('facebook.com')) results.facebookUrl = cleanUrl(fbMatch[1]);

    // Parse ALL_LISTINGS
    const listingLines = text.match(/^-\s+(.+)/gm) || [];
    for (const line of listingLines) {
      const parts = line.replace(/^-\s+/, '').split('|').map(s => s.trim());
      if (parts.length >= 1 && parts[0].length > 2) {
        const name = parts[0].replace(/\*+/g, '').trim();
        const urlPart = parts[1] || '';
        const statusPart = (parts[2] || '').toLowerCase();
        const url = urlPart.match(/https?:\/\/[^\s]+/) ? cleanUrl(urlPart.match(/https?:\/\/[^\s]+/)![0]) : null;

        // Don't add the primary business as a related business
        if (name.toLowerCase() !== results.businessName?.toLowerCase()) {
          results.relatedBusinesses.push({
            name: statusPart.includes('old') || statusPart.includes('previous') ? `${name} (previous)` : name,
            websiteUrl: url,
            source: 'phone_search',
          });
        }
      }
    }

    // Fallback URL extraction
    if (!results.websiteUrl) results.websiteUrl = extractUrlFromText(text, SKIP_DOMAINS);
    if (!results.facebookUrl) {
      const fbUrlMatch = text.match(/https?:\/\/(?:www\.)?facebook\.com\/[^\s,)"\]>?]+/i);
      if (fbUrlMatch) results.facebookUrl = cleanUrl(fbUrlMatch[0]);
    }
    if (!results.businessName) {
      const boldMatch = text.match(/\*\*([^*]+)\*\*/);
      if (boldMatch) results.businessName = boldMatch[1].trim();
    }

    console.log('[Discovery] Phone search results:', JSON.stringify(results));
  } catch (error) {
    console.error('[Discovery] Phone search failed:', error instanceof Error ? error.message : String(error));
  }

  return results;
}

// ─── Regex-based extraction (always runs, no API key needed) ─────────────────

function extractBasicData(html: string, url: string): DiscoveredItem[] {
  const items: DiscoveredItem[] = [];

  // Business name from title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch?.[1]) {
    const title = titleMatch[1].trim().split(/[|\-–]/)[0].trim();
    if (title.length > 2 && title.length < 100) {
      items.push({ field_type: 'business_name', field_value: title, source: 'website', source_url: url, confidence: 0.7 });
    }
  }

  // Meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
  if (descMatch?.[1]) {
    items.push({ field_type: 'description', field_value: descMatch[1].trim(), source: 'website', source_url: url, confidence: 0.75 });
  }

  // Phone - check tel: href links first (most reliable)
  const telMatch = html.match(/href=["']tel:([^"']+)["']/i);
  if (telMatch?.[1]) {
    const digits = telMatch[1].replace(/\D/g, '');
    const normalized = digits.length === 11 && digits[0] === '1' ? digits.slice(1) : digits;
    if (normalized.length === 10) {
      const formatted = `(${normalized.slice(0,3)}) ${normalized.slice(3,6)}-${normalized.slice(6)}`;
      items.push({ field_type: 'phone', field_value: formatted, source: 'website', source_url: url, confidence: 0.95 });
    }
  } else {
    // Fallback: regex scan for phone patterns in text
    const phoneMatches = html.match(/(?:\+?1[-.\ s]?)?\(?\d{3}\)?[-.\ s]?\d{3}[-.\ s]?\d{4}/g);
    if (phoneMatches) {
      const phone = phoneMatches.find(p => p.replace(/\D/g, '').length >= 10);
      if (phone) {
        items.push({ field_type: 'phone', field_value: phone.trim(), source: 'website', source_url: url, confidence: 0.8 });
      }
    }
  }

  // Email
  const emailMatches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (emailMatches) {
    const email = emailMatches.find(e =>
      !e.includes('example.com') && !e.includes('sentry.io') && !e.includes('schema.org') && !e.includes('wixpress.com')
    );
    if (email) {
      items.push({ field_type: 'email', field_value: email, source: 'website', source_url: url, confidence: 0.85 });
    }
  }

  // Social links from href attributes
  const hrefs = (html.match(/href=["']([^"']+)["']/g) || []).map(h => h.replace(/href=["']([^"']+)["']/, '$1'));
  for (const href of hrefs) {
    if (href.includes('facebook.com') && !href.includes('sharer') && !href.includes('facebook.com/tr')) {
      const m = href.match(/facebook\.com\/([^/?&#"]+)/);
      if (m?.[1] && !['pages', 'groups', 'events', 'share', 'plugins'].includes(m[1])) {
        items.push({ field_type: 'social_facebook', field_value: `https://www.facebook.com/${m[1]}`, source: 'website', source_url: url, confidence: 0.9 });
        break;
      }
    }
  }
  for (const href of hrefs) {
    if (href.includes('instagram.com')) {
      const m = href.match(/instagram\.com\/([^/?&#"]+)/);
      if (m?.[1] && m[1] !== 'p') {
        items.push({ field_type: 'social_instagram', field_value: `https://www.instagram.com/${m[1]}`, source: 'website', source_url: url, confidence: 0.9 });
        break;
      }
    }
  }

  return items;
}

// ─── AI-enhanced extraction ───────────────────────────────────────────────────

async function extractWithAI(html: string, url: string): Promise<DiscoveredItem[]> {
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY) {
    console.log('[Discovery] No AI API key configured - skipping AI extraction');
    return [];
  }

  const items: DiscoveredItem[] = [];

  try {
    const { generateObject, createGateway } = await import('ai');
    const { z } = await import('zod');

    let model;
    if (process.env.AI_GATEWAY_API_KEY) {
      // Use createGateway with explicit apiKey for local dev
      const gateway = createGateway({ apiKey: process.env.AI_GATEWAY_API_KEY });
      model = gateway('openai/gpt-4o-mini');
    } else {
      const { openai } = await import('@ai-sdk/openai');
      model = openai('gpt-4o-mini');
    }

    const schema = z.object({
      businessName: z.string().nullable(),
      tagline: z.string().nullable(),
      description: z.string().nullable(),
      phone: z.string().nullable(),
      email: z.string().nullable(),
      addressStreet: z.string().nullable(),
      addressCity: z.string().nullable(),
      addressState: z.string().nullable(),
      addressZip: z.string().nullable(),
      socialFacebook: z.string().nullable(),
      socialInstagram: z.string().nullable(),
      socialYoutube: z.string().nullable(),
      socialLinkedin: z.string().nullable(),
      socialX: z.string().nullable(),
      services: z.array(z.string()).nullable(),
      industry: z.string().nullable(),
      hoursMonday: z.string().nullable(),
      hoursTuesday: z.string().nullable(),
      hoursWednesday: z.string().nullable(),
      hoursThursday: z.string().nullable(),
      hoursFriday: z.string().nullable(),
      hoursSaturday: z.string().nullable(),
      hoursSunday: z.string().nullable(),
    });

    // Strip all tags to get plain text + extract href URLs separately
    const hrefUrls = (html.match(/href="([^"]+)"/g) || [])
      .map(h => h.replace(/href="([^"]+)"/, '$1'))
      .filter(u => u.startsWith('http') || u.startsWith('tel:') || u.startsWith('mailto:'));
    
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&#[0-9]+;/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    
    const prompt = `Extract business information from this website content.

Links found on the page:
${hrefUrls.slice(0, 50).join('\n')}

Page text content:
${textContent.slice(0, 15000)}`;

    console.log('[Discovery] AI prompt length:', prompt.length, '(text:', textContent.length, 'chars)');

    const { object } = await generateObject({
      model,
      schema,
      prompt,
    });

    console.log('[Discovery] AI result:', JSON.stringify(object));

    const push = (field_type: string, field_value: any, confidence = 0.9) => {
      if (field_value) items.push({ field_type, field_value, source: 'website', source_url: url, confidence });
    };

    push('business_name', object.businessName);
    push('tagline', object.tagline, 0.8);
    push('description', object.description, 0.8);
    push('phone', object.phone);
    push('email', object.email);
    push('industry', object.industry, 0.75);

    // Address - reconstruct from flat fields
    const address = {
      street: object.addressStreet,
      city: object.addressCity,
      state: object.addressState,
      zip: object.addressZip,
    };
    if (Object.values(address).some(Boolean)) {
      push('address', address, 0.85);
    }

    push('social_facebook', object.socialFacebook, 0.95);
    push('social_instagram', object.socialInstagram, 0.95);
    push('social_youtube', object.socialYoutube, 0.95);
    push('social_linkedin', object.socialLinkedin, 0.95);
    push('social_x', object.socialX, 0.95);
    if (object.services?.length) push('services', object.services, 0.8);

    // Hours - reconstruct from flat fields
    const hours = {
      monday: object.hoursMonday,
      tuesday: object.hoursTuesday,
      wednesday: object.hoursWednesday,
      thursday: object.hoursThursday,
      friday: object.hoursFriday,
      saturday: object.hoursSaturday,
      sunday: object.hoursSunday,
    };
    if (Object.values(hours).some(Boolean)) push('hours', hours, 0.85);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[Discovery] AI EXTRACTION FAILED:', msg);
    // Write full error to file for debugging
    const fs = await import('fs');
    fs.writeFileSync('/tmp/discovery-ai-error.txt', JSON.stringify({ msg, stack: (error as any)?.stack, data: (error as any)?.data, cause: (error as any)?.cause }, null, 2));
  }

  return items;
}

// ─── Merge & dedupe ───────────────────────────────────────────────────────────

function mergeItems(items: DiscoveredItem[]): DiscoveredItem[] {
  const grouped = new Map<string, DiscoveredItem[]>();
  // These types can have multiple values — user picks which are correct
  const multiValueTypes = new Set(['business_name', 'address', 'website', 'related_business']);

  for (const item of items) {
    if (multiValueTypes.has(item.field_type)) {
      // Dedupe by normalized value
      const normalizedVal = typeof item.field_value === 'string'
        ? item.field_value.toLowerCase().trim()
        : typeof item.field_value === 'object' && item.field_value !== null
          ? ((item.field_value as any).name || JSON.stringify(item.field_value)).toLowerCase()
          : String(item.field_value).toLowerCase();
      const key = `${item.field_type}:${normalizedVal}`;
      const existing = grouped.get(key);
      if (existing) {
        // Keep the one with higher confidence
        if (item.confidence > existing[0].confidence) {
          grouped.set(key, [item]);
        }
      } else {
        grouped.set(key, [item]);
      }
    } else {
      const existing = grouped.get(item.field_type) || [];
      existing.push(item);
      grouped.set(item.field_type, existing);
    }
  }
  const merged: DiscoveredItem[] = [];
  for (const group of grouped.values()) {
    merged.push(group.sort((a, b) => b.confidence - a.confidence)[0]);
  }
  return merged;
}

// ─── Helper: scrape a website and extract items ─────────────────────────────

async function scrapeAndExtract(
  sessionId: string,
  url: string,
  allItems: DiscoveredItem[],
): Promise<void> {
  await addProgress(sessionId, `🌐 Fetching ${url}...`);
  console.log('[Discovery] Fetching:', url);

  let html = '';
  try {
    const { getPageHtml } = await import('@/libs/agent-browser/browser');
    html = await getPageHtml(url);
    console.log('[Discovery] Got HTML, length:', html.length);
  } catch (err) {
    console.error('[Discovery] Fetch failed:', err);
    await addProgress(sessionId, `⚠️ Could not load website: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  if (!html) return;

  const basicItems = extractBasicData(html, url);
  console.log('[Discovery] Basic extraction found:', basicItems.length, 'items');
  allItems.push(...basicItems);

  await addProgress(sessionId, `🤖 Analyzing content with AI...`);
  const aiItems = await extractWithAI(html, url);
  console.log('[Discovery] AI extraction found:', aiItems.length, 'items');
  allItems.push(...aiItems);
}

// ─── Helper: get a field value from items (highest confidence) ──────────────

function getItemValue(items: DiscoveredItem[], fieldType: string): string | null {
  const matches = items.filter(i => i.field_type === fieldType).sort((a, b) => b.confidence - a.confidence);
  return matches.length > 0 ? matches[0].field_value : null;
}

// ─── Helper: add search results to items ────────────────────────────────────

function addSearchResults(
  searchResults: WebSearchResults,
  allItems: DiscoveredItem[],
  websiteUrls: Set<string>,
  searchQuery: string,
): void {
  // Use the primary website URL as source_url when available, otherwise note the search query
  const sourceUrl = searchResults.websiteUrl || undefined;
  const source = sourceUrl ? `Found via search: "${searchQuery}"` : `Search: "${searchQuery}"`;

  if (searchResults.websiteUrl) {
    websiteUrls.add(searchResults.websiteUrl);
    allItems.push({ field_type: 'website', field_value: searchResults.websiteUrl, source, source_url: sourceUrl, confidence: 0.85 });
  }
  if (searchResults.facebookUrl) {
    allItems.push({ field_type: 'social_facebook', field_value: searchResults.facebookUrl, source, source_url: searchResults.facebookUrl, confidence: 0.9 });
  }
  if (searchResults.address) allItems.push({ field_type: 'address', field_value: searchResults.address, source, source_url: sourceUrl, confidence: 0.8 });
  if (searchResults.phone) allItems.push({ field_type: 'phone', field_value: searchResults.phone, source, source_url: sourceUrl, confidence: 0.85 });
  if (searchResults.businessName) allItems.push({ field_type: 'business_name', field_value: searchResults.businessName, source, source_url: sourceUrl, confidence: 0.8 });

  // Add related businesses — each one gets their own business_name + website items
  for (const rb of searchResults.relatedBusinesses) {
    const rbSourceUrl = rb.websiteUrl || sourceUrl;
    const rbSource = rb.websiteUrl ? `Found via search: "${searchQuery}"` : source;
    allItems.push({ field_type: 'business_name', field_value: rb.name, source: rbSource, source_url: rbSourceUrl || undefined, confidence: 0.6 });
    if (rb.websiteUrl) {
      websiteUrls.add(rb.websiteUrl);
      allItems.push({ field_type: 'website', field_value: rb.websiteUrl, source: rbSource, source_url: rb.websiteUrl, confidence: 0.6 });
    }
  }
}

// ─── Helper: get ALL distinct values for a field type ────────────────────────

function getAllItemValues(items: DiscoveredItem[], fieldType: string): string[] {
  const seen = new Set<string>();
  return items
    .filter(i => i.field_type === fieldType && typeof i.field_value === 'string')
    .sort((a, b) => b.confidence - a.confidence)
    .map(i => i.field_value as string)
    .filter(v => {
      const norm = v.toLowerCase().trim();
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });
}

// ─── Main workflow ────────────────────────────────────────────────────────────

export async function runDiscoveryWorkflow(input: DiscoveryInput): Promise<{ success: boolean; itemCount: number }> {
  const { sessionId, entryType, entryValue } = input;
  console.log('[Discovery] Starting for session:', sessionId, '| type:', entryType, '| value:', entryValue);

  try {
    await addProgress(sessionId, '🔍 Analyzing entry point...');

    const allItems: DiscoveredItem[] = [];
    const websiteUrls = new Set<string>(); // all discovered website URLs
    const scrapedUrls = new Set<string>();

    // ─── Phase 1: Initial entry point ────────────────────────────────
    if (entryType === 'website') {
      const url = normalizeUrl(entryValue);
      websiteUrls.add(url);
      allItems.push({ field_type: 'website', field_value: url, source: 'user_input', confidence: 1.0 });
    } else if (entryType === 'facebook') {
      const url = normalizeUrl(entryValue);
      allItems.push({ field_type: 'social_facebook', field_value: url, source: 'user_input', confidence: 1.0 });
      await addProgress(sessionId, '🔍 Searching for business info...');
      addSearchResults(await searchWeb(entryValue), allItems, websiteUrls, entryValue);
    } else if (entryType === 'phone' || entryType === 'name_city' || entryType === 'gbp') {
      const query = entryType === 'phone'
        ? entryValue
        : entryType === 'name_city'
          ? `${entryValue} ${input.entryValueSecondary || ''}`
          : entryValue;
      await addProgress(sessionId, `🔍 Searching for "${query}"...`);
      addSearchResults(await searchWeb(query), allItems, websiteUrls, query);
      if (entryType === 'phone') {
        allItems.push({ field_type: 'phone', field_value: entryValue, source: 'user_input', confidence: 1.0 });
      }
    }

    // ─── Phase 2: Scrape first website if we have one ────────────────
    const firstUrl = [...websiteUrls][0];
    if (firstUrl) {
      await scrapeAndExtract(sessionId, firstUrl, allItems);
      scrapedUrls.add(firstUrl);
    }

    // ─── Phase 3: Phone search — ALWAYS if we have a phone ──────────
    // Phone search is the best way to find all related pages/businesses
    const discoveredPhone = getItemValue(allItems, 'phone');
    if (discoveredPhone) {
      await addProgress(sessionId, `📞 Searching phone ${discoveredPhone} for all related listings...`);
      console.log('[Discovery] Phase 3: phone search for:', discoveredPhone);
      const phoneResults = await searchPhone(discoveredPhone);
      addSearchResults(phoneResults, allItems, websiteUrls, discoveredPhone);
    }

    // ─── Phase 4: Search for each discovered business name ───────────
    // Don't lock onto one name — search for ALL found names
    const allNames = getAllItemValues(allItems, 'business_name');
    console.log('[Discovery] Phase 4: found %d business names:', allNames.length, allNames);

    for (const name of allNames.slice(0, 3)) { // cap at 3 names to avoid too many API calls
      await addProgress(sessionId, `🔍 Searching "${name}" for website & socials...`);
      console.log('[Discovery] Phase 4: searching name:', name);
      const nameResults = await searchWeb(`${name} business website facebook address`);
      addSearchResults(nameResults, allItems, websiteUrls, `${name} business website facebook address`);
    }

    // ─── Phase 5: Scrape any new websites we haven't scraped yet ─────
    for (const url of websiteUrls) {
      if (!scrapedUrls.has(url) && scrapedUrls.size < 3) { // cap at 3 scrapes
        await scrapeAndExtract(sessionId, url, allItems);
        scrapedUrls.add(url);
      }
    }

    // Update discovered sources (all found URLs)
    const discoveredSources: Record<string, string> = {};
    let urlIdx = 0;
    for (const url of websiteUrls) {
      discoveredSources[urlIdx === 0 ? 'website' : `website_${urlIdx}`] = url;
      urlIdx++;
    }
    const allFacebooks = getAllItemValues(allItems, 'social_facebook');
    if (allFacebooks[0]) discoveredSources.facebook = allFacebooks[0];
    await supabaseAdminClient
      .from('onboarding_discovery_sessions')
      .update({ discovered_sources: discoveredSources })
      .eq('id', sessionId);

    // ─── Phase 6: Merge, save, done ──────────────────────────────────
    await addProgress(sessionId, '🔄 Saving results...');
    const merged = mergeItems(allItems);
    console.log('[Discovery] Final merge: %d items from %d raw', merged.length, allItems.length);
    await clearProgress(sessionId);

    if (merged.length > 0) {
      await supabaseAdminClient.from('onboarding_discovery_items').insert(
        merged.map(item => ({
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

    await supabaseAdminClient
      .from('onboarding_discovery_sessions')
      .update({ status: 'awaiting_confirmation' })
      .eq('id', sessionId);

    console.log('[Discovery] Done. Items:', merged.length);
    return { success: true, itemCount: merged.length };

  } catch (error) {
    console.error('[Discovery] Fatal error:', error);
    await clearProgress(sessionId);
    await addProgress(sessionId, `❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    await supabaseAdminClient
      .from('onboarding_discovery_sessions')
      .update({ status: 'failed' })
      .eq('id', sessionId);
    throw error;
  }
}

// Keep the old export name for compatibility
export { runDiscoveryWorkflow as discoverBusinessWorkflow };
