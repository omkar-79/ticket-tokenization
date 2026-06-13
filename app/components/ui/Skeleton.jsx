export default function Skeleton({ className = "h-4 w-full" }) {
  return <div className={`shimmer rounded-md ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 space-y-3">
      <Skeleton className="h-5 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-10 w-24" />
    </div>
  );
}
