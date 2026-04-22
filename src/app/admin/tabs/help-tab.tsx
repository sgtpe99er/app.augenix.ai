'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { IoSearch, IoCopy, IoCheckmark, IoInformationCircle, IoWarning, IoBulb } from 'react-icons/io5';
import { cn } from '@/utils/cn';
import { HELP_DOCS, type DocSection, type ContentBlock, type CalloutVariant } from './help-data';
import { DIAGRAMS } from './help-diagrams';

// ─── Inline text parser (handles **bold** and `code`) ───────────────────────
function InlineText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**'))
          return <strong key={i} className='font-semibold text-white'>{part.slice(2, -2)}</strong>;
        if (part.startsWith('`') && part.endsWith('`'))
          return <code key={i} className='rounded bg-zinc-700 px-1.5 py-0.5 font-mono text-xs text-emerald-300'>{part.slice(1, -1)}</code>;
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

// ─── Copy button ─────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className='flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neutral-400 transition-colors hover:bg-zinc-700 hover:text-white'>
      {copied ? <IoCheckmark className='h-3.5 w-3.5 text-emerald-400' /> : <IoCopy className='h-3.5 w-3.5' />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ─── Callout ─────────────────────────────────────────────────────────────────
const CALLOUT_STYLES: Record<CalloutVariant, { bg: string; border: string; icon: React.ReactNode; label: string }> = {
  info:    { bg: 'bg-blue-500/10',    border: 'border-blue-500/40',    icon: <IoInformationCircle className='h-4 w-4 text-blue-400' />,  label: 'Note' },
  warning: { bg: 'bg-yellow-500/10',  border: 'border-yellow-500/40',  icon: <IoWarning className='h-4 w-4 text-yellow-400' />,          label: 'Warning' },
  tip:     { bg: 'bg-emerald-500/10', border: 'border-emerald-500/40', icon: <IoBulb className='h-4 w-4 text-emerald-400' />,            label: 'Tip' },
};

// ─── Block renderer ───────────────────────────────────────────────────────────
function Block({ block, query }: { block: ContentBlock; query: string }) {
  switch (block.type) {
    case 'paragraph':
      return (
        <p className='text-sm leading-relaxed text-neutral-300'>
          <InlineText text={block.text} />
        </p>
      );

    case 'subheading':
      return (
        <h3 id={block.id} className='mt-6 scroll-mt-4 text-base font-semibold text-white'>
          {block.text}
        </h3>
      );

    case 'code':
      return (
        <div className='group relative overflow-hidden rounded-xl border border-zinc-700'>
          <div className='flex items-center justify-between border-b border-zinc-700 bg-zinc-800/80 px-4 py-2'>
            <span className='font-mono text-xs text-neutral-500'>{block.language}</span>
            <CopyButton text={block.code} />
          </div>
          <SyntaxHighlighter
            language={block.language}
            style={vscDarkPlus}
            customStyle={{ margin: 0, background: 'transparent', padding: '1rem', fontSize: '0.75rem' }}
            codeTagProps={{ style: { fontFamily: 'ui-monospace, monospace' } }}
          >
            {block.code}
          </SyntaxHighlighter>
        </div>
      );

    case 'list':
      return (
        <ul className='space-y-1.5 text-sm'>
          {block.items.map((item, i) => (
            <li key={i} className='flex gap-2 text-neutral-300'>
              <span className='mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500' />
              <InlineText text={item} />
            </li>
          ))}
        </ul>
      );

    case 'steps':
      return (
        <ol className='space-y-2 text-sm'>
          {block.items.map((item, i) => (
            <li key={i} className='flex gap-3'>
              <span className='flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-bold text-emerald-400'>
                {i + 1}
              </span>
              <span className='pt-0.5 text-neutral-300'><InlineText text={item} /></span>
            </li>
          ))}
        </ol>
      );

    case 'callout': {
      const s = CALLOUT_STYLES[block.variant];
      return (
        <div className={cn('flex gap-3 rounded-xl border p-4', s.bg, s.border)}>
          <span className='mt-0.5 shrink-0'>{s.icon}</span>
          <div>
            <span className='text-xs font-semibold uppercase tracking-wider text-neutral-400'>{s.label} </span>
            <span className='text-sm text-neutral-300'><InlineText text={block.text} /></span>
          </div>
        </div>
      );
    }

    case 'table':
      return (
        <div className='overflow-x-auto rounded-xl border border-zinc-700'>
          <table className='w-full text-sm'>
            <thead className='bg-zinc-800'>
              <tr>
                {block.headers.map((h, i) => (
                  <th key={i} className='px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400'>
                    <InlineText text={h} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, ri) => (
                <tr key={ri} className='border-t border-zinc-800 hover:bg-zinc-800/40'>
                  {row.map((cell, ci) => (
                    <td key={ci} className='px-4 py-2.5 text-neutral-300'>
                      <InlineText text={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'diagram': {
      const DiagramComponent = DIAGRAMS[block.diagramId];
      return DiagramComponent ? <DiagramComponent /> : null;
    }

    default:
      return null;
  }
}

// ─── Section renderer ─────────────────────────────────────────────────────────
function Section({ section, query }: { section: DocSection; query: string }) {
  return (
    <div id={section.id} className='scroll-mt-4 space-y-4'>
      <h2 className='text-xl font-bold text-white'>{section.title}</h2>
      {section.content.map((block, i) => (
        <Block key={i} block={block} query={query} />
      ))}
    </div>
  );
}

// ─── Search filter ────────────────────────────────────────────────────────────
function sectionMatchesQuery(section: DocSection, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  if (section.title.toLowerCase().includes(q)) return true;
  return section.content.some((block) => {
    if ('text' in block) return block.text.toLowerCase().includes(q);
    if ('items' in block) return block.items.some((i) => i.toLowerCase().includes(q));
    if ('code' in block) return block.code.toLowerCase().includes(q);
    if ('rows' in block) return block.rows.some((r) => r.some((c) => c.toLowerCase().includes(q)));
    return false;
  });
}

// ─── Main component ───────────────────────────────────────────────────────────
export function HelpTab({ content: _content }: { content: string }) {
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState(HELP_DOCS[0]?.id ?? '');
  const contentRef = useRef<HTMLDivElement>(null);

  const filtered = HELP_DOCS.filter((s) => sectionMatchesQuery(s, query));

  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;
    const sections = container.querySelectorAll('[id]');
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) setActiveId(visible[0].target.id);
      },
      { rootMargin: '-10% 0px -75% 0px', threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [filtered]);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  return (
    <div className='flex gap-6 items-start'>

      {/* ── Left sidebar ── */}
      <aside className='hidden lg:flex w-60 shrink-0 flex-col gap-3'>
        {/* Search */}
        <div className='flex items-center gap-2 rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 focus-within:border-emerald-500/60 transition-colors'>
          <IoSearch className='h-4 w-4 shrink-0 text-neutral-500' />
          <input
            type='text'
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search docs…'
            className='w-full bg-transparent py-2.5 text-sm text-white placeholder-neutral-500 outline-none'
          />
        </div>

        {/* TOC */}
        <div className='sticky top-6 border border-zinc-100 dark:border-zinc-800 rounded-lg p-4'>
          <p className='mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500'>Contents</p>
          {filtered.length === 0 ? (
            <p className='text-xs text-neutral-600'>No results</p>
          ) : (
            <nav className='space-y-0.5'>
              {filtered.map((section) => {
                const subheadings = section.content.filter((b) => b.type === 'subheading') as Array<{ type: 'subheading'; id: string; text: string }>;
                return (
                  <div key={section.id}>
                    <button
                      onClick={() => scrollTo(section.id)}
                      className={cn(
                        'block w-full rounded-lg px-3 py-1.5 text-left text-sm font-semibold transition-colors hover:bg-zinc-800',
                        activeId === section.id ? 'bg-emerald-500/20 text-emerald-400' : 'text-neutral-200 hover:text-white'
                      )}
                    >
                      {section.title}
                    </button>
                    {subheadings.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => scrollTo(sub.id)}
                        className={cn(
                          'block w-full rounded-lg py-1 pl-6 pr-3 text-left text-xs transition-colors hover:bg-zinc-800',
                          activeId === sub.id ? 'text-emerald-400' : 'text-neutral-500 hover:text-neutral-300'
                        )}
                      >
                        {sub.text}
                      </button>
                    ))}
                  </div>
                );
              })}
            </nav>
          )}
        </div>
      </aside>

      {/* ── Content area ── */}
      <div ref={contentRef} className='min-w-0 flex-1'>
        {filtered.length === 0 ? (
          <div className='py-16 text-center'>
            <p className='text-neutral-400'>No results for <span className='text-white'>"{query}"</span></p>
            <button onClick={() => setQuery('')} className='mt-3 text-sm text-emerald-400 hover:underline'>Clear search</button>
          </div>
        ) : (
          filtered.map((section, i) => (
            <div key={section.id}>
              {i > 0 && (
                <div style={{ marginTop: '2.5rem', marginBottom: '2.5rem', borderTop: '1px solid #27272a' }} />
              )}
              <Section section={section} query={query} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
