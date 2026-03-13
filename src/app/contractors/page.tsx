"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { JOB_CATEGORIES } from "@/lib/utils";

interface Contractor {
  id: string;
  businessName: string;
  bio: string | null;
  city: string | null;
  state: string | null;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  yearsExperience: number;
  specialties: string;
  pricingRules: { category: { name: string; icon: string } }[];
}

function StarRow({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`text-xs ${s <= Math.round(rating) ? "text-yellow-400" : "text-slate-200"}`}>★</span>
      ))}
      <span className="text-xs text-slate-500 ml-1">{rating > 0 ? rating.toFixed(1) : "New"}</span>
      <span className="text-xs text-slate-400">({count})</span>
    </div>
  );
}

function ContractorsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [state, setState] = useState(searchParams.get("state") || "");
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("role", "contractor");
    if (search) params.set("q", search);
    if (category) params.set("category", category);
    if (state) params.set("state", state);
    if (verifiedOnly) params.set("verified", "true");

    fetch(`/api/contractors/search?${params}`)
      .then((r) => r.json())
      .then((d) => {
        setContractors(d.contractors || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [search, category, state, verifiedOnly]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (category) params.set("category", category);
    if (state) params.set("state", state);
    router.push(`/contractors?${params}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900">Find Contractors</h1>
          <p className="text-slate-500 mt-1">Browse verified home service professionals in your area</p>
        </div>

        {/* Filters */}
        <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-slate-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search by name or business..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              <option value="">All Categories</option>
              {JOB_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="State (e.g. TX)"
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
              maxLength={2}
              className="w-24 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 uppercase"
            />
            <button
              type="submit"
              className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              Search
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="verified"
              checked={verifiedOnly}
              onChange={(e) => setVerifiedOnly(e.target.checked)}
              className="rounded accent-orange-500"
            />
            <label htmlFor="verified" className="text-sm text-slate-600">Verified contractors only</label>
          </div>
        </form>

        {loading ? (
          <div className="text-center py-16">
            <div className="text-4xl animate-spin mb-4">⚙️</div>
            <p className="text-slate-400">Loading contractors...</p>
          </div>
        ) : contractors.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="text-4xl mb-4">🔍</div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">No contractors found</h2>
            <p className="text-slate-500 text-sm">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {contractors.map((c) => {
              const specialties: string[] = JSON.parse(c.specialties || "[]");
              return (
                <Link key={c.id} href={`/contractors/${c.id}`}>
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-orange-300 hover:shadow-md transition-all h-full">
                    {/* Header */}
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-xl font-black text-white shrink-0">
                        {c.businessName.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm truncate">{c.businessName}</span>
                          {c.isVerified && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full shrink-0">✓</span>
                          )}
                        </div>
                        {c.city && c.state && (
                          <p className="text-slate-400 text-xs mt-0.5">📍 {c.city}, {c.state}</p>
                        )}
                        <StarRow rating={c.rating} count={c.reviewCount} />
                      </div>
                    </div>

                    {c.bio && (
                      <p className="text-slate-500 text-xs leading-relaxed line-clamp-2 mb-3">{c.bio}</p>
                    )}

                    {/* Services */}
                    {c.pricingRules.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {c.pricingRules.slice(0, 3).map((r, i) => (
                          <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            {r.category.icon} {r.category.name}
                          </span>
                        ))}
                        {c.pricingRules.length > 3 && (
                          <span className="text-xs text-slate-400">+{c.pricingRules.length - 3} more</span>
                        )}
                      </div>
                    )}

                    {specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {specialties.slice(0, 2).map((s) => (
                          <span key={s} className="text-xs bg-orange-50 text-orange-600 border border-orange-100 px-2 py-0.5 rounded-full">
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 pt-3 border-t border-slate-50 text-xs text-orange-500 font-medium">
                      View profile →
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ContractorsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-4xl animate-spin">⚙️</div></div>}>
      <ContractorsContent />
    </Suspense>
  );
}
