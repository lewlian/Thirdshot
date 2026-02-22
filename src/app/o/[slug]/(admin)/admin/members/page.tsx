import { Suspense } from "react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getOrgBySlug, getCurrentDbUser } from "@/lib/org-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import {
  RoleSelect,
  TierSelect,
  MemberActions,
  StatusBadge,
  InviteMemberForm,
} from "./member-actions";
import { Users, Shield, UserCheck, UserX } from "lucide-react";

interface AdminMembersPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}

interface MemberTier {
  id: string;
  name: string;
}

async function getMembers(
  organizationId: string,
  page: number = 1,
  search?: string,
  statusFilter?: string
) {
  const pageSize = 20;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createServerSupabaseClient();

  let membersQuery = supabase
    .from("organization_members")
    .select(
      "*, users(id, name, email, phone, created_at), membership_tiers(id, name)",
      { count: "exact" }
    )
    .eq("organization_id", organizationId)
    .order("joined_at", { ascending: false })
    .range(from, to);

  if (statusFilter && statusFilter !== "all") {
    membersQuery = membersQuery.eq("membership_status", statusFilter);
  }

  const countQuery = supabase
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  const [{ data: members, count: filteredCount }, { count: total }] =
    await Promise.all([membersQuery, countQuery]);

  // Client-side search filter
  let filteredMembers = members || [];
  if (search && filteredMembers.length > 0) {
    const searchLower = search.toLowerCase();
    filteredMembers = filteredMembers.filter((m) => {
      const user = m.users as unknown as {
        name: string | null;
        email: string;
      } | null;
      return (
        user?.email?.toLowerCase().includes(searchLower) ||
        user?.name?.toLowerCase().includes(searchLower)
      );
    });
  }

  const effectiveCount = search ? filteredMembers.length : filteredCount || 0;

  return {
    members: filteredMembers,
    total: total || 0,
    filteredCount: effectiveCount,
    pages: Math.ceil(effectiveCount / pageSize),
    currentPage: page,
  };
}

async function getTiers(organizationId: string): Promise<MemberTier[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("membership_tiers")
    .select("id, name")
    .eq("organization_id", organizationId)
    .eq("is_active", true)
    .order("sort_order");
  return (data as MemberTier[]) || [];
}

async function getMemberStats(organizationId: string) {
  const supabase = await createServerSupabaseClient();

  const [{ count: totalMembers }, { count: activeMembers }, { count: suspended }] =
    await Promise.all([
      supabase
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId),
      supabase
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("membership_status", "active"),
      supabase
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("membership_status", "suspended"),
    ]);

  return {
    total: totalMembers || 0,
    active: activeMembers || 0,
    suspended: suspended || 0,
  };
}

