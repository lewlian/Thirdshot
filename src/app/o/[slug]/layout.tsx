import { getOrgBySlug } from "@/lib/org-context";
import { OrgProvider } from "./org-provider";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);

  return <OrgProvider org={org}>{children}</OrgProvider>;
}
