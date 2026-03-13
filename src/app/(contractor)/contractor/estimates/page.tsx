"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ContractorEstimate {
  id: string;
  estimateNumber: string;
  status: string;
  customerName: string | null;
  customerEmail: string | null;
  projectTitle: string | null;
  categoryId: string | null;
  totalPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  createdAt: string;
  updatedAt: string;
}

const STATUS_TABS = ["all", "draft", "sent", "accepted", "declined"] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-600",
};

const STATUS_ICONS: Record<string, string> = {
  draft: "✏️",
  sent: "📤",
  accepted: "✅",
  declined: "❌",
};

function EstimatesContent() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [estimates, setEstimates] = useState<ContractorEstimate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/contractor/estimates");
      return;
    }
    if (status === "authenticated" && session.user.role !== "contractor") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      loadEstimates();
    }
  }, [status, session, router]);

  async function loadEstimates() {
    setLoading(true);
    const params = new URLSearchParams();
    if (activeTab !== "all") params.set("status", activeTab);
    if (search) params.set("search", search);

    const res = await fetch(`/api/contractor/estimates?${params}`);
    const data = await res.json();
    setEstimates(data.estimates || []);
    setLoading(false);
  }

  useEffect(() => {
    if (status === "authenticated") loadEstimates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, search]);

  async function createNew() {
    setCreating(true);
    const res = await fetch("/api/contractor/estimates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "draft" }),
    });
    const data = await res.json();
    if (data.estimate?.id) {
      router.push(`/contractor/estimate-builder?id=${data.estimate.id}`);
    } else {
      setCreating(false);
    }
  }

  async function deleteEstimate(id: string, e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm("Delete this estimate permanently?")) return;
    await fetch(`/api/contractor/estimates/${id}`, { method: "DELETE" });
    setEstimates((prev) => prev.filter((e) => e.id !== id));
  }

  const displayPrice = (est: ContractorEstimate) => {
    if (est.totalPrice) return formatCurrency(est.totalPrice);
    if (est.minPrice && est.maxPrice)
      return `${formatCurrency(est.minPrice)} – ${formatCurrency(est.maxPrice)}`;
    return "—";
  };

  // Counts per status for tab badges
  const counts = estimates.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});

  // Filter on client side for "all" tab display
  const filtered =
    activeTab === "all"
      ? estimates
      : estimates.filter((e) => e.status === activeTab);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-spin">⚙️</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">My Estimates</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {estimates.length} estimate{estimates.length !== 1 ? "s" : ""} total
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/contractor/dashboard">
              <Button variant="outline" size="sm">
                ← Dashboard
              </Button>
            </Link>
            <Button size="sm" isLoading={creating} onClick={createNew}>
              + New Estimate
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {(["draft", "sent", "accepted", "declined"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveTab(s)}
              className={`bg-white rounded-2xl border p-5 text-left transition-all hover:shadow-md ${
                activeTab === s ? "border-orange-400 ring-2 ring-orange-100" : "border-slate-200"
              }`}
            >
              <div className="text-2xl mb-2">{STATUS_ICONS[s]}</div>
              <div className="text-3xl font-black text-slate-900">
                {counts[s] || 0}
              </div>
              <div className="text-slate-500 text-sm capitalize mt-0.5">{s}</div>
            </button>
          ))}
        </div>

        {/* Search + tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by customer, project, or estimate #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
          </div>

          {/* Status tabs */}
          <div className="flex border-b border-slate-100 px-4">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors capitalize ${
                  activeTab === tab
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab}
                {tab !== "all" && counts[tab] ? (
                  <span className="ml-1.5 text-xs bg-slate-100 rounded-full px-1.5 py-0.5">
                    {counts[tab]}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {/* List */}
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📋</div>
              <p className="text-slate-500 font-medium">No estimates found</p>
              <p className="text-slate-400 text-sm mt-1">
                {activeTab === "all"
                  ? "Create your first estimate to get started."
                  : `No ${activeTab} estimates yet.`}
              </p>
              <Button className="mt-5" size="sm" isLoading={creating} onClick={createNew}>
                + New Estimate
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filtered.map((est) => (
                <Link
                  key={est.id}
                  href={`/contractor/estimate-builder?id=${est.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 transition-colors group"
                >
                  {/* Status icon */}
                  <div className="text-2xl shrink-0">{STATUS_ICONS[est.status] || "📄"}</div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-slate-900 text-sm group-hover:text-orange-600 transition-colors">
                        {est.projectTitle || "Untitled Estimate"}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          STATUS_COLORS[est.status] || "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {est.status}
                      </span>
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5 truncate">
                      {est.estimateNumber}
                      {est.customerName ? ` · ${est.customerName}` : ""}
                      {est.customerEmail ? ` · ${est.customerEmail}` : ""}
                    </div>
                  </div>

                  {/* Price + date */}
                  <div className="text-right shrink-0">
                    <div className="font-bold text-slate-900 text-sm">
                      {displayPrice(est)}
                    </div>
                    <div className="text-slate-400 text-xs mt-0.5">
                      Updated {formatDate(est.updatedAt)}
                    </div>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={(e) => deleteEstimate(est.id, e)}
                    className="shrink-0 text-slate-300 hover:text-red-400 transition-colors text-lg leading-none ml-2"
                    title="Delete estimate"
                  >
                    ×
                  </button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ContractorEstimatesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-4xl animate-spin">⚙️</div>
        </div>
      }
    >
      <EstimatesContent />
    </Suspense>
  );
}
