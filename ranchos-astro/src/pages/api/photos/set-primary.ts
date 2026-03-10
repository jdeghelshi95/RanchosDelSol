import type { APIRoute } from 'astro';
import { setPrimaryPhoto } from '../../../lib/queries';
import { checkAdminAuth } from '../../../lib/auth';

export const POST: APIRoute = async ({ request }) => {
  if (!checkAdminAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { carId, photoId } = await request.json();
    await setPrimaryPhoto(Number(carId), Number(photoId));
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
