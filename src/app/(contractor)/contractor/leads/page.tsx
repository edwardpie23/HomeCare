"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Lead {
  id: string;
  title: string;
  description: string | null;
  city: string;
  state: string;
  zipCode: string;
  size: number | null;
  urgency: string;
  status: string;
  createdAt: string;
  qualityScore: number | null;
  qualityScoreReason: string | null;
  category: { name: string; icon: string; unit: string };
  estimates: {
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    isAiGenerated: boolean;
  }[];
  user: { name: string };
}

const urgencyColors: Record<string, string> = {
  asap: "bg-red-100 text-red-700",
  this_week: "bg-yellow-100 text-yellow-700",
  flexible: "bg-slate-100 text-slate-600",
};

const urgencyLabels: Record<string, string> = {
  asap: "🔥 ASAP",
  this_week: "📅 This Week",
  flexible: "😊 Flexible",
};

function scoreColor(score: number) {
  if (score >= 75) return "text-green-700 bg-green-100";
  if (score >= 50) return "text-yellow-700 bg-yellow-100";
  return "text-red-700 bg-red-100";
}

function scoreLabel(score: number) {
  if (score >= 75) return "Hot";
  if (score >= 50) return "Warm";
  return "Cold";
}

export default function ContractorLeadsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [scores, setScores] = useState<Record<string, { score: number; reason: string }>>({});
  const [loadingScores, setLoadingScores] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "hot" | "warm" | "cold">("all");

  const scoreLeads = useCallback(async (leadList: Lead[]) => {
    const unscored = leadList.filter((l) => l.qualityScore === null);
    if (unscored.length === 0) {
      // Populate scores from DB values
      const initial: Record<string, { score: number; reason: string }> = {};
      leadList.forEach((l) => {
        if (l.qualityScore !== null) {
          initial[l.id] = { score: l.qualityScore!, reason: l.qualityScoreReason || "" };
        }
      });
      setScores(initial);
      return;
    }

    // Set loading state for all unscored
    const loadingMap: Record<string, boolean> = {};
    unscored.forEach((l) => { loadingMap[l.id] = true; });
    setLoadingScores(loadingMap);

    // Score up to 10 leads in parallel
    const toScore = unscored.slice(0, 10);
    await Promise.all(
      toScore.map(async (lead) => {
        try {
          const res = await fetch("/api/leads/score", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId: lead.id }),
          });
          if (res.ok) {
            const data = await res.json();
            setScores((prev) => ({ ...prev, [lead.id]: data }));
          }
        } finally {
          setLoadingScores((prev) => ({ ...prev, [lead.id]: false }));
        }
      })
    );

    // Also populate pre-scored ones
    leadList.forEach((l) => {
      if (l.qualityScore !== null) {
        setScores((prev) => ({ ...prev, [l.id]: { score: l.qualityScore!, reason: l.qualityScoreReason || "" } }));
      }
    });
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/contractor/leads");
      return;
    }
    if (status === "authenticated" && session.user.role !== "contractor") {
      router.push("/get-estimate");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/jobs?role=contractor")
        .then((r) => r.json())
        .then((d) => {
          const jobs = d.jobs || [];
          setLeads(jobs);
          setLoading(false);
          scoreLeads(jobs);
        });
    }
  }, [status, session, router, scoreLeads]);

  const filteredLeads = leads.filter((lead) => {
    if (filter === "all") return true;
    const s = scores[lead.id]?.score ?? lead.qualityScore;
    if (!s) return false;
    if (filter === "hot") return s >= 75;
    if (filter === "warm") return s >= 50 && s < 75;
    if (filter === "cold") return s < 50;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-spin">⚙️</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/contractor/dashboard">
              <Button variant="ghost" size="sm">← Dashboard</Button>
            </Link>
            <div>
              <h1 className="text-3xl font-black text-slate-900">Available Leads</h1>
              <p className="text-slate-500 text-sm mt-1">
                {leads.length} homeowners looking for contractors right now
              </p>
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {(["all", "hot", "warm", "cold"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                filter === f
                  ? "bg-orange-500 text-white"
                  : "bg-white border border-slate-200 text-slate-600 hover:border-orange-300"
              }`}
            >
              {f === "hot" ? "🔥 Hot" : f === "warm" ? "🌤 Warm" : f === "cold" ? "🧊 Cold" : "All"}
            </button>
          ))}
        </div>

        {filteredLeads.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">No leads match this filter</h2>
            <p className="text-slate-500 text-sm">
              {leads.length === 0
                ? "Check back soon — new leads come in daily as homeowners request estimates."
                : "Try a different filter to see more leads."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredLeads.map((lead) => {
              const estimate = lead.estimates[0];
              const scoreData = scores[lead.id];
              const isScoring = loadingScores[lead.id];

              return (
                <div key={lead.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-orange-300 transition-all">
                  <Link href={`/contractor/leads/${lead.id}`} className="block">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-2xl">{lead.category.icon}</span>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-bold text-slate-900">{lead.title}</h3>
                              {/* Quality Score Badge */}
                              {isScoring ? (
                                <span className="text-xs bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full animate-pulse">
                                  Scoring…
                                </span>
                              ) : scoreData ? (
                                <span
                                  className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor(scoreData.score)}`}
                                  title={scoreData.reason}
                                >
                                  {scoreLabel(scoreData.score)} · {scoreData.score}
                                </span>
                              ) : null}
                            </div>
                            <p className="text-slate-500 text-sm">
                              {lead.city}, {lead.state} {lead.zipCode} · {formatDate(lead.createdAt)}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              urgencyColors[lead.urgency] || "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {urgencyLabels[lead.urgency] || lead.urgency}
                          </span>
                          {lead.size && (
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                              {lead.size} {lead.category.unit}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">
                            Posted by {lead.user.name}
                          </span>
                        </div>

                        {lead.description && (
                          <p className="text-slate-600 text-sm mb-3 line-clamp-2">
                            {lead.description}
                          </p>
                        )}

                        {/* Score reason tooltip */}
                        {scoreData && (
                          <p className="text-xs text-slate-400 italic">{scoreData.reason}</p>
                        )}
                      </div>

                      <div className="sm:text-right shrink-0">
                        {estimate && (
                          <div className="mb-3">
                            <div className="text-2xl font-black text-slate-900">
                              {formatCurrency(estimate.minPrice)} – {formatCurrency(estimate.maxPrice)}
                            </div>
                            <div className="text-xs text-slate-400">AI estimate range</div>
                          </div>
                        )}
                        <span className="text-xs text-orange-500 font-medium">View & Quote →</span>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-8 bg-orange-50 border border-orange-200 rounded-2xl p-5">
          <h3 className="font-bold text-orange-900 mb-2">How leads work</h3>
          <ul className="space-y-2 text-sm text-orange-700">
            <li>✓ Browse all available leads for free</li>
            <li>✓ AI scores each lead so you know which to prioritize</li>
            <li>✓ Claim a lead to connect with the homeowner</li>
            <li>✓ Pay only $15 lead fee per claimed job</li>
            <li>✓ Active subscribers get priority placement</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
