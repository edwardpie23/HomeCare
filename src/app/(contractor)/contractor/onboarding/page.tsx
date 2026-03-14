"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { JOB_CATEGORIES } from "@/lib/utils";

const STEPS = [
  { id: 1, title: "Business Info", icon: "🏢" },
  { id: 2, title: "Service Area", icon: "📍" },
  { id: 3, title: "Specialties", icon: "🔧" },
  { id: 4, title: "All Set!", icon: "🎉" },
];

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
  "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
  "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
  "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
];

export default function ContractorOnboardingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  // Step 1 — Business Info
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [yearsExperience, setYearsExperience] = useState("0");

  // Step 2 — Service Area
  const [city, setCity] = useState("");
  const [state, setState] = useState("CA");
  const [zipCode, setZipCode] = useState("");
  const [address, setAddress] = useState("");

  // Step 3 — Specialties
  const [specialties, setSpecialties] = useState<string[]>([]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated" && session.user.role !== "contractor") router.push("/get-estimate");
    // Pre-fill if they have existing data
    if (status === "authenticated") {
      fetch("/api/contractors/profile")
        .then((r) => r.json())
        .then((d) => {
          if (d.contractor?.onboardingDone) {
            router.push("/contractor/dashboard");
            return;
          }
          if (d.contractor) {
            const c = d.contractor;
            if (c.businessName) setBusinessName(c.businessName);
            if (c.phone) setPhone(c.phone);
            if (c.bio) setBio(c.bio);
            if (c.licenseNumber) setLicenseNumber(c.licenseNumber);
            if (c.yearsExperience) setYearsExperience(String(c.yearsExperience));
            if (c.city) setCity(c.city);
            if (c.state) setState(c.state);
            if (c.zipCode) setZipCode(c.zipCode);
            if (c.address) setAddress(c.address);
            if (c.specialties) {
              try { setSpecialties(JSON.parse(c.specialties)); } catch { /* ignore */ }
            }
          }
        });
    }
  }, [status, session, router]);

  function toggleSpecialty(name: string) {
    setSpecialties((prev) =>
      prev.includes(name) ? prev.filter((s) => s !== name) : [...prev, name]
    );
  }

  async function saveStep(nextStep: number, finalSave = false) {
    setSaving(true);
    const body: Record<string, unknown> = {};

    if (step === 1) {
      body.businessName = businessName;
      body.phone = phone;
      body.bio = bio;
      body.licenseNumber = licenseNumber;
      body.yearsExperience = parseInt(yearsExperience) || 0;
    } else if (step === 2) {
      body.city = city;
      body.state = state;
      body.zipCode = zipCode;
      body.address = address;
    } else if (step === 3) {
      body.specialties = JSON.stringify(specialties);
    }

    if (finalSave) {
      body.onboardingDone = true;
    }

    await fetch("/api/contractors/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    setStep(nextStep);
  }

  async function finish() {
    setSaving(true);
    await fetch("/api/contractors/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        specialties: JSON.stringify(specialties),
        onboardingDone: true,
      }),
    });
    setSaving(false);
    router.push("/contractor/dashboard?welcome=1");
  }

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-4xl animate-spin">⚙️</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                step > s.id
                  ? "bg-green-500 text-white"
                  : step === s.id
                  ? "bg-orange-500 text-white shadow-lg scale-110"
                  : "bg-white border-2 border-slate-200 text-slate-400"
              }`}>
                {step > s.id ? "✓" : s.icon}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${step > s.id ? "bg-green-400" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8">
          {/* Step 1: Business Info */}
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-1">Tell us about your business</h2>
              <p className="text-slate-500 text-sm mb-6">This appears on your public profile.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Business name *</label>
                  <input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Rodriguez Home Services"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Bio</label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell homeowners about your experience, values, and what makes you great..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm resize-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">License # (optional)</label>
                    <input
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="LIC-123456"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">Years experience</label>
                    <select
                      value={yearsExperience}
                      onChange={(e) => setYearsExperience(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm bg-white"
                    >
                      {[0,1,2,3,4,5,6,7,8,9,10,15,20,25,30].map((y) => (
                        <option key={y} value={y}>{y === 0 ? "Less than 1" : y === 30 ? "30+" : y} {y === 1 ? "year" : "years"}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <Button
                className="w-full mt-6"
                onClick={() => saveStep(2)}
                isLoading={saving}
                disabled={!businessName.trim()}
              >
                Continue →
              </Button>
            </div>
          )}

          {/* Step 2: Service Area */}
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-1">Where do you work?</h2>
              <p className="text-slate-500 text-sm mb-6">We'll match you with nearby jobs.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Street address (optional)</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main St"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">City *</label>
                    <input
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Los Angeles"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">State *</label>
                    <select
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm bg-white"
                    >
                      {US_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">ZIP code *</label>
                  <input
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    placeholder="90001"
                    maxLength={10}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300 text-sm"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>← Back</Button>
                <Button
                  className="flex-1"
                  onClick={() => saveStep(3)}
                  isLoading={saving}
                  disabled={!city.trim() || !zipCode.trim()}
                >
                  Continue →
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Specialties */}
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-black text-slate-900 mb-1">What do you specialize in?</h2>
              <p className="text-slate-500 text-sm mb-6">Select all that apply — you'll get matched with relevant jobs.</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {JOB_CATEGORIES.map((cat) => {
                  const selected = specialties.includes(cat.name);
                  return (
                    <button
                      key={cat.id}
                      onClick={() => toggleSpecialty(cat.name)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 text-center transition-all ${
                        selected
                          ? "border-orange-400 bg-orange-50 shadow-sm"
                          : "border-slate-200 bg-white hover:border-orange-200"
                      }`}
                    >
                      <span className="text-2xl">{cat.icon}</span>
                      <span className={`text-xs font-semibold leading-tight ${selected ? "text-orange-700" : "text-slate-600"}`}>
                        {cat.name}
                      </span>
                      {selected && <span className="text-orange-500 text-xs">✓</span>}
                    </button>
                  );
                })}
              </div>

              <p className="text-xs text-slate-400 mb-4 text-center">
                {specialties.length === 0
                  ? "Select at least one specialty"
                  : `${specialties.length} selected`}
              </p>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>← Back</Button>
                <Button
                  className="flex-1"
                  onClick={finish}
                  isLoading={saving}
                  disabled={specialties.length === 0}
                >
                  Finish Setup →
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="text-center py-4">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">You&apos;re all set!</h2>
              <p className="text-slate-500 text-sm mb-6">
                Your profile is live. Start browsing leads and winning jobs.
              </p>
              <Button className="w-full" onClick={() => router.push("/contractor/dashboard")}>
                Go to Dashboard →
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          You can update all of this anytime in Settings.
        </p>
      </div>
    </div>
  );
}
