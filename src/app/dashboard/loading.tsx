export default function DashboardLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      <div>
        <div className="h-9 w-48 rounded-sm bg-surface-container-low" />
        <div className="mt-3 h-5 w-32 rounded-sm bg-surface-container-low" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 rounded-sm bg-surface-container-low" />
        ))}
      </div>
      <div className="h-64 rounded-sm bg-surface-container-low" />
    </div>
  );
}
