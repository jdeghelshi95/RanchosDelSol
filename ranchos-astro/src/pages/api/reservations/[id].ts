import type { APIRoute } from 'astro';
import { getReservationById, updateReservation } from '../../../lib/queries';
import { checkAdminAuth } from '../../../lib/auth';

export const GET: APIRoute = async ({ request, params }) => {
  if (!checkAdminAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const reservation = await getReservationById(Number(params.id));
    if (!reservation) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    return new Response(JSON.stringify(reservation), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const PUT: APIRoute = async ({ request, params }) => {
  if (!checkAdminAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const updated = await updateReservation(Number(params.id), body);
    return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
