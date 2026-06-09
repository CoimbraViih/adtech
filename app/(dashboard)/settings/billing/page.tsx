import { Suspense } from "react";
import { BillingPageClient } from "./billing-page-client";

// useSearchParams() in a Client Component requires a Suspense boundary
// at the page level in Next.js 15. This Server Component wrapper provides it.
export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingPageClient />
    </Suspense>
  );
}
