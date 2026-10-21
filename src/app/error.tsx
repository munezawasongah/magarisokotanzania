"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container py-24 text-center">
      <h1 className="display text-3xl">Something went wrong</h1>
      <p className="mt-2 text-ink-500">Please try again. If it keeps happening, contact support.</p>
      <button onClick={reset} className="btn-primary mt-6">Try again</button>
    </div>
  );
}
