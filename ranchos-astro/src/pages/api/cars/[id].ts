import type { APIRoute } from 'astro';
import { getCarWithPhotos, updateCar, deleteCar } from '../../../lib/queries';
import { checkAdminAuth } from '../../../lib/auth';

export const GET: APIRoute = async ({ params }) => {
  try {
    const car = getCarWithPhotos(Number(params.id));
    if (!car) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    return new Response(JSON.stringify(car), { headers: { 'Content-Type': 'application/json' } });
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
    const { make, model, year, category, daily_rate, description, features, seats, transmission, fuel_type, available } = body;

    const updated = await updateCar(Number(params.id), {
      ...(make && { make }),
      ...(model && { model }),
      ...(year && { year: Number(year) }),
      ...(category && { category }),
      ...(daily_rate !== undefined && { daily_rate: Number(daily_rate) }),
      ...(description !== undefined && { description }),
      ...(features !== undefined && { features: JSON.stringify(features) }),
      ...(seats && { seats: Number(seats) }),
      ...(transmission && { transmission }),
      ...(fuel_type && { fuel_type }),
      ...(available !== undefined && { available: available ? 1 : 0 }),
    });

    return new Response(JSON.stringify(updated), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  if (!checkAdminAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    await deleteCar(Number(params.id));
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
