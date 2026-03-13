import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = "QuoteFast <noreply@quotefast.com>";

function formatCurrency(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export async function sendQuoteReceivedEmail(opts: {
  customerEmail: string;
  customerName: string;
  jobTitle: string;
  jobId: string;
  contractorName: string;
  minPrice: number;
  maxPrice: number;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const url = `${process.env.NEXTAUTH_URL}/my-jobs/${opts.jobId}`;
  await resend.emails.send({
    from: FROM,
    to: opts.customerEmail,
    subject: `New quote from ${opts.contractorName} for "${opts.jobTitle}"`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#111827">You have a new contractor quote!</h2>
        <p style="color:#6b7280">Hi ${opts.customerName},</p>
        <p style="color:#6b7280"><strong>${opts.contractorName}</strong> submitted a quote for your job: <em>${opts.jobTitle}</em>.</p>
        <div style="background:#f9fafb;border-radius:12px;padding:20px;margin:20px 0">
          <p style="margin:0;font-size:24px;font-weight:900;color:#111827">
            ${formatCurrency(opts.minPrice)} – ${formatCurrency(opts.maxPrice)}
          </p>
          <p style="margin:4px 0 0;color:#9ca3af;font-size:14px">Quoted price range</p>
        </div>
        <a href="${url}" style="display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700">
          View Quote & Respond →
        </a>
        <p style="margin-top:24px;color:#9ca3af;font-size:12px">QuoteFast — Home Services Marketplace</p>
      </div>`,
  });
}

export async function sendQuoteAcceptedEmail(opts: {
  contractorEmail: string;
  contractorName: string;
  customerName: string;
  jobTitle: string;
  agreedPrice: number;
  city: string;
  state: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  await resend.emails.send({
    from: FROM,
    to: opts.contractorEmail,
    subject: `Quote accepted! "${opts.jobTitle}" — ${opts.customerName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#16a34a">🎉 Your quote was accepted!</h2>
        <p style="color:#6b7280">Hi ${opts.contractorName},</p>
        <p style="color:#6b7280"><strong>${opts.customerName}</strong> accepted your quote for <em>${opts.jobTitle}</em> in ${opts.city}, ${opts.state}.</p>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:20px 0">
          <p style="margin:0;font-size:24px;font-weight:900;color:#15803d">${formatCurrency(opts.agreedPrice)}</p>
          <p style="margin:4px 0 0;color:#86efac;font-size:14px">Agreed price</p>
        </div>
        <a href="${process.env.NEXTAUTH_URL}/contractor/dashboard" style="display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700">
          View in Dashboard →
        </a>
        <p style="margin-top:24px;color:#9ca3af;font-size:12px">QuoteFast — Home Services Marketplace</p>
      </div>`,
  });
}

export async function sendQuoteDeclinedEmail(opts: {
  contractorEmail: string;
  contractorName: string;
  customerName: string;
  jobTitle: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  await resend.emails.send({
    from: FROM,
    to: opts.contractorEmail,
    subject: `Quote update for "${opts.jobTitle}"`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#111827">Quote status update</h2>
        <p style="color:#6b7280">Hi ${opts.contractorName},</p>
        <p style="color:#6b7280"><strong>${opts.customerName}</strong> has decided to go in a different direction for <em>${opts.jobTitle}</em> at this time.</p>
        <p style="color:#6b7280">Keep browsing available leads — new opportunities are posted daily.</p>
        <a href="${process.env.NEXTAUTH_URL}/contractor/leads" style="display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700">
          Browse Leads →
        </a>
        <p style="margin-top:24px;color:#9ca3af;font-size:12px">QuoteFast — Home Services Marketplace</p>
      </div>`,
  });
}

export async function sendReviewEmail(opts: {
  contractorEmail: string;
  contractorName: string;
  customerName: string;
  rating: number;
  comment: string | null;
  jobTitle: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const stars = "⭐".repeat(opts.rating);
  await resend.emails.send({
    from: FROM,
    to: opts.contractorEmail,
    subject: `New ${opts.rating}-star review from ${opts.customerName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#111827">You received a new review!</h2>
        <p style="color:#6b7280">Hi ${opts.contractorName},</p>
        <p style="color:#6b7280"><strong>${opts.customerName}</strong> left a review for <em>${opts.jobTitle}</em>.</p>
        <div style="background:#fefce8;border:1px solid #fef08a;border-radius:12px;padding:20px;margin:20px 0">
          <p style="font-size:24px;margin:0">${stars}</p>
          ${opts.comment ? `<p style="margin:8px 0 0;color:#78350f;font-style:italic">"${opts.comment}"</p>` : ""}
        </div>
        <a href="${process.env.NEXTAUTH_URL}/contractor/dashboard" style="display:inline-block;background:#f97316;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:700">
          View Dashboard →
        </a>
        <p style="margin-top:24px;color:#9ca3af;font-size:12px">QuoteFast — Home Services Marketplace</p>
      </div>`,
  });
}
