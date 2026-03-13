"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ContractorStats {
  businessName: string;
  subscriptionStatus: string;
  subscriptionEnds: string | null;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
}

interface Booking {
  id: string;
  agreedPrice: number;
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

function DashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const subStatus = searchParams.get("subscription");

  const [contractor, setContractor] = useState<ContractorStats | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [availableLeads, setAvailableLeads] = useState(0);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/contractor/dashboard");
      return;
    }
    if (status === "authenticated" && session.user.role !== "contractor") {
      router.push("/get-estimate");
      return;
    }
    if (status === "authenticated") {
      Promise.all([
        fetch("/api/contractors").then((r) => r.json()),
        fetch("/api/bookings").then((r) => r.json()),
        fetch("/api/jobs?role=contractor").then((r) => r.json()),
      ]).then(([cData, bData, jData]) => {
        // Get contractor profile from session
        fetch("/api/contractors/pricing").then((r) => r.json());
        setBookings(bData.bookings || []);
        setAvailableLeads((jData.jobs || []).length);
        setLoading(false);
      });

      // Fetch contractor profile separately
      fetch(`/api/contractors/profile`)
        .then((r) => r.json())
        .then((d) => {
          if (d.contractor) setContractor(d.contractor);
        })
        .catch(() => setLoading(false));

      setLoading(false);
    }
  }, [status, session, router]);

  async function handleSubscribe() {
    setSubscribing(true);
    const res = await fetch("/api/stripe/create-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ID }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("Payment setup failed. Please try again.");
      setSubscribing(false);
    }
  }

  const totalRevenue = bookings
    .filter((b) => b.status === "completed")
    .reduce((sum, b) => sum + b.agreedPrice, 0);

  const pendingBookings = bookings.filter((b) => b.status === "pending").length;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    confirmed: "bg-blue-100 text-blue-700",
    in_progress: "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
    cancelled: "bg-red-100 text-red-600",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-spin">⚙️</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">
              Contractor Dashboard
            </h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Welcome back, {session?.user?.name || "Contractor"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/contractor/leads">
              <Button variant="outline" size="sm">
                View Leads ({availableLeads})
              </Button>
            </Link>
            <Link href="/contractor/pricing">
              <Button size="sm">My Pricing</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Subscription banner */}
        {subStatus === "success" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <div>
              <p className="font-semibold text-green-800">Subscription activated!</p>
              <p className="text-green-600 text-sm">
                You now have full access to leads and the QuoteFast platform.
              </p>
            </div>
          </div>
        )}

        {/* Trial / subscription notice */}
        {(!contractor || contractor.subscriptionStatus === "inactive") && (
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-2xl p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex-1">
                <h2 className="text-xl font-black mb-1">
                  Activate your account to receive leads
                </h2>
                <p className="text-orange-100 text-sm">
                  Get unlimited leads from homeowners in your area. First 30 days free.
                </p>
              </div>
              <div className="flex flex-col items-center gap-1">
                <Button
                  variant="secondary"
                  size="lg"
                  className="text-orange-600 font-bold shrink-0"
                  isLoading={subscribing}
                  onClick={handleSubscribe}
                >
                  Start Free Trial
                </Button>
                <span className="text-orange-200 text-xs">$49/month after trial</span>
              </div>
            </div>
          </div>
        )}

        {contractor?.subscriptionStatus === "active" && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-green-500 text-lg">✓</span>
              <span className="font-semibold text-green-800">Active Subscription</span>
              {contractor.subscriptionEnds && (
                <span className="text-green-600 text-sm">
                  · Renews {formatDate(contractor.subscriptionEnds)}
                </span>
              )}
            </div>
            <span className="text-sm text-green-600">$49/month</span>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Available Leads",
              value: availableLeads,
              icon: "🎯",
              color: "from-orange-400 to-orange-500",
            },
            {
              label: "Active Bookings",
              value: pendingBookings,
              icon: "📅",
              color: "from-blue-400 to-blue-500",
            },
            {
              label: "Completed Jobs",
              value: bookings.filter((b) => b.status === "completed").length,
              icon: "✅",
              color: "from-green-400 to-green-500",
            },
            {
              label: "Total Revenue",
              value: formatCurrency(totalRevenue),
              icon: "💰",
              color: "from-purple-400 to-purple-500",
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-5">
              <div
                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-xl mb-3`}
              >
                {stat.icon}
              </div>
              <div className="text-2xl font-black text-slate-900">{stat.value}</div>
              <div className="text-slate-500 text-sm mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Bookings */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-slate-900">Recent Bookings</h2>
              <Link href="/contractor/leads">
                <Button variant="ghost" size="sm">
                  View Leads →
                </Button>
              </Link>
            </div>

            {bookings.length === 0 ? (
              <div className="text-center py-10">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-slate-500 text-sm">No bookings yet.</p>
                <p className="text-slate-400 text-xs mt-1">
                  Set up your pricing and activate your subscription to start receiving leads.
                </p>
                <Link href="/contractor/pricing" className="mt-4 inline-block">
                  <Button size="sm" variant="outline">
                    Set Up Pricing
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.slice(0, 5).map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-4 py-3 border-b border-slate-50 last:border-0"
                  >
                    <span className="text-xl">{booking.jobRequest.category.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm truncate">
                        {booking.jobRequest.title}
                      </p>
                      <p className="text-slate-400 text-xs">
                        {booking.customer.name} · {booking.jobRequest.city},{" "}
                        {booking.jobRequest.state}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-semibold text-slate-900 text-sm">
                        {formatCurrency(booking.agreedPrice)}
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          statusColors[booking.status] || "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h2 className="text-lg font-bold text-slate-900 mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Link href="/contractor/leads" className="block">
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 text-left transition-all">
                    <span className="text-2xl">🎯</span>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">Browse Leads</p>
                      <p className="text-slate-400 text-xs">{availableLeads} available</p>
                    </div>
                  </button>
                </Link>
                <Link href="/contractor/pricing" className="block">
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 text-left transition-all">
                    <span className="text-2xl">💲</span>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">Set My Pricing</p>
                      <p className="text-slate-400 text-xs">Upload your price tables</p>
                    </div>
                  </button>
                </Link>
                <Link href="/contractor/estimate-builder" className="block">
                  <button className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-orange-200 bg-orange-50 text-left transition-all">
                    <span className="text-2xl">📋</span>
                    <div>
                      <p className="font-medium text-slate-900 text-sm">Estimate Builder</p>
                      <p className="text-slate-400 text-xs">Create & download PDF estimates</p>
                    </div>
                  </button>
                </Link>
                <button
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 text-left transition-all"
                  onClick={handleSubscribe}
                >
                  <span className="text-2xl">⭐</span>
                  <div>
                    <p className="font-medium text-slate-900 text-sm">
                      {contractor?.subscriptionStatus === "active"
                        ? "Manage Subscription"
                        : "Activate Subscription"}
                    </p>
                    <p className="text-slate-400 text-xs">$49/month</p>
                  </div>
                </button>
              </div>
            </div>

            {/* Rating card */}
            <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-orange-100 rounded-2xl p-5">
              <div className="text-3xl mb-2">⭐</div>
              <div className="text-2xl font-black text-slate-900">
                {contractor?.rating?.toFixed(1) || "—"}
              </div>
              <div className="text-slate-600 text-sm">
                {contractor?.reviewCount || 0} reviews
              </div>
              <div className="text-slate-400 text-xs mt-1">
                {contractor?.isVerified ? "✓ Verified Contractor" : "Profile not verified"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ContractorDashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-4xl animate-spin">⚙️</div></div>}>
      <DashboardContent />
    </Suspense>
  );
}
