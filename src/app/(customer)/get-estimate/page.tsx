"use client";

import { useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { JOB_CATEGORIES, formatCurrency } from "@/lib/utils";

type Step = "category" | "details" | "estimating" | "result" | "booking";

interface Estimate {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  breakdown: { item: string; cost: number }[];
  notes: string;
  confidence: string;
  detected: string;
  complexity: string;
  isAiGenerated: boolean;
}

function GetEstimateFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();

  const initialCategory = searchParams.get("category") || "";

  const [step, setStep] = useState<Step>(initialCategory ? "details" : "category");
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [photos, setPhotos] = useState<string[]>([]);
  const [form, setForm] = useState({
    description: "",
    city: "",
    state: "",
    zipCode: "",
    size: "",
    urgency: "flexible",
  });
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedJobId, setSavedJobId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const category = JOB_CATEGORIES.find((c) => c.id === selectedCategory);

  function handlePhotoUpload(files: FileList | null) {
    if (!files) return;
    Array.from(files).forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotos((prev) => [...prev, e.target?.result as string].slice(0, 5));
      };
      reader.readAsDataURL(file);
    });
  }

  async function getEstimate() {
    setStep("estimating");
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: selectedCategory,
          photos,
          description: form.description,
          size: form.size,
          city: form.city,
          state: form.state,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setEstimate(data.estimate);
        setStep("result");

        // Auto-save job if logged in
        if (session?.user) {
          const saveRes = await fetch("/api/jobs", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              categoryId: selectedCategory,
              title: `${category?.name} – ${form.city || "My Location"}`,
              description: form.description,
              photos,
              city: form.city || "Unknown",
              state: form.state || "Unknown",
              zipCode: form.zipCode,
              size: form.size,
              urgency: form.urgency,
              aiAnalysis: data.estimate,
              estimate: data.estimate,
            }),
          });
          const saveData = await saveRes.json();
          if (saveData.jobId) setSavedJobId(saveData.jobId);
        }
      } else {
        setError("Failed to generate estimate. Please try again.");
        setStep("details");
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setStep("details");
    } finally {
      setLoading(false);
    }
  }

  function handleBookNow() {
    if (!session) {
      router.push(`/login?callbackUrl=/get-estimate`);
      return;
    }
    setStep("booking");
  }

  const confidenceColors = {
    high: "bg-green-100 text-green-700 border-green-200",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
    low: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="text-orange-500 hover:text-orange-600 text-sm font-medium">
            ← Back to Home
          </Link>
          <h1 className="text-3xl font-black text-slate-900 mt-4">
            Get Your Instant Estimate
          </h1>
          <p className="text-slate-500 mt-2">
            AI-powered pricing in under 2 minutes
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mb-8">
          {["category", "details", "estimating", "result"].map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  step === s
                    ? "bg-orange-500 text-white"
                    : ["estimating", "result", "booking"].includes(step) &&
                      ["category", "details"].includes(s)
                    ? "bg-green-500 text-white"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {["estimating", "result", "booking"].includes(step) &&
                ["category", "details"].includes(s)
                  ? "✓"
                  : i + 1}
              </div>
              {i < 3 && <div className="h-0.5 flex-1 bg-slate-200" />}
            </div>
          ))}
        </div>

        {/* Step: Category Selection */}
        {step === "category" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              What type of job is it?
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Select the category that best describes your project
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {JOB_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setStep("details");
                  }}
                  className="flex flex-col items-start p-4 rounded-xl border-2 border-slate-100 hover:border-orange-400 hover:bg-orange-50 transition-all text-left group"
                >
                  <span className="text-2xl mb-2">{cat.icon}</span>
                  <span className="font-semibold text-slate-900 text-sm group-hover:text-orange-600">
                    {cat.name}
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5">{cat.description}</span>
                  <span className="text-xs font-medium text-green-600 mt-1">
                    ${cat.baseMinPrice}–${cat.baseMaxPrice}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step: Job Details */}
        {step === "details" && category && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">{category.icon}</span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{category.name}</h2>
                <button
                  onClick={() => setStep("category")}
                  className="text-sm text-orange-500 hover:text-orange-600"
                >
                  Change category
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm mb-6">
                {error}
              </div>
            )}

            <div className="space-y-5">
              {/* Photo Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Upload Photos{" "}
                  <span className="text-slate-400 font-normal">(recommended — improves accuracy)</span>
                </label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-all"
                >
                  <div className="text-4xl mb-3">📸</div>
                  <p className="text-slate-600 font-medium">Click to upload photos</p>
                  <p className="text-slate-400 text-sm mt-1">JPG, PNG up to 10MB each · Max 5 photos</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handlePhotoUpload(e.target.files)}
                  />
                </div>

                {photos.length > 0 && (
                  <div className="flex gap-3 mt-3 flex-wrap">
                    {photos.map((photo, i) => (
                      <div key={i} className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo}
                          alt={`Photo ${i + 1}`}
                          className="w-20 h-20 object-cover rounded-xl border border-slate-200"
                        />
                        <button
                          onClick={() => setPhotos(photos.filter((_, idx) => idx !== i))}
                          className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Describe the problem
                </label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-slate-900 resize-none"
                  placeholder={`Describe your ${category.name.toLowerCase()} project...`}
                />
              </div>

              {/* Size */}
              {category.unit !== "job" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Approximate Size ({category.unit}){" "}
                    <span className="text-slate-400 font-normal">optional</span>
                  </label>
                  <input
                    type="number"
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-slate-900"
                    placeholder={`Enter ${category.unit}...`}
                  />
                </div>
              )}

              {/* Location */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-slate-900 text-sm"
                    placeholder="Dallas"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    State
                  </label>
                  <input
                    type="text"
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-slate-900 text-sm"
                    placeholder="TX"
                    maxLength={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    value={form.zipCode}
                    onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-slate-900 text-sm"
                    placeholder="75001"
                  />
                </div>
              </div>

              {/* Urgency */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  How soon do you need this done?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "asap", label: "ASAP", icon: "🔥" },
                    { value: "this_week", label: "This Week", icon: "📅" },
                    { value: "flexible", label: "Flexible", icon: "😊" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm({ ...form, urgency: opt.value })}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        form.urgency === opt.value
                          ? "border-orange-400 bg-orange-50 text-orange-700"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      <span className="text-xl">{opt.icon}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={getEstimate}
                className="w-full"
                size="lg"
                disabled={!form.city}
              >
                Get AI Estimate Now ⚡
              </Button>
            </div>
          </div>
        )}

        {/* Step: Estimating (loading) */}
        {step === "estimating" && (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="text-6xl mb-6 animate-bounce">🤖</div>
            <h2 className="text-2xl font-black text-slate-900 mb-3">
              AI is analyzing your job...
            </h2>
            <p className="text-slate-500 mb-8">
              {photos.length > 0
                ? `Examining ${photos.length} photo${photos.length > 1 ? "s" : ""}...`
                : "Calculating estimate based on job details..."}
            </p>
            <div className="space-y-3 max-w-xs mx-auto text-left">
              {[
                { text: "Identifying job type & scope", done: true },
                { text: "Checking local labor rates", done: true },
                { text: "Calculating material costs", done: loading },
                { text: "Generating price range", done: false },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      item.done ? "bg-green-500" : "bg-slate-200 animate-pulse"
                    }`}
                  >
                    {item.done && (
                      <svg className="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <span className={item.done ? "text-slate-700" : "text-slate-400"}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step: Result */}
        {step === "result" && estimate && category && (
          <div className="space-y-4">
            {/* Main estimate card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{category.icon}</span>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-slate-900">{category.name}</h2>
                  {estimate.detected && (
                    <p className="text-slate-500 text-sm">{estimate.detected}</p>
                  )}
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                    confidenceColors[estimate.confidence as keyof typeof confidenceColors] ||
                    confidenceColors.medium
                  }`}
                >
                  {estimate.confidence === "high"
                    ? "High Confidence"
                    : estimate.confidence === "medium"
                    ? "Medium Confidence"
                    : "Estimate Only"}
                </span>
              </div>

              {/* Big price */}
              <div className="text-center bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 mb-6 border border-orange-100">
                <p className="text-slate-500 text-sm mb-1">Estimated Cost</p>
                <p className="text-5xl font-black text-slate-900">
                  {formatCurrency(estimate.minPrice)} – {formatCurrency(estimate.maxPrice)}
                </p>
                <p className="text-slate-500 text-sm mt-2">
                  Average local price:{" "}
                  <strong className="text-slate-700">{formatCurrency(estimate.avgPrice)}</strong>
                </p>
                <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-400">
                  <span>📍 {form.city}{form.state ? `, ${form.state}` : ""}</span>
                  <span>🤖 AI Generated</span>
                  {estimate.complexity && (
                    <span>
                      {estimate.complexity === "simple" ? "🟢" : estimate.complexity === "complex" ? "🔴" : "🟡"}{" "}
                      {estimate.complexity.charAt(0).toUpperCase() + estimate.complexity.slice(1)} job
                    </span>
                  )}
                </div>
              </div>

              {/* Breakdown */}
              {estimate.breakdown && estimate.breakdown.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold text-slate-700 text-sm mb-3">Cost Breakdown</h3>
                  <div className="space-y-2">
                    {estimate.breakdown.map((item, i) => (
                      <div key={i} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                        <span className="text-slate-600 text-sm">{item.item}</span>
                        <span className="font-semibold text-slate-800 text-sm">
                          {formatCurrency(item.cost)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {estimate.notes && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                  <p className="text-blue-700 text-sm">
                    <strong>Note:</strong> {estimate.notes}
                  </p>
                </div>
              )}

              {/* Disclaimer */}
              <p className="text-xs text-slate-400 mb-6">
                This is an AI-generated estimate based on typical market prices. Actual contractor
                quotes may vary based on specific conditions, materials, and local rates.
              </p>

              {/* CTAs */}
              <div className="space-y-3">
                <Button onClick={handleBookNow} className="w-full" size="lg">
                  Find & Book a Contractor →
                </Button>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setStep("details");
                      setEstimate(null);
                    }}
                    className="flex-1"
                  >
                    Refine Estimate
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setStep("category");
                      setSelectedCategory("");
                      setEstimate(null);
                      setPhotos([]);
                    }}
                    className="flex-1"
                  >
                    New Estimate
                  </Button>
                </div>
              </div>
            </div>

            {/* Share / Save note */}
            {!session && (
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5">
                <p className="text-orange-800 font-semibold text-sm mb-1">
                  💾 Save your estimate
                </p>
                <p className="text-orange-600 text-sm mb-3">
                  Create a free account to save this estimate and connect with contractors.
                </p>
                <Link href="/register">
                  <Button size="sm" className="w-full">
                    Create Free Account
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Step: Booking */}
        {step === "booking" && estimate && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Find Local Contractors
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              Your estimate: {formatCurrency(estimate.minPrice)} –{" "}
              {formatCurrency(estimate.maxPrice)} · {form.city}
            </p>

            <div className="space-y-4 mb-6">
              {[
                {
                  name: "ProFix Services",
                  rating: 4.8,
                  reviews: 127,
                  price: formatCurrency(estimate.avgPrice - 30),
                  availability: "Available tomorrow",
                  badge: "Top Rated",
                },
                {
                  name: "HomePro Repairs",
                  rating: 4.6,
                  reviews: 89,
                  price: formatCurrency(estimate.avgPrice),
                  availability: "Available this week",
                  badge: "Verified",
                },
                {
                  name: "QuickFix Contractors",
                  rating: 4.4,
                  reviews: 53,
                  price: formatCurrency(estimate.avgPrice + 50),
                  availability: "Available in 2 days",
                  badge: null,
                },
              ].map((contractor) => (
                <div
                  key={contractor.name}
                  className="border border-slate-200 rounded-xl p-4 hover:border-orange-300 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{contractor.name}</span>
                        {contractor.badge && (
                          <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            {contractor.badge}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-yellow-500 text-sm">★</span>
                        <span className="text-sm font-medium text-slate-700">{contractor.rating}</span>
                        <span className="text-slate-400 text-sm">({contractor.reviews} reviews)</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-black text-slate-900">{contractor.price}</div>
                      <div className="text-xs text-slate-400">estimated</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-green-600">✓ {contractor.availability}</span>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (savedJobId) {
                          router.push(`/my-jobs`);
                        } else {
                          router.push("/register");
                        }
                      }}
                    >
                      Book Now
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-400 text-center">
              Contractors pay a small lead fee when you book. You pay nothing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function GetEstimatePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <GetEstimateFlow />
    </Suspense>
  );
}
