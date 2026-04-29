'use client';

import { useEffect } from 'react';

import { cn } from '@/utils/cn';

import { CURATED_FONT_PAIRINGS, CURATED_PALETTES, VIBE_TOKENS,WEBSITE_TEMPLATES } from './data';
import { loadGoogleFont } from './utils';

interface TemplatePickerProps {
  selectedTemplateId: string | null;
  onSelect: (templateId: string) => void;
}

export function TemplatePicker({ selectedTemplateId, onSelect }: TemplatePickerProps) {
  useEffect(() => {
    const fontIds = new Set<string>();
    WEBSITE_TEMPLATES.forEach((t) => {
      const fp = CURATED_FONT_PAIRINGS.find((f) => f.id === t.defaultFontPairingId);
      if (fp) {
        fontIds.add(fp.heading);
        fontIds.add(fp.body);
      }
    });
    fontIds.forEach((font) => loadGoogleFont(font));
  }, []);

  return (
    <div className='flex flex-col overflow-hidden rounded-xl bg-zinc-900'>
      <div className='shrink-0 px-5 pt-4 pb-3'>
        <h3 className='text-base font-semibold text-white'>Pick a style for your site</h3>
      </div>
      <div className='min-h-0 flex-1 flex flex-col gap-3 overflow-y-auto px-5 pb-5'>
        {WEBSITE_TEMPLATES.map((template) => {
          const palette = CURATED_PALETTES.find((p) => p.id === template.defaultPaletteId);
          const fontPairing = CURATED_FONT_PAIRINGS.find((f) => f.id === template.defaultFontPairingId);
          if (!palette || !fontPairing) return null;

          const isSelected = selectedTemplateId === template.id;

          return (
            <button
              key={template.id}
              type='button'
              onClick={() => onSelect(template.id)}
              className={cn(
                'group relative shrink-0 overflow-hidden rounded-lg border text-left transition-all',
                isSelected
                  ? 'border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30'
                  : 'border-zinc-700 bg-zinc-800 hover:border-zinc-500'
              )}
            >
              {/* Thumbnail */}
              <div className='relative h-32 overflow-hidden border-b border-white/5'>
                <TemplateThumbnail
                  palette={palette}
                  fontPairing={fontPairing}
                  vibe={template.vibe}
                  templateId={template.id}
                  templateName={template.name}
                />
                {isSelected && (
                  <div className='absolute inset-0 flex items-center justify-center bg-emerald-500/10'>
                    <div className='rounded-full bg-emerald-500 px-2.5 py-0.5 text-[11px] font-bold text-black'>
                      Selected
                    </div>
                  </div>
                )}
              </div>

              {/* Label */}
              <div className='px-3 py-2.5'>
                <div className='text-sm font-bold text-white' style={{ fontFamily: fontPairing.heading }}>
                  {template.name}
                </div>
                <div className='mt-0.5 text-xs text-neutral-400'>{template.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Unique thumbnail layouts per template                              */
/* ------------------------------------------------------------------ */

interface TemplateThumbnailProps {
  palette: { primary: string; secondary: string; accent: string; background: string; text: string };
  fontPairing: { heading: string; body: string };
  vibe: string;
  templateId: string;
  templateName: string;
}

function TemplateThumbnail({ palette, fontPairing, vibe, templateId, templateName }: TemplateThumbnailProps) {
  const { primary, secondary, accent, background, text } = palette;
  const { heading: hFont, body: bFont } = fontPairing;
  const tokens = VIBE_TOKENS[vibe as keyof typeof VIBE_TOKENS] ?? VIBE_TOKENS.modern;

  const layouts: Record<string, () => React.ReactNode> = {
    /* ── Modern: Minimal split hero, thin nav, whitespace-forward ── */
    'clean-studio': () => (
      <div className='h-full w-full' style={{ backgroundColor: background, color: text, fontFamily: bFont }}>
        <div className='flex items-center justify-between px-5 py-2' style={{ borderBottom: `1px solid ${text}10` }}>
          <span className='text-[10px] font-medium tracking-wide' style={{ fontFamily: hFont }}>{templateName}</span>
          <div className='flex gap-3 text-[8px] opacity-40'>
            <span>Home</span><span>Services</span><span>About</span>
          </div>
        </div>
        <div className='grid grid-cols-[1.2fr_0.8fr] gap-4 px-5 pt-6'>
          <div>
            <h2 className='text-[15px] font-medium leading-tight' style={{ fontFamily: hFont, color: secondary }}>
              Minimal design,<br />maximum impact.
            </h2>
            <p className='mt-1.5 text-[8px] leading-relaxed opacity-50'>Clean lines and clear hierarchy for modern businesses.</p>
            <div
              className='mt-3 inline-block px-3 py-1 text-[8px] font-medium'
              style={{ backgroundColor: primary, color: '#fff', borderRadius: tokens.borderRadius.lg }}
            >
              Get Started
            </div>
          </div>
          <div className='flex flex-col gap-1.5'>
            <div className='h-8 rounded' style={{ backgroundColor: `${primary}10` }} />
            <div className='h-8 rounded' style={{ backgroundColor: `${primary}08` }} />
            <div className='h-8 rounded' style={{ backgroundColor: `${primary}05` }} />
          </div>
        </div>
      </div>
    ),

    /* ── Classic: Centered serif heading, editorial, ornamental ── */
    'heritage': () => (
      <div className='h-full w-full' style={{ backgroundColor: background, color: text, fontFamily: bFont }}>
        <div className='flex flex-col items-center py-2'>
          <span className='text-[11px] font-semibold tracking-[0.08em]' style={{ fontFamily: hFont }}>{templateName}</span>
          <div className='mt-1 flex gap-4 text-[7px] uppercase tracking-[0.12em] opacity-50'>
            <span>Home</span><span>Services</span><span>About</span><span>Contact</span>
          </div>
          <div className='mt-1.5 w-12' style={{ borderBottom: `1px solid ${primary}40` }} />
        </div>
        <div className='px-5 pt-3 text-center'>
          <div className='mx-auto text-[7px] font-semibold uppercase tracking-[0.2em]' style={{ color: primary }}>
            Est. 2024
          </div>
          <h2 className='mt-1 text-[16px] font-bold leading-tight' style={{ fontFamily: hFont, color: secondary }}>
            Crafted with care,<br />built on tradition.
          </h2>
          <p className='mt-1 text-[8px] opacity-50'>Where heritage meets modern service.</p>
          <div className='mt-2.5 inline-block border px-3 py-1 text-[8px] font-medium' style={{ borderColor: primary, color: primary }}>
            Discover More
          </div>
        </div>
      </div>
    ),

    /* ── Bold: Giant text, dark bg, color accent strip, sharp edges ── */
    'impact': () => (
      <div className='h-full w-full' style={{ backgroundColor: '#111', color: '#fff', fontFamily: bFont }}>
        <div className='flex items-center justify-between px-4 py-2'>
          <span className='text-[10px] font-black uppercase tracking-wide' style={{ fontFamily: hFont }}>{templateName}</span>
          <div className='flex gap-2 text-[7px] uppercase tracking-wider opacity-50'>
            <span>Work</span><span>About</span>
          </div>
        </div>
        <div className='px-4 pt-3'>
          <h2 className='text-[22px] font-black uppercase leading-[0.95]' style={{ fontFamily: hFont, color: '#fff' }}>
            Make an<br />impact.
          </h2>
          <div className='mt-2 flex gap-2'>
            <div className='px-2.5 py-1 text-[8px] font-bold uppercase' style={{ backgroundColor: primary, color: '#fff' }}>
              Get a Quote
            </div>
            <div className='border px-2.5 py-1 text-[8px] font-bold uppercase' style={{ borderColor: '#fff', color: '#fff' }}>
              Our Work
            </div>
          </div>
        </div>
        <div className='mt-3 flex'>
          <div className='h-1.5 flex-1' style={{ backgroundColor: primary }} />
          <div className='h-1.5 flex-1' style={{ backgroundColor: accent }} />
          <div className='h-1.5 flex-1' style={{ backgroundColor: '#fff' }} />
        </div>
      </div>
    ),

    /* ── Corporate: Structured grid, trust bar, CTA in nav, shadow cards ── */
    'corporate': () => (
      <div className='h-full w-full' style={{ backgroundColor: background, color: text, fontFamily: bFont }}>
        <div className='flex items-center justify-between px-4 py-2' style={{ borderBottom: `1px solid ${text}10` }}>
          <div className='flex items-center gap-1.5'>
            <div className='flex h-5 w-5 items-center justify-center text-[7px] font-bold text-white' style={{ backgroundColor: primary, borderRadius: tokens.borderRadius.sm }}>
              {templateName.slice(0, 2).toUpperCase()}
            </div>
            <span className='text-[9px] font-semibold' style={{ fontFamily: hFont }}>{templateName}</span>
          </div>
          <div className='flex items-center gap-3'>
            <div className='flex gap-2 text-[7px] opacity-50'>
              <span>Services</span><span>About</span>
            </div>
            <div className='px-2 py-0.5 text-[7px] font-semibold text-white' style={{ backgroundColor: primary, borderRadius: tokens.borderRadius.sm }}>
              Contact Us
            </div>
          </div>
        </div>
        <div className='px-4 pt-3'>
          <h2 className='text-[13px] font-semibold leading-tight' style={{ fontFamily: hFont, color: secondary }}>
            Trusted by 500+ local businesses.
          </h2>
          <p className='mt-1 text-[8px] opacity-50'>Professional service you can count on.</p>
        </div>
        <div className='mt-2.5 flex gap-2 px-4'>
          {['15+ Years', '500+ Clients', '4.9 Rating'].map((stat) => (
            <div
              key={stat}
              className='flex-1 px-2 py-1.5 text-center text-[7px] font-medium'
              style={{ backgroundColor: `${primary}08`, borderRadius: tokens.borderRadius.md, boxShadow: tokens.shadows.sm }}
            >
              {stat}
            </div>
          ))}
        </div>
        <div className='mt-2 flex gap-1.5 px-4'>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className='flex-1 p-1.5 text-[6px]'
              style={{ backgroundColor: '#fff', borderRadius: tokens.borderRadius.md, boxShadow: tokens.shadows.sm }}
            >
              <div className='h-2 w-2 rounded-sm' style={{ backgroundColor: `${primary}20` }} />
              <div className='mt-1 font-medium' style={{ fontFamily: hFont }}>Service {i}</div>
            </div>
          ))}
        </div>
      </div>
    ),

    /* ── Playful: Rounded shapes, wavy badge, bento grid, bright colors ── */
    'bright-and-fun': () => (
      <div className='h-full w-full' style={{ backgroundColor: background, color: text, fontFamily: bFont }}>
        <div className='flex items-center justify-between px-4 py-2'>
          <div className='flex items-center gap-1.5'>
            <div className='flex h-5 w-5 items-center justify-center rounded-full text-[8px]' style={{ backgroundColor: primary, color: '#fff' }}>
              ★
            </div>
            <span className='text-[9px] font-bold' style={{ fontFamily: hFont }}>{templateName}</span>
          </div>
          <div className='rounded-full px-2.5 py-0.5 text-[7px] font-bold' style={{ backgroundColor: accent, color: '#fff' }}>
            Say Hello!
          </div>
        </div>
        <div className='px-4 pt-2'>
          <div
            className='mb-1 inline-block -rotate-2 px-2 py-0.5 text-[7px] font-bold'
            style={{ backgroundColor: `${accent}25`, color: accent, borderRadius: '12px' }}
          >
            Welcome!
          </div>
          <h2 className='text-[14px] font-bold leading-tight' style={{ fontFamily: hFont, color: secondary }}>
            Fun, friendly<br />& fantastic.
          </h2>
        </div>
        <div className='mt-2.5 grid grid-cols-3 grid-rows-2 gap-1.5 px-4'>
          <div className='col-span-2 row-span-1 rounded-xl p-2' style={{ backgroundColor: `${primary}15` }}>
            <div className='text-[7px] font-bold' style={{ fontFamily: hFont }}>Our Services</div>
            <div className='mt-0.5 text-[6px] opacity-50'>Something for everyone!</div>
          </div>
          <div className='row-span-2 flex items-center justify-center rounded-xl' style={{ backgroundColor: `${accent}15` }}>
            <div className='text-[14px]'>&#127881;</div>
          </div>
          <div className='rounded-xl p-1.5' style={{ backgroundColor: `${secondary}08` }}>
            <div className='text-[6px] font-bold'>Happy</div>
            <div className='text-[10px] font-black' style={{ color: primary }}>98%</div>
          </div>
          <div className='rounded-xl p-1.5' style={{ backgroundColor: `${primary}10` }}>
            <div className='text-[6px] font-bold'>Reviews</div>
            <div className='text-[8px]'>&#11088;&#11088;&#11088;&#11088;&#11088;</div>
          </div>
        </div>
      </div>
    ),

    /* ── Elegant: Dark bg, thin serif, ultra-spacious, minimal ── */
    'luxe': () => (
      <div className='h-full w-full' style={{ backgroundColor: '#1a1a18', color: '#f5f0eb', fontFamily: bFont }}>
        <div className='flex items-center justify-between px-5 py-3'>
          <span className='text-[8px] uppercase tracking-[0.2em] opacity-60'>{templateName}</span>
          <div className='flex gap-4 text-[7px] uppercase tracking-[0.15em] opacity-40'>
            <span>Gallery</span><span>Services</span><span>Book</span>
          </div>
        </div>
        <div className='flex flex-col items-center px-5 pt-6 text-center'>
          <div className='mb-2 w-8' style={{ borderBottom: `1px solid ${accent}60` }} />
          <h2
            className='text-[17px] font-light leading-tight tracking-wide'
            style={{ fontFamily: hFont, color: '#f5f0eb' }}
          >
            Effortless<br />Elegance
          </h2>
          <p className='mt-2 text-[7px] uppercase tracking-[0.15em] opacity-30'>
            A premium experience, refined.
          </p>
          <div
            className='mt-3 border px-4 py-1 text-[7px] uppercase tracking-[0.12em]'
            style={{ borderColor: `${accent}50`, color: accent }}
          >
            Reserve
          </div>
        </div>
      </div>
    ),
  };

  const renderLayout = layouts[templateId] ?? layouts['clean-studio'];

  return (
    <div
      className='absolute inset-0 origin-top-left'
      style={{ width: 640, height: 400, transform: 'scale(0.5)', transformOrigin: 'top left' }}
    >
      {renderLayout!()}
    </div>
  );
}
