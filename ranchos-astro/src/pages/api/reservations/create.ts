import type { APIRoute } from 'astro';
import { createReservation, getCarById, checkCarAvailability, getReservationById } from '../../../lib/queries';
import { sendReservationConfirmation, sendAdminNotification } from '../../../lib/email';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const {
      carId,
      customerName,
      customerEmail,
      customerPhone,
      startDate,
      endDate,
      totalAmount,
      depositAmount,
      notes,
    } = body;

    // Validate required fields
    if (!carId || !customerName || !customerEmail || !startDate || !endDate || !totalAmount) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), { status: 400 });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) {
      return new Response(JSON.stringify({ error: 'Return date must be after pickup date' }), { status: 400 });
    }

    // Check car exists and is available
    const car = await getCarById(Number(carId));
    if (!car) {
      return new Response(JSON.stringify({ error: 'Vehicle not found' }), { status: 404 });
    }
    if (!car.available) {
      return new Response(JSON.stringify({ error: 'Vehicle is not available' }), { status: 409 });
    }

    // Check for date conflicts
    const isAvailable = await checkCarAvailability(Number(carId), startDate, endDate);
    if (!isAvailable) {
      return new Response(JSON.stringify({ error: 'Vehicle is already reserved for the selected dates' }), { status: 409 });
    }

    // Check if Stripe is configured
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    let checkoutUrl: string | null = null;
    let stripeSessionId: string | null = null;

    if (stripeKey && stripeKey.startsWith('sk_')) {
      try {
        const Stripe = (await import('stripe')).default;
        const stripe = new Stripe(stripeKey);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const origin = request.headers.get('origin') || 'https://ranchosdelsol.com';

        const session = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'usd',
                product_data: {
                  name: `Car Rental: ${car.year} ${car.make} ${car.model}`,
                  description: `${days} day${days !== 1 ? 's' : ''} — ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
                },
                unit_amount: Math.round(Number(totalAmount) * 100),
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${origin}/reservation-success?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/cars/${carId}`,
          customer_email: customerEmail,
          metadata: {
            carId: String(carId),
            customerName,
            customerEmail,
            customerPhone: customerPhone || '',
            startDate,
            endDate,
            notes: notes || '',
          },
        });

        checkoutUrl = session.url;
        stripeSessionId = session.id;
      } catch (stripeErr: any) {
        console.error('[Stripe]', stripeErr.message);
        // Fall through to create reservation without payment
      }
    }

    // Create the reservation
    const reservation = await createReservation({
      car_id: Number(carId),
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone || null,
      start_date: startDate,
      end_date: endDate,
      total_amount: Number(totalAmount),
      deposit_amount: depositAmount ? Number(depositAmount) : null,
      status: 'pending',
      stripe_payment_intent_id: null,
      stripe_session_id: stripeSessionId,
      payment_status: 'unpaid',
      notes: notes || null,
    });

    // Get full reservation with car info for emails
    const fullReservation = getReservationById(reservation.id);
    if (fullReservation) {
      // Send emails asynchronously (don't block response)
      Promise.all([
        sendReservationConfirmation(fullReservation),
        sendAdminNotification(fullReservation),
      ]).catch(err => console.error('[Email]', err));
    }

    return new Response(
      JSON.stringify({
        success: true,
        reservationId: reservation.id,
        checkoutUrl,
      }),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('[Reservation Create]', err);
    return new Response(JSON.stringify({ error: err.message || 'Internal server error' }), { status: 500 });
  }
};
