"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface ExternalLead {
  id: string;
  platform: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  serviceCategory: string | null;
  description: string | null;
  location: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: { body: string; direction: string; sentAt: string }[];
  _count: { messages: number };
}

const PLATFORM_ICONS: Record<string, string> = {
  thumbtack: "📌",
  angi: "🏠",
  yelp: "⭐",
  nextdoor: "🏘️",
  email: "📧",
  manual: "✏️",
};

const PLATFORM_COLORS: Record<string, string> = {
  thumbtack: "bg-green-100 text-green-700",
  angi: "bg-blue-100 text-blue-700",
  yelp: "bg-red-100 text-red-700",
  nextdoor: "bg-teal-100 text-teal-700",
  email: "bg-slate-100 text-slate-700",
  manual: "bg-purple-100 text-purple-700",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-orange-100 text-orange-700",
  responded: "bg-blue-100 text-blue-700",
  booked: "bg-green-100 text-green-700",
  closed: "bg-slate-100 text-slate-500",
};

const STATUS_TABS = ["all", "new", "responded", "booked", "closed"] as const;

export default function ContractorInboxPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [leads, setLeads] = useState<ExternalLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [activePlatform, setActivePlatform] = useState<string>("all");

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && session.user.role !== "contractor") { router.push("/"); return; }
    if (status === "authenticated") {
      fetch("/api/external-leads")
        .then((r) => r.json())
        .then((d) => { setLeads(d.leads || []); setLoading(false); });
    }
  }, [status, session, router]);

  const platforms = ["all", ...Array.from(new Set(leads.map((l) => l.platform)))];

  const filtered = leads.filter((l) => {
    const matchStatus = activeTab === "all" || l.status === activeTab;
    const matchPlatform = activePlatform === "all" || l.platform === activePlatform;
    return matchStatus && matchPlatform;
  });

  const counts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.status] = (acc[l.status] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-spin">⚙️</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-16 z-40">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/contractor/dashboard">
              <Button variant="ghost" size="sm">← Dashboard</Button>
            </Link>
            <div>
              <h1 className="font-black text-slate-900 text-lg">Unified Inbox</h1>
              <p className="text-slate-400 text-xs">{leads.length} lead{leads.length !== 1 ? "s" : ""} from all platforms</p>
            </div>
          </div>
          <Link href="/contractor/settings/integrations">
            <Button variant="outline" size="sm">+ Connect platform</Button>
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {leads.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="text-5xl mb-4">📬</div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Your inbox is empty</h2>
            <p className="text-slate-500 mb-2 max-w-sm mx-auto">
              Connect Thumbtack, Angi, or other platforms to start receiving leads here.
            </p>
            <p className="text-slate-400 text-sm mb-6">
              Or set up the email bridge — forward lead notification emails to your unique address.
            </p>
            <Link href="/contractor/settings/integrations">
              <Button>Connect a platform</Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden mb-4">
              {/* Status tabs */}
              <div className="flex border-b border-slate-100 px-2 overflow-x-auto">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-3 text-sm font-medium border-b-2 -mb-px whitespace-nowrap capitalize transition-colors ${
                      activeTab === tab
                        ? "border-orange-500 text-orange-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab}
                    {tab !== "all" && counts[tab] ? (
                      <span className="ml-1.5 text-xs bg-slate-100 rounded-full px-1.5 py-0.5">{counts[tab]}</span>
                    ) : null}
                  </button>
                ))}
              </div>

              {/* Platform filter */}
              {platforms.length > 2 && (
                <div className="flex gap-2 px-3 py-2 overflow-x-auto">
                  {platforms.map((p) => (
                    <button
                      key={p}
                      onClick={() => setActivePlatform(p)}
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize whitespace-nowrap transition-colors ${
                        activePlatform === p
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {p !== "all" && PLATFORM_ICONS[p]} {p === "all" ? "All platforms" : p}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Lead list */}
            {filtered.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
                <p className="text-slate-400">No {activeTab !== "all" ? activeTab : ""} leads.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((lead) => {
                  const lastMsg = lead.messages[0];
                  const isNew = lead.status === "new";

                  return (
                    <Link key={lead.id} href={`/contractor/inbox/${lead.id}`}>
                      <div className={`bg-white rounded-2xl border p-4 hover:border-orange-300 hover:shadow-sm transition-all cursor-pointer ${isNew ? "border-orange-200" : "border-slate-200"}`}>
                        <div className="flex items-start gap-3">
                          <span className="text-2xl shrink-0">{PLATFORM_ICONS[lead.platform] || "📋"}</span>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-slate-900">
                                {lead.customerName || "Unknown customer"}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PLATFORM_COLORS[lead.platform] || "bg-slate-100 text-slate-600"}`}>
                                {lead.platform}
                              </span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[lead.status] || "bg-slate-100 text-slate-600"}`}>
                                {lead.status}
                              </span>
                              {isNew && (
                                <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-medium">
                                  NEW
                                </span>
                              )}
                            </div>

                            {lead.serviceCategory && (
                              <p className="text-slate-700 text-sm mt-0.5 font-medium">{lead.serviceCategory}</p>
                            )}

                            {lastMsg && (
                              <p className="text-slate-400 text-sm mt-0.5 truncate">
                                {lastMsg.direction === "outbound" ? "You: " : ""}{lastMsg.body}
                              </p>
                            )}

                            <div className="flex items-center gap-3 mt-1">
                              {lead.location && (
                                <span className="text-xs text-slate-400">📍 {lead.location}</span>
                              )}
                              <span className="text-xs text-slate-400">{formatDate(lead.updatedAt)}</span>
                              <span className="text-xs text-slate-400">💬 {lead._count.messages}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
