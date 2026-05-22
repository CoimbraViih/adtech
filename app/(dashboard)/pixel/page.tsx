import { requireServerSession } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { PixelTable } from "@/components/pixel/pixel-table";
import { CreatePixelDialog } from "@/components/pixel/create-pixel-dialog";
import type { Pixel } from "@/types/database";

const MOCK_PIXELS: Pixel[] = [
  {
    id: "px_demo_001",
    workspace_id: "ws_demo",
    name: "Site Principal",
    meta_pixel_id: "123456789012345",
    google_tag_id: "G-XXXXXXXXXX",
    created_at: new Date("2026-05-20").toISOString(),
    updated_at: new Date("2026-05-20").toISOString(),
  },
  {
    id: "px_demo_002",
    workspace_id: "ws_demo",
    name: "Landing Page Oferta",
    meta_pixel_id: null,
    google_tag_id: null,
    created_at: new Date("2026-05-21").toISOString(),
    updated_at: new Date("2026-05-21").toISOString(),
  },
];

export default async function PixelPage() {
  let session;
  try {
    session = await requireServerSession();
  } catch {
    redirect("/login");
  }
  void session;

  // TODO(M4-backend): replace with Supabase query
  const pixels = MOCK_PIXELS;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Pixels & Tracking</h1>
          <p className="text-sm text-muted mt-1">
            Instale o pixel AdFlow em seu site para rastrear conversões.
          </p>
        </div>
        <CreatePixelDialog />
      </div>
      <PixelTable pixels={pixels} />
    </div>
  );
}
