interface AdminListRowProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AdminListRow({ title, subtitle, actions }: AdminListRowProps) {
  return (
    <div className='flex items-start justify-between gap-4 py-4'>
      <div className='min-w-0 flex-1'>
        <p className='text-sm font-medium'>{title}</p>
        {subtitle && <p className='mt-0.5 text-xs font-light text-neutral-400'>{subtitle}</p>}
      </div>
      {actions && <div className='flex shrink-0 items-center gap-2'>{actions}</div>}
    </div>
  );
}
