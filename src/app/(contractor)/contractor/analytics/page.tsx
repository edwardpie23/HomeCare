"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface Summary {
  totalRevenue: number;
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  inProgressBookings: number;
  totalEstimates: number;
  declinedEstimates: number;
  winRate: number | null;
  avgResponseMinutes: number | null;
  rating: number;
  reviewCount: number;
}

interface MonthData {
  month: string;
  revenue: number;
  jobs?: number;
}

interface CategoryData {
  name: string;
  count: number;
}

interface Analytics {
  summary: Summary;
  revenueByMonth: MonthData[];
  jobsByMonth: { month: string; jobs: number }[];
  topCategories: CategoryData[];
}

function Bar({ value, max, color = "bg-orange-400" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex-1 flex flex-col items-center gap-1">
      <div className="w-full flex items-end justify-center" style={{ height: "80px" }}>
        <div
          className={`w-full rounded-t-lg ${color} transition-all duration-500`}
          style={{ height: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

function formatResponse(mins: number | null): string {
  if (mins === null) return "—";
  if (mins < 60) return `${mins}m`;
  if (mins < 1440) return `${Math.round(mins / 60)}h`;
  return `${Math.round(mins / 1440)}d`;
}

export default function ContractorAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session.user.role !== "contractor") router.push("/");
    if (status === "authenticated") {
      fetch("/api/contractor/analytics")
        .then((r) => r.json())
        .then((d) => { setData(d); setLoading(false); });
    }
  }, [status, session, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-spin">⚙️</div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, revenueByMonth, jobsByMonth, topCategories } = data;
  const maxRevenue = Math.max(...revenueByMonth.map((m) => m.revenue), 1);
  const maxJobs = Math.max(...jobsByMonth.map((m) => m.jobs), 1);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/contractor/dashboard">
            <Button variant="ghost" size="sm">← Dashboard</Button>
          </Link>
          <div>
            <h1 className="text-3xl font-black text-slate-900">Analytics</h1>
            <p className="text-slate-500 text-sm mt-0.5">Your business performance at a glance</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs text-slate-400 font-medium mb-1">Total Revenue</p>
            <p className="text-2xl font-black text-slate-900">{formatCurrency(summary.totalRevenue)}</p>
            <p className="text-xs text-slate-400 mt-1">{summary.completedBookings} jobs completed</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs text-slate-400 font-medium mb-1">Win Rate</p>
            <p className="text-2xl font-black text-slate-900">
              {summary.winRate !== null ? `${summary.winRate}%` : "—"}
            </p>
            <p className="text-xs text-slate-400 mt-1">{summary.totalEstimates} quotes sent</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs text-slate-400 font-medium mb-1">Avg Response</p>
            <p className="text-2xl font-black text-slate-900">{formatResponse(summary.avgResponseMinutes)}</p>
            <p className="text-xs text-slate-400 mt-1">after booking</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <p className="text-xs text-slate-400 font-medium mb-1">Rating</p>
            <p className="text-2xl font-black text-slate-900">
              {summary.rating > 0 ? `★ ${summary.rating.toFixed(1)}` : "—"}
            </p>
            <p className="text-xs text-slate-400 mt-1">{summary.reviewCount} reviews</p>
          </div>
        </div>

        {/* Jobs funnel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
          <h2 className="font-bold text-slate-900 mb-5">Job Funnel</h2>
          <div className="flex items-center gap-0 overflow-x-auto">
            {[
              { label: "Quotes Sent", value: summary.totalEstimates, color: "bg-blue-100 text-blue-700" },
              { label: "Bookings Won", value: summary.totalBookings, color: "bg-orange-100 text-orange-700" },
              { label: "In Progress", value: summary.inProgressBookings, color: "bg-purple-100 text-purple-700" },
              { label: "Completed", value: summary.completedBookings, color: "bg-green-100 text-green-700" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-0 shrink-0">
                <div className={`rounded-xl px-5 py-3 text-center ${item.color}`}>
                  <div className="text-2xl font-black">{item.value}</div>
                  <div className="text-xs font-medium mt-0.5 whitespace-nowrap">{item.label}</div>
                </div>
                {i < 3 && <span className="text-slate-300 text-xl font-light px-2">›</span>}
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Revenue chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-900 mb-5">Revenue (last 6 months)</h2>
            {revenueByMonth.every((m) => m.revenue === 0) ? (
              <div className="text-center py-8 text-slate-400 text-sm">No completed jobs yet</div>
            ) : (
              <div>
                <div className="flex items-end gap-2 mb-2">
                  {revenueByMonth.map((m) => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <Bar value={m.revenue} max={maxRevenue} color="bg-orange-400" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  {revenueByMonth.map((m) => (
                    <div key={m.month} className="flex-1 text-center">
                      <p className="text-xs text-slate-400">{m.month}</p>
                      {m.revenue > 0 && (
                        <p className="text-xs font-semibold text-slate-700">{formatCurrency(m.revenue)}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Jobs chart */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="font-bold text-slate-900 mb-5">Jobs Booked (last 6 months)</h2>
            {jobsByMonth.every((m) => m.jobs === 0) ? (
              <div className="text-center py-8 text-slate-400 text-sm">No bookings yet</div>
            ) : (
              <div>
                <div className="flex items-end gap-2 mb-2">
                  {jobsByMonth.map((m) => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <Bar value={m.jobs} max={maxJobs} color="bg-blue-400" />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  {jobsByMonth.map((m) => (
                    <div key={m.month} className="flex-1 text-center">
                      <p className="text-xs text-slate-400">{m.month}</p>
                      {m.jobs > 0 && (
                        <p className="text-xs font-semibold text-slate-700">{m.jobs}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top categories */}
        {topCategories.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
            <h2 className="font-bold text-slate-900 mb-5">Top Job Types</h2>
            <div className="space-y-3">
              {topCategories.map((cat, i) => {
                const pct = Math.round((cat.count / topCategories[0].count) * 100);
                return (
                  <div key={cat.name} className="flex items-center gap-4">
                    <div className="w-4 text-xs text-slate-400 font-medium">#{i + 1}</div>
                    <div className="w-32 text-sm font-medium text-slate-700 truncate">{cat.name}</div>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-orange-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-sm font-bold text-slate-900 w-8 text-right">{cat.count}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tips based on data */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
          <h3 className="font-bold text-orange-900 mb-3">💡 Performance Tips</h3>
          <ul className="space-y-2 text-sm text-orange-700">
            {summary.winRate !== null && summary.winRate < 30 && (
              <li>→ Your win rate is low ({summary.winRate}%). Try adjusting your pricing or responding faster.</li>
            )}
            {summary.avgResponseMinutes !== null && summary.avgResponseMinutes > 120 && (
              <li>→ Responding within 1 hour increases win rate by up to 40%. You average {formatResponse(summary.avgResponseMinutes)}.</li>
            )}
            {summary.reviewCount < 5 && (
              <li>→ Ask your last {summary.completedBookings} customers to leave a review — profiles with 5+ reviews get 3x more leads.</li>
            )}
            {summary.winRate !== null && summary.winRate >= 30 && summary.avgResponseMinutes !== null && summary.avgResponseMinutes <= 60 && summary.reviewCount >= 5 && (
              <li>✅ You&apos;re doing great! Consider expanding your service area to capture more leads.</li>
            )}
            {summary.totalEstimates === 0 && (
              <li>→ Start sending quotes on available leads to build your track record.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
