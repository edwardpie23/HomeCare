"use client";

import { useEffect, useState, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface ConnectedAccount {
  id: string;
  platform: string;
  isActive: boolean;
  inboundEmail: string | null;
  lastSyncAt: string | null;
  createdAt: string;
  _count: { leads: number };
}

const PLATFORMS = [
  {
    id: "thumbtack",
    name: "Thumbtack",
    logo: "📌",
    description: "Get leads from Thumbtack and reply to customers directly from your QuoteFast inbox.",
    partnerRequired: true,
    oauthUrl: "/api/oauth/thumbtack",
    docsUrl: "https://pro.thumbtack.com/",
  },
  {
    id: "angi",
    name: "Angi / HomeAdvisor",
    logo: "🏠",
    description: "Receive Angi leads and respond without leaving your dashboard.",
    partnerRequired: true,
    oauthUrl: "/api/oauth/angi",
    docsUrl: "https://pro.angi.com/",
  },
  {
    id: "yelp",
    name: "Yelp for Business",
    logo: "⭐",
    description: "Connect Yelp quote requests to your unified inbox via email forwarding.",
    partnerRequired: false,
    oauthUrl: null,
    docsUrl: "https://biz.yelp.com/",
  },
  {
    id: "nextdoor",
    name: "Nextdoor",
    logo: "🏘️",
    description: "Route Nextdoor service requests to your inbox via email forwarding.",
    partnerRequired: false,
    oauthUrl: null,
    docsUrl: "https://nextdoor.com/",
  },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="text-xs px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
    >
      {copied ? "✓ Copied" : "Copy"}
    </button>
  );
}

function IntegrationsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [accounts, setAccounts] = useState<ConnectedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/login"); return; }
    if (status === "authenticated" && session.user.role !== "contractor") { router.push("/"); return; }
    if (status === "authenticated") {
      fetch("/api/integrations")
        .then((r) => r.json())
        .then((d) => { setAccounts(d.accounts || []); setLoading(false); });
    }
  }, [status, session, router]);

  // Handle OAuth redirect feedback
  useEffect(() => {
    const success = searchParams.get("success");
    const error = searchParams.get("error");
    if (success) {
      showToast(`${success.charAt(0).toUpperCase() + success.slice(1)} connected successfully!`, "success");
      fetch("/api/integrations").then((r) => r.json()).then((d) => setAccounts(d.accounts || []));
    }
    if (error) {
      const msgs: Record<string, string> = {
        thumbtack_denied: "Thumbtack authorization was cancelled.",
        thumbtack_token_failed: "Failed to exchange Thumbtack token. Check your credentials.",
        angi_denied: "Angi authorization was cancelled.",
        angi_token_failed: "Failed to exchange Angi token.",
      };
      showToast(msgs[error] || "Connection failed.", "error");
    }
  }, [searchParams]);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  async function connectEmailBridge(platformId: string) {
    setConnecting(platformId);
    const res = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform: platformId }),
    });
    const data = await res.json();
    if (res.ok) {
      setAccounts((prev) => {
        const exists = prev.find((a) => a.platform === platformId);
        if (exists) return prev.map((a) => a.platform === platformId ? { ...a, ...data.account } : a);
        return [...prev, data.account];
      });
      showToast("Email bridge created! See your forwarding address below.", "success");
    }
    setConnecting(null);
  }

  async function disconnect(platformId: string) {
    if (!confirm(`Disconnect ${platformId}? Your existing leads will be kept.`)) return;
    await fetch(`/api/integrations?platform=${platformId}`, { method: "DELETE" });
    setAccounts((prev) =>
      prev.map((a) => a.platform === platformId ? { ...a, isActive: false } : a)
    );
    showToast(`${platformId} disconnected.`, "success");
  }

  const getAccount = (platformId: string) =>
    accounts.find((a) => a.platform === platformId && a.isActive);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-spin">⚙️</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Toast */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg ${
            toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"
          }`}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/contractor/dashboard">
            <Button variant="ghost" size="sm">← Dashboard</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900">Platform Integrations</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Connect lead platforms so you can respond from one inbox
            </p>
          </div>
        </div>

        {/* Webhook URLs card (for partner setup) */}
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mb-6">
          <h2 className="font-bold text-orange-900 mb-1">🔌 Webhook endpoints (share with platform partners)</h2>
          <p className="text-orange-700 text-sm mb-3">
            When you get approved by a platform, give them these URLs:
          </p>
          <div className="space-y-2">
            {[
              { label: "Thumbtack webhook", url: `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/thumbtack` },
              { label: "Angi webhook", url: `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/angi` },
              { label: "Inbound email webhook (Postmark/SendGrid)", url: `${typeof window !== "undefined" ? window.location.origin : ""}/api/webhooks/inbound-email` },
            ].map(({ label, url }) => (
              <div key={label} className="bg-white rounded-xl border border-orange-100 px-3 py-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-orange-600 font-medium">{label}</p>
                  <p className="text-xs text-slate-600 font-mono truncate">{url}</p>
                </div>
                <CopyButton text={url} />
              </div>
            ))}
          </div>
        </div>

        {/* Platforms */}
        <div className="space-y-4">
          {PLATFORMS.map((platform) => {
            const account = getAccount(platform.id);
            const isConnected = !!account;

            return (
              <div key={platform.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                <div className="flex items-start gap-4">
                  <span className="text-3xl shrink-0">{platform.logo}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900">{platform.name}</h3>
                      {isConnected && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                          ✓ Connected
                        </span>
                      )}
                      {platform.partnerRequired && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          Partner API
                        </span>
                      )}
                    </div>
                    <p className="text-slate-500 text-sm mt-1">{platform.description}</p>

                    {/* Connected account details */}
                    {account && (
                      <div className="mt-3 space-y-2">
                        <div className="text-xs text-slate-500">
                          {account._count.leads} leads received
                          {account.lastSyncAt && ` · Last synced ${new Date(account.lastSyncAt).toLocaleDateString()}`}
                        </div>

                        {account.inboundEmail && (
                          <div className="bg-slate-50 rounded-xl border border-slate-100 p-3">
                            <p className="text-xs font-semibold text-slate-700 mb-1">
                              📧 Your forwarding address
                            </p>
                            <div className="flex items-center gap-2">
                              <code className="text-xs text-slate-600 flex-1 break-all">
                                {account.inboundEmail}
                              </code>
                              <CopyButton text={account.inboundEmail} />
                            </div>
                            <p className="text-xs text-slate-400 mt-1.5">
                              In {platform.name}, set up email forwarding to send lead notifications to this address.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      {!isConnected ? (
                        <>
                          {platform.oauthUrl ? (
                            <a href={platform.oauthUrl}>
                              <Button size="sm">
                                Connect {platform.name}
                              </Button>
                            </a>
                          ) : null}
                          <Button
                            size="sm"
                            variant="outline"
                            isLoading={connecting === platform.id}
                            onClick={() => connectEmailBridge(platform.id)}
                          >
                            {platform.oauthUrl ? "Or use email bridge" : "Set up email bridge"}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Link href="/contractor/inbox">
                            <Button size="sm" variant="outline">
                              View leads →
                            </Button>
                          </Link>
                          {!account.inboundEmail && (
                            <Button
                              size="sm"
                              variant="ghost"
                              isLoading={connecting === platform.id}
                              onClick={() => connectEmailBridge(platform.id)}
                            >
                              Add email bridge
                            </Button>
                          )}
                          <button
                            onClick={() => disconnect(platform.id)}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                          >
                            Disconnect
                          </button>
                        </>
                      )}
                      <a
                        href={platform.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-400 hover:text-slate-600 underline"
                      >
                        {platform.partnerRequired ? "Apply for partner access ↗" : "Learn more ↗"}
                      </a>
                    </div>
                  </div>
                </div>

                {/* How to get partner access — expandable tip */}
                {platform.partnerRequired && !isConnected && (
                  <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-blue-800 mb-1">How to get API access</p>
                    <p className="text-xs text-blue-700">
                      {platform.id === "thumbtack"
                        ? "Visit thumbtack.com/partners and apply to the Pro Partner Program. Once approved, you'll receive a client_id, client_secret, and webhook secret to enter in your environment variables."
                        : "Contact Angi's partner team at pro.angi.com. Mention you're building a field service management integration. They'll review your application and provide API credentials."}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Environment variables guide */}
        <div className="bg-slate-900 rounded-2xl p-5 mt-6 text-sm">
          <h3 className="text-white font-bold mb-3">🔑 Environment variables to set</h3>
          <pre className="text-green-400 text-xs leading-relaxed overflow-x-auto">{`# Thumbtack (from partner dashboard)
THUMBTACK_CLIENT_ID=
THUMBTACK_CLIENT_SECRET=
THUMBTACK_WEBHOOK_SECRET=

# Angi (from partner dashboard)
ANGI_CLIENT_ID=
ANGI_CLIENT_SECRET=
ANGI_WEBHOOK_SECRET=

# Inbound email domain (your Postmark/SendGrid domain)
INBOUND_EMAIL_DOMAIN=mail.yourapp.com`}</pre>
        </div>
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-4xl animate-spin">⚙️</div></div>}>
      <IntegrationsContent />
    </Suspense>
  );
}
