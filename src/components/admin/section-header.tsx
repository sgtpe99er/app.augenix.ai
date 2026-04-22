interface AdminSectionHeaderProps {
  title: string;
  action?: React.ReactNode;
}

export function AdminSectionHeader({ title, action }: AdminSectionHeaderProps) {
  return (
    <div className='flex items-center justify-between mb-5'>
      <h3 className='text-base font-semibold text-black dark:text-white'>{title}</h3>
      {action && <div>{action}</div>}
    </div>
  );
}
