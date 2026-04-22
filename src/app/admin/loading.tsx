export default function AdminLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 lg:grid-cols-5 border-b border-zinc-100 dark:border-zinc-900 pb-8">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-8 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
            <div className="h-3 w-16 rounded bg-zinc-100 dark:bg-zinc-900" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-12 rounded bg-zinc-100 dark:bg-zinc-900" />
        ))}
      </div>
    </div>
  );
}
