"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  quote_received: "📋",
  quote_accepted: "✅",
  message: "💬",
  review: "⭐",
  status_update: "🔄",
};

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session?.user?.id) return;
    const load = () =>
      fetch("/api/notifications")
        .then((r) => r.json())
        .then((d) => {
          setNotifications(d.notifications || []);
          setUnreadCount(d.unreadCount || 0);
        });
    load();
    const interval = setInterval(load, 30_000); // poll every 30s
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function openNotif() {
    setNotifOpen((v) => !v);
    if (unreadCount > 0) {
      await fetch("/api/notifications/read", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    }
  }

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">🔧</span>
            <span className="font-bold text-xl text-slate-900">
              Quote<span className="text-orange-500">Fast</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="/how-it-works" className="text-slate-600 hover:text-slate-900 text-sm font-medium">
              How it Works
            </Link>
            <Link href="/contractors" className="text-slate-600 hover:text-slate-900 text-sm font-medium">
              Find Contractors
            </Link>

            {session ? (
              <>
                <Link href="/dashboard">
                  <Button variant="outline" size="sm">My Dashboard</Button>
                </Link>
                {session.user.role === "customer" && (
                  <Link href="/get-estimate">
                    <Button size="sm">+ New Estimate</Button>
                  </Link>
                )}

                {/* Notification bell */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={openNotif}
                    className="relative p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                    aria-label="Notifications"
                  >
                    <span className="text-xl">🔔</span>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {/* Dropdown */}
                  {notifOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50">
                      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                        <span className="font-semibold text-slate-900 text-sm">Notifications</span>
                        {notifications.length > 0 && (
                          <button
                            onClick={() => setNotifOpen(false)}
                            className="text-xs text-slate-400 hover:text-slate-600"
                          >
                            Close
                          </button>
                        )}
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="text-center py-8">
                            <div className="text-3xl mb-2">🔔</div>
                            <p className="text-slate-400 text-sm">No notifications yet</p>
                          </div>
                        ) : (
                          notifications.map((n) => (
                            <div
                              key={n.id}
                              className={`px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${!n.read ? "bg-orange-50" : ""}`}
                            >
                              {n.link ? (
                                <Link href={n.link} onClick={() => setNotifOpen(false)}>
                                  <div className="flex gap-3">
                                    <span className="text-lg shrink-0">{TYPE_ICONS[n.type] || "📢"}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-semibold text-slate-900 truncate">{n.title}</p>
                                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                                      <p className="text-xs text-slate-300 mt-1">{formatDate(n.createdAt)}</p>
                                    </div>
                                    {!n.read && <div className="w-2 h-2 bg-orange-500 rounded-full shrink-0 mt-1" />}
                                  </div>
                                </Link>
                              ) : (
                                <div className="flex gap-3">
                                  <span className="text-lg shrink-0">{TYPE_ICONS[n.type] || "📢"}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-slate-900 truncate">{n.title}</p>
                                    <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.body}</p>
                                    <p className="text-xs text-slate-300 mt-1">{formatDate(n.createdAt)}</p>
                                  </div>
                                  {!n.read && <div className="w-2 h-2 bg-orange-500 rounded-full shrink-0 mt-1" />}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                  <span className="text-sm text-slate-600 font-medium">{session.user.name?.split(" ")[0]}</span>
                  <button
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-slate-400 hover:text-slate-700 text-sm"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="text-slate-600 hover:text-slate-900 text-sm font-medium">
                  Log in
                </Link>
                <Link href="/register">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden py-4 border-t border-slate-100 space-y-3">
            <Link href="/how-it-works" className="block text-slate-600 text-sm py-1">How it Works</Link>
            <Link href="/contractors" className="block text-slate-600 text-sm py-1">Find Contractors</Link>
            {session ? (
              <>
                <Link href="/dashboard" className="block"><Button size="sm" className="w-full">My Dashboard</Button></Link>
                {session.user.role === "customer" && (
                  <Link href="/get-estimate" className="block"><Button variant="outline" size="sm" className="w-full">+ New Estimate</Button></Link>
                )}
                {unreadCount > 0 && (
                  <Link href="/dashboard" className="block text-orange-500 text-sm py-1 font-medium">
                    🔔 {unreadCount} new notification{unreadCount !== 1 ? "s" : ""}
                  </Link>
                )}
                <button onClick={() => signOut({ callbackUrl: "/" })} className="block text-slate-500 text-sm py-1">Sign Out ({session.user.name?.split(" ")[0]})</button>
              </>
            ) : (
              <>
                <Link href="/login" className="block text-slate-600 text-sm py-1">Log in</Link>
                <Link href="/register" className="block"><Button size="sm" className="w-full">Get Started</Button></Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
