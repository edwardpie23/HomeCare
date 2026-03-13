"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

interface Stats {
  totalUsers: number;
  totalContractors: number;
  activeSubscriptions: number;
  totalJobs: number;
  totalBookings: number;
  completedBookings: number;
  totalRevenue: number;
  mrr: number;
}

interface RecentUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
}

interface RecentJob {
  id: string;
  title: string;
  city: string;
  state: string;
  status: string;
  createdAt: string;
  category: { name: string; icon: string };
  user: { name: string | null };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [recentJobs, setRecentJobs] = useState<RecentJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => {
        setStats(d.stats);
        setRecentUsers(d.recentUsers || []);
        setRecentJobs(d.recentJobs || []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-4xl animate-spin mb-3">⚙️</div>
          <p className="text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Customers", value: stats?.totalUsers ?? 0, icon: "🏠", color: "bg-blue-500", link: "/admin/customers" },
    { label: "Total Contractors", value: stats?.totalContractors ?? 0, icon: "🔧", color: "bg-purple-500", link: "/admin/contractors" },
    { label: "Active Subscriptions", value: stats?.activeSubscriptions ?? 0, icon: "⭐", color: "bg-green-500", link: "/admin/contractors" },
    { label: "Total Jobs", value: stats?.totalJobs ?? 0, icon: "📋", color: "bg-orange-500", link: "/admin/jobs" },
    { label: "Total Bookings", value: stats?.totalBookings ?? 0, icon: "📅", color: "bg-yellow-500", link: "/admin/jobs" },
    { label: "Completed Jobs", value: stats?.completedBookings ?? 0, icon: "✅", color: "bg-teal-500", link: "/admin/jobs" },
    { label: "Lead Fee Revenue", value: formatCurrency(stats?.totalRevenue ?? 0), icon: "💵", color: "bg-emerald-500", link: "/admin/payments" },
    { label: "Monthly Recurring", value: formatCurrency(stats?.mrr ?? 0), icon: "📈", color: "bg-rose-500", link: "/admin/payments" },
  ];

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    estimated: "bg-blue-100 text-blue-700",
    booked: "bg-green-100 text-green-700",
    completed: "bg-slate-100 text-slate-600",
    cancelled: "bg-red-100 text-red-600",
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900">Admin Dashboard</h1>
        <p className="text-slate-500 mt-1">Platform overview and key metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {statCards.map((card) => (
          <Link key={card.label} href={card.link}>
            <div className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer">
              <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center text-xl mb-3`}>
                {card.icon}
              </div>
              <div className="text-2xl font-black text-slate-900">{card.value}</div>
              <div className="text-slate-500 text-sm mt-0.5">{card.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-900">Recent Signups</h2>
            <Link href="/admin/customers" className="text-orange-500 text-sm hover:text-orange-600 font-medium">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recentUsers.length === 0 ? (
              <p className="text-slate-400 text-sm">No users yet</p>
            ) : (
              recentUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${user.role === "contractor" ? "bg-orange-500" : "bg-blue-500"}`}>
                    {user.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{user.name || "—"}</p>
                    <p className="text-slate-400 text-xs truncate">{user.email}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.role === "contractor" ? "bg-orange-100 text-orange-700" : user.role === "admin" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                      {user.role}
                    </span>
                    <p className="text-slate-400 text-xs mt-0.5">{formatDate(user.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-slate-900">Recent Job Requests</h2>
            <Link href="/admin/jobs" className="text-orange-500 text-sm hover:text-orange-600 font-medium">
              View all →
            </Link>
          </div>
          <div className="space-y-3">
            {recentJobs.length === 0 ? (
              <p className="text-slate-400 text-sm">No jobs yet</p>
            ) : (
              recentJobs.map((job) => (
                <div key={job.id} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                  <span className="text-xl">{job.category.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 text-sm truncate">{job.title}</p>
                    <p className="text-slate-400 text-xs">{job.user.name} · {job.city}, {job.state}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColors[job.status] || "bg-slate-100 text-slate-600"}`}>
                      {job.status}
                    </span>
                    <p className="text-slate-400 text-xs mt-0.5">{formatDate(job.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Revenue Breakdown */}
      <div className="mt-6 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white">
        <h2 className="text-lg font-bold mb-4">Revenue Breakdown</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <p className="text-slate-400 text-sm">Subscription MRR</p>
            <p className="text-3xl font-black text-green-400">{formatCurrency(stats?.mrr ?? 0)}</p>
            <p className="text-slate-500 text-xs mt-1">{stats?.activeSubscriptions} × $49/mo</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Lead Fee Revenue</p>
            <p className="text-3xl font-black text-orange-400">{formatCurrency(stats?.totalRevenue ?? 0)}</p>
            <p className="text-slate-500 text-xs mt-1">$15 per claimed lead</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm">Conversion Rate</p>
            <p className="text-3xl font-black text-blue-400">
              {stats?.totalJobs
                ? Math.round((stats.totalBookings / stats.totalJobs) * 100)
                : 0}%
            </p>
            <p className="text-slate-500 text-xs mt-1">Jobs → Bookings</p>
          </div>
        </div>
      </div>
    </div>
  );
}
