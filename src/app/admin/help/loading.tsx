export default function HelpLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-40 rounded bg-zinc-200 dark:bg-zinc-800" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-4 rounded bg-zinc-100 dark:bg-zinc-900" style={{ width: `${70 + (i % 3) * 10}%` }} />
      ))}
    </div>
  );
}
