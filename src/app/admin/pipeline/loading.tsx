export default function PipelineLoading() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-8 w-32 rounded bg-zinc-200 dark:bg-zinc-800" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="h-14 rounded bg-zinc-100 dark:bg-zinc-900" />
      ))}
    </div>
  );
}
