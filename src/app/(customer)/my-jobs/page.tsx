"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Job {
  id: string;
  title: string;
  status: string;
  city: string;
  state: string;
  urgency: string;
  createdAt: string;
  category: { name: string; icon: string };
  estimates: {
    id: string;
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    isAiGenerated: boolean;
  }[];
  booking: {
    id: string;
    status: string;
    agreedPrice: number;
    scheduledDate: string | null;
    contractor: { businessName: string; phone: string };
  } | null;
}

const STATUS_TABS = ["all", "pending", "estimated", "booked", "completed", "cancelled"] as const;

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  estimated: "bg-blue-100 text-blue-700",
  booked: "bg-green-100 text-green-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-600",
};

export default function MyJobsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/my-jobs");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/jobs")
        .then((r) => r.json())
        .then((d) => {
          setJobs(d.jobs || []);
          setLoading(false);
        });
    }
  }, [status, router]);

  async function handleDelete(jobId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this job? This cannot be undone.")) return;
    setDeletingId(jobId);
    const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    if (res.ok) {
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } else {
      const d = await res.json();
      alert(d.error || "Could not delete.");
    }
    setDeletingId(null);
  }

  const filtered = activeTab === "all" ? jobs : jobs.filter((j) => j.status === activeTab);
  const counts = jobs.reduce<Record<string, number>>((acc, j) => {
    acc[j.status] = (acc[j.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-spin mb-4">⚙️</div>
          <p className="text-slate-500">Loading your jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-black text-slate-900">My Jobs</h1>
            <p className="text-slate-500 mt-1">Track your estimates and bookings</p>
          </div>
          <Link href="/get-estimate">
            <Button>+ New Estimate</Button>
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="text-5xl mb-4">🔧</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">No jobs yet</h2>
            <p className="text-slate-500 mb-6">
              Get your first instant estimate — it&apos;s free and takes under 2 minutes.
            </p>
            <Link href="/get-estimate">
              <Button size="lg">Get Your First Estimate</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Status tabs */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4">
              <div className="flex border-b border-slate-100 px-2 overflow-x-auto">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap capitalize transition-colors ${
                      activeTab === tab
                        ? "border-orange-500 text-orange-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab}
                    {tab !== "all" && counts[tab] ? (
                      <span className="ml-1.5 text-xs bg-slate-100 rounded-full px-1.5 py-0.5">{counts[tab]}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <p className="text-slate-400">No {activeTab} jobs.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((job) => {
                  const aiEstimate = job.estimates.find((e) => e.isAiGenerated);
                  const canDelete = job.status !== "booked" && job.status !== "completed";
                  return (
                    <div key={job.id} className="relative">
                      <Link href={`/my-jobs/${job.id}`}>
                        <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-orange-300 hover:shadow-sm transition-all cursor-pointer">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1">
                              <span className="text-2xl">{job.category.icon}</span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-semibold text-slate-900">{job.title}</span>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[job.status] || "bg-slate-100 text-slate-600"}`}>
                                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                                  </span>
                                </div>
                                <p className="text-slate-500 text-sm mt-0.5">
                                  {job.city}, {job.state} · {formatDate(job.createdAt)}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {aiEstimate && (
                                <div className="text-right">
                                  <div className="text-lg font-black text-slate-900">
                                    {formatCurrency(aiEstimate.minPrice)} – {formatCurrency(aiEstimate.maxPrice)}
                                  </div>
                                  <div className="text-xs text-slate-400">AI estimate</div>
                                </div>
                              )}
                              {canDelete && (
                                <button
                                  onClick={(e) => handleDelete(job.id, e)}
                                  disabled={deletingId === job.id}
                                  className="text-slate-300 hover:text-red-400 transition-colors text-xl leading-none p-1"
                                  title="Delete job"
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          </div>

                          {job.booking && (
                            <div className="mt-3 bg-green-50 border border-green-100 rounded-xl p-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-semibold text-green-800 text-sm">
                                    {job.booking.contractor.businessName}
                                  </p>
                                  <p className="text-green-600 text-xs mt-0.5">
                                    <span className={`inline-block px-1.5 py-0.5 rounded-full text-xs mr-1 ${
                                      job.booking.status === "completed" ? "bg-green-200 text-green-800" :
                                      job.booking.status === "in_progress" ? "bg-purple-100 text-purple-700" :
                                      job.booking.status === "confirmed" ? "bg-blue-100 text-blue-700" :
                                      "bg-yellow-100 text-yellow-700"
                                    }`}>
                                      {job.booking.status.replace("_", " ")}
                                    </span>
                                    {job.booking.scheduledDate ? formatDate(job.booking.scheduledDate) : "Date TBD"}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-green-800">{formatCurrency(job.booking.agreedPrice)}</div>
                                  <div className="text-xs text-green-600">agreed price</div>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="mt-3 pt-2.5 border-t border-slate-50 flex items-center justify-between">
                            <span className="text-xs text-orange-500 font-medium">View full details →</span>
                            {job.booking && (
                              <span className="text-xs text-slate-400">💬 Message contractor</span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
