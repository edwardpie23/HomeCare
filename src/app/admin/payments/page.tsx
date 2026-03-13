"use client";

import { useEffect, useState } from "react";
import { formatDate, formatCurrency } from "@/lib/utils";

interface StatsData {
  totalUsers: number;
  totalContractors: number;
  activeSubscriptions: number;
  totalJobs: number;
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
  mrr: number;
}

export default function AdminPaymentsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  const today = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    return d.toLocaleString("default", { month: "short", year: "numeric" });
  }).reverse();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900">Payments & Revenue</h1>
        <p className="text-slate-500 mt-1">Subscription and lead fee tracking</p>
      </div>

      {/* Key Revenue Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white">
          <p className="text-green-100 text-sm mb-1">Monthly Recurring Revenue</p>
          <p className="text-4xl font-black">{formatCurrency(stats?.mrr ?? 0)}</p>
          <p className="text-green-200 text-sm mt-2">{stats?.activeSubscriptions} active × $49/mo</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white">
          <p className="text-orange-100 text-sm mb-1">Lead Fee Revenue (total)</p>
          <p className="text-4xl font-black">{formatCurrency(stats?.totalRevenue ?? 0)}</p>
          <p className="text-orange-200 text-sm mt-2">$15 per claimed lead</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white">
          <p className="text-purple-100 text-sm mb-1">Annual Run Rate</p>
          <p className="text-4xl font-black">{formatCurrency((stats?.mrr ?? 0) * 12)}</p>
          <p className="text-purple-200 text-sm mt-2">Based on current MRR</p>
        </div>
      </div>

      {/* Revenue Projections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-5">Subscription Growth Projection</h2>
          <div className="space-y-3">
            {[
              { label: "Current", subs: stats?.activeSubscriptions ?? 0 },
              { label: "At 100 contractors", subs: 100 },
              { label: "At 500 contractors", subs: 500 },
              { label: "At 2,000 contractors", subs: 2000 },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <span className="text-slate-600 text-sm">{row.label}</span>
                <div className="text-right">
                  <span className="font-bold text-slate-900">{formatCurrency(row.subs * 49)}/mo</span>
                  <span className="text-slate-400 text-xs ml-2">({row.subs} subs)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-lg font-bold text-slate-900 mb-5">Monetization Breakdown</h2>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-green-50 rounded-xl">
              <div className="text-2xl">⭐</div>
              <div>
                <p className="font-semibold text-slate-900">Contractor Subscriptions</p>
                <p className="text-slate-500 text-sm">$49/month per contractor</p>
                <p className="text-green-600 font-bold mt-1">{formatCurrency(stats?.mrr ?? 0)}/mo current</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-orange-50 rounded-xl">
              <div className="text-2xl">🎯</div>
              <div>
                <p className="font-semibold text-slate-900">Lead Fees</p>
                <p className="text-slate-500 text-sm">$15 per claimed lead</p>
                <p className="text-orange-600 font-bold mt-1">{formatCurrency(stats?.totalRevenue ?? 0)} total earned</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl">
              <div className="text-2xl">💡</div>
              <div>
                <p className="font-semibold text-slate-900">Upcoming: Homeowner Fee</p>
                <p className="text-slate-500 text-sm">$2 per instant estimate (not yet active)</p>
                <p className="text-blue-600 font-bold mt-1">
                  Potential: {formatCurrency((stats?.totalJobs ?? 0) * 2)}/lifetime
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History Placeholder */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-slate-900">Payment History</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            Connect Stripe to see live payments
          </span>
        </div>

        <div className="text-center py-10 text-slate-400">
          <div className="text-4xl mb-3">💳</div>
          <p className="font-medium text-slate-600 mb-2">Full payment history coming with Stripe integration</p>
          <p className="text-sm">
            Once you configure your <code className="bg-slate-100 px-1 rounded">STRIPE_SECRET_KEY</code> and webhook,
            all subscription charges and lead fee payments will appear here.
          </p>
        </div>

        {/* Sample months */}
        <div className="border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-700 mb-3">Revenue Timeline (projected from current MRR)</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {months.map((month, i) => {
              const isCurrentMonth = i === months.length - 1;
              const projected = isCurrentMonth
                ? stats?.mrr ?? 0
                : Math.max(0, (stats?.mrr ?? 0) * (0.7 + i * 0.06));
              return (
                <div key={month} className={`rounded-xl p-3 text-center ${isCurrentMonth ? "bg-orange-50 border border-orange-200" : "bg-slate-50"}`}>
                  <p className="text-xs text-slate-500 mb-1">{month}</p>
                  <p className={`text-sm font-bold ${isCurrentMonth ? "text-orange-600" : "text-slate-600"}`}>
                    {formatCurrency(projected)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="mt-6 bg-slate-900 rounded-2xl p-6 text-white">
        <h2 className="text-lg font-bold mb-4">💳 Enable Full Payment Tracking</h2>
        <ol className="space-y-3 text-slate-300 text-sm">
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">1</span>
            <span>Create a product in <strong className="text-white">Stripe Dashboard</strong> → Products → Add Product: &quot;QuoteFast Pro&quot; at $49/month</span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">2</span>
            <span>Copy the Price ID (starts with <code className="bg-slate-700 px-1 rounded">price_</code>) into your <code className="bg-slate-700 px-1 rounded">.env</code> as <code className="bg-slate-700 px-1 rounded">STRIPE_SUBSCRIPTION_PRICE_ID</code></span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">3</span>
            <span>Set up a Stripe webhook pointing to <code className="bg-slate-700 px-1 rounded">{process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/stripe/webhook</code></span>
          </li>
          <li className="flex gap-3">
            <span className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">4</span>
            <span>Paste the webhook secret into <code className="bg-slate-700 px-1 rounded">STRIPE_WEBHOOK_SECRET</code></span>
          </li>
        </ol>
        <p className="text-slate-400 text-xs mt-4">
          Last updated: {formatDate(new Date().toISOString())}
        </p>
      </div>
    </div>
  );
}
