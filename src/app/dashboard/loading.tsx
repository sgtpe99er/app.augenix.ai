export default function DashboardLoading() {
  return (
    <div className='space-y-4 py-8'>
      <div className='h-8 w-64 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800' />
      <div className='h-24 w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800' />
      <div className='h-16 w-full animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800' />
    </div>
  );
}
