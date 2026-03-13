"use client";

import { useState, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, JOB_CATEGORIES } from "@/lib/utils";

interface LineItem {
  id: string;
  item: string;
  cost: number;
  category: "labor" | "materials" | "other";
}

interface EstimateResult {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  estimatedDays: number;
  validDays: number;
  breakdown: LineItem[];
  terms: string;
  notes: string;
}

interface ContractorProfile {
  businessName: string;
  phone: string;
  city: string;
  state: string;
  isVerified: boolean;
}

const URGENCY_OPTIONS = [
  { value: "asap",      label: "ASAP" },
  { value: "this_week", label: "This week" },
  { value: "flexible",  label: "Flexible" },
];

export default function EstimateBuilderPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const printRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [generating, setGenerating] = useState(false);
  const [estimate, setEstimate] = useState<EstimateResult | null>(null);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    categoryId: "painting",
    projectTitle: "",
    description: "",
    size: "",
    city: "",
    state: "",
    urgency: "flexible",
    customerName: "",
    customerEmail: "",
    customerAddress: "",
    notes: "",
    taxRate: "0",
    discount: "0",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/contractor/estimate-builder");
      return;
    }
    if (status === "authenticated" && session?.user?.role !== "contractor") {
      router.push("/my-jobs");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/contractors/profile")
        .then((r) => r.json())
        .then((d) => {
          if (d.contractor) {
            setProfile(d.contractor);
            setForm((prev) => ({
              ...prev,
              city: d.contractor.city || "",
              state: d.contractor.state || "",
            }));
          }
        });
    }
  }, [status, session, router]);

  const selectedCategory = JOB_CATEGORIES.find((c) => c.id === form.categoryId);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    setEstimate(null);

    const res = await fetch("/api/estimates/builder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to generate estimate");
      setGenerating(false);
      return;
    }

    const result: EstimateResult = data.estimate;
    setEstimate(result);
    setLineItems(
      result.breakdown.map((item, i) => ({ ...item, id: String(i) }))
    );
    setGenerating(false);

    // Scroll to preview
    setTimeout(() => {
      document.getElementById("estimate-preview")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }

  function updateLineItem(id: string, field: keyof LineItem, value: string | number) {
    setLineItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  }

  function addLineItem() {
    setLineItems((prev) => [
      ...prev,
      { id: Date.now().toString(), item: "Additional work", cost: 0, category: "other" },
    ]);
  }

  function removeLineItem(id: string) {
    setLineItems((prev) => prev.filter((item) => item.id !== id));
  }

  const subtotal = lineItems.reduce((sum, item) => sum + Number(item.cost), 0);
  const taxAmount = Math.round(subtotal * (parseFloat(form.taxRate || "0") / 100));
  const discountAmount = Math.round(subtotal * (parseFloat(form.discount || "0") / 100));
  const total = subtotal + taxAmount - discountAmount;
  const today = new Date();
  const validUntil = new Date(today.getTime() + (estimate?.validDays || 30) * 24 * 60 * 60 * 1000);
  const estimateNumber = `EST-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9000) + 1000}`;

  function handlePrint() {
    window.print();
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-spin">⚙️</div>
      </div>
    );
  }

  return (
    <>
      {/* ─── Print-only PDF layout ─── */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #pdf-document, #pdf-document * { visibility: visible !important; }
          #pdf-document {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            padding: 40px !important;
            background: white !important;
            font-family: Arial, sans-serif !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="min-h-screen bg-slate-50 no-print">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-4 py-4 no-print">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/contractor/dashboard">
                <Button variant="ghost" size="sm">← Dashboard</Button>
              </Link>
              <div>
                <h1 className="text-2xl font-black text-slate-900">Estimate Builder</h1>
                <p className="text-slate-500 text-sm">Create a professional estimate with AI</p>
              </div>
            </div>
            {estimate && (
              <Button onClick={handlePrint} className="gap-2">
                📄 Download PDF
              </Button>
            )}
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* ─── LEFT: Form ─── */}
            <div className="space-y-5 no-print">

              {/* Customer info */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span>👤</span> Customer
                </h2>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Customer name"
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm"
                  />
                  <input
                    type="email"
                    placeholder="Customer email (optional)"
                    value={form.customerEmail}
                    onChange={(e) => setForm({ ...form, customerEmail: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Job site address"
                    value={form.customerAddress}
                    onChange={(e) => setForm({ ...form, customerAddress: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm"
                  />
                </div>
              </div>

              {/* Project info */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span>🔧</span> Project
                </h2>
                <div className="space-y-3">
                  {/* Category */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Category</label>
                    <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-y-auto pr-1">
                      {JOB_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => setForm({ ...form, categoryId: cat.id })}
                          className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium border transition-all text-left ${
                            form.categoryId === cat.id
                              ? "border-orange-400 bg-orange-50 text-orange-700"
                              : "border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          <span>{cat.icon}</span>
                          <span className="truncate">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <input
                    type="text"
                    placeholder={`Project title (e.g. "Paint living room & hallway")`}
                    value={form.projectTitle}
                    onChange={(e) => setForm({ ...form, projectTitle: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm"
                  />

                  <textarea
                    placeholder="Describe the project in detail — scope of work, materials, special requirements..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm resize-none"
                  />

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Size ({selectedCategory?.unit || "unit"})
                      </label>
                      <input
                        type="number"
                        placeholder="e.g. 800"
                        value={form.size}
                        onChange={(e) => setForm({ ...form, size: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">City</label>
                      <input
                        type="text"
                        placeholder="City"
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">State</label>
                      <input
                        type="text"
                        placeholder="CA"
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })}
                        maxLength={2}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Timeline</label>
                    <div className="flex gap-2">
                      {URGENCY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setForm({ ...form, urgency: opt.value })}
                          className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                            form.urgency === opt.value
                              ? "border-orange-400 bg-orange-50 text-orange-700"
                              : "border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing adjustments */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5">
                <h2 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span>💰</span> Pricing Options
                </h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Tax Rate (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0" max="20" step="0.5"
                        value={form.taxRate}
                        onChange={(e) => setForm({ ...form, taxRate: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Discount (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0" max="50" step="1"
                        value={form.discount}
                        onChange={(e) => setForm({ ...form, discount: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm"
                        placeholder="0"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Internal Notes (won&apos;t print)</label>
                  <input
                    type="text"
                    placeholder="e.g. customer prefers morning visits"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm"
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                  ❌ {error}
                </div>
              )}

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-3 shadow-lg shadow-orange-200"
              >
                {generating ? (
                  <>
                    <span className="text-2xl animate-spin">⚙️</span>
                    Generating estimate with AI...
                  </>
                ) : (
                  <>
                    <span className="text-2xl">🤖</span>
                    Generate AI Estimate
                  </>
                )}
              </button>
            </div>

            {/* ─── RIGHT: Live Editable Preview ─── */}
            <div id="estimate-preview">
              {!estimate ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center h-full flex flex-col items-center justify-center no-print">
                  <div className="text-5xl mb-4">📋</div>
                  <p className="font-semibold text-slate-700 text-lg mb-2">Your estimate will appear here</p>
                  <p className="text-slate-400 text-sm max-w-xs">
                    Fill in the project details and click Generate. AI will create an accurate, itemized estimate you can edit and download as PDF.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Price range summary */}
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white no-print">
                    <p className="text-orange-100 text-sm mb-1">AI Suggested Range</p>
                    <div className="text-3xl font-black">
                      {formatCurrency(estimate.minPrice)} – {formatCurrency(estimate.maxPrice)}
                    </div>
                    <p className="text-orange-200 text-sm mt-1">
                      Your edited total: <strong className="text-white">{formatCurrency(total)}</strong>
                      {estimate.estimatedDays > 0 && ` · Est. ${estimate.estimatedDays} day${estimate.estimatedDays !== 1 ? "s" : ""}`}
                    </p>
                  </div>

                  {/* Editable line items */}
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 no-print">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-900">Line Items</h3>
                      <button
                        onClick={addLineItem}
                        className="text-xs text-orange-500 hover:text-orange-600 font-semibold border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-all"
                      >
                        + Add Item
                      </button>
                    </div>
                    <div className="space-y-2">
                      {lineItems.map((item) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <select
                            value={item.category}
                            onChange={(e) => updateLineItem(item.id, "category", e.target.value)}
                            className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 shrink-0"
                          >
                            <option value="labor">Labor</option>
                            <option value="materials">Materials</option>
                            <option value="other">Other</option>
                          </select>
                          <input
                            type="text"
                            value={item.item}
                            onChange={(e) => updateLineItem(item.id, "item", e.target.value)}
                            className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-400 text-slate-900 min-w-0"
                          />
                          <div className="relative shrink-0 w-24">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                            <input
                              type="number"
                              value={item.cost}
                              onChange={(e) => updateLineItem(item.id, "cost", parseFloat(e.target.value) || 0)}
                              className="w-full pl-6 pr-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-400 text-slate-900 font-medium"
                            />
                          </div>
                          <button
                            onClick={() => removeLineItem(item.id)}
                            className="text-slate-300 hover:text-red-400 transition-colors shrink-0 text-lg leading-none"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-slate-100 mt-4 pt-4 space-y-1.5 text-sm">
                      <div className="flex justify-between text-slate-600">
                        <span>Subtotal</span>
                        <span className="font-medium">{formatCurrency(subtotal)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount ({form.discount}%)</span>
                          <span className="font-medium">−{formatCurrency(discountAmount)}</span>
                        </div>
                      )}
                      {taxAmount > 0 && (
                        <div className="flex justify-between text-slate-600">
                          <span>Tax ({form.taxRate}%)</span>
                          <span className="font-medium">{formatCurrency(taxAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-black text-slate-900 pt-2 border-t border-slate-200">
                        <span>Total</span>
                        <span>{formatCurrency(total)}</span>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handlePrint} className="w-full gap-2 no-print" size="lg">
                    📄 Download as PDF
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─── PDF DOCUMENT (hidden on screen, shown only when printing) ─── */}
      {estimate && (
        <div id="pdf-document" ref={printRef} style={{ display: "none" }}>
          <style>{`
            @media print {
              #pdf-document { display: block !important; }
              * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            }
          `}</style>

          <div style={{ maxWidth: "780px", margin: "0 auto", fontFamily: "Arial, sans-serif", color: "#1e293b" }}>

            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", paddingBottom: "24px", borderBottom: "3px solid #f97316" }}>
              <div>
                <div style={{ fontSize: "28px", fontWeight: "900", color: "#1e293b" }}>
                  {profile?.businessName || session?.user?.name || "Your Business"}
                </div>
                {profile?.isVerified && (
                  <div style={{ fontSize: "11px", color: "#3b82f6", fontWeight: "600", marginTop: "2px" }}>✓ VERIFIED CONTRACTOR</div>
                )}
                {profile?.city && (
                  <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                    📍 {profile.city}, {profile.state}
                  </div>
                )}
                {profile?.phone && (
                  <div style={{ fontSize: "13px", color: "#64748b" }}>📞 {profile.phone}</div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "26px", fontWeight: "900", color: "#f97316" }}>ESTIMATE</div>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>#{estimateNumber}</div>
                <div style={{ fontSize: "13px", color: "#64748b" }}>Date: {formatDate(today.toISOString())}</div>
                <div style={{ fontSize: "13px", color: "#64748b" }}>Valid until: {formatDate(validUntil.toISOString())}</div>
              </div>
            </div>

            {/* Bill To + Project */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px", marginBottom: "28px" }}>
              <div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                  Prepared For
                </div>
                <div style={{ fontWeight: "700", fontSize: "16px" }}>{form.customerName || "Valued Customer"}</div>
                {form.customerEmail && <div style={{ fontSize: "13px", color: "#64748b" }}>{form.customerEmail}</div>}
                {form.customerAddress && <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>{form.customerAddress}</div>}
              </div>
              <div>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
                  Project Details
                </div>
                <div style={{ fontWeight: "700", fontSize: "16px" }}>
                  {form.projectTitle || selectedCategory?.name || "Home Improvement"}
                </div>
                <div style={{ fontSize: "13px", color: "#64748b", marginTop: "2px" }}>
                  {selectedCategory?.icon} {selectedCategory?.name}
                  {form.size ? ` · ${form.size} ${selectedCategory?.unit}` : ""}
                </div>
                {(form.city || form.customerAddress) && (
                  <div style={{ fontSize: "13px", color: "#64748b" }}>
                    📍 {form.customerAddress || `${form.city}, ${form.state}`}
                  </div>
                )}
                <div style={{ fontSize: "13px", color: "#64748b" }}>
                  Timeline: {form.urgency === "asap" ? "ASAP" : form.urgency === "this_week" ? "This week" : "Flexible"}
                  {estimate.estimatedDays > 0 && ` · Est. ${estimate.estimatedDays} day${estimate.estimatedDays !== 1 ? "s" : ""}`}
                </div>
              </div>
            </div>

            {/* Description */}
            {form.description && (
              <div style={{ backgroundColor: "#f8fafc", borderRadius: "8px", padding: "14px 16px", marginBottom: "24px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                  Scope of Work
                </div>
                <div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.6" }}>{form.description}</div>
              </div>
            )}

            {/* Line Items Table */}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
              <thead>
                <tr style={{ backgroundColor: "#1e293b" }}>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "white", textTransform: "uppercase", letterSpacing: "0.05em", width: "70px" }}>
                    Type
                  </th>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "white", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Description
                  </th>
                  <th style={{ textAlign: "right", padding: "10px 14px", fontSize: "11px", fontWeight: "700", color: "white", textTransform: "uppercase", letterSpacing: "0.05em", width: "100px" }}>
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? "white" : "#f8fafc" }}>
                    <td style={{ padding: "10px 14px", fontSize: "12px", color: "#64748b", textTransform: "capitalize", borderBottom: "1px solid #e2e8f0" }}>
                      {item.category}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: "13px", color: "#1e293b", borderBottom: "1px solid #e2e8f0" }}>
                      {item.item}
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: "13px", fontWeight: "600", color: "#1e293b", textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>
                      {formatCurrency(Number(item.cost))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "28px" }}>
              <div style={{ width: "220px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "#64748b" }}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "#16a34a" }}>
                    <span>Discount ({form.discount}%)</span>
                    <span>−{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                {taxAmount > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "13px", color: "#64748b" }}>
                    <span>Tax ({form.taxRate}%)</span>
                    <span>{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", backgroundColor: "#f97316", borderRadius: "8px", marginTop: "6px" }}>
                  <span style={{ fontWeight: "900", fontSize: "16px", color: "white" }}>TOTAL</span>
                  <span style={{ fontWeight: "900", fontSize: "16px", color: "white" }}>{formatCurrency(total)}</span>
                </div>
                <div style={{ textAlign: "center", fontSize: "11px", color: "#94a3b8", marginTop: "6px" }}>
                  Range: {formatCurrency(estimate.minPrice)} – {formatCurrency(estimate.maxPrice)}
                </div>
              </div>
            </div>

            {/* Notes & Terms */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "28px" }}>
              {estimate.notes && (
                <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "14px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#16a34a", textTransform: "uppercase", marginBottom: "6px" }}>Notes</div>
                  <div style={{ fontSize: "12px", color: "#166534", lineHeight: "1.5" }}>{estimate.notes}</div>
                </div>
              )}
              <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "14px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#d97706", textTransform: "uppercase", marginBottom: "6px" }}>Terms & Conditions</div>
                <div style={{ fontSize: "12px", color: "#92400e", lineHeight: "1.5" }}>
                  {estimate.terms || "50% deposit required to schedule. Balance due on completion. Price valid for 30 days."}
                </div>
              </div>
            </div>

            {/* Signature */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", borderTop: "2px solid #e2e8f0", paddingTop: "24px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "24px" }}>Contractor Signature</div>
                <div style={{ borderBottom: "1px solid #cbd5e1", marginBottom: "6px", height: "32px" }}></div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>{profile?.businessName || session?.user?.name}</div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#94a3b8", marginBottom: "24px" }}>Customer Acceptance</div>
                <div style={{ borderBottom: "1px solid #cbd5e1", marginBottom: "6px", height: "32px" }}></div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>Date: _______________</div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: "center", marginTop: "32px", paddingTop: "16px", borderTop: "1px solid #e2e8f0", fontSize: "11px", color: "#94a3b8" }}>
              Estimate #{estimateNumber} · Generated {formatDate(today.toISOString())} · Powered by QuoteFast
            </div>
          </div>
        </div>
      )}
    </>
  );
}
