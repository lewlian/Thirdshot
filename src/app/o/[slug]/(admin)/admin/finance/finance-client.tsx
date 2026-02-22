"use client";

import { useRouter } from "next/navigation";

const periods = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "ytd", label: "Year to date" },
];

export function FinanceDateFilter({
  slug,
  currentPeriod,
}: {
  slug: string;
  currentPeriod: string;
}) {
  const router = useRouter();

  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {periods.map((p) => (
        <button
          key={p.value}
          onClick={() =>
            router.push(`/o/${slug}/admin/finance?period=${p.value}`)
          }
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            currentPeriod === p.value
              ? "bg-white text-gray-900 shadow-sm font-medium"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
