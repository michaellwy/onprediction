import Link from "next/link";

export default function NotFound() {
  return (
    <div className="h-[calc(100vh-56px)] flex flex-col items-center justify-center bg-background">
      <h2 className="font-serif text-xl font-semibold text-foreground mb-2">
        Page not found
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
      >
        Back to readings
      </Link>
    </div>
  );
}
