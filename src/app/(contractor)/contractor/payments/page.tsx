"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Booking {
  id: string;
  agreedPrice: number;
  leadFee: number;
  leadFeePaid: boolean;
  status: string;
  createdAt: string;
  scheduledDate: string | null;
  jobRequest: {
    title: string;
    city: string;
    state: string;
    category: { name: string; icon: string };
  };
  customer: { name: string; email: string };
}

interface ContractorProfile {
  subscriptionStatus: string;
  subscriptionEnds: string | null;
  businessName: string;
}

function PaymentsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [profile, setProfile] = useState<ContractorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "leads" | "jobs">("overview");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/contractor/payments");
      return;
    }
    if (status === "authenticated" && session.user.role !== "contractor") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      Promise.all([
        fetch("/api/bookings").then((r) => r.json()),
        fetch("/api/contractors/profile").then((r) => r.json()),
      ]).then(([bData, pData]) => {
        setBookings(bData.bookings || []);
        if (pData.contractor) setProfile(pData.contractor);
        setLoading(false);
      });
    }
  }, [status, session, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-spin">⚙️</div>
      </div>
    );
  }

  // Derived stats
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const activeBookings = bookings.filter(
    (b) => b.status === "pending" || b.status === "confirmed" || b.status === "in_progress"
  );

  const totalRevenue = completedBookings.reduce((s, b) => s + b.agreedPrice, 0);
  const totalLeadFees = bookings.reduce((s, b) => s + (b.leadFeePaid ? b.leadFee : 0), 0);
  const pendingLeadFees = bookings.reduce(
    (s, b) => s + (!b.leadFeePaid && b.status !== "cancelled" ? b.leadFee : 0),
    0
  );
  const netRevenue = totalRevenue - totalLeadFees;

  const isActive = profile?.subscriptionStatus === "active";
  const monthlyFee = 49;

  const STATUS_COLORS: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    in_progress: "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-600",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Payment History</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Revenue, lead fees, and subscription billing
            </p>
          </div>
          <Link href="/contractor/dashboard">
            <Button variant="outline" size="sm">
              ← Dashboard
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Subscription status */}
        <div
          className={`rounded-2xl p-5 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
            isActive
              ? "bg-green-50 border border-green-200"
              : "bg-orange-50 border border-orange-200"
          }`}
        >
          <div className="text-3xl">{isActive ? "✅" : "⚠️"}</div>
          <div className="flex-1">
            <p className={`font-bold text-lg ${isActive ? "text-green-800" : "text-orange-800"}`}>
              {isActive ? "Subscription Active" : "No Active Subscription"}
            </p>
            <p className={`text-sm ${isActive ? "text-green-600" : "text-orange-600"}`}>
              {isActive
                ? `$${monthlyFee}/month · Renews ${
                    profile?.subscriptionEnds ? formatDate(profile.subscriptionEnds) : "—"
                  }`
                : "Activate your subscription to receive leads from homeowners."}
            </p>
          </div>
          {!isActive && (
            <Button size="sm" className="shrink-0 bg-orange-500 hover:bg-orange-600 text-white">
              Activate — $49/mo
            </Button>
          )}
          {isActive && (
            <div className="text-right shrink-0">
              <div className="text-green-700 font-semibold text-sm">$49/month</div>
              <div className="text-green-500 text-xs">Billed monthly</div>
            </div>
          )}
        </div>

        {/* Revenue summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Revenue",
              value: formatCurrency(totalRevenue),
              sub: `${completedBookings.length} completed jobs`,
              icon: "💰",
              color: "from-green-400 to-green-500",
            },
            {
              label: "Lead Fees Paid",
              value: formatCurrency(totalLeadFees),
              sub: `$15 per claimed lead`,
              icon: "🎯",
              color: "from-orange-400 to-orange-500",
            },
            {
              label: "Pending Fees",
              value: formatCurrency(pendingLeadFees),
              sub: `${activeBookings.length} active leads`,
              icon: "⏳",
              color: "from-yellow-400 to-yellow-500",
            },
            {
              label: "Net Revenue",
              value: formatCurrency(netRevenue),
              sub: "Revenue minus lead fees",
              icon: "📈",
              color: "from-blue-400 to-blue-500",
            },
          ].map((card) => (
            <div key={card.label} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center text-xl mb-3`}
              >
                {card.icon}
              </div>
              <div className="text-2xl font-black text-slate-900">{card.value}</div>
              <div className="text-slate-500 text-sm mt-0.5">{card.label}</div>
              <div className="text-slate-400 text-xs mt-1">{card.sub}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-100 px-4">
            {(["overview", "leads", "jobs"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 -mb-px capitalize transition-colors ${
                  activeTab === tab
                    ? "border-orange-500 text-orange-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab === "overview" ? "All Transactions" : tab === "leads" ? "Lead Fees" : "Completed Jobs"}
              </button>
            ))}
          </div>

          {/* Overview / All */}
          {activeTab === "overview" && (
            <>
              {/* Subscription line items */}
              {isActive && (
                <div className="px-6 py-4 border-b border-slate-50">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-sm">
                      ✅
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">
                        Monthly Subscription — QuoteFast Pro
                      </p>
                      <p className="text-xs text-slate-400">Recurring · Active</p>
                    </div>
                    <div className="text-sm font-semibold text-slate-900">
                      ${monthlyFee}/mo
                    </div>
                  </div>
                </div>
              )}

              {bookings.length === 0 ? (
                <div className="text-center py-14">
                  <div className="text-4xl mb-3">💳</div>
                  <p className="text-slate-500 font-medium">No transactions yet</p>
                  <p className="text-slate-400 text-sm mt-1">
                    Lead fees and job revenue will appear here once you start claiming leads.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {bookings.map((b) => (
                    <div key={b.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="text-xl shrink-0">{b.jobRequest.category.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {b.jobRequest.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {b.customer.name} · {b.jobRequest.city}, {b.jobRequest.state} ·{" "}
                          {formatDate(b.createdAt)}
                        </p>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        {b.status === "completed" && (
                          <div className="text-sm font-bold text-green-600">
                            +{formatCurrency(b.agreedPrice)}
                          </div>
                        )}
                        <div
                          className={`text-xs ${
                            b.leadFeePaid ? "text-red-500" : "text-slate-400"
                          }`}
                        >
                          Lead fee: {b.leadFeePaid ? `-$${b.leadFee}` : `$${b.leadFee} pending`}
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            STATUS_COLORS[b.status] || "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {b.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Lead Fees tab */}
          {activeTab === "leads" && (
            <>
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                Lead fees are charged when you claim a job. $15 per lead.
              </div>
              {bookings.length === 0 ? (
                <div className="text-center py-14">
                  <p className="text-slate-400 text-sm">No leads claimed yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {bookings.map((b) => (
                    <div key={b.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="text-xl shrink-0">{b.jobRequest.category.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {b.jobRequest.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {b.customer.name} · {formatDate(b.createdAt)}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className={`text-sm font-bold ${
                            b.leadFeePaid ? "text-red-500" : "text-yellow-600"
                          }`}
                        >
                          ${b.leadFee}
                        </div>
                        <div className="text-xs text-slate-400">
                          {b.leadFeePaid ? "Paid" : "Pending"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {bookings.length > 0 && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-medium">Total lead fees paid</span>
                  <span className="font-bold text-red-500">{formatCurrency(totalLeadFees)}</span>
                </div>
              )}
            </>
          )}

          {/* Completed Jobs tab */}
          {activeTab === "jobs" && (
            <>
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                Revenue from completed jobs (agreed price at time of booking).
              </div>
              {completedBookings.length === 0 ? (
                <div className="text-center py-14">
                  <div className="text-4xl mb-3">🏠</div>
                  <p className="text-slate-400 text-sm">No completed jobs yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {completedBookings.map((b) => (
                    <div key={b.id} className="flex items-center gap-4 px-6 py-4">
                      <div className="text-xl shrink-0">{b.jobRequest.category.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {b.jobRequest.title}
                        </p>
                        <p className="text-xs text-slate-400">
                          {b.customer.name} · {b.jobRequest.city}, {b.jobRequest.state}
                        </p>
                        {b.scheduledDate && (
                          <p className="text-xs text-slate-400">
                            Completed: {formatDate(b.scheduledDate)}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold text-green-600">
                          {formatCurrency(b.agreedPrice)}
                        </div>
                        <div className="text-xs text-slate-400">
                          Net: {formatCurrency(b.agreedPrice - b.leadFee)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {completedBookings.length > 0 && (
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-sm text-slate-600 font-medium">Total revenue</span>
                  <span className="font-bold text-green-600">{formatCurrency(totalRevenue)}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Billing info note */}
        <div className="mt-6 bg-blue-50 border border-blue-100 rounded-2xl p-5 text-sm text-blue-700">
          <p className="font-semibold mb-1">💳 Billing information</p>
          <p className="text-blue-600 text-xs leading-relaxed">
            Lead fees ($15/lead) are collected at the time you claim a job. Subscription billing is
            processed monthly via Stripe. For billing disputes or invoices, contact{" "}
            <a href="mailto:billing@quotefast.com" className="underline">
              billing@quotefast.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ContractorPaymentsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-4xl animate-spin">⚙️</div>
        </div>
      }
    >
      <PaymentsContent />
    </Suspense>
  );
}
