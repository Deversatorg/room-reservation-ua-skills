import { describe, expect, it } from "vitest";

import { registerSchema } from "@/lib/validation";

describe("registration validation", () => {
  it("normalizes email and trims the display name", () => {
    const result = registerSchema.parse({
      name: "  Alex Johnson  ",
      email: "  ALEX@Example.COM  ",
      password: "12345678",
    });

    expect(result.name).toBe("Alex Johnson");
    expect(result.email).toBe("alex@example.com");
  });

  it("rejects an empty display name", () => {
    expect(() =>
      registerSchema.parse({
        name: "   ",
        email: "alex@example.com",
        password: "12345678",
      }),
    ).toThrow();
  });

  it("enforces the 8 to 72 character password boundary", () => {
    const input = {
      name: "Alex",
      email: "alex@example.com",
    };

    expect(() =>
      registerSchema.parse({ ...input, password: "a".repeat(7) }),
    ).toThrow();
    expect(
      registerSchema.parse({ ...input, password: "a".repeat(8) }).password,
    ).toHaveLength(8);
    expect(
      registerSchema.parse({ ...input, password: "a".repeat(72) }).password,
    ).toHaveLength(72);
    expect(() =>
      registerSchema.parse({ ...input, password: "a".repeat(73) }),
    ).toThrow();
  });
});
