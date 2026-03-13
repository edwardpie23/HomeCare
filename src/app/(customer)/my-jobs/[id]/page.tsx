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
    status: string;
    createdAt: string;
    contractor: { id: string; businessName: string; isVerified: boolean } | null;
  }[];
  booking: {
    id: string;
    status: string;
    agreedPrice: number;
    scheduledDate: string | null;
    notes: string | null;
    contractor: { id: string; businessName: string; phone: string; city: string; state: string; isVerified: boolean };
    review: { id: string } | null;
  } | null;
  user: { name: string | null; email: string };
}

const urgencyLabels: Record<string, string> = {
  asap: "🔥 ASAP",
  this_week: "📅 This Week",
  flexible: "😊 Flexible",
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  estimated: "bg-blue-100 text-blue-700",
  booked: "bg-green-100 text-green-700",
  completed: "bg-slate-100 text-slate-700",
  cancelled: "bg-red-100 text-red-600",
};

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className={`text-2xl transition-colors ${s <= (hover || value) ? "text-yellow-400" : "text-slate-200"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { status } = useSession();
  const router = useRouter();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Review form state
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    urgency: "",
    size: "",
    address: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/my-jobs/${id}`);
      return;
    }
    if (status === "authenticated") {
      fetch(`/api/jobs/${id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.job) {
            setJob(d.job);
            setForm({
              title: d.job.title,
              description: d.job.description || "",
              urgency: d.job.urgency,
              size: d.job.size?.toString() || "",
              address: d.job.address || "",
            });
          }
          setLoading(false);
        });
    }
  }, [status, id, router]);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setJob((prev) => prev ? { ...prev, ...data.job } : prev);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!confirm("Delete this job? This cannot be undone.")) return;
    setDeleting(true);
    const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/my-jobs");
    } else {
      const d = await res.json();
      alert(d.error || "Could not delete job.");
      setDeleting(false);
    }
  }

  async function handleAccept(estimateId: string, avgPrice: number) {
    if (!confirm(`Accept this quote for ${formatCurrency(avgPrice)}? This will book the contractor.`)) return;
    setActionLoading(estimateId);
    const res = await fetch(`/api/estimates/${estimateId}/accept`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      // Refresh job data
      const d = await fetch(`/api/jobs/${id}`).then((r) => r.json());
      if (d.job) setJob(d.job);
    } else {
      alert(data.error || "Could not accept quote.");
    }
    setActionLoading(null);
  }

  async function handleDecline(estimateId: string) {
    if (!confirm("Decline this quote?")) return;
    setActionLoading(estimateId);
    const res = await fetch(`/api/estimates/${estimateId}/decline`, { method: "POST" });
    if (res.ok) {
      setJob((prev) =>
        prev
          ? {
              ...prev,
              estimates: prev.estimates.map((e) =>
                e.id === estimateId ? { ...e, status: "declined" } : e
              ),
            }
          : prev
      );
    }
    setActionLoading(null);
  }

  async function handleReviewSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!job?.booking?.id) return;
    setReviewSubmitting(true);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookingId: job.booking.id,
        rating: reviewRating,
        comment: reviewComment,
      }),
    });
    if (res.ok) {
      setReviewDone(true);
      setJob((prev) =>
        prev && prev.booking ? { ...prev, booking: { ...prev.booking, review: { id: "done" } } } : prev
      );
    }
    setReviewSubmitting(false);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-slate-600 font-medium">Job not found</p>
          <Link href="/my-jobs" className="mt-4 inline-block text-orange-500 hover:underline text-sm">
            ← Back to my jobs
          </Link>
        </div>
      </div>
    );
  }

  const photos: string[] = JSON.parse(job.photos || "[]");
  const aiAnalysis = job.aiAnalysis ? JSON.parse(job.aiAnalysis) : null;
  const aiEstimate = job.estimates.find((e) => e.isAiGenerated);
  const contractorEstimates = job.estimates.filter((e) => !e.isAiGenerated);
  const canEdit = job.status !== "booked" && job.status !== "completed";
  const canDelete = job.status !== "booked" && job.status !== "completed";

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/my-jobs">
              <Button variant="ghost" size="sm">← My Jobs</Button>
            </Link>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusColors[job.status] || "bg-slate-100 text-slate-600"}`}>
              {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
            </span>
          </div>
          {canDelete && (
            <Button variant="ghost" size="sm" isLoading={deleting} onClick={handleDelete}
              className="text-red-400 hover:text-red-600 hover:bg-red-50">
              🗑 Delete Job
            </Button>
          )}
        </div>

        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-5">
            ✓ Changes saved successfully
          </div>
        )}

        {/* Job Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{job.category.icon}</span>
              <div>
                <span className="text-sm text-slate-400 font-medium">{job.category.name}</span>
                {!editing && (
                  <h1 className="text-2xl font-black text-slate-900">{job.title}</h1>
                )}
              </div>
            </div>
            {canEdit && !editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                ✏️ Edit
              </Button>
            )}
          </div>

          {editing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 resize-none"
                  placeholder="Describe the work needed in detail..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Urgency</label>
                  <select
                    value={form.urgency}
                    onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900"
                  >
                    <option value="asap">🔥 ASAP</option>
                    <option value="this_week">📅 This Week</option>
                    <option value="flexible">😊 Flexible</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Size ({job.category.unit})
                  </label>
                  <input
                    type="number"
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900"
                    placeholder="e.g. 200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Address / Location Notes</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900"
                  placeholder="Street address or notes for the contractor"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button onClick={handleSave} isLoading={saving}>Save Changes</Button>
                <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-400 text-xs uppercase font-medium">Location</span>
                  <p className="text-slate-900 font-medium mt-0.5">{job.city}, {job.state} {job.zipCode}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-xs uppercase font-medium">Urgency</span>
                  <p className="text-slate-900 font-medium mt-0.5">{urgencyLabels[job.urgency] || job.urgency}</p>
                </div>
                {job.size && (
                  <div>
                    <span className="text-slate-400 text-xs uppercase font-medium">Size</span>
                    <p className="text-slate-900 font-medium mt-0.5">{job.size} {job.category.unit}</p>
                  </div>
                )}
                {job.address && (
                  <div className="col-span-2 sm:col-span-3">
                    <span className="text-slate-400 text-xs uppercase font-medium">Address</span>
                    <p className="text-slate-900 font-medium mt-0.5">{job.address}</p>
                  </div>
                )}
                <div>
                  <span className="text-slate-400 text-xs uppercase font-medium">Submitted</span>
                  <p className="text-slate-900 font-medium mt-0.5">{formatDate(job.createdAt)}</p>
                </div>
              </div>

              {job.description && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase font-medium mb-2">Description</p>
                  <p className="text-slate-700 text-sm leading-relaxed">{job.description}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Photos */}
        {photos.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
            <h2 className="font-bold text-slate-900 mb-4">📷 Photos ({photos.length})</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {photos.map((photo, i) => (
                <img
                  key={i}
                  src={photo}
                  alt={`Job photo ${i + 1}`}
                  className="w-full h-36 object-cover rounded-xl border border-slate-200"
                />
              ))}
            </div>
          </div>
        )}

        {/* AI Estimate */}
        {aiEstimate && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🤖</span>
              <h2 className="font-bold text-slate-900">AI Estimate</h2>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Instant</span>
            </div>
            <div className="text-3xl font-black text-slate-900 mb-1">
              {formatCurrency(aiEstimate.minPrice)} – {formatCurrency(aiEstimate.maxPrice)}
            </div>
            <p className="text-slate-500 text-sm mb-4">
              Average: {formatCurrency(aiEstimate.avgPrice)}
            </p>

            {aiEstimate.breakdown && (() => {
              const breakdown = JSON.parse(aiEstimate.breakdown);
              return breakdown.length > 0 ? (
                <div className="space-y-2">
                  {breakdown.map((item: { item: string; cost: number }, i: number) => (
                    <div key={i} className="flex justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                      <span className="text-slate-600">{item.item}</span>
                      <span className="font-medium text-slate-900">{formatCurrency(item.cost)}</span>
                    </div>
                  ))}
                </div>
              ) : null;
            })()}

            {aiEstimate.notes && (
              <p className="text-slate-500 text-sm mt-4 italic">{aiEstimate.notes}</p>
            )}
          </div>
        )}

        {/* AI Analysis */}
        {aiAnalysis && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
            <h2 className="font-bold text-slate-900 mb-4">🔍 AI Job Analysis</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-400 text-xs uppercase font-medium">Assessment</span>
                <p className="text-slate-900 mt-0.5">{aiAnalysis.detected}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs uppercase font-medium">Complexity</span>
                <p className="mt-0.5">
                  <span className={`font-semibold ${aiAnalysis.complexity === "simple" ? "text-green-600" : aiAnalysis.complexity === "complex" ? "text-red-600" : "text-yellow-600"}`}>
                    {aiAnalysis.complexity?.charAt(0).toUpperCase() + aiAnalysis.complexity?.slice(1)}
                  </span>
                </p>
              </div>
              {aiAnalysis.estimatedHours && (
                <div>
                  <span className="text-slate-400 text-xs uppercase font-medium">Est. Hours</span>
                  <p className="text-slate-900 mt-0.5">{aiAnalysis.estimatedHours} hrs</p>
                </div>
              )}
              <div>
                <span className="text-slate-400 text-xs uppercase font-medium">Confidence</span>
                <p className="text-slate-900 mt-0.5 capitalize">{aiAnalysis.confidence}</p>
              </div>
            </div>
          </div>
        )}

        {/* Contractor Quotes with Accept/Decline */}
        {contractorEstimates.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
            <h2 className="font-bold text-slate-900 mb-4">
              📋 Contractor Quotes ({contractorEstimates.length})
            </h2>
            <div className="space-y-4">
              {contractorEstimates.map((est) => {
                const isAccepted = est.status === "accepted";
                const isDeclined = est.status === "declined";
                const isPending = est.status === "pending";

                return (
                  <div
                    key={est.id}
                    className={`border rounded-xl p-4 transition-colors ${
                      isAccepted
                        ? "border-green-200 bg-green-50"
                        : isDeclined
                        ? "border-slate-100 bg-slate-50 opacity-60"
                        : "border-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {est.contractor && (
                          <Link
                            href={`/contractors/${est.contractor.id}`}
                            className="font-semibold text-slate-900 text-sm hover:text-orange-600 transition-colors"
                          >
                            {est.contractor.businessName}
                          </Link>
                        )}
                        {est.contractor?.isVerified && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">✓ Verified</span>
                        )}
                        {isAccepted && (
                          <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-semibold">✓ Accepted</span>
                        )}
                        {isDeclined && (
                          <span className="text-xs bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">Declined</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{formatDate(est.createdAt)}</span>
                    </div>

                    <div className="text-2xl font-black text-slate-900">
                      {formatCurrency(est.minPrice)} – {formatCurrency(est.maxPrice)}
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">Avg: {formatCurrency(est.avgPrice)}</p>
                    {est.notes && <p className="text-slate-600 text-sm mt-2">{est.notes}</p>}

                    {/* Accept / Decline buttons */}
                    {isPending && !job.booking && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                        <Button
                          size="sm"
                          isLoading={actionLoading === est.id}
                          onClick={() => handleAccept(est.id, est.avgPrice)}
                          className="bg-green-500 hover:bg-green-600 text-white"
                        >
                          ✓ Accept Quote
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          isLoading={actionLoading === est.id}
                          onClick={() => handleDecline(est.id)}
                          className="text-red-500 border-red-200 hover:bg-red-50"
                        >
                          ✕ Decline
                        </Button>
                        {est.contractor && (
                          <Link href={`/contractors/${est.contractor.id}`}>
                            <Button size="sm" variant="ghost" className="text-slate-500">
                              View Profile
                            </Button>
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Booking */}
        {job.booking && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-6 mb-5">
            <h2 className="font-bold text-green-900 mb-4">✅ Booked</h2>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Link
                    href={`/contractors/${job.booking.contractor.id}`}
                    className="font-bold text-green-900 hover:text-green-700 transition-colors"
                  >
                    {job.booking.contractor.businessName}
                  </Link>
                  {job.booking.contractor.isVerified && (
                    <span className="text-xs bg-green-200 text-green-800 px-1.5 py-0.5 rounded-full">✓ Verified</span>
                  )}
                </div>
                <p className="text-green-700 text-sm">📞 {job.booking.contractor.phone}</p>
                <p className="text-green-700 text-sm">
                  📍 {job.booking.contractor.city}, {job.booking.contractor.state}
                </p>
                {job.booking.scheduledDate && (
                  <p className="text-green-700 text-sm mt-1">
                    📅 Scheduled: {formatDate(job.booking.scheduledDate)}
                  </p>
                )}
                {job.booking.notes && (
                  <p className="text-green-600 text-sm mt-2 italic">{job.booking.notes}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <div className="text-2xl font-black text-green-900">
                  {formatCurrency(job.booking.agreedPrice)}
                </div>
                <div className="text-green-600 text-xs">agreed price</div>
              </div>
            </div>
          </div>
        )}

        {/* Review form (completed jobs without review) */}
        {job.booking && job.status === "completed" && !job.booking.review && !reviewDone && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 mb-5">
            <h2 className="font-bold text-slate-900 mb-1">⭐ Leave a Review</h2>
            <p className="text-slate-500 text-sm mb-4">
              How did {job.booking.contractor.businessName} do?
            </p>
            <form onSubmit={handleReviewSubmit} className="space-y-4">
              <StarPicker value={reviewRating} onChange={setReviewRating} />
              <textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                rows={3}
                placeholder="Share your experience (optional)..."
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 resize-none text-sm"
              />
              <Button type="submit" isLoading={reviewSubmitting} size="sm">
                Submit Review
              </Button>
            </form>
          </div>
        )}

        {(reviewDone || (job.booking?.review && job.status === "completed")) && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-5 text-center">
            <p className="text-green-700 font-semibold">✓ Review submitted — thank you!</p>
          </div>
        )}

        {/* CTA if not booked yet */}
        {!job.booking && job.status === "estimated" && contractorEstimates.length === 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 text-center">
            <p className="text-orange-900 font-semibold mb-2">Waiting for contractor quotes</p>
            <p className="text-orange-700 text-sm">
              Contractors will submit quotes soon. You'll be able to accept or decline them here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
