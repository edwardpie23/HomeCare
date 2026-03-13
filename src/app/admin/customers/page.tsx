"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDate } from "@/lib/utils";

interface Customer {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  _count: { jobRequests: number; bookings: number };
}

export default function AdminCustomersPage() {
  const [users, setUsers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ role: "customer", page: String(page), search });
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.users || []);
    setTotal(data.total || 0);
    setPages(data.pages || 1);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function deleteUser(id: string, name: string) {
    if (!confirm(`Delete customer "${name}"? This cannot be undone.`)) return;
    setActionLoading(id);
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    await load();
    setActionLoading(null);
  }

  async function makeAdmin(id: string) {
    if (!confirm("Promote this user to admin?")) return;
    setActionLoading(id);
    await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "make_admin" }),
    });
    await load();
    setActionLoading(null);
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Customers</h1>
          <p className="text-slate-500 mt-1">{total} total homeowners</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Customer</th>
              <th className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Joined</th>
              <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Jobs</th>
              <th className="text-center text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Bookings</th>
              <th className="text-right text-xs font-semibold text-slate-500 uppercase tracking-wider px-6 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400">Loading...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-12 text-slate-400">No customers found</td></tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-sm">
                        {user.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{user.name || "—"}</p>
                        <p className="text-slate-400 text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500 text-sm">{formatDate(user.createdAt)}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-slate-900">{user._count.jobRequests}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-semibold text-slate-900">{user._count.bookings}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => makeAdmin(user.id)}
                        disabled={actionLoading === user.id}
                        className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-orange-400 hover:text-orange-600 transition-all disabled:opacity-50"
                      >
                        Make Admin
                      </button>
                      <button
                        onClick={() => deleteUser(user.id, user.name || user.email)}
                        disabled={actionLoading === user.id}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-all disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            <p className="text-sm text-slate-500">Page {page} of {pages}</p>
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
