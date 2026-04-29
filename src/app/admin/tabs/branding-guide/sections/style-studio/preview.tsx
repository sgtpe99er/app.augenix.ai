'use client';

import { VIBE_TOKENS } from './data';
import { PreviewProps } from './types';

export function Preview({
  primary,
  secondary,
  accent,
  background,
  text,
  headingFont,
  bodyFont,
  stylePreference,
  businessName,
  toneOfVoice,
  templateId,
}: PreviewProps) {
  const brand = businessName || 'Your Brand';
  const initials = (businessName || 'BG').slice(0, 2).toUpperCase();
  const tokens = VIBE_TOKENS[stylePreference as keyof typeof VIBE_TOKENS] ?? VIBE_TOKENS.modern;

  return (
    <div className='flex flex-col overflow-hidden rounded-[18px] bg-zinc-900'>
      <div className='flex flex-1 flex-col overflow-hidden rounded-[18px] bg-[#d9d9d9] p-[2px]'>
        <div className='flex flex-1 flex-col overflow-hidden rounded-[16px] bg-[#efefef]'>
          {/* Browser chrome */}
          <div className='flex items-center gap-3 border-b border-black/10 bg-[#e7e7e7] px-3 py-2'>
            <div className='flex items-center gap-1.5'>
              <span className='h-2.5 w-2.5 rounded-full bg-[#ff5f57]' />
              <span className='h-2.5 w-2.5 rounded-full bg-[#febc2e]' />
              <span className='h-2.5 w-2.5 rounded-full bg-[#28c840]' />
            </div>
            <div className='flex-1 px-2'>
              <div className='mx-auto flex h-7 max-w-2xl items-center justify-center rounded-full border border-black/10 bg-white/85 px-4 text-xs text-zinc-500'>
                {brand} Preview
              </div>
            </div>
          </div>

          {/* Page content */}
          <div className='min-h-0 flex-1 overflow-auto' style={{ backgroundColor: background }}>
            <div
              className='w-full'
              style={{ backgroundColor: background, color: text, fontFamily: bodyFont }}
            >
              {templateId === 'heritage' && (
                <HeritageLayout
                  {...{ primary, secondary, accent, background, text, headingFont, bodyFont, brand, initials, tokens, toneOfVoice }}
                />
              )}
              {templateId === 'impact' && (
                <ImpactLayout
                  {...{ primary, secondary, accent, background, text, headingFont, bodyFont, brand, initials, tokens, toneOfVoice }}
                />
              )}
              {templateId === 'corporate' && (
                <CorporateLayout
                  {...{ primary, secondary, accent, background, text, headingFont, bodyFont, brand, initials, tokens, toneOfVoice }}
                />
              )}
              {templateId === 'bright-and-fun' && (
                <PlayfulLayout
                  {...{ primary, secondary, accent, background, text, headingFont, bodyFont, brand, initials, tokens, toneOfVoice }}
                />
              )}
              {templateId === 'luxe' && (
                <LuxeLayout
                  {...{ primary, secondary, accent, background, text, headingFont, bodyFont, brand, initials, tokens, toneOfVoice }}
                />
              )}
              {(!templateId || templateId === 'clean-studio') && (
                <ModernLayout
                  {...{ primary, secondary, accent, background, text, headingFont, bodyFont, brand, initials, tokens, toneOfVoice }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared layout props                                                */
/* ------------------------------------------------------------------ */

interface LayoutProps {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  headingFont: string;
  bodyFont: string;
  brand: string;
  initials: string;
  tokens: (typeof VIBE_TOKENS)[keyof typeof VIBE_TOKENS];
  toneOfVoice: string;
}

/* ------------------------------------------------------------------ */
/*  Modern / Clean Studio — minimal split, whitespace-forward          */
/* ------------------------------------------------------------------ */

function ModernLayout({ primary, secondary, accent, text, headingFont, bodyFont, brand, tokens }: LayoutProps) {
  return (
    <div className='px-6 py-8'>
      {/* Nav */}
      <div className='flex items-center justify-between pb-6' style={{ borderBottom: `1px solid ${text}10` }}>
        <span className='text-sm font-medium tracking-wide' style={{ fontFamily: headingFont }}>{brand}</span>
        <div className='flex items-center gap-6 text-sm opacity-50'>
          <span>Home</span><span>Services</span><span>About</span>
        </div>
        <div
          className='px-4 py-2 text-sm font-medium text-white'
          style={{ backgroundColor: primary, borderRadius: tokens.borderRadius.lg }}
        >
          Get Started
        </div>
      </div>

      {/* Split hero */}
      <div className='grid grid-cols-[1.2fr_0.8fr] gap-8 pt-10'>
        <div>
          <h1 className='text-3xl font-medium leading-tight' style={{ fontFamily: headingFont, color: secondary }}>
            Minimal design,<br />maximum impact.
          </h1>
          <p className='mt-4 max-w-md text-base leading-7 opacity-60'>
            Clean lines, clear hierarchy, and thoughtful whitespace for a modern business presence.
          </p>
          <div className='mt-8 flex gap-3'>
            <div
              className='px-5 py-3 text-sm font-medium text-white'
              style={{ backgroundColor: primary, borderRadius: tokens.borderRadius.lg }}
            >
              Get a Quote
            </div>
            <div
              className='px-5 py-3 text-sm font-medium'
              style={{ border: `1.5px solid ${secondary}30`, color: secondary, borderRadius: tokens.borderRadius.lg }}
            >
              Learn More
            </div>
          </div>
        </div>
        <div className='flex flex-col gap-3'>
          {[1, 2, 3].map((i) => (
            <div key={i} className='p-4' style={{ backgroundColor: `${primary}06`, borderRadius: tokens.borderRadius.lg }}>
              <div className='text-sm font-medium' style={{ fontFamily: headingFont }}>Service {i}</div>
              <div className='mt-1 text-xs opacity-50'>Brief description of this service offering.</div>
            </div>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className='mt-12 grid grid-cols-3 gap-4'>
        {[primary, secondary, accent].filter(Boolean).map((color, i) => (
          <div key={i} className='p-5' style={{ backgroundColor: `${color}10`, borderRadius: tokens.borderRadius.lg }}>
            <div className='h-2 w-8' style={{ backgroundColor: color, borderRadius: tokens.borderRadius.sm }} />
            <div className='mt-3 text-sm font-medium' style={{ fontFamily: headingFont }}>Feature {i + 1}</div>
            <div className='mt-1 text-xs opacity-50'>A clear, concise description.</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Heritage / Classic — centered serif, editorial, ornamental         */
/* ------------------------------------------------------------------ */

function HeritageLayout({ primary, secondary, accent, background, text, headingFont, bodyFont, brand, tokens }: LayoutProps) {
  return (
    <div>
      {/* Centered nav */}
      <div className='flex flex-col items-center py-5' style={{ borderBottom: `1px solid ${text}12` }}>
        <span className='text-lg font-semibold tracking-[0.06em]' style={{ fontFamily: headingFont }}>{brand}</span>
        <div className='mt-2 flex gap-6 text-xs uppercase tracking-[0.15em] opacity-50'>
          <span>Home</span><span>Services</span><span>About</span><span>Contact</span>
        </div>
        <div className='mt-3 w-16' style={{ borderBottom: `1px solid ${primary}40` }} />
      </div>

      {/* Centered hero */}
      <div className='px-8 pt-10 text-center'>
        <div className='text-xs font-semibold uppercase tracking-[0.25em]' style={{ color: primary }}>
          Est. 2024
        </div>
        <h1 className='mt-3 text-3xl font-bold leading-tight' style={{ fontFamily: headingFont, color: secondary }}>
          Crafted with care,<br />built on tradition.
        </h1>
        <p className='mx-auto mt-4 max-w-md text-base leading-7 opacity-60'>
          Where heritage meets modern service. Quality and craftsmanship you can trust.
        </p>
        <div className='mt-8 inline-block border-2 px-6 py-3 text-sm font-semibold' style={{ borderColor: primary, color: primary }}>
          Discover More
        </div>
      </div>

      {/* Zigzag editorial sections */}
      <div className='mt-12 space-y-6 px-8'>
        {['Our Story', 'Our Craft', 'Our Promise'].map((title, i) => {
          const sectionColor = [primary, accent, secondary][i];
          return (
          <div key={title} className={`flex gap-6 ${i % 2 === 1 ? 'flex-row-reverse' : ''}`}>
            <div
              className='h-28 w-1/3 shrink-0'
              style={{ backgroundColor: `${sectionColor}15`, borderRadius: tokens.borderRadius.md }}
            />
            <div className='flex-1 py-2'>
              <div className='text-sm font-bold' style={{ fontFamily: headingFont, color: secondary }}>{title}</div>
              <p className='mt-2 text-sm leading-relaxed opacity-60'>
                A tradition of excellence, passed down through years of dedicated service to our community.
              </p>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Impact / Bold — giant text, dark, sharp, color blocks              */
/* ------------------------------------------------------------------ */

function ImpactLayout({ primary, secondary, accent, background, text, headingFont, brand }: LayoutProps) {
  return (
    <div style={{ backgroundColor: background, color: text }}>
      {/* Bold nav */}
      <div className='flex items-center justify-between px-6 py-4'>
        <span className='text-sm font-black uppercase tracking-wider' style={{ fontFamily: headingFont, color: text }}>{brand}</span>
        <div className='flex items-center gap-5 text-xs uppercase tracking-widest' style={{ color: `${text}80` }}>
          <span>Work</span><span>About</span><span>Contact</span>
        </div>
      </div>

      {/* Giant headline */}
      <div className='px-6 pt-8'>
        <h1 className='text-5xl font-black uppercase leading-[0.95]' style={{ fontFamily: headingFont, color: secondary }}>
          Make an<br />impact.
        </h1>
        <p className='mt-4 max-w-sm text-sm leading-relaxed' style={{ color: `${text}80` }}>
          Bold design for businesses that refuse to blend in. Stand out. Get noticed. Win.
        </p>
        <div className='mt-8 flex gap-3'>
          <div className='px-6 py-3 text-sm font-bold uppercase tracking-wider' style={{ backgroundColor: primary, color: background }}>
            Get a Quote
          </div>
          <div className='border-2 px-6 py-3 text-sm font-bold uppercase tracking-wider' style={{ borderColor: text, color: text }}>
            Our Work
          </div>
        </div>
      </div>

      {/* Color accent strip */}
      <div className='mt-10 flex'>
        <div className='h-2 flex-1' style={{ backgroundColor: primary }} />
        <div className='h-2 flex-1' style={{ backgroundColor: accent }} />
        <div className='h-2 flex-1' style={{ backgroundColor: secondary }} />
      </div>

      {/* Numbered sections */}
      <div className='space-y-0'>
        {['Branding', 'Web Design', 'Marketing'].map((title, i) => (
          <div
            key={title}
            className='flex items-center gap-6 border-t px-6 py-5'
            style={{ borderColor: `${text}15` }}
          >
            <span className='text-2xl font-black' style={{ fontFamily: headingFont, color: `${text}30` }}>0{i + 1}</span>
            <div>
              <div className='text-sm font-bold uppercase tracking-wider' style={{ fontFamily: headingFont, color: text }}>{title}</div>
              <div className='mt-1 text-xs' style={{ color: `${text}66` }}>Results-driven service.</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Corporate / Professional — structured grid, trust bar, stats       */
/* ------------------------------------------------------------------ */

function CorporateLayout({ primary, secondary, accent, background, text, headingFont, brand, initials, tokens }: LayoutProps) {
  return (
    <div className='px-6 py-6'>
      {/* Professional nav */}
      <div className='flex items-center justify-between pb-4' style={{ borderBottom: `1px solid ${text}12` }}>
        <div className='flex items-center gap-3'>
          <div
            className='flex h-9 w-9 items-center justify-center text-xs font-bold text-white'
            style={{ backgroundColor: primary, borderRadius: tokens.borderRadius.sm }}
          >
            {initials}
          </div>
          <span className='text-sm font-semibold' style={{ fontFamily: headingFont }}>{brand}</span>
        </div>
        <div className='flex items-center gap-5 text-sm opacity-50'>
          <span>Services</span><span>About</span><span>Reviews</span>
        </div>
        <div
          className='px-4 py-2 text-sm font-semibold text-white'
          style={{ backgroundColor: primary, borderRadius: tokens.borderRadius.sm }}
        >
          Contact Us
        </div>
      </div>

      {/* Hero */}
      <div className='pt-8'>
        <h1 className='text-2xl font-semibold leading-tight' style={{ fontFamily: headingFont, color: secondary }}>
          Trusted by 500+ local businesses.
        </h1>
        <p className='mt-3 max-w-lg text-base leading-7 opacity-60'>
          Professional service you can count on. Licensed, insured, and committed to excellence.
        </p>
        <div
          className='mt-6 inline-block px-5 py-3 text-sm font-semibold text-white'
          style={{ backgroundColor: primary, borderRadius: tokens.borderRadius.md }}
        >
          Schedule a Consultation
        </div>
      </div>

      {/* Stats row */}
      <div className='mt-8 grid grid-cols-3 gap-3'>
        {[
          { label: 'Years Experience', value: '15+' },
          { label: 'Happy Clients', value: '500+' },
          { label: 'Average Rating', value: '4.9' },
        ].map((stat) => (
          <div
            key={stat.label}
            className='p-4 text-center'
            style={{ backgroundColor: `${primary}06`, borderRadius: tokens.borderRadius.md, boxShadow: tokens.shadows.sm }}
          >
            <div className='text-xl font-bold' style={{ color: primary, fontFamily: headingFont }}>{stat.value}</div>
            <div className='mt-1 text-xs opacity-50'>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Service cards */}
      <div className='mt-8 grid grid-cols-3 gap-3'>
        {['Consulting', 'Implementation', 'Support'].map((svc) => (
          <div
            key={svc}
            className='p-4'
            style={{ borderRadius: tokens.borderRadius.md, boxShadow: tokens.shadows.md, backgroundColor: background }}
          >
            <div className='h-3 w-3' style={{ backgroundColor: `${primary}20`, borderRadius: tokens.borderRadius.sm }} />
            <div className='mt-2 text-sm font-semibold' style={{ fontFamily: headingFont }}>{svc}</div>
            <div className='mt-1 text-xs opacity-50'>Expert-led professional service.</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Playful / Bright & Fun — rounded, bento, bright colors             */
/* ------------------------------------------------------------------ */

function PlayfulLayout({ primary, secondary, accent, text, headingFont, brand, tokens }: LayoutProps) {
  return (
    <div className='px-6 py-6'>
      {/* Pill nav */}
      <div className='flex items-center justify-between pb-4'>
        <div className='flex items-center gap-2'>
          <div
            className='flex h-9 w-9 items-center justify-center rounded-full text-sm text-white'
            style={{ backgroundColor: primary }}
          >
            &#9733;
          </div>
          <span className='text-sm font-bold' style={{ fontFamily: headingFont }}>{brand}</span>
        </div>
        <div className='flex items-center gap-4 text-sm opacity-50'>
          <span>Services</span><span>About</span>
        </div>
        <div
          className='rounded-full px-4 py-2 text-sm font-bold text-white'
          style={{ backgroundColor: accent }}
        >
          Say Hello!
        </div>
      </div>

      {/* Fun hero */}
      <div className='pt-6'>
        <div
          className='mb-3 inline-block -rotate-2 px-3 py-1 text-xs font-bold'
          style={{ backgroundColor: `${accent}20`, color: accent, borderRadius: '16px' }}
        >
          Welcome!
        </div>
        <h1 className='text-3xl font-bold leading-tight' style={{ fontFamily: headingFont, color: secondary }}>
          Fun, friendly<br />& fantastic.
        </h1>
        <p className='mt-3 max-w-md text-base leading-7 opacity-60'>
          We bring energy and personality to everything we do. Your experience should be joyful!
        </p>
        <div className='mt-6 flex gap-3'>
          <div
            className='rounded-full px-5 py-3 text-sm font-bold text-white'
            style={{ backgroundColor: primary }}
          >
            Let&apos;s Go!
          </div>
          <div
            className='rounded-full border-2 px-5 py-3 text-sm font-bold'
            style={{ borderColor: secondary, color: secondary }}
          >
            See Our Work
          </div>
        </div>
      </div>

      {/* Bento grid */}
      <div className='mt-10 grid grid-cols-3 grid-rows-2 gap-3'>
        <div className='col-span-2 rounded-2xl p-5' style={{ backgroundColor: `${primary}12` }}>
          <div className='text-sm font-bold' style={{ fontFamily: headingFont }}>Our Services</div>
          <div className='mt-1 text-sm opacity-50'>Something for everyone — check out what we offer!</div>
        </div>
        <div className='row-span-2 flex flex-col items-center justify-center rounded-2xl' style={{ backgroundColor: `${accent}12` }}>
          <div className='text-3xl'>&#127881;</div>
          <div className='mt-2 text-xs font-bold opacity-60'>Let&apos;s Party!</div>
        </div>
        <div className='rounded-2xl p-4' style={{ backgroundColor: `${secondary}08` }}>
          <div className='text-xs font-bold'>Happiness</div>
          <div className='mt-1 text-2xl font-black' style={{ color: primary }}>98%</div>
        </div>
        <div className='rounded-2xl p-4' style={{ backgroundColor: `${primary}08` }}>
          <div className='text-xs font-bold'>Reviews</div>
          <div className='mt-1 text-lg'>&#11088;&#11088;&#11088;&#11088;&#11088;</div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Luxe / Elegant — dark, thin serif, ultra-spacious                  */
/* ------------------------------------------------------------------ */

function LuxeLayout({ primary, secondary, accent, background, text, headingFont, brand }: LayoutProps) {
  return (
    <div style={{ backgroundColor: background, color: text, minHeight: '100%' }}>
      {/* Ultra-minimal nav */}
      <div className='flex items-center justify-between px-8 py-6'>
        <span className='text-xs uppercase tracking-[0.25em]' style={{ color: `${text}99` }}>{brand}</span>
        <div className='flex gap-8 text-xs uppercase tracking-[0.18em]' style={{ color: `${text}66` }}>
          <span>Gallery</span><span>Services</span><span>Book</span>
        </div>
      </div>

      {/* Spacious centered hero */}
      <div className='flex flex-col items-center px-8 pt-14 text-center'>
        <div className='mb-4 w-12' style={{ borderBottom: `1px solid ${accent}50` }} />
        <h1 className='text-4xl font-light leading-tight tracking-wide' style={{ fontFamily: headingFont, color: secondary }}>
          Effortless<br />Elegance
        </h1>
        <p className='mt-4 text-sm uppercase tracking-[0.18em]' style={{ color: `${text}50` }}>
          A premium experience, refined.
        </p>
        <div
          className='mt-8 border px-8 py-3 text-xs uppercase tracking-[0.15em]'
          style={{ borderColor: `${primary}60`, color: primary }}
        >
          Reserve
        </div>
      </div>

      {/* Minimal feature list */}
      <div className='mx-auto mt-16 max-w-xs space-y-0'>
        {['Bespoke Service', 'Premium Quality', 'Exclusive Experience'].map((item) => (
          <div
            key={item}
            className='border-t py-5 text-center text-xs uppercase tracking-[0.15em]'
            style={{ borderColor: `${text}12`, color: `${text}80` }}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}
