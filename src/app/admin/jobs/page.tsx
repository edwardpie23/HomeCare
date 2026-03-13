"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Job {
  id: string;
  title: string;
  city: string;
  state: string;
  status: string;
  urgency: string;
  createdAt: string;
  category: { name: string; icon: string };
  user: { name: string | null; email: string };
  estimates: { minPrice: number; maxPrice: number; isAiGenerated: boolean }[];
  booking: { contractor: { businessName: string } } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  estimated: "bg-blue-100 text-blue-700",
  booked: "bg-green-100 text-green-700",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-100 text-red-600",
};

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), ...(statusFilter ? { status: statusFilter } : {}) });
    const res = await fetch(`/api/admin/jobs?${params}`);
    const data = await res.json();
    setJobs(data.jobs || []);
    setTotal(data.total || 0);
    setPages(data.pages || 1);
    setLoading(false);
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Jobs & Estimates</h1>
          <p className="text-slate-500 mt-1">{total} total job requests</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 flex gap-2 flex-wrap">
        {["", "pending", "estimated", "booked", "completed", "cancelled"].map((s) => (
          <button
            key={s || "all"}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              statusFilter === s
                ? "bg-orange-500 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {s ? s.charAt(0).toUpperCase() + s.slice(1) : "All"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Job</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Customer</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">AI Estimate</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Contractor</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">Loading...</td></tr>
            ) : jobs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">No jobs found</td></tr>
            ) : (
              jobs.map((job) => {
                const est = job.estimates[0];
                return (
                  <tr key={job.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{job.category.icon}</span>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{job.title}</p>
                          <p className="text-slate-400 text-xs">{job.city}, {job.state}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900 text-sm">{job.user.name || "—"}</p>
                      <p className="text-slate-400 text-xs">{job.user.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      {est ? (
                        <p className="font-semibold text-slate-900 text-sm">
                          {formatCurrency(est.minPrice)} – {formatCurrency(est.maxPrice)}
                        </p>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {job.booking ? (
                        <p className="text-slate-900 text-sm">{job.booking.contractor.businessName}</p>
                      ) : (
                        <span className="text-slate-400 text-sm">Not booked</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[job.status] || "bg-slate-100 text-slate-600"}`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {formatDate(job.createdAt)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">Page {page} of {pages} · {total} total</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">← Prev</button>
              <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
