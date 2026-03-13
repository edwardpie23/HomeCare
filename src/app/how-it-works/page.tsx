import Link from "next/link";
import { Button } from "@/components/ui/button";
import { JOB_CATEGORIES } from "@/lib/utils";

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero */}
      <section className="bg-white border-b border-slate-200 py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-black text-slate-900 mb-4">
            How QuoteFast Works
          </h1>
          <p className="text-xl text-slate-500">
            From photo to booked contractor in under 5 minutes — no phone calls,
            no waiting, no pressure.
          </p>
        </div>
      </section>

      {/* Steps for homeowners */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-12">
            <span className="text-3xl">🏠</span>
            <h2 className="text-3xl font-black text-slate-900">For Homeowners</h2>
          </div>

          <div className="space-y-8">
            {[
              {
                step: 1,
                icon: "🔍",
                title: "Choose your job type",
                desc: "Pick from 12 categories — drywall repair, painting, plumbing, electrical, flooring, roofing, and more. Each category is pre-loaded with realistic base pricing from real contractor data.",
                detail: "Don't see your exact job? Pick the closest category and describe it in the notes.",
              },
              {
                step: 2,
                icon: "📸",
                title: "Upload photos of the problem",
                desc: "Take a photo of the repair area with your phone or camera and upload it. The more detail the better — close-ups, full-room shots, all angles.",
                detail: "You can upload up to 5 photos. No photo? You can still get an estimate by describing the job.",
              },
              {
                step: 3,
                icon: "📍",
                title: "Enter your location",
                desc: "We use your city and state to adjust pricing to your local market. Labor rates in Dallas are different than NYC — your estimate reflects that.",
                detail: "We never share your exact address publicly.",
              },
              {
                step: 4,
                icon: "⚡",
                title: "Get your instant AI estimate",
                desc: "Our AI (Claude by Anthropic) analyzes your photos, identifies the problem, estimates the scope of work, and gives you a price range based on real local rates.",
                detail: 'Example: "Detected: 8-inch drywall hole · Medium difficulty · Estimate: $350–$550 · Average: $450"',
              },
              {
                step: 5,
                icon: "📅",
                title: "Book a local contractor",
                desc: "See available contractors near you. Since they already know the price range, there's no awkward negotiation. Pick one and book directly.",
                detail: "Contractors pay a small lead fee — you pay nothing to book.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 bg-white rounded-2xl border border-slate-200 p-6">
                <div className="shrink-0">
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center text-white font-black text-lg">
                    {item.step}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{item.icon}</span>
                    <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                  </div>
                  <p className="text-slate-600 mb-2">{item.desc}</p>
                  <p className="text-slate-400 text-sm italic">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/get-estimate">
              <Button size="xl">Try It Now — Free</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Steps for contractors */}
      <section className="py-20 px-4 bg-white border-t border-slate-200">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-12">
            <span className="text-3xl">🔧</span>
            <h2 className="text-3xl font-black text-slate-900">For Contractors</h2>
          </div>

          <div className="space-y-8">
            {[
              {
                step: 1,
                icon: "📝",
                title: "Create your contractor account",
                desc: "Sign up with your business name, service area, and specialties. Takes about 2 minutes.",
                detail: "Free to create — no credit card required.",
              },
              {
                step: 2,
                icon: "💲",
                title: "Upload your price tables",
                desc: "Set your exact rates for each job type you do. The AI will use your actual pricing when homeowners in your area request estimates.",
                detail: "Example: Drywall repair — $200 base + $50 per additional hole.",
              },
              {
                step: 3,
                icon: "🎯",
                title: "Browse available leads",
                desc: "See all open job requests in your area. Each lead shows the job type, location, size, urgency, and the AI-estimated price range.",
                detail: "Homeowners are pre-qualified — they already accept the price range.",
              },
              {
                step: 4,
                icon: "✅",
                title: "Claim a lead",
                desc: "When you find a job you want, claim it. You pay a $15 lead fee only at this point — not to browse, not to bid.",
                detail: "With a $49/month subscription, lead fees are included.",
              },
              {
                step: 5,
                icon: "🤝",
                title: "Connect and complete the job",
                desc: "Once you claim a lead, you get the homeowner's contact info. Schedule, show up, do great work. Get paid.",
                detail: "Build reviews on your profile to rank higher in future results.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <div className="shrink-0">
                  <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center text-white font-black text-lg">
                    {item.step}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">{item.icon}</span>
                    <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                  </div>
                  <p className="text-slate-600 mb-2">{item.desc}</p>
                  <p className="text-slate-400 text-sm italic">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/register?role=contractor">
              <Button size="xl">Join as a Contractor</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black text-slate-900 text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {[
              {
                q: "How accurate are the AI estimates?",
                a: "Very accurate for standard jobs. The AI is trained to recognize common repair scenarios and prices them against real local market data. Unusual or complex jobs may have wider ranges. We always show a confidence level (High / Medium / Low) with each estimate.",
              },
              {
                q: "Is it free to get an estimate?",
                a: "Yes, completely free for homeowners. There are no hidden fees. Contractors pay when they claim leads.",
              },
              {
                q: "Do I need to create an account to get an estimate?",
                a: "No — you can get an instant estimate without signing up. You only need an account to save your estimate and book a contractor.",
              },
              {
                q: "What job types are covered?",
                a: `Currently: ${JOB_CATEGORIES.map((c) => c.name).join(", ")}.`,
              },
              {
                q: "How is QuoteFast different from Angi or Thumbtack?",
                a: "Those platforms require contractors to manually quote each job, which means waiting 24–48 hours for responses. QuoteFast gives you an AI estimate instantly so you know what to expect before any contractor is involved.",
              },
              {
                q: "What if the contractor charges more than the estimate?",
                a: "The estimate is a starting range based on typical market prices. Contractors may charge more or less based on specific job conditions. Think of it like a car repair estimate — it's a good baseline, not a locked price.",
              },
            ].map((item) => (
              <div key={item.q} className="bg-white rounded-2xl border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-2">{item.q}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-orange-500 text-white text-center">
        <h2 className="text-3xl font-black mb-4">Ready to get your estimate?</h2>
        <p className="text-orange-100 mb-8">Takes less than 2 minutes. No account required.</p>
        <Link href="/get-estimate">
          <Button variant="secondary" size="xl" className="text-orange-600 font-bold">
            Get Free Estimate Now
          </Button>
        </Link>
      </section>
    </div>
  );
}
