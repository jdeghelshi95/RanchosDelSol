import type { APIRoute } from 'astro';
import { getCars, createCar, deleteCar } from '../../../lib/queries';
import { checkAdminAuth } from '../../../lib/auth';

export const GET: APIRoute = async () => {
  try {
    const cars = await getCars();
    return new Response(JSON.stringify(cars), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  if (!checkAdminAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const { make, model, year, category, daily_rate, description, features, seats, transmission, fuel_type, available } = body;

    if (!make || !model || !year || !category || !daily_rate) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
    }

    const car = await createCar({
      make,
      model,
      year: Number(year),
      category,
      daily_rate: Number(daily_rate),
      description: description || null,
      features: features ? JSON.stringify(features) : null,
      seats: Number(seats) || 5,
      transmission: transmission || 'automatic',
      fuel_type: fuel_type || 'gasoline',
      available: available !== false ? 1 : 0,
    });

    return new Response(JSON.stringify(car), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
