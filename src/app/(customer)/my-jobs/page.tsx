"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Job {
  id: string;
  title: string;
  status: string;
  city: string;
  state: string;
  urgency: string;
  createdAt: string;
  category: { name: string; icon: string };
  estimates: {
    id: string;
    minPrice: number;
    maxPrice: number;
    avgPrice: number;
    isAiGenerated: boolean;
  }[];
  booking: {
    id: string;
    status: string;
    agreedPrice: number;
    scheduledDate: string | null;
    contractor: { businessName: string; phone: string };
  } | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  estimated: "bg-blue-100 text-blue-700",
  booked: "bg-green-100 text-green-700",
  completed: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-600",
};

export default function MyJobsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/my-jobs");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/jobs")
        .then((r) => r.json())
        .then((d) => {
          setJobs(d.jobs || []);
          setLoading(false);
        });
    }
  }, [status, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl animate-spin mb-4">⚙️</div>
          <p className="text-slate-500">Loading your jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-slate-900">My Jobs</h1>
            <p className="text-slate-500 mt-1">Track your estimates and bookings</p>
          </div>
          <Link href="/get-estimate">
            <Button>+ New Estimate</Button>
          </Link>
        </div>

        {jobs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="text-5xl mb-4">🔧</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">No jobs yet</h2>
            <p className="text-slate-500 mb-6">
              Get your first instant estimate — it&apos;s free and takes under 2 minutes.
            </p>
            <Link href="/get-estimate">
              <Button size="lg">Get Your First Estimate</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => {
              const aiEstimate = job.estimates.find((e) => e.isAiGenerated);
              return (
                <div
                  key={job.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <span className="text-2xl">{job.category.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-slate-900">{job.title}</span>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              statusColors[job.status] || "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-slate-500 text-sm mt-0.5">
                          {job.city}, {job.state} · {formatDate(job.createdAt)}
                        </p>
                      </div>
                    </div>

                    {aiEstimate && (
                      <div className="text-right shrink-0">
                        <div className="text-lg font-black text-slate-900">
                          {formatCurrency(aiEstimate.minPrice)} – {formatCurrency(aiEstimate.maxPrice)}
                        </div>
                        <div className="text-xs text-slate-400">AI estimate</div>
                      </div>
                    )}
                  </div>

                  {job.booking && (
                    <div className="mt-4 bg-green-50 border border-green-100 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-green-800 text-sm">
                            Booked: {job.booking.contractor.businessName}
                          </p>
                          <p className="text-green-600 text-xs mt-0.5">
                            {job.booking.contractor.phone} ·{" "}
                            {job.booking.scheduledDate
                              ? formatDate(job.booking.scheduledDate)
                              : "Date TBD"}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-green-800">
                            {formatCurrency(job.booking.agreedPrice)}
                          </div>
                          <div className="text-xs text-green-600">agreed price</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {!job.booking && job.status === "estimated" && (
                    <div className="mt-4 flex gap-2">
                      <Link href="/get-estimate" className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          Book a Contractor
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
