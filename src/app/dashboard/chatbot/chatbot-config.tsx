'use client';

import { useState } from 'react';
import { IoChatbubbleEllipses, IoCloudUpload,IoCopy, IoSave } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

export function ChatbotConfig() {
  const [systemPrompt, setSystemPrompt] = useState(
    'You are a helpful assistant for our business. Answer customer questions about our services, pricing, and availability. Be friendly, professional, and concise.'
  );
  const [welcomeMessage, setWelcomeMessage] = useState(
    'Hi there! How can I help you today?'
  );
  const [primaryColor, setPrimaryColor] = useState('#000000');
  const [saving, setSaving] = useState(false);

  const embedCode = `<script src="https://app.augenix.ai/api/chatbot/widget.js" data-org="YOUR_ORG_SLUG"></script>`;

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/dashboard/chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, welcomeMessage, primaryColor }),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-normal tracking-tight text-on-surface lg:text-4xl">
          AI Chatbot
        </h1>
        <p className="mt-2 text-on-surface-variant">
          Configure and embed an AI-powered chatbot on your website.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Configuration */}
        <div className="space-y-6">
          {/* System prompt */}
          <div>
            <label htmlFor="system-prompt" className="mb-2 block text-sm font-medium text-on-surface">
              System Prompt
            </label>
            <p className="mb-2 text-xs text-on-surface-variant">
              Define how your chatbot should behave and what it knows about your business.
            </p>
            <textarea
              id="system-prompt"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={6}
              className="w-full resize-none rounded-sm border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Welcome message */}
          <div>
            <label htmlFor="welcome-msg" className="mb-2 block text-sm font-medium text-on-surface">
              Welcome Message
            </label>
            <input
              id="welcome-msg"
              type="text"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="w-full rounded-sm border border-outline-variant/20 bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Widget color */}
          <div>
            <label htmlFor="widget-color" className="mb-2 block text-sm font-medium text-on-surface">
              Widget Color
            </label>
            <div className="flex items-center gap-3">
              <input
                id="widget-color"
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-9 w-9 cursor-pointer rounded-sm border border-outline-variant/20"
              />
              <span className="text-sm text-on-surface-variant">{primaryColor}</span>
            </div>
          </div>

          {/* Knowledge base upload */}
          <div>
            <label className="mb-2 block text-sm font-medium text-on-surface">
              Knowledge Base <span className="font-normal text-on-surface-variant">(optional)</span>
            </label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-sm border border-dashed border-outline-variant/40 bg-surface px-4 py-6 text-sm text-on-surface-variant transition-colors hover:border-on-primary-container hover:text-on-primary-container">
              <IoCloudUpload className="h-5 w-5" />
              Upload documents to train your chatbot (PDF, TXT, MD)
              <input type="file" accept=".pdf,.txt,.md,.docx" multiple className="hidden" />
            </label>
          </div>

          <Button onClick={handleSave} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <IoSave className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>

        {/* Preview & embed code */}
        <div className="space-y-6">
          {/* Chat preview */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-on-surface">Preview</h3>
            <div className="overflow-hidden rounded-sm border border-outline-variant/20 bg-surface-container-lowest">
              <div className="flex items-center gap-2 p-3" style={{ backgroundColor: primaryColor }}>
                <IoChatbubbleEllipses className="h-4 w-4 text-white" />
                <span className="text-sm font-medium text-white">Chat with us</span>
              </div>
              <div className="space-y-3 p-4">
                <div className="max-w-[80%] rounded-sm bg-surface-container-low p-3">
                  <p className="text-sm text-on-surface">{welcomeMessage}</p>
                </div>
                <div className="ml-auto max-w-[80%] rounded-sm p-3" style={{ backgroundColor: primaryColor + '15' }}>
                  <p className="text-sm text-on-surface">What are your business hours?</p>
                </div>
                <div className="max-w-[80%] rounded-sm bg-surface-container-low p-3">
                  <p className="text-sm text-on-surface-variant">
                    <span className="inline-block h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: primaryColor }} />
                    <span className="ml-1.5">Typing...</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Embed code */}
          <div>
            <h3 className="mb-3 text-sm font-medium text-on-surface">Embed Code</h3>
            <p className="mb-2 text-xs text-on-surface-variant">
              Add this script tag to your website to enable the chatbot.
            </p>
            <div className="relative">
              <pre className="overflow-x-auto rounded-sm bg-zinc-900 p-4 text-xs text-zinc-300">
                <code>{embedCode}</code>
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(embedCode)}
                className="absolute right-2 top-2 rounded-sm bg-zinc-700 p-1.5 text-zinc-400 transition-colors hover:text-white"
              >
                <IoCopy className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
