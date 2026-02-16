/**
 * Unit tests for utility functions
 */

import { cn } from "@/lib/utils";

describe("cn (className utility)", () => {
  it("should merge class names", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    const isActive = true;
    const result = cn("base", isActive && "active");
    expect(result).toBe("base active");
  });

  it("should filter out falsy values", () => {
    const result = cn("base", false && "hidden", null, undefined, "visible");
    expect(result).toBe("base visible");
  });

  it("should merge tailwind classes correctly", () => {
    // tailwind-merge should dedupe conflicting classes
    const result = cn("p-4", "p-2");
    expect(result).toBe("p-2");
  });

  it("should handle object syntax", () => {
    const result = cn({
      base: true,
      active: true,
      disabled: false,
    });
    expect(result).toBe("base active");
  });

  it("should handle arrays", () => {
    const result = cn(["foo", "bar"], "baz");
    expect(result).toBe("foo bar baz");
  });

  it("should handle empty inputs", () => {
    expect(cn()).toBe("");
    expect(cn("")).toBe("");
    expect(cn(null)).toBe("");
    expect(cn(undefined)).toBe("");
  });
});
