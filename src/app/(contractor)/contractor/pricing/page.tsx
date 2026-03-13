"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { JOB_CATEGORIES } from "@/lib/utils";

interface PricingRule {
  id: string;
  categoryId: string;
  basePrice: number;
  pricePerUnit: number | null;
  unit: string | null;
  notes: string | null;
  category: { name: string; icon: string; unit: string };
}

export default function ContractorPricingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingRule, setEditingRule] = useState<{
    categoryId: string;
    basePrice: string;
    pricePerUnit: string;
    unit: string;
    notes: string;
  } | null>(null);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/contractor/pricing");
      return;
    }
    if (status === "authenticated" && session.user.role !== "contractor") {
      router.push("/get-estimate");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/contractors/pricing")
        .then((r) => r.json())
        .then((d) => {
          setRules(d.pricingRules || []);
          setLoading(false);
        });
    }
  }, [status, session, router]);

  async function saveRule(categoryId: string) {
    if (!editingRule) return;
    setSaving(categoryId);

    const res = await fetch("/api/contractors/pricing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        categoryId,
        basePrice: editingRule.basePrice,
        pricePerUnit: editingRule.pricePerUnit || null,
        unit: editingRule.unit || null,
        notes: editingRule.notes || null,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      setRules((prev) => {
        const existing = prev.find((r) => r.categoryId === categoryId);
        const cat = JOB_CATEGORIES.find((c) => c.id === categoryId);
        const newRule: PricingRule = {
          ...data.rule,
          category: {
            name: cat?.name || "",
            icon: cat?.icon || "",
            unit: cat?.unit || "job",
          },
        };
        if (existing) {
          return prev.map((r) => (r.categoryId === categoryId ? newRule : r));
        }
        return [...prev, newRule];
      });
      setEditingRule(null);
      setSuccess(`Pricing saved for ${JOB_CATEGORIES.find((c) => c.id === categoryId)?.name}`);
      setTimeout(() => setSuccess(""), 3000);
    }

    setSaving(null);
  }

  function startEditing(categoryId: string) {
    const existing = rules.find((r) => r.categoryId === categoryId);
    const cat = JOB_CATEGORIES.find((c) => c.id === categoryId);
    setEditingRule({
      categoryId,
      basePrice: existing?.basePrice?.toString() || "",
      pricePerUnit: existing?.pricePerUnit?.toString() || "",
      unit: existing?.unit || cat?.unit || "job",
      notes: existing?.notes || "",
    });
  }

  const ruleMap = new Map(rules.map((r) => [r.categoryId, r]));

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
            <h1 className="text-3xl font-black text-slate-900">My Pricing</h1>
            <p className="text-slate-500 text-sm mt-1">
              Set your rates for each job type. This helps customers get accurate estimates from you.
            </p>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm mb-6">
            ✓ {success}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-8">
          <p className="text-blue-800 text-sm">
            <strong>Pro tip:</strong> Contractors with detailed pricing receive 3x more bookings.
            Your rates are used by AI to generate customer estimates using your actual pricing.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {JOB_CATEGORIES.map((cat) => {
            const rule = ruleMap.get(cat.id);
            const isEditing = editingRule?.categoryId === cat.id;

            return (
              <div
                key={cat.id}
                className={`bg-white rounded-2xl border-2 transition-all ${
                  isEditing ? "border-orange-400 shadow-md" : "border-slate-200"
                } p-5`}
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{cat.icon}</span>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">{cat.name}</p>
                    <p className="text-xs text-slate-400">{cat.description}</p>
                  </div>
                  {rule && !isEditing && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                      Set ✓
                    </span>
                  )}
                </div>

                {!isEditing ? (
                  <div>
                    {rule ? (
                      <div className="space-y-1 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Base price</span>
                          <span className="font-semibold">${rule.basePrice}</span>
                        </div>
                        {rule.pricePerUnit && (
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-500">Per {rule.unit || cat.unit}</span>
                            <span className="font-semibold">${rule.pricePerUnit}</span>
                          </div>
                        )}
                        {rule.notes && (
                          <p className="text-slate-400 text-xs italic mt-2">{rule.notes}</p>
                        )}
                      </div>
                    ) : (
                      <div className="text-slate-400 text-sm mb-4">
                        Market rate: ${cat.baseMinPrice}–${cat.baseMaxPrice}
                      </div>
                    )}
                    <Button
                      variant={rule ? "secondary" : "outline"}
                      size="sm"
                      className="w-full"
                      onClick={() => startEditing(cat.id)}
                    >
                      {rule ? "Edit Pricing" : "Set My Price"}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Base Price ($) *
                      </label>
                      <input
                        type="number"
                        value={editingRule.basePrice}
                        onChange={(e) =>
                          setEditingRule({ ...editingRule, basePrice: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm"
                        placeholder="e.g. 200"
                      />
                    </div>

                    {cat.unit !== "job" && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Price per {cat.unit}
                          </label>
                          <input
                            type="number"
                            value={editingRule.pricePerUnit}
                            onChange={(e) =>
                              setEditingRule({ ...editingRule, pricePerUnit: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-slate-700 mb-1">
                            Unit
                          </label>
                          <input
                            type="text"
                            value={editingRule.unit}
                            onChange={(e) =>
                              setEditingRule({ ...editingRule, unit: e.target.value })
                            }
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm"
                            placeholder={cat.unit}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Notes (optional)
                      </label>
                      <input
                        type="text"
                        value={editingRule.notes}
                        onChange={(e) =>
                          setEditingRule({ ...editingRule, notes: e.target.value })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 text-sm"
                        placeholder="e.g. Minimum 2 holes, includes primer"
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        isLoading={saving === cat.id}
                        onClick={() => saveRule(cat.id)}
                        disabled={!editingRule.basePrice}
                      >
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingRule(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
