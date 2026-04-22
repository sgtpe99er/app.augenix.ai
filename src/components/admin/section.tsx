import { cn } from '@/utils/cn';

interface AdminSectionProps {
  children: React.ReactNode;
  className?: string;
}

export function AdminSection({ children, className }: AdminSectionProps) {
  return (
    <div className={cn('rounded-xl bg-neutral-50 px-6 py-5 dark:bg-white/[0.03]', className)}>
      {children}
    </div>
  );
}
