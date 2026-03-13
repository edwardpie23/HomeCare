import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ForContractorsPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-full px-4 py-1.5 text-green-300 text-sm font-medium mb-8">
            <span>🔧</span>
            <span>For Contractors & Tradespeople</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-black mb-6">
            Stop doing{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
              free estimates
            </span>
          </h1>
          <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
            QuoteFast sends you leads from homeowners who already know the price range
            and are ready to book. No more wasted afternoons driving to quote jobs
            that go nowhere.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register?role=contractor">
              <Button size="xl" className="shadow-2xl w-full sm:w-auto">
                Start Free Trial — 30 Days Free
              </Button>
            </Link>
          </div>
          <p className="text-slate-400 text-sm mt-4">$49/month after trial · Cancel anytime</p>
        </div>
      </section>

      {/* The Problem */}
      <section className="py-20 bg-white px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-black text-slate-900 text-center mb-12">
            Sound familiar?
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              {
                problem: "You drive 30 minutes to quote a job and they ghost you",
                icon: "🚗",
              },
              {
                problem: "Homeowners waste your time asking for free estimates",
                icon: "⏰",
              },
              {
                problem: "Lead platforms charge $50+ just to bid on a job",
                icon: "💸",
              },
              {
                problem: "Customers don't know what things cost so they lowball you",
                icon: "😤",
              },
            ].map((item) => (
              <div
                key={item.problem}
                className="flex gap-4 p-5 bg-red-50 border border-red-100 rounded-2xl"
              >
                <span className="text-3xl">{item.icon}</span>
                <p className="text-slate-700 font-medium">{item.problem}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Solution */}
      <section className="py-20 bg-slate-50 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-black text-slate-900 text-center mb-4">
            Here&apos;s what changes with QuoteFast
          </h2>
          <p className="text-slate-500 text-center text-lg mb-12 max-w-xl mx-auto">
            Homeowners get AI estimates before they even contact you. They know the price.
            They&apos;re ready to book.
          </p>
          <div className="space-y-6">
            {[
              {
                icon: "🤖",
                title: "AI does the estimating for you",
                desc: "Homeowners get instant estimates from our AI. When they book, they already understand the price range — no more sticker shock.",
              },
              {
                icon: "💲",
                title: "Upload your own price tables",
                desc: "Set your exact rates for each job type. Our AI generates estimates using your actual pricing, so leads come pre-matched to your rates.",
              },
              {
                icon: "🎯",
                title: "Pay only for real leads",
                desc: "Browse leads for free. Pay just $15 when you claim a lead — not $50 to send a blind quote. You only pay when someone is serious.",
              },
              {
                icon: "📍",
                title: "Leads in your area only",
                desc: "We show you jobs near your service area. No more driving across town for small repairs.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex gap-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm"
              >
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-2xl shrink-0">
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-1">{item.title}</h3>
                  <p className="text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-white px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-black text-slate-900 mb-4">Simple Pricing</h2>
          <p className="text-slate-500 text-lg mb-12">No tricks. No hidden fees.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                name: "Free",
                price: "$0",
                period: "forever",
                features: [
                  "Create your contractor profile",
                  "Browse available leads",
                  "Set your pricing tables",
                  "AI estimates use your rates",
                ],
                cta: "Get Started",
                href: "/register?role=contractor",
                highlight: false,
              },
              {
                name: "Pro",
                price: "$49",
                period: "/month",
                features: [
                  "Everything in Free",
                  "Claim unlimited leads",
                  "Priority placement in results",
                  "Verified contractor badge",
                  "Lead fee: only $15/job",
                ],
                cta: "Start Free Trial",
                href: "/register?role=contractor",
                highlight: true,
              },
              {
                name: "Pay Per Lead",
                price: "$15",
                period: "/lead",
                features: [
                  "No monthly subscription",
                  "Claim individual leads",
                  "Standard placement",
                  "Pay as you go",
                ],
                cta: "Get Started",
                href: "/register?role=contractor",
                highlight: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-6 border-2 ${
                  plan.highlight
                    ? "border-orange-500 bg-orange-50 shadow-xl scale-105"
                    : "border-slate-200 bg-white"
                }`}
              >
                {plan.highlight && (
                  <div className="text-center mb-3">
                    <span className="bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                      MOST POPULAR
                    </span>
                  </div>
                )}
                <h3 className="text-xl font-black text-slate-900 mb-1">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                  <span className="text-slate-500">{plan.period}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="text-green-500 mt-0.5">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={plan.href}>
                  <Button
                    variant={plan.highlight ? "default" : "outline"}
                    className="w-full"
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-slate-50 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-black text-slate-900 text-center mb-12">
            What contractors say
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                quote:
                  "I used to spend 10 hours a week on free estimates. Now I get 3-4 real leads a week from QuoteFast and they actually convert.",
                name: "Mike R.",
                trade: "Drywall & Painting",
                stars: 5,
              },
              {
                quote:
                  "The AI estimates match my pricing almost exactly. Customers come in knowing what to expect. Closing rate went from 20% to 60%.",
                name: "Sarah L.",
                trade: "Tile & Flooring",
                stars: 5,
              },
              {
                quote:
                  "Best $49 I spend each month. One job pays for 3 months of the subscription.",
                name: "Tom K.",
                trade: "General Handyman",
                stars: 5,
              },
            ].map((t) => (
              <div key={t.name} className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="text-yellow-400 text-lg mb-3">{"★".repeat(t.stars)}</div>
                <p className="text-slate-600 text-sm italic mb-4">&ldquo;{t.quote}&rdquo;</p>
                <div>
                  <p className="font-semibold text-slate-900 text-sm">{t.name}</p>
                  <p className="text-slate-400 text-xs">{t.trade}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-orange-500 px-4">
        <div className="max-w-2xl mx-auto text-center text-white">
          <h2 className="text-4xl font-black mb-4">
            Ready to stop doing free estimates?
          </h2>
          <p className="text-orange-100 text-lg mb-8">
            Join QuoteFast and start receiving pre-qualified leads from homeowners
            who are ready to book.
          </p>
          <Link href="/register?role=contractor">
            <Button variant="secondary" size="xl" className="text-orange-600 font-bold shadow-xl">
              Start Your Free 30-Day Trial
            </Button>
          </Link>
          <p className="text-orange-200 text-sm mt-4">
            No credit card required · $49/month after trial
          </p>
        </div>
      </section>
    </div>
  );
}
