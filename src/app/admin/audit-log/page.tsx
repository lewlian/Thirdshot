import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";

const TIMEZONE = "Asia/Singapore";

interface AuditLogPageProps {
  searchParams: Promise<{ page?: string; action?: string }>;
}

async function getAuditLogs(page: number = 1, action?: string) {
  const pageSize = 30;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const supabase = await createServerSupabaseClient();

  let logsQuery = supabase
    .from('admin_audit_logs')
    .select('*, users(name, email)')
    .order('created_at', { ascending: false })
    .range(from, to);

  let countQuery = supabase
    .from('admin_audit_logs')
    .select('*', { count: 'exact', head: true });

  if (action) {
    logsQuery = logsQuery.eq('action', action);
    countQuery = countQuery.eq('action', action);
  }

  const [{ data: logs }, { count: total }] = await Promise.all([
    logsQuery,
    countQuery,
  ]);

  return {
    logs: logs || [],
    total: total || 0,
    pages: Math.ceil((total || 0) / pageSize),
    currentPage: page,
  };
}

async function getActionTypes() {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from('admin_audit_logs')
    .select('action');

  if (!data) return [];
  // Deduplicate actions
  return [...new Set(data.map((d) => d.action))];
}

function getActionColor(action: string) {
  switch (action) {
    case "CREATE":
      return "bg-green-100 text-green-800";
    case "UPDATE":
    case "UPDATE_ROLE":
      return "bg-blue-100 text-blue-800";
    case "DELETE":
    case "CANCEL":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export default async function AuditLogPage({
  searchParams,
}: AuditLogPageProps) {
  const { page, action } = await searchParams;
  const pageNum = page ? parseInt(page) : 1;
  const [{ logs, total, pages, currentPage }, actionTypes] = await Promise.all([
    getAuditLogs(pageNum, action),
    getActionTypes(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-gray-600">
            {total} log entr{total !== 1 ? "ies" : "y"}
          </p>
        </div>

        {/* Action filter */}
        <div className="flex gap-2">
          <Link
            href="/admin/audit-log"
            className={`px-3 py-1 text-sm rounded ${
              !action ? "bg-green-600 text-white" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            All
          </Link>
          {actionTypes.map((a) => (
            <Link
              key={a}
              href={`/admin/audit-log?action=${a}`}
              className={`px-3 py-1 text-sm rounded ${
                action === a
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
            >
              {a}
            </Link>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No audit logs yet</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => {
                const newData = log.new_data as Record<string, unknown> | null;
                const previousData = log.previous_data as Record<string, unknown> | null;
                const admin = log.users as unknown as { name: string | null; email: string } | null;

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-3 bg-gray-50 rounded-lg"
                  >
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${getActionColor(
                        log.action
                      )}`}
                    >
                      {log.action}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">
                          {admin?.name || admin?.email}
                        </span>{" "}
                        {log.action.toLowerCase()}d{" "}
                        <span className="font-medium">{log.entity_type}</span>
                        {typeof newData?.name === "string" && (
                          <span className="text-gray-600">
                            {" "}
                            &quot;{newData.name}&quot;
                          </span>
                        )}
                      </p>
                      {log.notes && (
                        <p className="text-xs text-gray-600 mt-1">
                          {log.notes}
                        </p>
                      )}
                      {(newData || previousData) && (
                        <div className="text-xs text-gray-500 mt-1 space-y-1">
                          {previousData && (
                            <p className="truncate">
                              <span className="font-medium">Before:</span> {JSON.stringify(previousData)}
                            </p>
                          )}
                          {newData && (
                            <p className="truncate">
                              <span className="font-medium">After:</span> {JSON.stringify(newData)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <time className="text-xs text-gray-500 whitespace-nowrap">
                      {formatInTimeZone(
                        log.created_at,
                        TIMEZONE,
                        "dd MMM yyyy, h:mm a"
                      )}
                    </time>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/admin/audit-log?${action ? `action=${action}&` : ""}page=${p}`}
                  className={`px-3 py-1 rounded ${
                    p === currentPage
                      ? "bg-green-600 text-white"
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
