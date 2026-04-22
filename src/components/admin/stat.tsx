import { cn } from '@/utils/cn';

interface AdminStatProps {
  value: string | number;
  label: string;
  sub?: string;
  accent?: boolean;
}

export function AdminStat({ value, label, sub, accent }: AdminStatProps) {
  return (
    <div>
      <p className={cn('text-4xl font-semibold tracking-tight', accent && 'text-emerald-500 dark:text-emerald-400')}>
        {value}
      </p>
      <p className='mt-1 text-sm font-light text-neutral-500'>{label}</p>
      {sub && <p className='mt-0.5 text-xs text-emerald-500'>{sub}</p>}
    </div>
  );
}
