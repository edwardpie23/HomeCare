"use client";

import { useState, useRef, useEffect, use, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate, JOB_CATEGORIES } from "@/lib/utils";

interface LineItem {
  id: string;
  item: string;
  cost: number;
  category: "labor" | "materials" | "other";
}

interface MaterialItem {
  item: string;
  qty: number;
  unit: string;
  unitCost: number;
  total: number;
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
  { value: "asap", label: "ASAP" },
  { value: "this_week", label: "This week" },
  { value: "flexible", label: "Flexible" },
];

function EstimateBuilderContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [savedEstimateId, setSavedEstimateId] = useState<string | null>(editId);
  const [hasEstimate, setHasEstimate] = useState(false);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [generatingMaterials, setGeneratingMaterials] = useState(false);
  const [activeTab, setActiveTab] = useState<"estimate" | "materials">("estimate");
  const [error, setError] = useState("");

  const [aiRange, setAiRange] = useState<{ min: number; max: number } | null>(null);

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
    internalNotes: "",
    taxRate: "0",
    discount: "0",
    validDays: "30",
    terms: "50% deposit required to schedule. Balance due on completion.",
  });

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session?.user?.role !== "contractor") router.push("/my-jobs");
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/contractors/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.contractor) {
          setProfile(d.contractor);
          setForm((p) => ({ ...p, city: d.contractor.city || "", state: d.contractor.state || "" }));
        }
      });

    if (editId) {
      fetch(`/api/contractor/estimates/${editId}`)
        .then((r) => r.json())
        .then((d) => {
          if (!d.estimate) return;
          const e = d.estimate;
          setForm({
            categoryId: e.categoryId || "painting",
            projectTitle: e.projectTitle || "",
            description: e.description || "",
            size: e.size?.toString() || "",
            city: e.city || "",
            state: e.state || "",
            urgency: e.urgency || "flexible",
            customerName: e.customerName || "",
            customerEmail: e.customerEmail || "",
            customerAddress: e.customerAddress || "",
            notes: e.notes || "",
            internalNotes: e.internalNotes || "",
            taxRate: e.taxRate?.toString() || "0",
            discount: e.discount?.toString() || "0",
            validDays: e.validDays?.toString() || "30",
            terms: e.terms || "50% deposit required to schedule. Balance due on completion.",
          });
          const items = JSON.parse(e.lineItems || "[]");
          if (items.length > 0) {
            setLineItems(items);
            setHasEstimate(true);
            if (e.minPrice && e.maxPrice) setAiRange({ min: e.minPrice, max: e.maxPrice });
          }
          if (e.materialsList) {
            setMaterials(JSON.parse(e.materialsList));
          }
        });
    }
  }, [status, editId]);

  const selectedCategory = JOB_CATEGORIES.find((c) => c.id === form.categoryId);

  const subtotal = lineItems.reduce((sum, i) => sum + Number(i.cost), 0);
  const taxAmt = Math.round(subtotal * (parseFloat(form.taxRate || "0") / 100));
  const discountAmt = Math.round(subtotal * (parseFloat(form.discount || "0") / 100));
  const total = subtotal + taxAmt - discountAmt;
  const today = new Date();
  const validUntil = new Date(today.getTime() + parseInt(form.validDays || "30") * 86400000);
  const estimateNumber = savedEstimateId
    ? `EST-${savedEstimateId.slice(-8).toUpperCase()}`
    : `EST-${today.getFullYear()}${String(today.getMonth()+1).padStart(2,"0")}${String(today.getDate()).padStart(2,"0")}-DRAFT`;

  const buildSavePayload = useCallback((status = "draft") => ({
    ...form,
    status,
    lineItems,
    minPrice: aiRange?.min ?? null,
    maxPrice: aiRange?.max ?? null,
    totalPrice: total,
    materialsList: materials.length > 0 ? materials : null,
  }), [form, lineItems, aiRange, total, materials]);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    const res = await fetch("/api/estimates/builder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error || "Failed"); setGenerating(false); return; }
    const est = data.estimate;
    setAiRange({ min: est.minPrice, max: est.maxPrice });
    setLineItems(est.breakdown.map((b: { item: string; cost: number; category?: string }, i: number) => ({
      id: String(i),
      item: b.item,
      cost: b.cost,
      category: b.category || "labor",
    })));
    if (est.notes && !form.notes) setForm((p) => ({ ...p, notes: est.notes }));
    if (est.terms && !form.terms) setForm((p) => ({ ...p, terms: est.terms }));
    setHasEstimate(true);
    setGenerating(false);
    setTimeout(() => document.getElementById("preview-section")?.scrollIntoView({ behavior: "smooth" }), 100);
  }

  async function handleSave(status = "draft") {
    setSaving(true);
    const payload = buildSavePayload(status);
    let res, data;
    if (savedEstimateId) {
      res = await fetch(`/api/contractor/estimates/${savedEstimateId}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/contractor/estimates", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
    }
    data = await res.json();
    if (res.ok && data.estimate) {
      setSavedEstimateId(data.estimate.id);
      setSaveMsg(status === "sent" ? "Marked as sent ✓" : "Draft saved ✓");
      setTimeout(() => setSaveMsg(""), 3000);
    }
    setSaving(false);
  }

  async function handleGenerateMaterials() {
    setGeneratingMaterials(true);
    // Save first to get an ID if needed
    if (!savedEstimateId) await handleSave("draft");
    const id = savedEstimateId || "temp";
    const res = await fetch(`/api/contractor/estimates/${id}/materials`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, lineItems }),
    });
    const data = await res.json();
    if (data.materialsList) {
      setMaterials(data.materialsList);
      setActiveTab("materials");
    }
    setGeneratingMaterials(false);
  }

  function updateLineItem(id: string, field: keyof LineItem, value: string | number) {
    setLineItems((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i));
  }
  function addLineItem() {
    setLineItems((prev) => [...prev, { id: Date.now().toString(), item: "Additional work", cost: 0, category: "other" }]);
  }
  function removeLineItem(id: string) {
    setLineItems((prev) => prev.filter((i) => i.id !== id));
  }

  const materialsTotal = materials.reduce((s, m) => s + m.total, 0);

  function handlePrint() { window.print(); }

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #pdf-document, #pdf-document * { visibility: visible !important; }
          #pdf-document { position: fixed !important; inset: 0 !important; width: 100% !important; padding: 40px !important; background: white !important; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 no-print">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Link href="/contractor/estimates"><Button variant="ghost" size="sm">← My Estimates</Button></Link>
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                {editId ? "Edit Estimate" : "New Estimate"}
                {saveMsg && <span className="ml-3 text-sm font-normal text-green-600">{saveMsg}</span>}
              </h1>
              <p className="text-slate-400 text-xs">{estimateNumber}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => handleSave("draft")} isLoading={saving}>
              💾 Save Draft
            </Button>
            {hasEstimate && (
              <>
                <Button variant="outline" size="sm" onClick={() => handleSave("sent")} isLoading={saving}>
                  📤 Mark as Sent
                </Button>
                <Button size="sm" onClick={handlePrint}>
                  📄 Download PDF
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 no-print">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── LEFT: FORM ── */}
          <div className="space-y-4">
            {/* Customer */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="font-bold text-slate-900 mb-3">👤 Customer</h2>
              <div className="space-y-2.5">
                {[
                  { placeholder: "Customer name", key: "customerName", type: "text" },
                  { placeholder: "Customer email", key: "customerEmail", type: "email" },
                  { placeholder: "Job site address", key: "customerAddress", type: "text" },
                ].map(({ placeholder, key, type }) => (
                  <input key={key} type={type} placeholder={placeholder}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm"
                  />
                ))}
              </div>
            </div>

            {/* Project */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="font-bold text-slate-900 mb-3">🔧 Project</h2>
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-1.5 max-h-44 overflow-y-auto pr-1">
                  {JOB_CATEGORIES.map((cat) => (
                    <button key={cat.id} type="button"
                      onClick={() => setForm({ ...form, categoryId: cat.id })}
                      className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium border transition-all text-left ${form.categoryId === cat.id ? "border-orange-400 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                      <span>{cat.icon}</span><span className="truncate">{cat.name}</span>
                    </button>
                  ))}
                </div>
                <input type="text" placeholder="Project title" value={form.projectTitle}
                  onChange={(e) => setForm({ ...form, projectTitle: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm" />
                <textarea placeholder="Describe the scope of work..." value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm resize-none" />
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Size ({selectedCategory?.unit})</label>
                    <input type="number" placeholder="e.g. 800" value={form.size}
                      onChange={(e) => setForm({ ...form, size: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">City</label>
                    <input type="text" placeholder="City" value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">State</label>
                    <input type="text" placeholder="CA" maxLength={2} value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm" />
                  </div>
                </div>
                <div className="flex gap-2">
                  {URGENCY_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm({ ...form, urgency: opt.value })}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${form.urgency === opt.value ? "border-orange-400 bg-orange-50 text-orange-700" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Pricing options */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="font-bold text-slate-900 mb-3">💰 Options</h2>
              <div className="grid grid-cols-3 gap-3 mb-3">
                {[["Tax (%)", "taxRate"], ["Discount (%)", "discount"], ["Valid (days)", "validDays"]].map(([label, key]) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">{label}</label>
                    <input type="number" min="0" value={form[key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm" />
                  </div>
                ))}
              </div>
              <div className="space-y-2.5">
                <textarea placeholder="Customer-facing notes (will appear on PDF)" value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm resize-none" />
                <textarea placeholder="Terms & conditions (will appear on PDF)" value={form.terms}
                  onChange={(e) => setForm({ ...form, terms: e.target.value })}
                  rows={2} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm resize-none" />
                <input type="text" placeholder="🔒 Internal notes (never printed)" value={form.internalNotes}
                  onChange={(e) => setForm({ ...form, internalNotes: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-dashed border-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm" />
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">❌ {error}</div>}

            <button onClick={handleGenerate} disabled={generating}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-3 shadow-lg shadow-orange-200">
              {generating ? <><span className="text-2xl animate-spin">⚙️</span>Generating...</> : <><span className="text-2xl">🤖</span>Generate AI Estimate</>}
            </button>
          </div>

          {/* ── RIGHT: PREVIEW + MATERIALS ── */}
          <div id="preview-section">
            {!hasEstimate ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center flex flex-col items-center justify-center h-full min-h-[400px]">
                <div className="text-5xl mb-4">📋</div>
                <p className="font-semibold text-slate-700 text-lg mb-2">Your estimate will appear here</p>
                <p className="text-slate-400 text-sm max-w-xs">Fill in the project details and click Generate. You can then edit every line item before saving or printing.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* AI range badge */}
                {aiRange && (
                  <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-5 text-white">
                    <p className="text-orange-100 text-sm mb-1">AI Suggested Range</p>
                    <div className="text-3xl font-black">{formatCurrency(aiRange.min)} – {formatCurrency(aiRange.max)}</div>
                    <p className="text-orange-200 text-sm mt-1">Your edited total: <strong className="text-white">{formatCurrency(total)}</strong></p>
                  </div>
                )}

                {/* Tabs */}
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="flex border-b border-slate-200">
                    {(["estimate", "materials"] as const).map((tab) => (
                      <button key={tab} onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-3 text-sm font-semibold transition-all ${activeTab === tab ? "bg-slate-50 text-orange-600 border-b-2 border-orange-500" : "text-slate-500 hover:text-slate-700"}`}>
                        {tab === "estimate" ? `📋 Line Items (${lineItems.length})` : `🧱 Materials List${materials.length > 0 ? ` (${materials.length})` : ""}`}
                      </button>
                    ))}
                  </div>

                  {activeTab === "estimate" && (
                    <div className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-400">Edit items below — click any field</span>
                        <button onClick={addLineItem} className="text-xs text-orange-500 hover:text-orange-600 font-semibold border border-orange-200 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition-all">+ Add Item</button>
                      </div>
                      <div className="space-y-2 mb-4">
                        {lineItems.map((item) => (
                          <div key={item.id} className="flex items-center gap-2">
                            <select value={item.category} onChange={(e) => updateLineItem(item.id, "category", e.target.value)}
                              className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 text-slate-600 shrink-0">
                              <option value="labor">Labor</option>
                              <option value="materials">Materials</option>
                              <option value="other">Other</option>
                            </select>
                            <input type="text" value={item.item} onChange={(e) => updateLineItem(item.id, "item", e.target.value)}
                              className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-400 text-slate-900 min-w-0" />
                            <div className="relative shrink-0 w-24">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                              <input type="number" value={item.cost} onChange={(e) => updateLineItem(item.id, "cost", parseFloat(e.target.value) || 0)}
                                className="w-full pl-6 pr-2 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-orange-400 text-slate-900 font-medium" />
                            </div>
                            <button onClick={() => removeLineItem(item.id)} className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none shrink-0">×</button>
                          </div>
                        ))}
                      </div>
                      <div className="border-t border-slate-100 pt-3 space-y-1.5 text-sm">
                        <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                        {discountAmt > 0 && <div className="flex justify-between text-green-600"><span>Discount ({form.discount}%)</span><span>−{formatCurrency(discountAmt)}</span></div>}
                        {taxAmt > 0 && <div className="flex justify-between text-slate-500"><span>Tax ({form.taxRate}%)</span><span>{formatCurrency(taxAmt)}</span></div>}
                        <div className="flex justify-between text-lg font-black text-slate-900 pt-2 border-t border-slate-200"><span>Total</span><span>{formatCurrency(total)}</span></div>
                      </div>
                    </div>
                  )}

                  {activeTab === "materials" && (
                    <div className="p-5">
                      {materials.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-3">🧱</div>
                          <p className="font-semibold text-slate-700 mb-2">No materials list yet</p>
                          <p className="text-slate-400 text-sm mb-4">AI will generate a detailed shopping list based on this estimate. It's internal only — never shown to the customer.</p>
                          <button onClick={handleGenerateMaterials} disabled={generatingMaterials}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition-all disabled:opacity-60 text-sm">
                            {generatingMaterials ? <><span className="animate-spin">⚙️</span>Generating...</> : <><span>🤖</span>Generate Materials List</>}
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <span className="text-sm font-semibold text-slate-700">Materials to Purchase</span>
                              <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">Internal Only</span>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={handleGenerateMaterials} disabled={generatingMaterials}
                                className="text-xs text-purple-600 border border-purple-200 px-2.5 py-1 rounded-lg hover:bg-purple-50 transition-all">
                                ↻ Regenerate
                              </button>
                              <button onClick={() => {
                                const w = window.open("", "_blank");
                                if (!w) return;
                                w.document.write(`<html><head><title>Materials List</title><style>body{font-family:Arial;padding:32px;max-width:700px;margin:auto}table{width:100%;border-collapse:collapse}th{background:#1e293b;color:white;padding:10px;text-align:left;font-size:12px}td{padding:10px;border-bottom:1px solid #e2e8f0;font-size:13px}.total-row{font-weight:900;font-size:15px}</style></head><body><h2>Materials List</h2><p style="color:#64748b;margin-bottom:16px">${form.projectTitle || "Project"} · ${form.customerName || "Customer"} · Internal Use Only</p><table><thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Unit Cost</th><th>Total</th><th>Notes</th></tr></thead><tbody>${materials.map(m=>`<tr><td>${m.item}</td><td>${m.qty}</td><td>${m.unit}</td><td>$${m.unitCost}</td><td>$${m.total}</td><td>${m.notes||""}</td></tr>`).join("")}<tr class="total-row"><td colspan="4">Total Materials Cost</td><td>$${materialsTotal}</td><td></td></tr></tbody></table></body></html>`);
                                w.document.close();
                                w.print();
                              }} className="text-xs text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg hover:bg-slate-50 transition-all">
                                🖨️ Print
                              </button>
                            </div>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-slate-50">
                                  <th className="text-left text-xs font-semibold text-slate-500 py-2 px-2">Item</th>
                                  <th className="text-center text-xs font-semibold text-slate-500 py-2 px-2">Qty</th>
                                  <th className="text-left text-xs font-semibold text-slate-500 py-2 px-2">Unit</th>
                                  <th className="text-right text-xs font-semibold text-slate-500 py-2 px-2">Unit $</th>
                                  <th className="text-right text-xs font-semibold text-slate-500 py-2 px-2">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {materials.map((m, i) => (
                                  <tr key={i} className="hover:bg-slate-50">
                                    <td className="py-2 px-2">
                                      <p className="font-medium text-slate-900">{m.item}</p>
                                      {m.notes && <p className="text-slate-400 text-xs">{m.notes}</p>}
                                    </td>
                                    <td className="py-2 px-2 text-center font-semibold">{m.qty}</td>
                                    <td className="py-2 px-2 text-slate-500">{m.unit}</td>
                                    <td className="py-2 px-2 text-right">{formatCurrency(m.unitCost)}</td>
                                    <td className="py-2 px-2 text-right font-semibold">{formatCurrency(m.total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot>
                                <tr className="border-t-2 border-slate-200">
                                  <td colSpan={4} className="py-2 px-2 font-black text-slate-900">Total Materials Cost</td>
                                  <td className="py-2 px-2 text-right font-black text-slate-900">{formatCurrency(materialsTotal)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3">
                  <Button onClick={() => handleSave("draft")} variant="outline" className="flex-1" isLoading={saving}>💾 Save Draft</Button>
                  <Button onClick={handlePrint} className="flex-1">📄 Download PDF</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── PDF DOCUMENT (print only) ── */}
      {hasEstimate && (
        <div id="pdf-document" style={{ display: "none" }}>
          <style>{`@media print { #pdf-document { display: block !important; } * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }`}</style>
          <div style={{ maxWidth: "780px", margin: "0 auto", fontFamily: "Arial, sans-serif", color: "#1e293b" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", paddingBottom: "20px", borderBottom: "3px solid #f97316" }}>
              <div>
                <div style={{ fontSize: "26px", fontWeight: "900" }}>{profile?.businessName || session?.user?.name}</div>
                {profile?.isVerified && <div style={{ fontSize: "11px", color: "#3b82f6", fontWeight: "700", marginTop: "2px" }}>✓ VERIFIED CONTRACTOR</div>}
                {profile?.city && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>📍 {profile.city}, {profile.state}</div>}
                {profile?.phone && <div style={{ fontSize: "12px", color: "#64748b" }}>📞 {profile.phone}</div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "24px", fontWeight: "900", color: "#f97316" }}>ESTIMATE</div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>#{estimateNumber}</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>Date: {formatDate(today.toISOString())}</div>
                <div style={{ fontSize: "12px", color: "#64748b" }}>Valid until: {formatDate(validUntil.toISOString())}</div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
              <div>
                <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>Prepared For</div>
                <div style={{ fontWeight: "700", fontSize: "15px" }}>{form.customerName || "Valued Customer"}</div>
                {form.customerEmail && <div style={{ fontSize: "12px", color: "#64748b" }}>{form.customerEmail}</div>}
                {form.customerAddress && <div style={{ fontSize: "12px", color: "#64748b", marginTop: "3px" }}>{form.customerAddress}</div>}
              </div>
              <div>
                <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", marginBottom: "6px" }}>Project</div>
                <div style={{ fontWeight: "700", fontSize: "15px" }}>{form.projectTitle || selectedCategory?.name}</div>
                <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{selectedCategory?.icon} {selectedCategory?.name}{form.size ? ` · ${form.size} ${selectedCategory?.unit}` : ""}</div>
                {form.customerAddress && <div style={{ fontSize: "12px", color: "#64748b" }}>📍 {form.customerAddress}</div>}
              </div>
            </div>
            {form.description && (
              <div style={{ backgroundColor: "#f8fafc", borderRadius: "8px", padding: "12px 14px", marginBottom: "20px" }}>
                <div style={{ fontSize: "10px", fontWeight: "700", color: "#94a3b8", textTransform: "uppercase", marginBottom: "5px" }}>Scope of Work</div>
                <div style={{ fontSize: "12px", color: "#475569", lineHeight: "1.6" }}>{form.description}</div>
              </div>
            )}
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "14px" }}>
              <thead>
                <tr style={{ backgroundColor: "#1e293b" }}>
                  <th style={{ textAlign: "left", padding: "9px 12px", fontSize: "10px", fontWeight: "700", color: "white", textTransform: "uppercase", width: "70px" }}>Type</th>
                  <th style={{ textAlign: "left", padding: "9px 12px", fontSize: "10px", fontWeight: "700", color: "white", textTransform: "uppercase" }}>Description</th>
                  <th style={{ textAlign: "right", padding: "9px 12px", fontSize: "10px", fontWeight: "700", color: "white", textTransform: "uppercase", width: "90px" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, i) => (
                  <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? "white" : "#f8fafc" }}>
                    <td style={{ padding: "9px 12px", fontSize: "11px", color: "#64748b", textTransform: "capitalize", borderBottom: "1px solid #e2e8f0" }}>{item.category}</td>
                    <td style={{ padding: "9px 12px", fontSize: "12px", color: "#1e293b", borderBottom: "1px solid #e2e8f0" }}>{item.item}</td>
                    <td style={{ padding: "9px 12px", fontSize: "12px", fontWeight: "600", textAlign: "right", borderBottom: "1px solid #e2e8f0" }}>{formatCurrency(Number(item.cost))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "24px" }}>
              <div style={{ width: "210px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "12px", color: "#64748b" }}><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                {discountAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "12px", color: "#16a34a" }}><span>Discount ({form.discount}%)</span><span>−{formatCurrency(discountAmt)}</span></div>}
                {taxAmt > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: "12px", color: "#64748b" }}><span>Tax ({form.taxRate}%)</span><span>{formatCurrency(taxAmt)}</span></div>}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 12px", backgroundColor: "#f97316", borderRadius: "8px", marginTop: "5px" }}>
                  <span style={{ fontWeight: "900", fontSize: "15px", color: "white" }}>TOTAL</span>
                  <span style={{ fontWeight: "900", fontSize: "15px", color: "white" }}>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
              {form.notes && <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "12px" }}><div style={{ fontSize: "10px", fontWeight: "700", color: "#16a34a", textTransform: "uppercase", marginBottom: "5px" }}>Notes</div><div style={{ fontSize: "11px", color: "#166534", lineHeight: "1.5" }}>{form.notes}</div></div>}
              {form.terms && <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "12px" }}><div style={{ fontSize: "10px", fontWeight: "700", color: "#d97706", textTransform: "uppercase", marginBottom: "5px" }}>Terms</div><div style={{ fontSize: "11px", color: "#92400e", lineHeight: "1.5" }}>{form.terms}</div></div>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px", borderTop: "2px solid #e2e8f0", paddingTop: "20px" }}>
              <div><div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "20px" }}>Contractor Signature</div><div style={{ borderBottom: "1px solid #cbd5e1", height: "28px", marginBottom: "5px" }}></div><div style={{ fontSize: "11px", color: "#64748b" }}>{profile?.businessName || session?.user?.name}</div></div>
              <div><div style={{ fontSize: "10px", color: "#94a3b8", marginBottom: "20px" }}>Customer Acceptance</div><div style={{ borderBottom: "1px solid #cbd5e1", height: "28px", marginBottom: "5px" }}></div><div style={{ fontSize: "11px", color: "#64748b" }}>Date: _______________</div></div>
            </div>
            <div style={{ textAlign: "center", marginTop: "24px", paddingTop: "12px", borderTop: "1px solid #e2e8f0", fontSize: "10px", color: "#94a3b8" }}>
              {estimateNumber} · {formatDate(today.toISOString())} · Powered by QuoteFast
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function EstimateBuilderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-4xl animate-spin">⚙️</div></div>}>
      <EstimateBuilderContent />
    </Suspense>
  );
}
