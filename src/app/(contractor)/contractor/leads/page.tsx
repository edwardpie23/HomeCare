"use client";

import { useState, useEffect } from "react";
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

export default function ContractorLeadsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

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
          setLeads(d.jobs || []);
          setLoading(false);
        });
    }
  }, [status, session, router]);

  async function claimLead(jobId: string, estimatePrice: number) {
    setClaiming(jobId);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobRequestId: jobId,
        agreedPrice: estimatePrice,
        notes: "Contractor claimed lead from QuoteFast platform",
      }),
    });

    if (res.ok) {
      setLeads((prev) => prev.filter((l) => l.id !== jobId));
      alert("Lead claimed! Check your dashboard for details.");
      router.push("/contractor/dashboard");
    } else {
      alert("Failed to claim lead. Please try again.");
    }
    setClaiming(null);
  }

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
        <div className="flex items-center gap-4 mb-8">
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

        {leads.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">No leads available right now</h2>
            <p className="text-slate-500 text-sm">
              Check back soon — new leads come in daily as homeowners request estimates.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {leads.map((lead) => {
              const estimate = lead.estimates[0];
              return (
                <div key={lead.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-orange-300 transition-all">
                  <Link href={`/contractor/leads/${lead.id}`} className="block">
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{lead.category.icon}</span>
                        <div>
                          <h3 className="font-bold text-slate-900">{lead.title}</h3>
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
            <li>✓ Claim a lead to connect with the homeowner</li>
            <li>✓ Pay only $15 lead fee per claimed job</li>
            <li>✓ Active subscribers get priority placement</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
