"use client";

import { useEffect, useState, use, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface ExternalMessage {
  id: string;
  direction: string;
  senderName: string | null;
  body: string;
  sentAt: string;
  deliveredAt: string | null;
  rawData: string | null;
}

interface Lead {
  id: string;
  platform: string;
  externalLeadId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  serviceCategory: string | null;
  description: string | null;
  location: string | null;
  budget: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: ExternalMessage[];
  connectedAccount: { platform: string; inboundEmail: string | null };
}

const PLATFORM_ICONS: Record<string, string> = {
  thumbtack: "📌",
  angi: "🏠",
  yelp: "⭐",
  email: "📧",
  manual: "✏️",
};

const LEAD_STATUSES = ["new", "responded", "booked", "closed"];

export default function InboxLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && session.user.role !== "contractor") { router.push("/"); return; }
    if (status === "authenticated") {
      fetch(`/api/external-leads/${id}`)
        .then((r) => r.json())
        .then((d) => { if (d.lead) setLead(d.lead); setLoading(false); });
    }
  }, [status, session, id, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lead?.messages]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    setSending(true);
    setDeliveryStatus(null);

    const res = await fetch("/api/external-leads/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadId: id, body: newMessage }),
    });
    const data = await res.json();

    if (res.ok) {
      setLead((prev) => prev ? {
        ...prev,
        status: prev.status === "new" ? "responded" : prev.status,
        messages: [...prev.messages, data.message],
      } : prev);
      setNewMessage("");
      setDeliveryStatus(data.deliveryMethod);
      setTimeout(() => setDeliveryStatus(null), 4000);
    }
    setSending(false);
  }

  async function updateStatus(newStatus: string) {
    setUpdatingStatus(true);
    const res = await fetch(`/api/external-leads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setLead((prev) => prev ? { ...prev, status: newStatus } : prev);
    }
    setUpdatingStatus(false);
  }

  const deliveryLabels: Record<string, { label: string; color: string }> = {
    thumbtack_api: { label: "✓ Sent via Thumbtack API", color: "text-green-600" },
    angi_api: { label: "✓ Sent via Angi API", color: "text-green-600" },
    email: { label: "✓ Sent to customer by email", color: "text-blue-600" },
    stored: { label: "⚠️ Saved locally — no external delivery (no API access yet)", color: "text-yellow-600" },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-spin">⚙️</div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Lead not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/contractor/inbox">
              <Button variant="ghost" size="sm">← Inbox</Button>
            </Link>
            <div className="flex items-center gap-2">
              <span className="text-xl">{PLATFORM_ICONS[lead.platform] || "📋"}</span>
              <span className="font-bold text-slate-900">{lead.customerName || "Unknown customer"}</span>
              <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{lead.platform}</span>
            </div>
          </div>

          {/* Status selector */}
          <div className="flex items-center gap-2">
            <select
              value={lead.status}
              onChange={(e) => updateStatus(e.target.value)}
              disabled={updatingStatus}
              className="text-sm px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300"
            >
              {LEAD_STATUSES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sidebar: lead info */}
        <div className="space-y-4 lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Lead Details</h3>
            <div className="space-y-2.5 text-sm">
              {lead.customerName && (
                <div>
                  <p className="text-slate-400 text-xs">Customer</p>
                  <p className="font-medium text-slate-900">{lead.customerName}</p>
                </div>
              )}
              {lead.customerEmail && (
                <div>
                  <p className="text-slate-400 text-xs">Email</p>
                  <a href={`mailto:${lead.customerEmail}`} className="font-medium text-orange-500 hover:underline text-sm break-all">
                    {lead.customerEmail}
                  </a>
                </div>
              )}
              {lead.customerPhone && (
                <div>
                  <p className="text-slate-400 text-xs">Phone</p>
                  <a href={`tel:${lead.customerPhone}`} className="font-medium text-orange-500 hover:underline">
                    {lead.customerPhone}
                  </a>
                </div>
              )}
              {lead.serviceCategory && (
                <div>
                  <p className="text-slate-400 text-xs">Service</p>
                  <p className="font-medium text-slate-900">{lead.serviceCategory}</p>
                </div>
              )}
              {lead.location && (
                <div>
                  <p className="text-slate-400 text-xs">Location</p>
                  <p className="font-medium text-slate-900">📍 {lead.location}</p>
                </div>
              )}
              {lead.budget && (
                <div>
                  <p className="text-slate-400 text-xs">Budget</p>
                  <p className="font-medium text-slate-900">{lead.budget}</p>
                </div>
              )}
              <div>
                <p className="text-slate-400 text-xs">Received</p>
                <p className="font-medium text-slate-900">{formatDate(lead.createdAt)}</p>
              </div>
            </div>

            {lead.description && (
              <div className="mt-3 pt-3 border-t border-slate-50">
                <p className="text-slate-400 text-xs mb-1">Request</p>
                <p className="text-slate-600 text-sm leading-relaxed">{lead.description}</p>
              </div>
            )}
          </div>

          {/* Delivery info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-2">How replies are sent</h3>
            {lead.connectedAccount?.inboundEmail ? (
              <>
                {lead.platform === "thumbtack" || lead.platform === "angi" ? (
                  <p className="text-slate-500 text-xs">
                    Replies go via the <strong>{lead.platform} API</strong> if you have partner access,
                    otherwise by email to {lead.customerEmail || "the customer"}.
                  </p>
                ) : (
                  <p className="text-slate-500 text-xs">
                    Replies are sent to the customer by email using your connected email bridge.
                  </p>
                )}
              </>
            ) : (
              <p className="text-slate-500 text-xs">
                Replies are stored locally. Connect your platform or set up an email bridge
                in <Link href="/contractor/settings/integrations" className="text-orange-500 underline">integrations settings</Link> to deliver them.
              </p>
            )}
          </div>
        </div>

        {/* Message thread */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 flex flex-col" style={{ minHeight: "500px" }}>
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Conversation</h2>
            <p className="text-slate-400 text-xs mt-0.5">{lead.messages.length} message{lead.messages.length !== 1 ? "s" : ""}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "420px" }}>
            {lead.messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">💬</div>
                <p className="text-slate-400 text-sm">No messages yet.</p>
              </div>
            ) : (
              lead.messages.map((msg) => {
                const isOutbound = msg.direction === "outbound";
                return (
                  <div key={msg.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-sm rounded-2xl px-4 py-2.5 ${
                      isOutbound ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-900"
                    }`}>
                      {!isOutbound && msg.senderName && (
                        <p className="text-xs font-semibold text-slate-500 mb-0.5">{msg.senderName}</p>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                      <div className={`text-xs mt-1 flex items-center gap-1.5 ${isOutbound ? "text-orange-200" : "text-slate-400"}`}>
                        <span>{formatDate(msg.sentAt)}</span>
                        {isOutbound && msg.deliveredAt && <span>· ✓ delivered</span>}
                        {isOutbound && !msg.deliveredAt && <span>· stored</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Delivery feedback */}
          {deliveryStatus && (
            <div className={`px-4 py-2 text-xs font-medium ${deliveryLabels[deliveryStatus]?.color || "text-slate-500"}`}>
              {deliveryLabels[deliveryStatus]?.label || deliveryStatus}
            </div>
          )}

          {/* Reply input */}
          <form onSubmit={sendReply} className="p-4 border-t border-slate-100">
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendReply(e as never); } }}
              placeholder="Type your reply… (Enter to send, Shift+Enter for new line)"
              rows={3}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-slate-400">
                Reply via {lead.platform} API or email
              </p>
              <Button type="submit" size="sm" isLoading={sending} disabled={!newMessage.trim()}>
                Send Reply
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
