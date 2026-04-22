export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-3">
          <div className="h-5 w-36 rounded bg-zinc-200 dark:bg-zinc-800" />
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="space-y-2">
                <div className="h-8 w-20 rounded bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-3 w-16 rounded bg-zinc-100 dark:bg-zinc-900" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
