import { Suspense } from "react";
import { requireServerSession, createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PixelListClient } from "@/components/pixel/pixel-list-client";
import { CreatePixelDialog } from "@/components/pixel/create-pixel-dialog";
import { GlobalDateFilter, type CompareMode } from "@/components/shared/global-date-filter";
import type { Pixel } from "@/types/database";


export default async function PixelPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; compare?: string }>;
}) {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }
  const supabase = await createServerSupabaseClient();
  const { data: pixelData } = await supabase
    .from("pixels")
    .select("*")
    .eq("workspace_id", session.workspace.id)
    .order("created_at", { ascending: false });
  const pixels = pixelData ?? [];

  const sp = await searchParams;
  const dateFrom = sp.from ?? new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
  const dateTo = sp.to ?? new Date().toISOString().slice(0, 10);
  const compare: CompareMode = (["prev_period", "prev_year", "none"] as CompareMode[]).includes(sp.compare as CompareMode)
    ? (sp.compare as CompareMode)
    : "prev_period";

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Pixels & Tracking</h1>
          <p className="text-sm text-muted mt-1">
            Instale o pixel AdFlow em seu site para rastrear conversões.
          </p>
        </div>
        <CreatePixelDialog />
        <Suspense>
          <GlobalDateFilter currentFrom={dateFrom} currentTo={dateTo} currentCompare={compare} />
        </Suspense>
      </div>
      <PixelListClient pixels={pixels} />
    </div>
  );
}
