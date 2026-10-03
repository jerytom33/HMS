/**
 * Upload the `file` in formData to Cloudinary using a server-issued signature.
 * Resolves with Cloudinary's response; secure_url is a browser-displayable URL
 * (see optimizedImageUrl). Throws on failure.
 */
export async function cloudinaryUpload(formData: FormData): Promise<{ secure_url: string; [key: string]: unknown }> {
  const signRes = await fetch('/api/cloudinary/sign', { method: 'POST' })
  const sign = await signRes.json()
  if (!signRes.ok) throw new Error(sign.error || 'Could not sign upload')

  const body = new FormData()
  body.append('file', formData.get('file') as Blob)
  body.append('api_key', sign.apiKey)
  body.append('timestamp', String(sign.timestamp))
  body.append('signature', sign.signature)
  body.append('folder', sign.folder)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, { method: 'POST', body })
  const data = await res.json()
  if (!res.ok || !data.secure_url) throw new Error(data?.error?.message || `Upload failed (${res.status})`)
  return { ...data, secure_url: optimizedImageUrl(data.secure_url) }
}

/**
 * Cloudinary delivery URL that converts to a format the browser can show:
 * WebP/AVIF where supported, JPEG otherwise. Needed for HEIC (iPhone photos),
 * which most browsers cannot display. Non-Cloudinary URLs pass through unchanged.
 */
export function optimizedImageUrl(url: string): string {
  if (!url.startsWith('https://res.cloudinary.com/')) return url
  const marker = '/image/upload/'
  const i = url.indexOf(marker)
  if (i === -1 || url.slice(i + marker.length).startsWith('f_auto')) return url
  return `${url.slice(0, i + marker.length)}f_auto,q_auto/${url.slice(i + marker.length)}`
}
