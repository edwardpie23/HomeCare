"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const { data: session } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

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
            <Link href="/for-contractors" className="text-slate-600 hover:text-slate-900 text-sm font-medium">
              For Contractors
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
            <Link href="/for-contractors" className="block text-slate-600 text-sm py-1">For Contractors</Link>
            {session ? (
              <>
                <Link href="/dashboard" className="block"><Button size="sm" className="w-full">My Dashboard</Button></Link>
                {session.user.role === "customer" && (
                  <Link href="/get-estimate" className="block"><Button variant="outline" size="sm" className="w-full">+ New Estimate</Button></Link>
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
