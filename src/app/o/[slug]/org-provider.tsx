"use client";

import { createContext, useContext } from "react";
import type { OrgContext } from "@/lib/org-context";

const OrgContextReact = createContext<OrgContext | null>(null);

export function OrgProvider({
  org,
  children,
}: {
  org: OrgContext;
  children: React.ReactNode;
}) {
  return (
    <OrgContextReact.Provider value={org}>{children}</OrgContextReact.Provider>
  );
}

export function useOrg(): OrgContext {
  const ctx = useContext(OrgContextReact);
  if (!ctx) {
    throw new Error("useOrg must be used within an OrgProvider");
  }
  return ctx;
}