function getRoleBadgeColor(role: string) {
  switch (role) {
    case "owner":
      return "bg-purple-100 text-purple-800";
    case "admin":
      return "bg-blue-100 text-blue-800";
    case "staff":
      return "bg-indigo-100 text-indigo-800";
    case "member":
      return "bg-green-100 text-green-800";
    case "guest":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

async function MembersContent({
  slug,
  organizationId,
  timezone,
  searchParams,
}: {
  slug: string;
  organizationId: string;
  timezone: string;
  searchParams: Promise<{ page?: string; search?: string; status?: string }>;
}) {
  const { page, search, status: statusFilter } = await searchParams;
  const pageNum = page ? parseInt(page) : 1;

  const [{ members, total, filteredCount, pages, currentPage }, tiers, stats, currentUser] =
    await Promise.all([
      getMembers(organizationId, pageNum, search, statusFilter),
      getTiers(organizationId),
      getMemberStats(organizationId),
      getCurrentDbUser(),
    ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-gray-600">{total} total members</p>
        </div>
        <InviteMemberForm orgId={organizationId} tiers={tiers} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <UserCheck className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <UserX className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.suspended}</p>
                <p className="text-xs text-muted-foreground">Suspended</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form className="flex gap-2 flex-1">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by name or email..."
            className="flex-1 px-3 py-2 border rounded-md text-sm"
          />
          {statusFilter && (
            <input type="hidden" name="status" value={statusFilter} />
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-800"
          >
            Search
          </button>
        </form>
        <div className="flex gap-2">
          {["all", "active", "suspended"].map((s) => (
            <Link
              key={s}
              href={`/o/${slug}/admin/members?${search ? `search=${search}&` : ""}status=${s}`}
              className={`px-3 py-2 rounded-md text-sm capitalize ${
                (statusFilter || "all") === s
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-700"
              }`}
            >
              {s}
            </Link>
          ))}
        </div>
      </div>

      {/* Members Table */}
      <Card>
        <CardContent className="p-0">
          {members.length === 0 ? (
            <p className="text-gray-500 text-center py-12">No members found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50/50">
                    <th className="text-left py-3 px-4 font-medium">Member</th>
                    <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">
                      Phone
                    </th>
                    <th className="text-left py-3 px-4 font-medium">Role</th>
                    <th className="text-left py-3 px-4 font-medium hidden md:table-cell">
                      Tier
                    </th>
                    <th className="text-left py-3 px-4 font-medium hidden md:table-cell">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium hidden lg:table-cell">
                      Joined
                    </th>
                    <th className="text-right py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {members.map((member) => {
                    const user = member.users as unknown as {
                      id: string;
                      name: string | null;
                      email: string;
                      phone: string | null;
                    } | null;
                    const tier = member.membership_tiers as unknown as {
                      id: string;
                      name: string;
                    } | null;
                    const isCurrentUser = currentUser?.id === user?.id;

                    return (
                      <tr key={member.id} className="hover:bg-gray-50/50">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-medium text-gray-900">
                              {user?.name || "No name"}
                              {isCurrentUser && (
                                <span className="ml-1 text-xs text-muted-foreground">
                                  (you)
                                </span>
                              )}
                            </p>
                            <p className="text-gray-500 text-xs">
                              {user?.email}
                            </p>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden sm:table-cell">
                          {user?.phone || (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {member.role === "owner" || isCurrentUser ? (
                            <span
                              className={`inline-block px-2 py-1 text-xs rounded-full font-medium ${getRoleBadgeColor(member.role)}`}
                            >
                              {member.role}
                            </span>
                          ) : (
                            <RoleSelect
                              orgId={organizationId}
                              memberId={member.id}
                              currentRole={member.role}
                            />
                          )}
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          {member.role === "owner" || isCurrentUser ? (
                            tier?.name || (
                              <span className="text-gray-400">-</span>
                            )
                          ) : (
                            <TierSelect
                              orgId={organizationId}
                              memberId={member.id}
                              currentTierId={tier?.id || null}
                              tiers={tiers}
                            />
                          )}
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <StatusBadge status={member.membership_status} />
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell text-gray-500">
                          {formatInTimeZone(
                            member.joined_at,
                            timezone,
                            "dd MMM yyyy"
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <MemberActions
                            orgId={organizationId}
                            memberId={member.id}
                            memberName={user?.name || user?.email || ""}
                            currentRole={member.role}
                            currentTierId={tier?.id || null}
                            memberStatus={member.membership_status}
                            tiers={tiers}
                            isCurrentUser={isCurrentUser}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex justify-center gap-2 py-4 border-t">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/o/${slug}/admin/members?${search ? `search=${search}&` : ""}${statusFilter ? `status=${statusFilter}&` : ""}page=${p}`}
                  className={`px-3 py-1 rounded text-sm ${
                    p === currentPage
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {p}
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function AdminMembersPage({
  params,
  searchParams,
}: AdminMembersPageProps) {
  const { slug } = await params;
  const org = await getOrgBySlug(slug);

  return (
    <Suspense
      fallback={
        <div className="text-center py-8 text-gray-500">
          Loading members...
        </div>
      }
    >
      <MembersContent
        slug={slug}
        organizationId={org.id}
        timezone={org.timezone}
        searchParams={searchParams}
      />
    </Suspense>
  );
}
