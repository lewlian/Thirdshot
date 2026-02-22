/**
 * Unit tests for role-based permission checks.
 * Pure function — no mocks needed.
 */

import { hasMinRole, OrgRole } from "@/lib/permissions";

describe("hasMinRole", () => {
  const roles: OrgRole[] = ["owner", "admin", "staff", "member", "guest"];

  it("owner has min role for every role", () => {
    for (const required of roles) {
      expect(hasMinRole("owner", required)).toBe(true);
    }
  });

  it("admin meets admin, staff, member, guest but not owner", () => {
    expect(hasMinRole("admin", "owner")).toBe(false);
    expect(hasMinRole("admin", "admin")).toBe(true);
    expect(hasMinRole("admin", "staff")).toBe(true);
    expect(hasMinRole("admin", "member")).toBe(true);
    expect(hasMinRole("admin", "guest")).toBe(true);
  });

  it("staff meets staff, member, guest but not admin or owner", () => {
    expect(hasMinRole("staff", "owner")).toBe(false);
    expect(hasMinRole("staff", "admin")).toBe(false);
    expect(hasMinRole("staff", "staff")).toBe(true);
    expect(hasMinRole("staff", "member")).toBe(true);
    expect(hasMinRole("staff", "guest")).toBe(true);
  });

  it("member meets member, guest but not staff, admin, owner", () => {
    expect(hasMinRole("member", "owner")).toBe(false);
    expect(hasMinRole("member", "admin")).toBe(false);
    expect(hasMinRole("member", "staff")).toBe(false);
    expect(hasMinRole("member", "member")).toBe(true);
    expect(hasMinRole("member", "guest")).toBe(true);
  });

  it("guest only meets guest", () => {
    expect(hasMinRole("guest", "owner")).toBe(false);
    expect(hasMinRole("guest", "admin")).toBe(false);
    expect(hasMinRole("guest", "staff")).toBe(false);
    expect(hasMinRole("guest", "member")).toBe(false);
    expect(hasMinRole("guest", "guest")).toBe(true);
  });

  it("every role meets its own level", () => {
    for (const role of roles) {
      expect(hasMinRole(role, role)).toBe(true);
    }
  });
});
