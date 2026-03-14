"use client";

import { useEffect, useState, use } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDate, JOB_CATEGORIES } from "@/lib/utils";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customer: { name: string | null };
  booking: {
    jobRequest: {
      title: string;
      category: { name: string; icon: string };
    };
  };
}

interface Contractor {
  id: string;
  businessName: string;
  bio: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  yearsExperience: number;
  specialties: string;
  subscriptionStatus: string;
  pricingRules: {
    id: string;
    basePrice: number;
    pricePerUnit: number | null;
    unit: string | null;
    category: { name: string; icon: string };
  }[];
  reviews: Review[];
  user: { name: string | null; createdAt: string };
}

function StarBar({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((s) => (
          <span key={s} className={`text-lg ${s <= Math.round(rating) ? "text-yellow-400" : "text-slate-200"}`}>★</span>
        ))}
      </div>
      <span className="font-bold text-slate-900">{rating > 0 ? rating.toFixed(1) : "—"}</span>
      <span className="text-slate-400 text-sm">({count} review{count !== 1 ? "s" : ""})</span>
    </div>
  );
}

export default function ContractorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Instant booking modal
  const [showBooking, setShowBooking] = useState(false);
  const [bookCategory, setBookCategory] = useState("");
  const [bookTitle, setBookTitle] = useState("");
  const [bookDescription, setBookDescription] = useState("");
  const [bookCity, setBookCity] = useState("");
  const [bookZip, setBookZip] = useState("");
  const [bookPrice, setBookPrice] = useState("");
  const [bookDate, setBookDate] = useState("");
  const [bookingInProgress, setBookingInProgress] = useState(false);
  const [bookSuccess, setBookSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/contractors/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.contractor) {
          setContractor(d.contractor);
          if (d.contractor.city) setBookCity(d.contractor.city);
        } else setNotFound(true);
        setLoading(false);
      });
  }, [id]);

  function handleCategoryChange(catName: string) {
    setBookCategory(catName);
    const cat = JOB_CATEGORIES.find((c) => c.name === catName);
    if (cat) {
      setBookTitle(`${catName} Service`);
      const rule = contractor?.pricingRules.find((r) => r.category.name === catName);
      if (rule) setBookPrice(String(rule.basePrice));
      else setBookPrice(String(Math.round((cat.baseMinPrice + cat.baseMaxPrice) / 2)));
    }
  }

  async function handleInstantBook(e: React.FormEvent) {
    e.preventDefault();
    if (!session) {
      router.push(`/login?callbackUrl=/contractors/${id}`);
      return;
    }
    setBookingInProgress(true);
    const res = await fetch("/api/bookings/instant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractorId: contractor!.id,
        categoryName: bookCategory,
        title: bookTitle,
        description: bookDescription,
        city: bookCity,
        state: contractor?.state || "CA",
        zipCode: bookZip,
        agreedPrice: parseFloat(bookPrice),
        scheduledDate: bookDate || null,
      }),
    });
    setBookingInProgress(false);
    if (res.ok) {
      const data = await res.json();
      setBookSuccess(true);
      setTimeout(() => router.push(`/my-jobs/${data.bookingId}`), 1500);
    } else {
      alert("Booking failed. Please try again.");
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="text-4xl animate-spin">⚙️</div></div>;

  if (notFound || !contractor) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-slate-600 font-medium">Contractor not found</p>
          <Link href="/" className="mt-4 inline-block text-orange-500 hover:underline text-sm">← Back to Home</Link>
        </div>
      </div>
    );
  }

  const specialties: string[] = JSON.parse(contractor.specialties || "[]");
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: contractor.reviews.filter((r) => r.rating === star).length,
  }));
  const availableCategories = specialties.length > 0
    ? JOB_CATEGORIES.filter((c) => specialties.includes(c.name))
    : JOB_CATEGORIES;

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-orange-500 hover:text-orange-600 text-sm font-medium">← Back to Home</Link>
        </div>

        {/* Hero card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-2xl font-black text-white shrink-0">
              {contractor.businessName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-black text-slate-900">{contractor.businessName}</h1>
                {contractor.isVerified && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">✓ Verified</span>
                )}
                {contractor.subscriptionStatus === "active" && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">Active</span>
                )}
              </div>
              {contractor.city && contractor.state && (
                <p className="text-slate-500 text-sm mt-0.5">📍 {contractor.city}, {contractor.state}</p>
              )}
              <div className="mt-2">
                <StarBar rating={contractor.rating} count={contractor.reviewCount} />
              </div>
            </div>
          </div>

          {contractor.bio && (
            <p className="mt-4 text-slate-600 text-sm leading-relaxed border-t border-slate-50 pt-4">{contractor.bio}</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-50">
            {contractor.yearsExperience > 0 && (
              <div>
                <p className="text-slate-400 text-xs uppercase font-medium">Experience</p>
                <p className="font-semibold text-slate-900 mt-0.5">{contractor.yearsExperience} yr{contractor.yearsExperience !== 1 ? "s" : ""}</p>
              </div>
            )}
            {contractor.phone && (
              <div>
                <p className="text-slate-400 text-xs uppercase font-medium">Phone</p>
                <a href={`tel:${contractor.phone}`} className="font-semibold text-orange-500 hover:underline mt-0.5 block">{contractor.phone}</a>
              </div>
            )}
            <div>
              <p className="text-slate-400 text-xs uppercase font-medium">Member since</p>
              <p className="font-semibold text-slate-900 mt-0.5">{new Date(contractor.user.createdAt).getFullYear()}</p>
            </div>
          </div>

          {specialties.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {specialties.map((s) => (
                <span key={s} className="text-xs bg-orange-50 text-orange-700 border border-orange-100 px-2.5 py-1 rounded-full">{s}</span>
              ))}
            </div>
          )}

          {/* CTAs */}
          <div className="mt-5 pt-5 border-t border-slate-100 flex gap-3">
            <button
              onClick={() => setShowBooking(true)}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl text-sm transition-colors"
            >
              ⚡ Book Instantly
            </button>
            <Link
              href="/get-estimate"
              className="flex-1 text-center border border-slate-200 hover:border-orange-300 text-slate-700 font-medium py-3 rounded-xl text-sm transition-colors"
            >
              Get AI Estimate First
            </Link>
          </div>
        </div>

        {/* Pricing */}
        {contractor.pricingRules.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
            <h2 className="font-bold text-slate-900 mb-4">💲 Services &amp; Pricing</h2>
            <div className="space-y-3">
              {contractor.pricingRules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <span>{rule.category.icon}</span>
                    <span className="text-sm font-medium text-slate-900">{rule.category.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-bold text-slate-900">from ${rule.basePrice.toLocaleString()}</span>
                    {rule.pricePerUnit && rule.unit && (
                      <span className="text-xs text-slate-400 ml-1">+ ${rule.pricePerUnit}/{rule.unit}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-5">
          <h2 className="font-bold text-slate-900 mb-4">⭐ Reviews ({contractor.reviewCount})</h2>
          {contractor.reviewCount > 0 && (
            <div className="flex flex-col sm:flex-row gap-6 mb-6 pb-6 border-b border-slate-100">
              <div className="text-center sm:text-left shrink-0">
                <div className="text-5xl font-black text-slate-900">{contractor.rating.toFixed(1)}</div>
                <StarBar rating={contractor.rating} count={contractor.reviewCount} />
              </div>
              <div className="flex-1 space-y-1.5">
                {dist.map(({ star, count }) => (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 w-4 text-right">{star}</span>
                    <span className="text-yellow-400">★</span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full" style={{ width: contractor.reviewCount > 0 ? `${(count / contractor.reviewCount) * 100}%` : "0%" }} />
                    </div>
                    <span className="text-slate-400 w-4">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {contractor.reviews.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-3xl mb-2">💬</div>
              <p className="text-slate-400 text-sm">No reviews yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {contractor.reviews.map((review) => (
                <div key={review.id} className="border border-slate-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1,2,3,4,5].map((s) => (
                          <span key={s} className={`text-sm ${s <= review.rating ? "text-yellow-400" : "text-slate-200"}`}>★</span>
                        ))}
                      </div>
                      <span className="font-semibold text-slate-900 text-sm">{review.customer.name || "Customer"}</span>
                    </div>
                    <span className="text-xs text-slate-400">{formatDate(review.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                    <span>{review.booking.jobRequest.category.icon}</span>
                    <span>{review.booking.jobRequest.title}</span>
                  </div>
                  {review.comment && <p className="text-slate-600 text-sm leading-relaxed italic">&ldquo;{review.comment}&rdquo;</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom CTA */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-6 text-center text-white">
          <h3 className="text-xl font-black mb-2">Ready to get started?</h3>
          <p className="text-orange-100 text-sm mb-4">Book {contractor.businessName} instantly or get an AI estimate first.</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={() => setShowBooking(true)} className="bg-white text-orange-600 font-bold px-6 py-3 rounded-xl hover:bg-orange-50 transition-colors">⚡ Book Instantly</button>
            <Link href="/get-estimate" className="border border-white/50 text-white font-bold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors">Get AI Estimate →</Link>
          </div>
        </div>
      </div>

      {/* Instant Booking Modal */}
      {showBooking && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {bookSuccess ? (
              <div className="p-8 text-center">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="text-xl font-black text-slate-900 mb-2">Booking confirmed!</h3>
                <p className="text-slate-500 text-sm">Redirecting to your job…</p>
              </div>
            ) : (
              <form onSubmit={handleInstantBook} className="p-6">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-xl font-black text-slate-900">Book {contractor.businessName}</h3>
                  <button type="button" onClick={() => setShowBooking(false)} className="text-slate-400 hover:text-slate-600 text-xl">✕</button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Service type *</label>
                    <select value={bookCategory} onChange={(e) => handleCategoryChange(e.target.value)} required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm bg-white">
                      <option value="">Select a service…</option>
                      {availableCategories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.icon} {cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Job title *</label>
                    <input value={bookTitle} onChange={(e) => setBookTitle(e.target.value)} placeholder="e.g. Paint living room" required className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Description</label>
                    <textarea value={bookDescription} onChange={(e) => setBookDescription(e.target.value)} placeholder="Describe the work needed…" rows={2} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm resize-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">City</label>
                      <input value={bookCity} onChange={(e) => setBookCity(e.target.value)} placeholder="Your city" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">ZIP</label>
                      <input value={bookZip} onChange={(e) => setBookZip(e.target.value)} placeholder="90001" maxLength={10} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Price ($) *</label>
                      <input type="number" value={bookPrice} onChange={(e) => setBookPrice(e.target.value)} placeholder="500" required min={1} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1.5">Preferred date</label>
                      <input type="date" value={bookDate} onChange={(e) => setBookDate(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm" />
                    </div>
                  </div>
                </div>
                {!session && (
                  <p className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 mt-4">You&apos;ll be redirected to log in first.</p>
                )}
                <button type="submit" disabled={bookingInProgress || !bookCategory || !bookTitle || !bookPrice} className="w-full mt-5 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold py-3 rounded-xl text-sm transition-colors">
                  {bookingInProgress ? "Booking…" : "⚡ Confirm Booking"}
                </button>
                <p className="text-xs text-slate-400 text-center mt-2">No payment required now — settle payment with the contractor directly.</p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
