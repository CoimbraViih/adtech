import { describe, it, expect } from "vitest";
import type { Pixel } from "@/types/database";

// Pure filter logic extracted for testability
function filterPixels(
  pixels: Pixel[],
  query: string,
  filter: "all" | "meta" | "google" | "unconnected"
): Pixel[] {
  const q = query.trim().toLowerCase();
  return pixels.filter((px) => {
    const matchesQuery =
      q === "" ||
      px.name.toLowerCase().includes(q) ||
      px.id.toLowerCase().includes(q);

    const matchesFilter =
      filter === "all" ||
      (filter === "meta" && px.meta_pixel_id !== null) ||
      (filter === "google" && px.google_tag_id !== null) ||
      (filter === "unconnected" &&
        px.meta_pixel_id === null &&
        px.google_tag_id === null);

    return matchesQuery && matchesFilter;
  });
}

const PIXELS: Pixel[] = [
  {
    id: "px_001",
    workspace_id: "ws",
    name: "Site Principal",
    meta_pixel_id: "123",
    google_tag_id: "G-AAA",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "px_002",
    workspace_id: "ws",
    name: "Landing Page",
    meta_pixel_id: null,
    google_tag_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "px_003",
    workspace_id: "ws",
    name: "Blog",
    meta_pixel_id: null,
    google_tag_id: "G-BBB",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe("filterPixels", () => {
  it("returns all pixels with empty query and 'all' filter", () => {
    expect(filterPixels(PIXELS, "", "all")).toHaveLength(3);
  });

  it("filters by name query (case-insensitive)", () => {
    const result = filterPixels(PIXELS, "landing", "all");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("px_002");
  });

  it("filters by pixel ID query", () => {
    const result = filterPixels(PIXELS, "px_003", "all");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Blog");
  });

  it("filters only pixels with Meta connected", () => {
    const result = filterPixels(PIXELS, "", "meta");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("px_001");
  });

  it("filters only pixels with Google connected", () => {
    const result = filterPixels(PIXELS, "", "google");
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toEqual(["px_001", "px_003"]);
  });

  it("filters unconnected pixels (no Meta, no Google)", () => {
    const result = filterPixels(PIXELS, "", "unconnected");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("px_002");
  });

  it("combines query and filter (meta + name match)", () => {
    const result = filterPixels(PIXELS, "site", "meta");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("px_001");
  });

  it("returns empty when query matches nothing", () => {
    expect(filterPixels(PIXELS, "xyz_nonexistent", "all")).toHaveLength(0);
  });

  it("returns empty when filter excludes everything", () => {
    // All pixels have either meta or google except px_002, but query is "site"
    const result = filterPixels(PIXELS, "site", "unconnected");
    expect(result).toHaveLength(0);
  });
});
