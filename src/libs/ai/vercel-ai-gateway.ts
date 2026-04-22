/**
 * Vercel AI Gateway Client
 * Uses the AI_GATEWAY_API_KEY to access various AI models through Vercel's unified API
 */

const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AI_GATEWAY_BASE_URL = 'https://ai-gateway.vercel.sh/v1';

export interface VisionComparisonResult {
  differences: string[];
  cssFixSuggestions: string[];
  htmlFixSuggestions: string[];
  overallSimilarity: 'identical' | 'minor_differences' | 'moderate_differences' | 'major_differences';
  summary: string;
}

export interface ImageInput {
  type: 'image_url';
  image_url: {
    url: string; // Can be a URL or base64 data URI
  };
}

export interface TextInput {
  type: 'text';
  text: string;
}

type ContentPart = ImageInput | TextInput;

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

interface ChatCompletionRequest {
  model: string;
  messages: Message[];
  max_tokens?: number;
  temperature?: number;
}

interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Call the Vercel AI Gateway with a chat completion request
 */
async function callAIGateway(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
  if (!AI_GATEWAY_API_KEY) {
    throw new Error('AI_GATEWAY_API_KEY is not configured');
  }

  const response = await fetch(`${AI_GATEWAY_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI Gateway error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Compare two screenshots using vision AI and get CSS/HTML fix suggestions
 */
export async function compareScreenshots(
  originalScreenshotUrl: string,
  rewrittenScreenshotUrl: string,
  rewrittenHtml: string,
  options?: {
    model?: string;
    maxTokens?: number;
  }
): Promise<VisionComparisonResult> {
  const model = options?.model ?? 'google/gemini-2.5-flash';
  const maxTokens = options?.maxTokens ?? 4096;

  // Truncate HTML if too long (keep first 50KB to stay within context limits)
  const truncatedHtml = rewrittenHtml.length > 50000 
    ? rewrittenHtml.substring(0, 50000) + '\n\n<!-- HTML truncated for context limits -->'
    : rewrittenHtml;

  const systemPrompt = `You are an expert web developer specializing in WordPress migrations. Your task is to compare two screenshots of the same webpage:

1. The FIRST image is the ORIGINAL WordPress page (the source of truth)
2. The SECOND image is our MIGRATED version (what we need to fix)

Analyze the visual differences and provide specific, actionable fixes. Focus on:
- Layout differences (spacing, alignment, positioning)
- Typography differences (font sizes, weights, line heights)
- Color differences
- Missing or broken elements
- Image sizing/positioning issues
- Navigation/header/footer differences

You will also receive the current HTML of the migrated page. Provide specific CSS and HTML fixes that can be applied.

Respond in JSON format with this structure:
{
  "differences": ["list of visual differences found"],
  "cssFixSuggestions": ["specific CSS rules to add or modify"],
  "htmlFixSuggestions": ["specific HTML changes needed"],
  "overallSimilarity": "identical|minor_differences|moderate_differences|major_differences",
  "summary": "brief summary of the comparison"
}`;

  const userContent: ContentPart[] = [
    {
      type: 'text',
      text: 'Compare these two screenshots. The first is the original WordPress page, the second is our migrated version.\n\nOriginal WordPress page:',
    },
    {
      type: 'image_url',
      image_url: { url: originalScreenshotUrl },
    },
    {
      type: 'text',
      text: '\n\nMigrated version:',
    },
    {
      type: 'image_url',
      image_url: { url: rewrittenScreenshotUrl },
    },
    {
      type: 'text',
      text: `\n\nCurrent HTML of the migrated page:\n\`\`\`html\n${truncatedHtml}\n\`\`\`\n\nProvide specific fixes to make the migrated version match the original as closely as possible.`,
    },
  ];

  const response = await callAIGateway({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    max_tokens: maxTokens,
    temperature: 0.2,
  });

  const content = response.choices[0]?.message?.content ?? '';
  
  // Parse JSON from the response (handle markdown code blocks)
  let jsonStr = content;
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    const result = JSON.parse(jsonStr) as VisionComparisonResult;
    return result;
  } catch (parseError) {
    // If JSON parsing fails, return a structured error response
    console.error('[vision-compare] Failed to parse AI response as JSON:', content);
    return {
      differences: ['Failed to parse AI response'],
      cssFixSuggestions: [],
      htmlFixSuggestions: [],
      overallSimilarity: 'major_differences',
      summary: `AI response could not be parsed: ${content.substring(0, 500)}`,
    };
  }
}

/**
 * Apply CSS fixes to HTML by injecting a style block
 */
export function applyCssFixes(html: string, cssRules: string[]): string {
  if (cssRules.length === 0) return html;

  const cssBlock = `
<style data-migration-fixes="true">
/* Auto-generated fixes from visual comparison */
${cssRules.join('\n')}
</style>
`;

  // Inject before </head> if present, otherwise before </body>
  if (html.includes('</head>')) {
    return html.replace('</head>', cssBlock + '</head>');
  } else if (html.includes('</body>')) {
    return html.replace('</body>', cssBlock + '</body>');
  }
  
  // Fallback: append to end
  return html + cssBlock;
}

/**
 * Generate a simple text-based comparison prompt (for debugging/logging)
 */
export async function generateComparisonReport(
  originalScreenshotUrl: string,
  rewrittenScreenshotUrl: string
): Promise<string> {
  const model = 'google/gemini-2.5-flash';

  const response = await callAIGateway({
    model,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Compare these two webpage screenshots. The first is the original, the second is a migrated version. List the key visual differences in bullet points.',
          },
          {
            type: 'image_url',
            image_url: { url: originalScreenshotUrl },
          },
          {
            type: 'image_url',
            image_url: { url: rewrittenScreenshotUrl },
          },
        ],
      },
    ],
    max_tokens: 1024,
    temperature: 0.3,
  });

  return response.choices[0]?.message?.content ?? 'No comparison generated';
}
