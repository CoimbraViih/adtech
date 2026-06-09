import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  uploadCreativeAsset,
  deleteCreativeAsset,
  getAssetsByCreative,
  getAssetsByCampaign,
  getAssetsByRtbCampaign,
  ALLOWED_MIME_TYPES,
  MAX_SIZE_BYTES,
} from "@/lib/storage/creative-assets";

// ── Constants ─────────────────────────────────────────────────────────────────

describe("ALLOWED_MIME_TYPES", () => {
  it("includes jpeg, png, webp, gif", () => {
    expect(ALLOWED_MIME_TYPES).toContain("image/jpeg");
    expect(ALLOWED_MIME_TYPES).toContain("image/png");
    expect(ALLOWED_MIME_TYPES).toContain("image/webp");
    expect(ALLOWED_MIME_TYPES).toContain("image/gif");
  });

  it("does not include pdf or svg", () => {
    const types = ALLOWED_MIME_TYPES as readonly string[];
    expect(types).not.toContain("application/pdf");
    expect(types).not.toContain("image/svg+xml");
  });
});

describe("MAX_SIZE_BYTES", () => {
  it("is 10 MB", () => {
    expect(MAX_SIZE_BYTES).toBe(10 * 1024 * 1024);
  });
});

// ── uploadCreativeAsset ───────────────────────────────────────────────────────

function makeFile(name: string, type: string, sizeBytes: number): File {
  const content = new Uint8Array(sizeBytes);
  return new File([content], name, { type });
}

describe("uploadCreativeAsset", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      randomUUID: vi.fn().mockReturnValue("test-uuid-1234"),
    });
  });

  it("returns a CreativeAsset with correct fields", async () => {
    const file = makeFile("banner.png", "image/png", 1024);
    const asset = await uploadCreativeAsset(file, "ws_test", { creativeId: "cr_1" });

    expect(asset.workspace_id).toBe("ws_test");
    expect(asset.creative_id).toBe("cr_1");
    expect(asset.campaign_id).toBeNull();
    expect(asset.rtb_campaign_id).toBeNull();
    expect(asset.filename).toBe("banner.png");
    expect(asset.mime_type).toBe("image/png");
    expect(asset.size_bytes).toBe(1024);
    expect(asset.storage_path).toContain("ws_test/");
    expect(asset.storage_path).toContain(".png");
    expect(asset.public_url).toContain(asset.storage_path);
  });

  it("sets campaign_id when provided", async () => {
    const file = makeFile("banner.jpg", "image/jpeg", 2048);
    const asset = await uploadCreativeAsset(file, "ws_test", { campaignId: "camp_1" });
    expect(asset.campaign_id).toBe("camp_1");
    expect(asset.creative_id).toBeNull();
  });

  it("sets rtb_campaign_id when provided", async () => {
    const file = makeFile("leaderboard.webp", "image/webp", 512);
    const asset = await uploadCreativeAsset(file, "ws_test", { rtbCampaignId: "rtb_1" });
    expect(asset.rtb_campaign_id).toBe("rtb_1");
  });

  it("uses correct extension for gif", async () => {
    const file = makeFile("anim.gif", "image/gif", 4096);
    const asset = await uploadCreativeAsset(file, "ws_test");
    expect(asset.storage_path).toMatch(/\.gif$/);
  });

  it("sets all FK fields to null when no opts provided", async () => {
    const file = makeFile("img.png", "image/png", 100);
    const asset = await uploadCreativeAsset(file, "ws_test");
    expect(asset.creative_id).toBeNull();
    expect(asset.campaign_id).toBeNull();
    expect(asset.rtb_campaign_id).toBeNull();
  });
});

// ── deleteCreativeAsset ───────────────────────────────────────────────────────

describe("deleteCreativeAsset", () => {
  it("resolves without throwing (stub)", async () => {
    await expect(deleteCreativeAsset("asset_123")).resolves.toBeUndefined();
  });
});

// ── getAssets* stubs ──────────────────────────────────────────────────────────

describe("getAssetsByCreative", () => {
  it("returns empty array (stub)", async () => {
    const result = await getAssetsByCreative("cr_1");
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);
  });
});

describe("getAssetsByCampaign", () => {
  it("returns empty array (stub)", async () => {
    const result = await getAssetsByCampaign("camp_1");
    expect(Array.isArray(result)).toBe(true);
  });
});

describe("getAssetsByRtbCampaign", () => {
  it("returns empty array (stub)", async () => {
    const result = await getAssetsByRtbCampaign("rtb_1");
    expect(Array.isArray(result)).toBe(true);
  });
});
