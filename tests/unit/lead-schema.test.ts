import { describe, it, expect } from "vitest";
import { parseLeadInput } from "@/lib/leads/schema";

describe("parseLeadInput", () => {
  it("accepts a valid lead", () => {
    const result = parseLeadInput({
      name: "Ana Lima",
      email: "ana@agencia.com.br",
      agency_size: "small",
    });
    expect(result.success).toBe(true);
  });

  it("accepts agency_size 'solo'", () => {
    const result = parseLeadInput({
      name: "Carlos",
      email: "carlos@solo.com",
      agency_size: "solo",
    });
    expect(result.success).toBe(true);
  });

  it("accepts agency_size 'large'", () => {
    const result = parseLeadInput({
      name: "Empresa Grande",
      email: "contato@grande.com",
      agency_size: "large",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing name", () => {
    const result = parseLeadInput({ email: "x@x.com", agency_size: "solo" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email", () => {
    const result = parseLeadInput({ name: "X", email: "not-an-email", agency_size: "solo" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid agency_size", () => {
    const result = parseLeadInput({ name: "X", email: "x@x.com", agency_size: "enterprise" });
    expect(result.success).toBe(false);
  });

  it("rejects empty name", () => {
    const result = parseLeadInput({ name: "", email: "x@x.com", agency_size: "solo" });
    expect(result.success).toBe(false);
  });

  it("rejects name longer than 100 chars", () => {
    const result = parseLeadInput({ name: "A".repeat(101), email: "x@x.com", agency_size: "solo" });
    expect(result.success).toBe(false);
  });
});
