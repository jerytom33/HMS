import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';

const UPLOAD_FOLDER = 'hms';

/**
 * Signs a Cloudinary upload so the browser can upload directly without an
 * unsigned preset. The API secret never leaves the server. Staff login required.
 */
export async function POST(request: Request) {
  const payload = await getPayload({ config });
  const { user } = await payload.auth({ headers: request.headers });
  if (!user || user.collection !== 'users') {
    return NextResponse.json({ error: 'Sign in to upload images' }, { status: 401 });
  }
  const cloudName = process.env.CLOUDINARY_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_SECRET_KEY;

  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Cloudinary is not configured on the server' }, { status: 500 });
  }

  const timestamp = Math.round(Date.now() / 1000);
  // Cloudinary signs the alphabetically sorted params, then appends the secret
  const signature = createHash('sha1')
    .update(`folder=${UPLOAD_FOLDER}&timestamp=${timestamp}${apiSecret}`)
    .digest('hex');

  return NextResponse.json({ cloudName, apiKey, timestamp, signature, folder: UPLOAD_FOLDER });
}
