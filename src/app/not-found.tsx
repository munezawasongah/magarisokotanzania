import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container py-24 text-center">
      <p className="plate text-2xl">T 404 GS</p>
      <h1 className="display mt-6 text-3xl">This page took a wrong turn</h1>
      <p className="mt-2 text-ink-500">The listing may have been sold or removed.</p>
      <Link href="/cars" className="btn-primary mt-6">Browse cars</Link>
    </div>
  );
}
