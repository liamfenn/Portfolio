import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="flex flex-col gap-1">
        <span className="type-mono-responsive text-muted-foreground">404</span>
        <p className="text-foreground">This page doesn't exist.</p>
        <Link href="/" className="text-muted">
          Back home
        </Link>
      </div>
    </div>
  );
}
