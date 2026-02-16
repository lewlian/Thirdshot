import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatInTimeZone } from "date-fns-tz";
import Link from "next/link";
import { UserRoleToggle } from "./role-toggle";

const TIMEZONE = "Asia/Singapore";

interface AdminUsersPageProps {
  searchParams: Promise<{ page?: string; search?: string }>;
}

async function getUsers(page: number = 1, search?: string) {
  const pageSize = 20;
  const skip = (page - 1) * pageSize;

  const where = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" as const } },
          { name: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        _count: {
          select: { bookings: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    total,
    pages: Math.ceil(total / pageSize),
    currentPage: page,
  };
}

export default async function AdminUsersPage({
  searchParams,
}: AdminUsersPageProps) {
  const { page, search } = await searchParams;
  const pageNum = page ? parseInt(page) : 1;
  const { users, total, pages, currentPage } = await getUsers(pageNum, search);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="text-gray-600">
            {total} registered user{total !== 1 ? "s" : ""}
          </p>
        </div>
        <form className="flex gap-2">
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search users..."
            className="px-3 py-2 border rounded-md text-sm"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
          >
            Search
          </button>
        </form>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No users found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">User</th>
                    <th className="text-left py-3 px-2 font-medium">Phone</th>
                    <th className="text-left py-3 px-2 font-medium">Bookings</th>
                    <th className="text-left py-3 px-2 font-medium">Joined</th>
                    <th className="text-left py-3 px-2 font-medium">Role</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium">
                            {user.name || "No name"}
                          </p>
                          <p className="text-gray-500 text-xs">{user.email}</p>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        {user.phone || (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-2">{user._count.bookings}</td>
                      <td className="py-3 px-2">
                        {formatInTimeZone(
                          user.createdAt,
                          TIMEZONE,
                          "dd MMM yyyy"
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <UserRoleToggle userId={user.id} role={user.role} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={`/admin/users?${search ? `search=${search}&` : ""}page=${p}`}
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
