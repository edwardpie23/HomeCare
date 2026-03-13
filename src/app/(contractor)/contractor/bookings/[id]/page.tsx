"use client";

import { useEffect, useState, use, useRef } from "react";
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
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">💬 Messages with {booking.customer.name}</h2>
            <p className="text-slate-400 text-xs mt-0.5">{booking.customer.email}</p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ maxHeight: "400px" }}>
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-3xl mb-2">💬</div>
                <p className="text-slate-400 text-sm">No messages yet.</p>
                <p className="text-slate-300 text-xs mt-1">Send a message to coordinate with the customer.</p>
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
