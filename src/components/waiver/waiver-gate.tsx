import { getUser, createServerSupabaseClient } from "@/lib/supabase/server";
import { getUserWaiverStatus } from "@/lib/actions/waivers";
import { getUserOrgRole } from "@/lib/permissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignWaiverForm } from "@/app/o/[slug]/(member)/sign-waiver/sign-waiver-form";

interface WaiverGateProps {
  orgId: string;
  orgName: string;
  slug: string;
  children: React.ReactNode;
}

export async function WaiverGate({ orgId, orgName, slug, children }: WaiverGateProps) {
  const user = await getUser();
  if (!user) return <>{children}</>;

  const supabase = await createServerSupabaseClient();
  const { data: dbUser } = await supabase
    .from("users")
    .select("id, role")
    .eq("supabase_id", user.id)
    .single();

  if (!dbUser) return <>{children}</>;

  // Admins skip waiver
  const orgRole = await getUserOrgRole(dbUser.id, orgId);
  if (orgRole === "owner" || orgRole === "admin") return <>{children}</>;

  const waiverStatus = await getUserWaiverStatus(orgId, dbUser.id);
  if (!waiverStatus.required || waiverStatus.signed) return <>{children}</>;

  // Show waiver inline instead of redirecting
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{waiverStatus.waiver!.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Please read and sign this waiver to continue using {orgName}.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50 text-sm leading-relaxed whitespace-pre-wrap">
            {waiverStatus.waiver!.content}
          </div>
          <SignWaiverForm orgId={orgId} waiverId={waiverStatus.waiver!.id} slug={slug} />
        </CardContent>
      </Card>
    </div>
  );
}
