import { redirect, notFound } from "next/navigation";
import { getUser, createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrgBySlug } from "@/lib/org-context";
import { getActiveWaiver, getUserWaiverStatus } from "@/lib/actions/waivers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignWaiverForm } from "./sign-waiver-form";

interface SignWaiverPageProps {
  params: Promise<{ slug: string }>;
}

export default async function SignWaiverPage({ params }: SignWaiverPageProps) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);

  const user = await getUser();
  if (!user) redirect("/login");

  const supabase = await createServerSupabaseClient();
  const { data: dbUser } = await supabase
    .from("users")
    .select("id")
    .eq("supabase_id", user.id)
    .single();

  if (!dbUser) redirect("/login");

  const waiver = await getActiveWaiver(org.id);
  if (!waiver) {
    // No waiver required, redirect to courts
    redirect(`/o/${slug}/courts`);
  }

  const status = await getUserWaiverStatus(org.id, dbUser.id);
  if (status.signed) {
    // Already signed, redirect to courts
    redirect(`/o/${slug}/courts`);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>{waiver.title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Please read and sign this waiver to continue using {org.name}.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="max-h-96 overflow-y-auto border rounded-lg p-4 bg-gray-50 text-sm leading-relaxed whitespace-pre-wrap">
            {waiver.content}
          </div>

          <SignWaiverForm orgId={org.id} waiverId={waiver.id} slug={slug} />
        </CardContent>
      </Card>
    </div>
  );
}
