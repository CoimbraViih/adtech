import { GET } from "@/app/api/health/route";

describe("GET /api/health", () => {
  it("returns 200 with status ok and required fields", async () => {
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toHaveProperty("status", "ok");
    expect(body).toHaveProperty("version");
    expect(body).toHaveProperty("build");
    expect(body).toHaveProperty("env");
    expect(body).toHaveProperty("timestamp");
  });

  it("timestamp is a valid ISO string", async () => {
    const response = await GET();
    const body = await response.json();

    const timestamp = new Date(body.timestamp);
    expect(timestamp).toBeInstanceOf(Date);
    expect(timestamp.getTime()).toBeGreaterThan(0);
  });
});
