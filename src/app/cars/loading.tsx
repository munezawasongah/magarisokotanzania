export default function Loading() {
  return (
    <div className="container py-8" aria-busy="true">
      <div className="h-9 w-64 animate-pulse rounded bg-ink-100" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
        <div className="hidden h-[600px] animate-pulse rounded-lg bg-ink-100 lg:block" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-80 animate-pulse rounded-lg bg-ink-100" />)}
        </div>
      </div>
    </div>
  );
}
