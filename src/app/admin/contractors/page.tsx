"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface Contractor {
  id: string;
  name: string | null;
  email: string;
  createdAt: string;
  _count: { jobRequests: number; bookings: number };
  contractor: {
    businessName: string;
    subscriptionStatus: string;
    subscriptionEnds: string | null;
    isVerified: boolean;
    isActive: boolean;
    rating: number;
    reviewCount: number;
    city: string | null;
    state: string | null;
  } | null;
}

export default function AdminContractorsPage() {
  const [users, setUsers] = useState<Contractor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ role: "contractor", page: String(page), search });
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.users || []);
    setTotal(data.total || 0);
    setPages(data.pages || 1);
    setLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function action(userId: string, actionName: string, extra?: Record<string, unknown>) {
    setActionLoading(userId + actionName);
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: actionName, ...extra }),
    });
    const data = await res.json();
    setSuccess(data.message || "Done");
    setTimeout(() => setSuccess(""), 3000);
    await load();
    setActionLoading(null);
  }

  const subColors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    trial: "bg-blue-100 text-blue-700",
    inactive: "bg-slate-100 text-slate-500",
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Contractors</h1>
          <p className="text-slate-500 mt-1">{total} total contractors</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
            {users.filter((u) => u.contractor?.subscriptionStatus === "active").length} active
          </span>
          <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
            {users.filter((u) => u.contractor?.subscriptionStatus !== "active").length} inactive
          </span>
          <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-medium">
            MRR: {formatCurrency(users.filter((u) => u.contractor?.subscriptionStatus === "active").length * 49)}
          </span>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-6">
          ✓ {success}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
        <input
          type="text"
          placeholder="Search by name, email or business..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900"
        />
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-slate-400">Loading...</div>
        ) : users.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 text-center py-12 text-slate-400">No contractors found</div>
        ) : (
          users.map((user) => {
            const c = user.contractor;
            return (
              <div key={user.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  {/* Identity */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-11 h-11 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 font-black text-lg">
                      {c?.businessName?.[0]?.toUpperCase() || "?"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-slate-900">{c?.businessName || user.name}</p>
                        {c?.isVerified && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">✓ Verified</span>
                        )}
                        {!c?.isActive && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Deactivated</span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs">{user.email}</p>
                      {c?.city && (
                        <p className="text-slate-400 text-xs">📍 {c.city}, {c.state}</p>
                      )}
                    </div>
                  </div>

                  {/* Subscription */}
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${subColors[c?.subscriptionStatus || "inactive"]}`}>
                        {c?.subscriptionStatus || "inactive"}
                      </span>
                      {c?.subscriptionEnds && (
                        <p className="text-xs text-slate-400 mt-1">
                          Ends {formatDate(c.subscriptionEnds)}
                        </p>
                      )}
                    </div>
                    <div className="text-center px-4 border-l border-slate-100">
                      <p className="text-lg font-black text-slate-900">{c?.rating?.toFixed(1) || "—"}</p>
                      <p className="text-xs text-slate-400">★ {c?.reviewCount || 0} reviews</p>
                    </div>
                    <div className="text-center px-4 border-l border-slate-100">
                      <p className="text-lg font-black text-slate-900">{user._count.bookings}</p>
                      <p className="text-xs text-slate-400">bookings</p>
                    </div>
                    <p className="text-xs text-slate-400 px-4 border-l border-slate-100">
                      Joined<br />{formatDate(user.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                  {/* Subscription actions */}
                  {c?.subscriptionStatus !== "active" ? (
                    <button
                      onClick={() => action(user.id, "activate_subscription", { months: 1 })}
                      disabled={!!actionLoading}
                      className="text-xs px-3 py-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-all disabled:opacity-50"
                    >
                      ✓ Activate 1 Month
                    </button>
                  ) : (
                    <button
                      onClick={() => action(user.id, "cancel_subscription")}
                      disabled={!!actionLoading}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-all disabled:opacity-50"
                    >
                      Cancel Subscription
                    </button>
                  )}

                  {/* Extend subscription */}
                  <button
                    onClick={() => action(user.id, "activate_subscription", { months: 3 })}
                    disabled={!!actionLoading}
                    className="text-xs px-3 py-1.5 rounded-lg border border-green-300 text-green-700 hover:bg-green-50 transition-all disabled:opacity-50"
                  >
                    +3 Months
                  </button>

                  {/* Verify */}
                  {!c?.isVerified && (
                    <button
                      onClick={() => action(user.id, "verify_contractor")}
                      disabled={!!actionLoading}
                      className="text-xs px-3 py-1.5 rounded-lg border border-blue-300 text-blue-700 hover:bg-blue-50 transition-all disabled:opacity-50"
                    >
                      Verify ✓
                    </button>
                  )}

                  {/* Activate / Deactivate */}
                  {c?.isActive ? (
                    <button
                      onClick={() => action(user.id, "deactivate_contractor")}
                      disabled={!!actionLoading}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => action(user.id, "activate_contractor")}
                      disabled={!!actionLoading}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                      Reactivate
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <p className="text-sm text-slate-500">Page {page} of {pages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">← Prev</button>
            <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg disabled:opacity-40 hover:bg-slate-50">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
