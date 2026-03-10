import type { APIRoute } from 'astro';
import { addCarPhoto, deleteCarPhoto, setPrimaryPhoto } from '../../../lib/queries';
import { checkAdminAuth } from '../../../lib/auth';
import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'public', 'uploads');
const BASE_URL = process.env.PUBLIC_BASE_URL || '';

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export const POST: APIRoute = async ({ request }) => {
  if (!checkAdminAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    ensureUploadDir();
    const formData = await request.formData();
    const carId = Number(formData.get('carId'));
    const isPrimary = formData.get('isPrimary') === 'true';
    const file = formData.get('photo') as File;

    if (!carId || !file) {
      return new Response(JSON.stringify({ error: 'carId and photo are required' }), { status: 400 });
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed' }), { status: 400 });
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File size must be under 5MB' }), { status: 400 });
    }

    const ext = file.name.split('.').pop() || 'jpg';
    const fileKey = `cars/${carId}/${randomBytes(8).toString('hex')}.${ext}`;
    const filePath = path.join(UPLOAD_DIR, fileKey.replace('cars/', ''));

    // Ensure car subdirectory exists
    const carDir = path.join(UPLOAD_DIR, String(carId));
    if (!fs.existsSync(carDir)) fs.mkdirSync(carDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(path.join(UPLOAD_DIR, String(carId), path.basename(fileKey)), buffer);

    const url = `${BASE_URL}/uploads/${carId}/${path.basename(fileKey)}`;
    const photo = addCarPhoto(carId, url, fileKey, isPrimary);

    return new Response(JSON.stringify(photo), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[Photo Upload]', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  if (!checkAdminAuth(request)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  try {
    const { photoId, fileKey } = await request.json();
    
    // Delete file from disk
    if (fileKey) {
      const filePath = path.join(UPLOAD_DIR, fileKey.replace('cars/', ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    deleteCarPhoto(Number(photoId));
    return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};
