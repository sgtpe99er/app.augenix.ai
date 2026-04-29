import { NextRequest, NextResponse } from 'next/server';

import { supabaseAdminClient } from '@/libs/supabase/supabase-admin';
import { createSupabaseServerClient } from '@/libs/supabase/supabase-server-client';

async function logActivity(jobId: string, action: string, message: string) {
  try {
    const { data: job } = await supabaseAdminClient
      .from('migration_jobs')
      .select('build_status')
      .eq('id', jobId)
      .single();
    const buildStatus = ((job?.build_status as any) || {});
    const activity = buildStatus.recent_activity || [];
    activity.push({ timestamp: new Date().toISOString(), action, message });
    await supabaseAdminClient
      .from('migration_jobs')
      .update({ build_status: { ...buildStatus, recent_activity: activity } })
      .eq('id', jobId);
  } catch (e) {
    console.error('[logActivity] Failed:', e);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId, pageLabel } = await request.json();

    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
    }

    // Get job and homepage data
    const { data: job, error: jobError } = await supabaseAdminClient
      .from('migration_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Get brand guide from database
    const { data: brandGuide, error: brandGuideError } = await supabaseAdminClient
      .from('brand_guides')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (brandGuideError || !brandGuide) {
      return NextResponse.json({ error: 'Brand guide not found. Please extract brand guide first.' }, { status: 400 });
    }

    // Check if components already created
    if ((job.metadata as any)?.component_library) {
      return NextResponse.json({
        message: 'Components already created',
        components: (job.metadata as any).component_library,
      });
    }

    await logActivity(jobId, 'components_start', 'Starting component identification...');

    // Get homepage HTML - try exact match, then with/without trailing slash
    const targetUrl = job.target_url;
    const targetUrlAlt = targetUrl.endsWith('/') ? targetUrl.slice(0, -1) : targetUrl + '/';

    let homepage: { original_html: string | null; url: string } | null = null;

    const { data: exactMatch } = await supabaseAdminClient
      .from('migration_pages')
      .select('original_html, url')
      .eq('job_id', jobId)
      .eq('url', targetUrl)
      .single();

    if (exactMatch) {
      homepage = exactMatch;
    } else {
      const { data: altMatch } = await supabaseAdminClient
        .from('migration_pages')
        .select('original_html, url')
        .eq('job_id', jobId)
        .eq('url', targetUrlAlt)
        .single();
      if (altMatch) homepage = altMatch;
    }

    if (!homepage) {
      return NextResponse.json({ error: 'Homepage not found' }, { status: 404 });
    }

    if (!homepage.original_html) {
      return NextResponse.json({ error: 'Homepage HTML not found. Please run capture first.' }, { status: 400 });
    }

    const htmlLength = homepage.original_html.length;
    const CHUNK_SIZE = 15000;
    const totalChunks = Math.ceil(htmlLength / CHUNK_SIZE);
    await logActivity(jobId, 'components_html', `Found homepage HTML (${Math.round(htmlLength / 1024)}KB) — will process in ${totalChunks} chunk${totalChunks > 1 ? 's' : ''}`);

    const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
    if (!AI_GATEWAY_API_KEY) {
      return NextResponse.json({ error: 'AI Gateway API key not configured' }, { status: 500 });
    }

    const brandGuideJson = JSON.stringify({
      colors: brandGuide.colors,
      typography: brandGuide.typography,
      spacing: brandGuide.spacing,
      border_radius: brandGuide.border_radius,
      shadows: brandGuide.shadows,
      ui_patterns: brandGuide.ui_patterns,
    }, null, 2);

    // Process HTML in chunks, accumulating components
    let allComponents: any[] = [];

    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const chunk = homepage.original_html.substring(start, start + CHUNK_SIZE);
      const isFirst = chunkIndex === 0;
      const isLast = chunkIndex === totalChunks - 1;

      await logActivity(jobId, 'components_ai', `Analyzing chunk ${chunkIndex + 1}/${totalChunks} (chars ${start + 1}–${Math.min(start + CHUNK_SIZE, htmlLength)})...`);

      const existingNames = allComponents.map(c => c.name);
      const previousContext = allComponents.length > 0
        ? `\n\nComponents already identified from previous chunks (do NOT duplicate these, only add NEW ones):\n${existingNames.join(', ')}`
        : '';

      const prompt = `
Analyze the following HTML chunk and identify reusable React components that should be created. Consider the brand guide provided.
${isFirst ? '' : '\nThis is a CONTINUATION of the same page. Only identify NEW components not already listed.'}

Brand Guide:
${brandGuideJson}

HTML Content (chunk ${chunkIndex + 1}/${totalChunks}):
${chunk}
${previousContext}

Identify components based on:
1. Repeated patterns (header, footer, navigation)
2. Distinct sections (hero, about, services, contact)
3. Interactive elements (buttons, forms, cards)
4. Layout components (containers, grids, sections)

For each component, provide:
- name: Component name (PascalCase)
- type: Component category (layout, ui, section, form)
- description: What this component does
- props: Array of props this component should accept
- cssClasses: Key CSS classes used
- variations: Different variations if any

Return as JSON:
{
  "components": [
    {
      "name": "Header",
      "type": "layout",
      "description": "Site header with navigation",
      "props": [
        {"name": "logo", "type": "string", "description": "Logo URL"},
        {"name": "menuItems", "type": "array", "description": "Navigation items"}
      ],
      "cssClasses": ["header", "nav", "logo"],
      "variations": ["with-submenu", "transparent"]
    }
  ]
}
${isLast ? '' : '\nOnly return NEW components found in this chunk.'}`;

      const aiResponse = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'openai/gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert React component architect. Identify components that would be reusable and follow best practices. Only return NEW components not already identified.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.2,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(`AI Gateway error (${aiResponse.status}): ${errorText}`);
      }

      const completion = await aiResponse.json();
      const componentsText = completion.choices?.[0]?.message?.content;

      let chunkComponents: any[] = [];
      try {
        const parsed = JSON.parse(componentsText || '{"components": []}');
        chunkComponents = parsed.components || [];
      } catch (e) {
        const jsonMatch = componentsText?.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          chunkComponents = parsed.components || [];
        }
      }

      // Deduplicate by name (case-insensitive)
      const existingNamesLower = new Set(allComponents.map(c => c.name.toLowerCase()));
      const newComponents = chunkComponents.filter(
        (c: any) => !existingNamesLower.has(c.name.toLowerCase())
      );
      allComponents = [...allComponents, ...newComponents];

      await logActivity(jobId, 'components_chunk_done', `Chunk ${chunkIndex + 1}/${totalChunks}: found ${newComponents.length} new component${newComponents.length !== 1 ? 's' : ''} (${allComponents.length} total)`);
    }

    const components = { components: allComponents };
    await logActivity(jobId, 'components_parsed', `Identified ${allComponents.length} total components across ${totalChunks} chunk${totalChunks > 1 ? 's' : ''}. Generating files...`);

    // Generate component files
    const brandGuideData = {
      colors: brandGuide.colors,
      typography: brandGuide.typography,
      spacing: brandGuide.spacing,
      border_radius: brandGuide.border_radius,
      shadows: brandGuide.shadows,
      ui_patterns: brandGuide.ui_patterns,
    };
    const componentFiles = await generateComponentFiles(components.components, brandGuideData);

    await logActivity(jobId, 'components_upload', `Generated ${componentFiles.length} files. Uploading to storage...`);

    // Upload component files to storage
    const uploadedFiles = [];
    for (const file of componentFiles) {
      const filePath = `${jobId}/components/${file.path}`;
      const { error: uploadError } = await supabaseAdminClient.storage
        .from('migration-assets')
        .upload(filePath, file.content, {
          contentType: 'text/typescript',
          upsert: true,
        });

      if (!uploadError) {
        const { data: url } = supabaseAdminClient.storage
          .from('migration-assets')
          .getPublicUrl(filePath);
        
        uploadedFiles.push({
          path: file.path,
          url: url.publicUrl,
        });
      }
    }

    // Save component library to metadata
    const metadata = (job.metadata as any) || {};
    metadata.component_library = {
      components: components.components,
      files: uploadedFiles,
      created_at: new Date().toISOString(),
    };

    const buildStatus = (job.build_status as any) || {};
    await supabaseAdminClient
      .from('migration_jobs')
      .update({
        metadata,
        component_library_url: uploadedFiles[0]?.url || null,
        build_status: {
          ...buildStatus,
          phase: 'homepage',
          current_step: 'components_complete',
          completed_at: new Date().toISOString(),
          recent_activity: [
            ...(buildStatus.recent_activity || []),
            {
              timestamp: new Date().toISOString(),
              action: 'components_created',
              message: `Created ${components.components.length} components`,
              details: {
                componentCount: components.components.length,
                fileCount: uploadedFiles.length,
                types: [...new Set(components.components.map((c: any) => c.type))],
              }
            }
          ]
        }
      })
      .eq('id', jobId);

    await logActivity(jobId, 'components_complete', `Created ${components.components.length} components with ${uploadedFiles.length} files`);

    return NextResponse.json({
      message: 'Components created successfully',
      components: components.components,
      files: uploadedFiles,
    });
  } catch (error: any) {
    console.error('[wp-migration-v2-components] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateComponentFiles(components: any[], brandGuide: any) {
  const files = [];

  for (const component of components) {
    // Generate TypeScript interface for props
    const propsInterface = generatePropsInterface(component.name, component.props);
    
    // Generate component code
    const componentCode = generateComponentCode(component, brandGuide);
    
    // Generate index file
    const indexCode = generateIndexCode(component.name);

    files.push({
      path: `${component.name.toLowerCase()}/index.ts`,
      content: indexCode,
    });

    files.push({
      path: `${component.name.toLowerCase()}/${component.name}.tsx`,
      content: componentCode,
    });

    files.push({
      path: `${component.name.toLowerCase()}/${component.name}.types.ts`,
      content: propsInterface,
    });
  }

  // Generate main index file
  const mainIndex = components.map(c => `export { ${c.name} } from './${c.name.toLowerCase()}';`).join('\n');
  files.push({
    path: 'index.ts',
    content: mainIndex,
  });

  return files;
}

function generatePropsInterface(componentName: string, props: any[]) {
  const imports = new Set<string>();
  const propLines = props.map(prop => {
    let type = prop.type;
    if (prop.type === 'array') type = 'any[]';
    if (prop.type === 'object') type = 'Record<string, any>';
    
    return `  ${prop.name}?: ${type}; // ${prop.description}`;
  });

  return `export interface ${componentName}Props {
${propLines.join('\n')}
}
`;
}

function generateComponentCode(component: any, brandGuide: any) {
  const { name, type, description, props } = component;
  
  // Generate prop destructuring
  const propDestructure = props.map((p: any) => p.name).join(', ') || '{}';
  
  // Generate CSS classes
  const cssClasses = component.cssClasses?.join(' ') || '';

  return `import React from 'react';
import { cn } from '@/lib/utils';
import { ${name}Props } from './${name}.types';

/**
 * ${description}
 * Type: ${type}
 */
export const ${name}: React.FC<${name}Props> = ({ ${propDestructure} }) => {
  return (
    <div className={cn('${cssClasses}', 'component-${name.toLowerCase()}')}>
      {/* TODO: Implement ${name} component based on design */}
      {/* Brand colors: ${brandGuide.colors?.primary?.[0] || 'N/A'} */}
      {/* Font: ${brandGuide.typography?.fontFamily?.primary || 'N/A'} */}
    </div>
  );
};
`;
}

function generateIndexCode(componentName: string) {
  return `export { ${componentName} } from './${componentName}';
export type { ${componentName}Props } from './${componentName}.types';
`;
}
