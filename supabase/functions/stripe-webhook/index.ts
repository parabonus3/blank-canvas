import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const d = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${d}`);
};

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeKey) {
    logStep("ERROR", { message: "STRIPE_SECRET_KEY not set" });
    return new Response("Server error", { status: 500 });
  }

  if (!webhookSecret) {
    logStep("ERROR", { message: "STRIPE_WEBHOOK_SECRET not set — refusing to process unsigned events" });
    return new Response("Misconfigured", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const body = await req.text();

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    logStep("ERROR", { message: "No stripe-signature header" });
    return new Response("No signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    logStep("ERROR", { message: `Signature verification failed: ${(err as Error).message}` });
    return new Response("Invalid signature", { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Checkout session completed", {
        sessionId: session.id,
        customerId: session.customer,
        mode: session.mode,
        paymentStatus: session.payment_status,
        kind: session.metadata?.kind,
      });

      // Streak Freeze Pack purchase
      if (
        session.mode === "payment" &&
        session.payment_status === "paid" &&
        session.metadata?.kind === "streak_freeze_pack"
      ) {
        const userId = session.metadata.user_id;
        if (!userId) {
          logStep("ERROR", { message: "Missing user_id in metadata" });
          break;
        }

        try {
          // Need line_items expanded to get quantity
          const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
            expand: ["line_items"],
          });
          const quantity = fullSession.line_items?.data?.[0]?.quantity ?? 1;
          const freezesAdded = quantity * 3;
          const amountCents = fullSession.amount_total ?? quantity * 100;
          const currency = fullSession.currency ?? "usd";
          const paymentIntent =
            typeof fullSession.payment_intent === "string"
              ? fullSession.payment_intent
              : fullSession.payment_intent?.id ?? null;

          const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
          );

          // Idempotency: UNIQUE on stripe_session_id
          const { error: insErr } = await supabaseAdmin
            .from("streak_freeze_purchases")
            .insert({
              user_id: userId,
              stripe_session_id: session.id,
              stripe_payment_intent: paymentIntent,
              quantity,
              freezes_added: freezesAdded,
              amount_cents: amountCents,
              currency,
            });

          if (insErr) {
            if ((insErr as any).code === "23505") {
              logStep("Freeze pack already processed (duplicate session)", {
                sessionId: session.id,
              });
              break;
            }
            logStep("ERROR inserting purchase", { message: insErr.message });
            break;
          }

          const { error: rpcErr } = await supabaseAdmin.rpc("credit_purchased_freezes", {
            _user_id: userId,
            _amount: freezesAdded,
          });
          if (rpcErr) {
            logStep("ERROR crediting freezes", { message: rpcErr.message });
            break;
          }

          logStep("Freeze pack credited", { userId, quantity, freezesAdded });
        } catch (err) {
          logStep("ERROR processing freeze pack", {
            message: err instanceof Error ? err.message : String(err),
          });
        }
      }

      break;
    }

    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Async payment succeeded", {
        sessionId: session.id,
        customerId: session.customer,
      });
      break;
    }

    case "checkout.session.async_payment_failed": {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Async payment failed", {
        sessionId: session.id,
        customerId: session.customer,
      });
      break;
    }

    case "customer.subscription.created": {
      const sub = event.data.object as Stripe.Subscription;
      logStep("Subscription created", {
        subId: sub.id,
        customerId: sub.customer,
        status: sub.status,
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      logStep("Subscription updated", {
        subId: sub.id,
        status: sub.status,
        priceId: sub.items.data[0]?.price?.id,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      logStep("Subscription cancelled/deleted", {
        subId: sub.id,
        customerId: sub.customer,
      });
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("Payment succeeded", {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        amount: invoice.amount_paid,
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("Payment failed", {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        amount: invoice.amount_due,
      });
      break;
    }

    case "invoice.payment_action_required": {
      const invoice = event.data.object as Stripe.Invoice;
      logStep("Payment action required (3DS/SCA)", {
        invoiceId: invoice.id,
        customerId: invoice.customer,
        hostedInvoiceUrl: invoice.hosted_invoice_url,
      });
      break;
    }

    default:
      logStep("Unhandled event type", { type: event.type });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
