import { describe, it, expect } from "vitest";
import { maskIp } from "@/lib/security/ip";

describe("maskIp", () => {
  it("masks last octet of IPv4", () => {
    expect(maskIp("192.168.1.123")).toBe("192.168.1.0");
  });

  it("handles edge IPv4 values", () => {
    expect(maskIp("10.0.0.1")).toBe("10.0.0.0");
    expect(maskIp("255.255.255.255")).toBe("255.255.255.0");
  });

  it("masks IPv6 after third group", () => {
    expect(maskIp("2001:db8:85a3:0:0:8a2e:0370:7334")).toBe(
      "2001:db8:85a3:0:0:0:0:0"
    );
  });

  it("returns null for null input", () => {
    expect(maskIp(null)).toBe(null);
  });

  it("returns null for unrecognised format", () => {
    expect(maskIp("not-an-ip")).toBe(null);
  });

  it("returns null for out-of-range IPv4 octet", () => {
    expect(maskIp("999.168.1.1")).toBe(null);
  });

  it("returns null for hybrid IPv4-in-IPv6 format", () => {
    expect(maskIp("1.2.3.4:5:6")).toBe(null);
  });
});
