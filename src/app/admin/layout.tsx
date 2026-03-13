"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { href: "/admin/customers", label: "Customers", icon: "🏠" },
  { href: "/admin/contractors", label: "Contractors", icon: "🔧" },
  { href: "/admin/jobs", label: "Jobs & Estimates", icon: "📋" },
  { href: "/admin/payments", label: "Payments", icon: "💰" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shrink-0">
        <div className="p-5 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl">🔧</span>
            <span className="font-bold text-white">
              Quote<span className="text-orange-500">Fast</span>
            </span>
          </Link>
          <div className="mt-2 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-lg">
            <span className="text-red-400 text-xs font-semibold">ADMIN PANEL</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-orange-500 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                )}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
              {session?.user?.name?.[0]?.toUpperCase() || "A"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {session?.user?.name || "Admin"}
              </p>
              <p className="text-slate-500 text-xs truncate">{session?.user?.email}</p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="w-full text-left text-slate-400 hover:text-white text-sm px-3 py-2 rounded-lg hover:bg-slate-800 transition-all"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 overflow-auto bg-slate-50">
        {children}
      </div>
    </div>
  );
}
