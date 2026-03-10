import type { APIRoute } from 'astro';
import { updateReservation, createReservation, getCarById } from '../../../lib/queries';
import { sendReservationConfirmation } from '../../../lib/email';

export const POST: APIRoute = async ({ request }) => {
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeKey) {
    return new Response('Stripe not configured', { status: 400 });
  }

  try {
    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeKey);

    const body = await request.text();
    const sig = request.headers.get('stripe-signature') || '';

    let event: any;
    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
      } catch (err: any) {
        console.error('[Webhook] Signature verification failed:', err.message);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
      }
    } else {
      event = JSON.parse(body);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const meta = session.metadata || {};

      // Find reservation by stripe session ID or create new one
      const db = await import('../../../lib/db').then(m => m.db);
      const existing = db.prepare('SELECT * FROM reservations WHERE stripe_session_id = ?').get(session.id) as any;

      if (existing) {
        updateReservation(existing.id, {
          payment_status: 'paid',
          status: 'confirmed',
          stripe_payment_intent_id: session.payment_intent,
        });
      } else if (meta.carId) {
        // Create reservation from metadata
        const reservation = createReservation({
          car_id: Number(meta.carId),
          customer_name: meta.customerName,
          customer_email: meta.customerEmail,
          customer_phone: meta.customerPhone || null,
          start_date: meta.startDate,
          end_date: meta.endDate,
          total_amount: session.amount_total / 100,
          deposit_amount: null,
          status: 'confirmed',
          stripe_payment_intent_id: session.payment_intent,
          stripe_session_id: session.id,
          payment_status: 'paid',
          notes: meta.notes || null,
        });
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      const pi = event.data.object;
      const db = await import('../../../lib/db').then(m => m.db);
      const existing = db.prepare('SELECT * FROM reservations WHERE stripe_payment_intent_id = ?').get(pi.id) as any;
      if (existing) {
        updateReservation(existing.id, { status: 'cancelled', payment_status: 'unpaid' });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[Webhook]', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
