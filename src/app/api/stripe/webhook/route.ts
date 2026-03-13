import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-02-25.clover",
});

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature") || "";

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const contractorId = session.metadata?.contractorId;

        if (contractorId && session.mode === "subscription") {
          await prisma.contractor.update({
            where: { id: contractorId },
            data: {
              subscriptionStatus: "active",
              subscriptionEnds: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customer = await stripe.customers.retrieve(
          subscription.customer as string
        );

        if (customer && !customer.deleted) {
          await prisma.contractor.updateMany({
            where: { stripeCustomerId: customer.id },
            data: { subscriptionStatus: "inactive" },
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice & { subscription?: string | null };
        const subscriptionId = invoice.subscription;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const customer = await stripe.customers.retrieve(
            subscription.customer as string
          );

          if (customer && !customer.deleted) {
            const periodEnd = (subscription as { current_period_end?: number }).current_period_end;
            await prisma.contractor.updateMany({
              where: { stripeCustomerId: customer.id },
              data: {
                subscriptionStatus: "active",
                subscriptionEnds: new Date((periodEnd || 0) * 1000),
              },
            });
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
