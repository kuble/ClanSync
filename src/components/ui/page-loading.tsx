import { Skeleton } from "@/components/ui/skeleton";

export function PageLoading({ label }: { label: string }) {
  return (
    <section aria-busy="true" className="space-y-6">
      <p role="status" className="text-sm text-muted-foreground">
        {label}
      </p>
      <div aria-hidden="true" className="space-y-6">
        <div className="space-y-3">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {[0, 1].map((index) => (
            <div
              key={index}
              className="space-y-4 rounded-2xl border bg-card p-5"
            >
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
