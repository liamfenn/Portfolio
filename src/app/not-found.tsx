import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-fill px-4">
      <div className="flex flex-col gap-1">
        <span className="type-mono-responsive text-muted">404</span>
        <p className="text-primary">This page doesn&apos;t exist.</p>
        <Link href="/" className="text-secondary">
          Back home
        </Link>
      </div>
    </div>
  );
}
