'use client';

import { useEffect } from 'react';
import type { IconType } from 'react-icons';
import { IoClose } from 'react-icons/io5';

import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

// ─── Tab types ───────────────────────────────────────────────────────────────

export interface ModalTab {
  id: string;
  label: string;
  icon: IconType;
}

// ─── Root Modal ──────────────────────────────────────────────────────────────

interface ModalProps {
  children: React.ReactNode;
  onClose: () => void;
  /** Max width class, defaults to max-w-2xl */
  maxWidth?: string;
}

export function Modal({ children, onClose, maxWidth = 'max-w-2xl' }: ModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4'
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={cn('relative w-full rounded-2xl bg-white dark:bg-zinc-900 shadow-xl', maxWidth)}>
        {children}
      </div>
    </div>
  );
}

// ─── Modal Header ─────────────────────────────────────────────────────────────

interface ModalHeaderProps {
  title: string;
  subtitle?: string;
  onClose: () => void;
}

export function ModalHeader({ title, subtitle, onClose }: ModalHeaderProps) {
  return (
    <div className='flex items-center justify-between px-8 pt-6 pb-4'>
      <div>
        <h2 className='text-xl font-bold'>{title}</h2>
        {subtitle && <p className='text-sm text-neutral-400'>{subtitle}</p>}
      </div>
      <button
        type='button'
        onClick={onClose}
        className='rounded-lg p-1.5 text-neutral-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white transition-colors'
      >
        <IoClose className='h-5 w-5' />
      </button>
    </div>
  );
}

// ─── Modal Tabs ───────────────────────────────────────────────────────────────

interface ModalTabsProps {
  tabs: ModalTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function ModalTabs({ tabs, activeTab, onTabChange }: ModalTabsProps) {
  return (
    <div className='flex gap-2 border-b border-zinc-100 dark:border-zinc-800 px-8 pb-3'>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type='button'
          onClick={() => onTabChange(tab.id)}
          className={cn(
            'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
            activeTab === tab.id
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'text-neutral-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-black dark:hover:text-white'
          )}
        >
          <tab.icon className='h-4 w-4' />
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── Modal Body ───────────────────────────────────────────────────────────────

interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function ModalBody({ children, className }: ModalBodyProps) {
  return (
    <div className={cn('px-8 py-5', className)}>
      {children}
    </div>
  );
}

// ─── Modal Footer ─────────────────────────────────────────────────────────────

interface ModalFooterProps {
  /** Left side — e.g. progress dots or info text */
  left?: React.ReactNode;
  /** Right side — action buttons */
  children: React.ReactNode;
  error?: string;
}

export function ModalFooter({ left, children, error }: ModalFooterProps) {
  return (
    <div className='flex items-center justify-between border-t border-zinc-100 dark:border-zinc-800 px-8 py-4'>
      <div>{left}</div>
      <div className='flex items-center gap-3'>
        {error && <p className='text-sm text-red-400'>{error}</p>}
        {children}
      </div>
    </div>
  );
}

// ─── Progress Dots ────────────────────────────────────────────────────────────

interface ModalProgressDotsProps {
  tabs: ModalTab[];
  activeTab: string;
}

export function ModalProgressDots({ tabs, activeTab }: ModalProgressDotsProps) {
  return (
    <div className='flex gap-1'>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={cn(
            'h-1.5 w-6 rounded-full transition-colors',
            activeTab === tab.id ? 'bg-emerald-500' : 'bg-zinc-700'
          )}
        />
      ))}
    </div>
  );
}

// ─── Confirm Modal ────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConfirmModal({
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal onClose={onClose} maxWidth='max-w-md'>
      <ModalHeader title={title} onClose={onClose} />
      <ModalBody>
        <p className='text-sm text-neutral-400'>{description}</p>
      </ModalBody>
      <ModalFooter>
        <Button type='button' variant='outline' onClick={onClose} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button
          type='button'
          disabled={loading}
          onClick={onConfirm}
          className={
            destructive
              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
              : 'bg-emerald-500 text-black hover:bg-emerald-400'
          }
        >
          {loading ? 'Loading...' : confirmLabel}
        </Button>
      </ModalFooter>
    </Modal>
  );
}
