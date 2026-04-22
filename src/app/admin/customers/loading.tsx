export default function CustomersLoading() {
  return (
    <div className="space-y-3 animate-pulse">
      <div className="h-8 w-48 rounded bg-zinc-200 dark:bg-zinc-800" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-12 rounded bg-zinc-100 dark:bg-zinc-900" />
      ))}
    </div>
  );
}
