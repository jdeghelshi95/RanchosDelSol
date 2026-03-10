import type { APIRoute } from 'astro';
import { getReservations, updateReservation } from '../../../lib/queries';
import { checkAdminAuth } from '../../../lib/auth';

export const GET: APIRoute = async ({ request }) => {
  if (!checkAdminAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const reservations = getReservations();
    return new Response(JSON.stringify(reservations), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
