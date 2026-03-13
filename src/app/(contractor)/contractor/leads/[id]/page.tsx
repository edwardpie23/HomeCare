"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Job {
  id: string;
  title: string;
  description: string | null;
  city: string;
  state: string;
  zipCode: string;
  address: string | null;
  size: number | null;
  urgency: string;
  status: string;
  photos: string;
  aiAnalysis: string | null;
  createdAt: string;
  category: { name: string; icon: string; unit: string };
  estimates: {
    id: string;
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    breakdown: string | null;
    notes: string | null;
    isAiGenerated: boolean;
    createdAt: string;
  }[];
  booking: { id: string } | null;
  user: { name: string | null; email: string };
}

const urgencyLabels: Record<string, string> = {
  asap: "🔥 ASAP — needs immediate attention",
  this_week: "📅 This Week",
  flexible: "😊 Flexible timeline",
};

export default function ContractorLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);

  // Estimate state
  const [estimateForm, setEstimateForm] = useState({
    minPrice: "",
    maxPrice: "",
    avgPrice: "",
    notes: "",
  });
  const [aiSuggestion, setAiSuggestion] = useState<{
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    breakdown: { item: string; cost: number }[];
    notes: string;
    estimatedDays?: number;
  } | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);
  const [savingEstimate, setSavingEstimate] = useState(false);
  const [estimateSaved, setEstimateSaved] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/contractor/leads/${id}`);
      return;
    }
    if (status === "authenticated" && session?.user?.role !== "contractor") {
      router.push("/my-jobs");
      return;
    }
    if (status === "authenticated") {
      fetch(`/api/jobs/${id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.job) setJob(d.job);
          setLoading(false);
        });
    }
  }, [status, session, id, router]);

  async function generateAiEstimate() {
    setGeneratingAi(true);
    setAiSuggestion(null);
    const res = await fetch("/api/estimates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobRequestId: id, action: "ai_suggest" }),
    });
    const data = await res.json();
    if (data.suggestion) {
      setAiSuggestion(data.suggestion);
      setEstimateForm({
        minPrice: String(data.suggestion.minPrice),
        maxPrice: String(data.suggestion.maxPrice),
        avgPrice: String(data.suggestion.avgPrice),
        notes: data.suggestion.notes || "",
      });
    }
    setGeneratingAi(false);
  }

  async function saveEstimate() {
    setSavingEstimate(true);
    const res = await fetch("/api/estimates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobRequestId: id,
        action: "save",
        ...estimateForm,
      }),
    });
    if (res.ok) {
      setEstimateSaved(true);
      setTimeout(() => setEstimateSaved(false), 3000);
    }
    setSavingEstimate(false);
  }

  async function claimLead() {
    if (!estimateForm.avgPrice) {
      alert("Please create an estimate first before claiming.");
      return;
    }
    setClaiming(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobRequestId: id,
        agreedPrice: parseFloat(estimateForm.avgPrice),
        notes: estimateForm.notes,
      }),
    });
    if (res.ok) {
      router.push("/contractor/dashboard?subscription=success");
    } else {
      const d = await res.json();
      alert(d.error || "Failed to claim lead.");
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-spin">⚙️</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center">
        <div>
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-slate-600 font-medium">Lead not found</p>
          <Link href="/contractor/leads" className="mt-4 inline-block text-orange-500 hover:underline text-sm">← Back to leads</Link>
        </div>
      </div>
    );
  }

  const photos: string[] = JSON.parse(job.photos || "[]");
  const aiAnalysis = job.aiAnalysis ? JSON.parse(job.aiAnalysis) : null;
  const platformEstimate = job.estimates.find((e) => e.isAiGenerated);
  const alreadyBooked = !!job.booking;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/contractor/leads">
              <Button variant="ghost" size="sm">← Leads</Button>
            </Link>
            <span className="text-xs bg-orange-100 text-orange-700 font-semibold px-2.5 py-1 rounded-full">
              {alreadyBooked ? "Booked" : "Available Lead"}
            </span>
          </div>
          {!alreadyBooked && (
            <Button
              onClick={claimLead}
              isLoading={claiming}
              className="shrink-0"
            >
              Claim Lead — $15
            </Button>
          )}
        </div>

        {/* Job Summary */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
          <div className="flex items-center gap-3 mb-5">
            <span className="text-3xl">{job.category.icon}</span>
            <div>
              <p className="text-slate-400 text-sm">{job.category.name}</p>
              <h1 className="text-2xl font-black text-slate-900">{job.title}</h1>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mb-5">
            <div>
              <span className="text-slate-400 text-xs uppercase font-medium">Location</span>
              <p className="text-slate-900 font-semibold mt-0.5">{job.city}, {job.state} {job.zipCode}</p>
            </div>
            <div>
              <span className="text-slate-400 text-xs uppercase font-medium">Urgency</span>
              <p className="text-slate-900 font-semibold mt-0.5">{urgencyLabels[job.urgency] || job.urgency}</p>
            </div>
            {job.size && (
              <div>
                <span className="text-slate-400 text-xs uppercase font-medium">Size</span>
                <p className="text-slate-900 font-semibold mt-0.5">{job.size} {job.category.unit}</p>
              </div>
            )}
            <div>
              <span className="text-slate-400 text-xs uppercase font-medium">Customer</span>
              <p className="text-slate-900 font-semibold mt-0.5">{job.user.name || "Homeowner"}</p>
            </div>
            {job.address && (
              <div className="col-span-2">
                <span className="text-slate-400 text-xs uppercase font-medium">Address</span>
                <p className="text-slate-900 font-semibold mt-0.5">{job.address}</p>
              </div>
            )}
            <div>
              <span className="text-slate-400 text-xs uppercase font-medium">Posted</span>
              <p className="text-slate-900 font-semibold mt-0.5">{formatDate(job.createdAt)}</p>
            </div>
          </div>

          {job.description && (
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-slate-400 text-xs uppercase font-medium mb-2">Customer's Description</p>
              <p className="text-slate-700 text-sm leading-relaxed">{job.description}</p>
            </div>
          )}
        </div>

        {/* Photos */}
        {photos.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
            <h2 className="font-bold text-slate-900 mb-4">📷 Customer Photos ({photos.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo, i) => (
                <img
                  key={i}
                  src={photo}
                  alt={`Job photo ${i + 1}`}
                  className="w-full h-40 object-cover rounded-xl border border-slate-200 cursor-pointer hover:opacity-90"
                  onClick={() => window.open(photo, "_blank")}
                />
              ))}
            </div>
            <p className="text-slate-400 text-xs mt-2">Click any photo to view full size</p>
          </div>
        )}

        {/* AI Analysis (platform's analysis of job) */}
        {(aiAnalysis || platformEstimate) && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🤖</span>
              <h2 className="font-bold text-slate-900">Platform AI Assessment</h2>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">For reference</span>
            </div>

            {aiAnalysis && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
                <div>
                  <span className="text-slate-400 text-xs uppercase font-medium">Assessment</span>
                  <p className="text-slate-900 mt-0.5 text-xs">{aiAnalysis.detected}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs uppercase font-medium">Complexity</span>
                  <p className={`font-semibold mt-0.5 text-sm ${aiAnalysis.complexity === "simple" ? "text-green-600" : aiAnalysis.complexity === "complex" ? "text-red-600" : "text-yellow-600"}`}>
                    {aiAnalysis.complexity?.charAt(0).toUpperCase() + aiAnalysis.complexity?.slice(1)}
                  </p>
                </div>
                {aiAnalysis.estimatedHours && (
                  <div>
                    <span className="text-slate-400 text-xs uppercase font-medium">Est. Hours</span>
                    <p className="text-slate-900 font-semibold mt-0.5">{aiAnalysis.estimatedHours}h</p>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 text-xs uppercase font-medium">Confidence</span>
                  <p className="text-slate-900 font-semibold mt-0.5 capitalize">{aiAnalysis.confidence}</p>
                </div>
              </div>
            )}

            {platformEstimate && (
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-blue-500 text-xs font-medium uppercase mb-1">Platform Estimate Range</p>
                <p className="text-2xl font-black text-blue-900">
                  {formatCurrency(platformEstimate.minPrice)} – {formatCurrency(platformEstimate.maxPrice)}
                </p>
                <p className="text-blue-600 text-xs mt-0.5">Avg: {formatCurrency(platformEstimate.avgPrice)}</p>
                {platformEstimate.notes && (
                  <p className="text-blue-700 text-xs mt-2 italic">{platformEstimate.notes}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== AI ESTIMATE CREATOR ===== */}
        {!alreadyBooked && (
          <div className="bg-white rounded-2xl border-2 border-orange-200 p-6 mb-5">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-2xl">✍️</span>
              <div>
                <h2 className="font-black text-slate-900 text-lg">Create Your Estimate</h2>
                <p className="text-slate-500 text-sm">Let AI suggest a price or enter your own</p>
              </div>
            </div>

            {/* AI Suggest Button */}
            <button
              onClick={generateAiEstimate}
              disabled={generatingAi}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold hover:opacity-90 transition-all disabled:opacity-60 mb-5"
            >
              {generatingAi ? (
                <>
                  <span className="animate-spin text-lg">⚙️</span>
                  Analyzing job and generating estimate...
                </>
              ) : (
                <>
                  <span className="text-lg">🤖</span>
                  Generate AI Price Suggestion
                </>
              )}
            </button>

            {/* AI Suggestion result */}
            {aiSuggestion && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-5">
                <p className="text-purple-700 text-xs font-semibold uppercase mb-3">AI Suggested for This Job</p>
                <div className="text-2xl font-black text-purple-900 mb-2">
                  {formatCurrency(aiSuggestion.minPrice)} – {formatCurrency(aiSuggestion.maxPrice)}
                </div>
                {aiSuggestion.breakdown.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {aiSuggestion.breakdown.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-purple-700">{item.item}</span>
                        <span className="font-semibold text-purple-900">{formatCurrency(item.cost)}</span>
                      </div>
                    ))}
                  </div>
                )}
                {aiSuggestion.estimatedDays && (
                  <p className="text-purple-600 text-xs">
                    Est. {aiSuggestion.estimatedDays} day{aiSuggestion.estimatedDays !== 1 ? "s" : ""} to complete
                  </p>
                )}
                <p className="text-purple-500 text-xs mt-2 italic">
                  Values pre-filled below — adjust as needed
                </p>
              </div>
            )}

            {/* Manual price inputs */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Min Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={estimateForm.minPrice}
                    onChange={(e) => setEstimateForm({ ...estimateForm, minPrice: e.target.value })}
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm"
                    placeholder="300"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Max Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={estimateForm.maxPrice}
                    onChange={(e) => setEstimateForm({ ...estimateForm, maxPrice: e.target.value })}
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm"
                    placeholder="600"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Your Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                  <input
                    type="number"
                    value={estimateForm.avgPrice}
                    onChange={(e) => setEstimateForm({ ...estimateForm, avgPrice: e.target.value })}
                    className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm font-semibold"
                    placeholder="450"
                  />
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">Message to Customer (optional)</label>
              <textarea
                value={estimateForm.notes}
                onChange={(e) => setEstimateForm({ ...estimateForm, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 resize-none text-sm"
                placeholder="e.g. Price includes all labor and materials. I can start this week. 5 years experience in roof repairs."
              />
            </div>

            {estimateSaved && (
              <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-2.5 text-sm mb-4">
                ✓ Estimate saved — the customer can now see your quote
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={saveEstimate}
                isLoading={savingEstimate}
                variant="outline"
                className="flex-1"
                disabled={!estimateForm.minPrice || !estimateForm.maxPrice || !estimateForm.avgPrice}
              >
                💾 Save Estimate
              </Button>
              <Button
                onClick={claimLead}
                isLoading={claiming}
                className="flex-1"
                disabled={!estimateForm.avgPrice}
              >
                ⚡ Claim Lead — $15
              </Button>
            </div>
            <p className="text-slate-400 text-xs text-center mt-3">
              Save to submit a quote first, or Claim to immediately book this job.
            </p>
          </div>
        )}

        {alreadyBooked && (
          <div className="bg-slate-100 rounded-2xl p-5 text-center text-slate-500 text-sm">
            This lead has already been booked by another contractor.
          </div>
        )}
      </div>
    </div>
  );
}
