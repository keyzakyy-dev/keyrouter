import { Suspense } from "react";
import { CardSkeleton } from "@/shared/components/Loading";
import ProviderLimits from "../usage/components/ProviderLimits";

export default function QuotaPage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <div className="flex min-w-0 flex-col gap-6 px-1 sm:px-0">
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-text-main">
            Quota
          </h1>
          <p className="text-xs text-text-subtle">
            Remaining limits per connection - auto-refreshes while the page is open.
          </p>
        </div>
        <ProviderLimits />
      </div>
    </Suspense>
  );
}
