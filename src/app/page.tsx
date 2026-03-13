import Link from "next/link";
import { Button } from "@/components/ui/button";
import { JOB_CATEGORIES } from "@/lib/utils";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-orange-900 text-white overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/30 rounded-full px-4 py-1.5 text-orange-300 text-sm font-medium mb-8">
              <span>⚡</span>
              <span>AI-Powered Estimates in Seconds</span>
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight mb-6">
              Know the price{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
                before you call
              </span>
            </h1>

            <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Upload a photo of your repair job. Our AI analyzes it and gives you
              an instant price estimate — then connects you with a local contractor
              ready to book.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link href="/get-estimate">
                <Button size="xl" className="shadow-2xl shadow-orange-500/30 w-full sm:w-auto">
                  Get Free Estimate Now →
                </Button>
              </Link>
              <Link href="/for-contractors">
                <Button
                  variant="outline"
                  size="xl"
                  className="border-white/30 text-white hover:bg-white/10 w-full sm:w-auto"
                >
                  I&apos;m a Contractor
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto text-center">
              <div>
                <div className="text-3xl font-black text-orange-400">2 min</div>
                <div className="text-slate-400 text-sm mt-1">avg estimate time</div>
              </div>
              <div>
                <div className="text-3xl font-black text-orange-400">12+</div>
                <div className="text-slate-400 text-sm mt-1">job types covered</div>
              </div>
              <div>
                <div className="text-3xl font-black text-orange-400">$0</div>
                <div className="text-slate-400 text-sm mt-1">to get an estimate</div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 60L1440 60L1440 0C1440 0 1080 60 720 60C360 60 0 0 0 0L0 60Z"
              fill="#f8fafc"
            />
          </svg>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-slate-900 mb-4">
              How QuoteFast Works
            </h2>
            <p className="text-lg text-slate-500 max-w-xl mx-auto">
              Three steps from photo to booked contractor
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: "📸",
                title: "Upload Photos",
                desc: "Take a photo of the problem area. Our AI works best with clear, close-up shots.",
                color: "from-blue-500 to-blue-600",
              },
              {
                step: "02",
                icon: "🤖",
                title: "AI Analyzes & Estimates",
                desc: "Claude AI examines your photo, detects the issue, and generates an accurate price range based on local rates.",
                color: "from-orange-500 to-orange-600",
              },
              {
                step: "03",
                icon: "📅",
                title: "Book a Contractor",
                desc: "See available contractors near you, compare prices, and book directly — all in one place.",
                color: "from-green-500 to-green-600",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative bg-white rounded-2xl p-8 shadow-sm border border-slate-100"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center text-2xl mb-6`}
                >
                  {item.icon}
                </div>
                <span className="text-6xl font-black text-slate-100 absolute top-6 right-8">
                  {item.step}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Job Categories */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-slate-900 mb-4">
              What Can We Estimate?
            </h2>
            <p className="text-slate-500 text-lg">
              From small repairs to large projects — we cover it all
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {JOB_CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={`/get-estimate?category=${cat.id}`}
                className="group bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 rounded-xl p-4 transition-all duration-200"
              >
                <div className="text-3xl mb-3">{cat.icon}</div>
                <div className="font-semibold text-slate-900 text-sm group-hover:text-orange-600 transition-colors">
                  {cat.name}
                </div>
                <div className="text-xs text-slate-500 mt-1">{cat.description}</div>
                <div className="text-xs font-medium text-green-600 mt-2">
                  ${cat.baseMinPrice}–${cat.baseMaxPrice}
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href="/get-estimate">
              <Button size="lg">Get Your Instant Estimate</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Sample Estimate Preview */}
      <section className="py-20 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-black mb-6">
                Real estimates.{" "}
                <span className="text-orange-400">Real fast.</span>
              </h2>
              <p className="text-slate-300 text-lg mb-8 leading-relaxed">
                Our AI is trained to understand repair complexity. It considers your
                location, job size, material costs, and local labor rates to give
                you an honest estimate — not a ballpark guess.
              </p>
              <ul className="space-y-4">
                {[
                  "No waiting 24–48 hours for callbacks",
                  "No pressure sales tactics",
                  "Transparent price breakdowns",
                  "Compare multiple contractor quotes",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-slate-300">
                    <span className="text-green-400 text-xl">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Mock estimate card */}
            <div className="bg-white rounded-2xl p-6 text-slate-900 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">🧱</span>
                <div>
                  <div className="font-bold text-lg">Drywall Repair</div>
                  <div className="text-slate-500 text-sm">AI Analysis Complete</div>
                </div>
                <span className="ml-auto bg-green-100 text-green-700 text-xs font-semibold px-2 py-1 rounded-full">
                  High Confidence
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <div className="text-slate-500 text-xs mb-1">AI Detected</div>
                <div className="font-medium text-sm">
                  Drywall hole ~8 inches · Medium difficulty · 1 coat finish
                </div>
              </div>

              <div className="text-center py-4 border-y border-slate-100 mb-4">
                <div className="text-slate-500 text-sm mb-1">Estimated Cost</div>
                <div className="text-4xl font-black text-slate-900">$350 – $550</div>
                <div className="text-slate-500 text-sm mt-1">
                  Average local price:{" "}
                  <strong className="text-slate-700">$450</strong>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-sm font-medium text-slate-700 mb-2">
                  Price Breakdown
                </div>
                {[
                  { label: "Labor (2–3 hours)", amount: "$180–$280" },
                  { label: "Materials (drywall, mud, tape)", amount: "$45–$80" },
                  { label: "Texture matching", amount: "$50–$100" },
                  { label: "Priming & painting", amount: "$75–$90" },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between text-sm">
                    <span className="text-slate-500">{item.label}</span>
                    <span className="font-medium">{item.amount}</span>
                  </div>
                ))}
              </div>

              <Link href="/get-estimate">
                <Button className="w-full" size="lg">
                  Book a Contractor Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* For Contractors CTA */}
      <section className="py-20 bg-orange-500">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-4xl font-black mb-4">Are you a contractor?</h2>
          <p className="text-orange-100 text-lg mb-8 max-w-2xl mx-auto">
            Stop chasing free estimates. Get pre-qualified leads from homeowners
            who already know the price range and are ready to book.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register?role=contractor">
              <Button
                variant="secondary"
                size="xl"
                className="text-orange-600 font-bold shadow-xl"
              >
                Join as a Contractor
              </Button>
            </Link>
            <Link href="/for-contractors">
              <Button variant="ghost" size="xl" className="text-white hover:bg-orange-600">
                Learn More
              </Button>
            </Link>
          </div>
          <p className="text-orange-200 text-sm mt-6">
            $49/month · Cancel anytime · First 30 days free
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🔧</span>
                <span className="font-bold text-white">QuoteFast</span>
              </div>
              <p className="text-sm text-slate-500">
                Instant AI-powered home repair estimates.
              </p>
            </div>
            <div>
              <div className="font-semibold text-white mb-3 text-sm">
                For Homeowners
              </div>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/get-estimate" className="hover:text-white">
                    Get Estimate
                  </Link>
                </li>
                <li>
                  <Link href="/how-it-works" className="hover:text-white">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/my-jobs" className="hover:text-white">
                    My Jobs
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-white mb-3 text-sm">
                For Contractors
              </div>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/for-contractors" className="hover:text-white">
                    Why Join
                  </Link>
                </li>
                <li>
                  <Link href="/register?role=contractor" className="hover:text-white">
                    Sign Up
                  </Link>
                </li>
                <li>
                  <Link href="/contractor/dashboard" className="hover:text-white">
                    Dashboard
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-white mb-3 text-sm">Company</div>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/about" className="hover:text-white">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-white">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 text-center text-sm text-slate-600">
            © 2025 QuoteFast. Built for contractors, by contractors.
          </div>
        </div>
      </footer>
    </div>
  );
}
