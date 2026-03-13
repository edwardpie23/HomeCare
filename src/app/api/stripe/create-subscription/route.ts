import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "contractor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { priceId } = body;

    const contractor = await prisma.contractor.findUnique({
      where: { userId: session.user.id },
      include: { user: true },
    });

    if (!contractor) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    let customerId = contractor.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: contractor.user.email,
        name: contractor.businessName,
        metadata: { contractorId: contractor.id, userId: session.user.id },
      });
      customerId = customer.id;

      await prisma.contractor.update({
        where: { id: contractor.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId || process.env.STRIPE_SUBSCRIPTION_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/contractor/dashboard?subscription=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/contractor/dashboard?subscription=cancelled`,
      metadata: { contractorId: contractor.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Stripe subscription error:", error);
    return NextResponse.json({ error: "Payment setup failed" }, { status: 500 });
  }
}
