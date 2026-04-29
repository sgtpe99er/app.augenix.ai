'use client';

import { useState } from 'react';
import { IoArrowForward,IoDocumentText, IoLogoTwitter, IoMail, IoSparkles } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

type ContentType = 'blog' | 'social' | 'email';

const CONTENT_TYPES: Array<{ key: ContentType; label: string; icon: typeof IoDocumentText; description: string }> = [
  { key: 'blog', label: 'Blog Post', icon: IoDocumentText, description: 'Generate a full blog post from a topic or prompt.' },
  { key: 'social', label: 'Social Post', icon: IoLogoTwitter, description: 'Create engaging social media content.' },
  { key: 'email', label: 'Email Sequence', icon: IoMail, description: 'Draft email sequences for nurturing leads.' },
];

export function ContentDashboard() {
  const [selectedType, setSelectedType] = useState<ContentType>('blog');
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/ai/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, prompt }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? 'Failed to generate content');
      }

      const data = await res.json();
      setResult(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-normal tracking-tight text-on-surface lg:text-4xl">
          Content Generation
        </h1>
        <p className="mt-2 text-on-surface-variant">
          Use AI to create blog posts, social media content, and email sequences.
        </p>
      </div>

      {/* Content type selector */}
      <div className="grid gap-3 sm:grid-cols-3">
        {CONTENT_TYPES.map((type) => (
          <button
            key={type.key}
            onClick={() => { setSelectedType(type.key); setResult(null); }}
            className={cn(
              'flex items-start gap-3 rounded-sm p-4 text-left transition-colors',
              selectedType === type.key
                ? 'bg-primary text-primary-foreground'
                : 'bg-surface-container-lowest text-on-surface hover:bg-surface-container-low'
            )}
          >
            <type.icon className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">{type.label}</p>
              <p className={cn('mt-1 text-xs', selectedType === type.key ? 'opacity-80' : 'text-on-surface-variant')}>
                {type.description}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Prompt input */}
      <div>
        <label htmlFor="content-prompt" className="mb-2 block text-sm font-medium text-on-surface">
          {selectedType === 'blog' && 'Blog topic or outline'}
          {selectedType === 'social' && 'Social post topic or key points'}
          {selectedType === 'email' && 'Email sequence goal and audience'}
        </label>
        <textarea
          id="content-prompt"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            selectedType === 'blog'
              ? 'e.g. Write a blog post about 5 tips for maintaining your HVAC system during summer...'
              : selectedType === 'social'
                ? 'e.g. Promote our new same-day delivery service with an engaging tone...'
                : 'e.g. Create a 3-email nurture sequence for new leads interested in our roofing services...'
          }
          rows={4}
          className="w-full resize-none rounded-sm border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>

      {error && (
        <div className="rounded-sm bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      <Button
        onClick={handleGenerate}
        disabled={!prompt.trim() || generating}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <IoSparkles className="mr-2 h-4 w-4" />
        {generating ? 'Generating...' : 'Generate Content'}
      </Button>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-on-surface">Generated Content</h3>
          <div className="prose prose-sm max-w-none rounded-sm bg-surface-container-lowest p-6 dark:prose-invert">
            <div className="whitespace-pre-wrap text-on-surface-variant">{result}</div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(result)}>
              Copy to Clipboard
            </Button>
            <Button variant="ghost" onClick={() => { setResult(null); setPrompt(''); }}>
              Start Over
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
