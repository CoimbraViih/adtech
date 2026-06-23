import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

type CheckResult = {
  ok: boolean;
  latencyMs: number;
  error?: string;
};

async function checkDatabase(): Promise<CheckResult> {
  const start = Date.now();
  try {
    const supabase = createServiceClient();
    const { error } = await supabase.from("pixels").select("id").limit(1);
    if (error) {
      return { ok: false, latencyMs: Date.now() - start, error: error.message };
    }
    return { ok: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { ok: false, latencyMs: Date.now() - start, error: (err as Error).message };
  }
}

export async function GET() {
  const db = await checkDatabase();
  const allOk = db.ok;

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      version: process.env.npm_package_version ?? "unknown",
      build: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
      timestamp: new Date().toISOString(),
      checks: { db },
    },
    { status: allOk ? 200 : 503 }
  );
}
