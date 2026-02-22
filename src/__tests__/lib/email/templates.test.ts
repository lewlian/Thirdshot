/**
 * Unit tests for email template rendering.
 */

jest.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: jest.fn(),
}));

import { renderTemplate } from "@/lib/email/templates";

describe("renderTemplate", () => {
  it("replaces a single variable", () => {
    expect(renderTemplate("Hello {{name}}", { name: "Alice" })).toBe(
      "Hello Alice"
    );
  });

  it("replaces multiple different variables", () => {
    const tpl = "Hi {{member_name}}, your court is {{court_name}}.";
    const result = renderTemplate(tpl, {
      member_name: "Bob",
      court_name: "Court A",
    });
    expect(result).toBe("Hi Bob, your court is Court A.");
  });

  it("replaces duplicate variables", () => {
    expect(
      renderTemplate("{{name}} and {{name}}", { name: "X" })
    ).toBe("X and X");
  });

  it("replaces missing variables with empty string", () => {
    expect(renderTemplate("Hi {{name}}, your {{thing}}.", {})).toBe(
      "Hi , your ."
    );
  });

  it("returns template unchanged when no variables present", () => {
    expect(renderTemplate("No vars here", { name: "X" })).toBe(
      "No vars here"
    );
  });

  it("handles empty template", () => {
    expect(renderTemplate("", { name: "X" })).toBe("");
  });

  it("does not match single-brace {name}", () => {
    expect(renderTemplate("Hi {name}", { name: "X" })).toBe("Hi {name}");
  });

  it("does not do recursive replacement", () => {
    // If the value itself contains {{...}}, it should NOT be replaced again
    expect(
      renderTemplate("Value: {{a}}", { a: "{{b}}", b: "DEEP" })
    ).toBe("Value: {{b}}");
  });

  it("handles special regex characters in values", () => {
    expect(
      renderTemplate("Amount: {{amount}}", { amount: "$100.00" })
    ).toBe("Amount: $100.00");
  });

  it("handles undefined value for a known key", () => {
    expect(
      renderTemplate("Hi {{member_name}}", { member_name: undefined })
    ).toBe("Hi ");
  });
});
