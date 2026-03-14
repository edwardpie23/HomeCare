"use client";

import { useEffect, useState, use, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Message {
  id: string;
  body: string;
  senderRole: string;
  createdAt: string;
  sender: { name: string | null; role: string };
}

interface Booking {
  id: string;
  agreedPrice: number;
  status: string;
  scheduledDate: string | null;
  notes: string | null;
  createdAt: string;
  jobRequest: {
    id: string;
    title: string;
    description: string | null;
    city: string;
    state: string;
    address: string | null;
    size: number | null;
    urgency: string;
    photos: string;
    category: { name: string; icon: string; unit: string };
  };
  customer: { id: string; name: string | null; email: string };
  messages: Message[];
}

interface ChatEstimate {
  minPrice: number;
  maxPrice: number;
  confidence: "low" | "medium" | "high";
  priceNote: string;
  scopeChanges: string[];
}

const STATUS_FLOW = ["pending", "confirmed", "in_progress", "completed"] as const;
const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};
const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  in_progress: "bg-purple-100 text-purple-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-600",
};

const confidenceColors = {
  low: "text-red-500",
  medium: "text-yellow-600",
  high: "text-green-600",
};

export default function ContractorBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // AI features
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [chatEstimate, setChatEstimate] = useState<ChatEstimate | null>(null);
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }
    if (status === "authenticated" && session.user.role !== "contractor") {
      router.push("/");
      return;
    }
    if (status === "authenticated") {
      fetch(`/api/bookings/${id}`)
        .then((r) => r.json())
        .then((d) => {
          if (d.booking) {
            setBooking(d.booking);
            setMessages(d.booking.messages || []);
            setScheduledDate(d.booking.scheduledDate?.slice(0, 10) || "");
          }
          setLoading(false);
        });
    }
  }, [status, session, id, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const refreshChatEstimate = useCallback(async () => {
    if (!booking) return;
    setLoadingEstimate(true);
    try {
      const res = await fetch("/api/messages/chat-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatEstimate(data);
      }
    } finally {
      setLoadingEstimate(false);
    }
  }, [booking, id]);

  // Load chat estimate once booking is ready
  useEffect(() => {
    if (booking) {
      refreshChatEstimate();
    }
  }, [booking, refreshChatEstimate]);

  async function loadSuggestions() {
    setLoadingSuggestions(true);
    setShowSuggestions(true);
    try {
      const res = await fetch("/api/messages/reply-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: id }),
      });
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } finally {
      setLoadingSuggestions(false);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    setSending(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bookingId: id, body: newMessage }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessages((prev) => [...prev, data.message]);
      setNewMessage("");
      setSuggestions([]);
      setShowSuggestions(false);
      // Refresh estimate after new message
      setTimeout(refreshChatEstimate, 500);
    }
    setSending(false);
  }

  async function updateStatus(newStatus: string) {
    setStatusUpdating(true);
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        ...(scheduledDate ? { scheduledDate } : {}),
      }),
    });
    if (res.ok) {
      setBooking((prev) => prev ? { ...prev, status: newStatus } : prev);
    }
    setStatusUpdating(false);
  }

  async function saveScheduledDate() {
    if (!scheduledDate) return;
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scheduledDate }),
    });
    setBooking((prev) => prev ? { ...prev, scheduledDate } : prev);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-spin">⚙️</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Booking not found.</p>
      </div>
    );
  }

  const photos: string[] = JSON.parse(booking.jobRequest.photos || "[]");
  const currentStatusIdx = STATUS_FLOW.indexOf(booking.status as typeof STATUS_FLOW[number]);
  const nextStatus = currentStatusIdx >= 0 && currentStatusIdx < STATUS_FLOW.length - 1
    ? STATUS_FLOW[currentStatusIdx + 1]
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/contractor/dashboard">
              <Button variant="ghost" size="sm">← Dashboard</Button>
            </Link>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[booking.status] || "bg-slate-100 text-slate-600"}`}>
              {STATUS_LABELS[booking.status] || booking.status}
            </span>
          </div>
          <div className="font-bold text-slate-900">{formatCurrency(booking.agreedPrice)}</div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Job details + status controls */}
        <div className="space-y-5 lg:col-span-1">
          {/* Job Info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">{booking.jobRequest.category.icon}</span>
              <div>
                <p className="text-xs text-slate-400 font-medium">{booking.jobRequest.category.name}</p>
                <h1 className="font-bold text-slate-900 text-sm leading-tight">{booking.jobRequest.title}</h1>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Customer</span>
                <span className="font-medium text-slate-900">{booking.customer.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Location</span>
                <span className="font-medium text-slate-900">{booking.jobRequest.city}, {booking.jobRequest.state}</span>
              </div>
              {booking.jobRequest.address && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Address</span>
                  <span className="font-medium text-slate-900 text-right text-xs">{booking.jobRequest.address}</span>
                </div>
              )}
              {booking.jobRequest.size && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Size</span>
                  <span className="font-medium text-slate-900">{booking.jobRequest.size} {booking.jobRequest.category.unit}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">Booked</span>
                <span className="font-medium text-slate-900">{formatDate(booking.createdAt)}</span>
              </div>
            </div>
            {booking.jobRequest.description && (
              <p className="mt-3 text-slate-600 text-xs leading-relaxed border-t border-slate-50 pt-3">
                {booking.jobRequest.description}
              </p>
            )}
          </div>

          {/* Live Price Estimate from Chat */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-slate-900 text-sm">💰 Live Price Estimate</h3>
              <button
                onClick={refreshChatEstimate}
                disabled={loadingEstimate}
                className="text-xs text-orange-500 hover:text-orange-700 disabled:text-slate-300 transition-colors"
              >
                {loadingEstimate ? "Updating…" : "Refresh"}
              </button>
            </div>

            {loadingEstimate && !chatEstimate ? (
              <div className="animate-pulse space-y-2">
                <div className="h-8 bg-slate-100 rounded-lg w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
              </div>
            ) : chatEstimate ? (
              <div>
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-2xl font-black text-slate-900">
                    {formatCurrency(chatEstimate.minPrice)}
                  </span>
                  <span className="text-slate-400 text-sm mb-0.5">–</span>
                  <span className="text-2xl font-black text-slate-900">
                    {formatCurrency(chatEstimate.maxPrice)}
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-medium ${confidenceColors[chatEstimate.confidence]}`}>
                    {chatEstimate.confidence === "high" ? "● High confidence" :
                     chatEstimate.confidence === "medium" ? "● Medium confidence" :
                     "● Low confidence"}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mb-2">{chatEstimate.priceNote}</p>
                {chatEstimate.scopeChanges.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mt-2">
                    <p className="text-xs font-semibold text-yellow-800 mb-1">Scope changes detected:</p>
                    <ul className="space-y-1">
                      {chatEstimate.scopeChanges.map((change, i) => (
                        <li key={i} className="text-xs text-yellow-700">• {change}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs text-slate-300 mt-2">Updates as conversation progresses</p>
              </div>
            ) : (
              <p className="text-xs text-slate-400">Send a message to get a live estimate.</p>
            )}
          </div>

          {/* Photos */}
          {photos.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 text-sm mb-3">📷 Photos</h3>
              <div className="grid grid-cols-2 gap-2">
                {photos.map((p, i) => (
                  <img key={i} src={p} alt="" className="w-full h-24 object-cover rounded-xl border border-slate-100" />
                ))}
              </div>
            </div>
          )}

          {/* Status Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h3 className="font-semibold text-slate-900 text-sm mb-4">📋 Job Status</h3>

            {/* Progress stepper */}
            <div className="space-y-2 mb-4">
              {STATUS_FLOW.map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    i < currentStatusIdx ? "bg-green-500 text-white" :
                    i === currentStatusIdx ? "bg-orange-500 text-white" :
                    "bg-slate-100 text-slate-400"
                  }`}>
                    {i < currentStatusIdx ? "✓" : i + 1}
                  </div>
                  <span className={`text-sm ${i === currentStatusIdx ? "font-semibold text-slate-900" : "text-slate-400"}`}>
                    {STATUS_LABELS[s]}
                  </span>
                </div>
              ))}
            </div>

            {nextStatus && booking.status !== "cancelled" && (
              <Button
                className="w-full"
                size="sm"
                isLoading={statusUpdating}
                onClick={() => updateStatus(nextStatus)}
              >
                Mark as {STATUS_LABELS[nextStatus]} →
              </Button>
            )}

            {booking.status === "completed" && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <p className="text-green-700 font-semibold text-sm">✅ Job completed!</p>
              </div>
            )}

            {booking.status !== "completed" && booking.status !== "cancelled" && (
              <button
                onClick={() => updateStatus("cancelled")}
                className="w-full mt-2 text-xs text-red-400 hover:text-red-600 py-1 transition-colors"
              >
                Cancel booking
              </button>
            )}
          </div>

          {/* Schedule date */}
          {booking.status !== "completed" && booking.status !== "cancelled" && (
            <div className="bg-white rounded-2xl border border-slate-200 p-5">
              <h3 className="font-semibold text-slate-900 text-sm mb-3">📅 Schedule Date</h3>
              <input
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
              />
              <Button size="sm" className="w-full mt-2" variant="outline" onClick={saveScheduledDate}>
                Save Date
              </Button>
            </div>
          )}
        </div>

        {/* Right: Message thread */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 flex flex-col" style={{ minHeight: "500px" }}>
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-slate-900">💬 Messages with {booking.customer.name}</h2>
              <p className="text-slate-400 text-xs mt-0.5">{booking.customer.email}</p>
            </div>
            <button
              onClick={loadSuggestions}
              className="flex items-center gap-1.5 text-xs bg-orange-50 border border-orange-200 text-orange-600 hover:bg-orange-100 px-3 py-1.5 rounded-full font-medium transition-colors"
            >
              ✨ AI Replies
            </button>
          </div>

          {/* AI Reply Suggestions */}
          {showSuggestions && (
            <div className="px-4 pt-3 pb-0 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-slate-500">Suggested replies</p>
                <button onClick={() => setShowSuggestions(false)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
              </div>
              {loadingSuggestions ? (
                <div className="flex gap-2 mb-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-8 bg-slate-100 rounded-xl flex-1 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2 mb-3">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => { setNewMessage(s); setShowSuggestions(false); }}
                      className="text-left text-xs bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 text-slate-700 px-3 py-2 rounded-xl transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "400px" }}>
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">💬</div>
                <p className="text-slate-400 text-sm">No messages yet.</p>
                <p className="text-slate-300 text-xs mt-1">Use ✨ AI Replies to get suggested openers.</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMine = msg.senderRole === "contractor";
                return (
                  <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-xs lg:max-w-sm rounded-2xl px-4 py-2.5 ${
                      isMine ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-900"
                    }`}>
                      <p className="text-sm leading-relaxed">{msg.body}</p>
                      <p className={`text-xs mt-1 ${isMine ? "text-orange-200" : "text-slate-400"}`}>
                        {formatDate(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <form onSubmit={sendMessage} className="p-4 border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300"
            />
            <Button type="submit" size="sm" isLoading={sending} disabled={!newMessage.trim()}>
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
