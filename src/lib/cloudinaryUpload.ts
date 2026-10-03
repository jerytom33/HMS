/**
 * Upload the `file` in formData to Cloudinary using a server-issued signature.
 * Resolves with Cloudinary's response (e.g. { secure_url }); throws on failure.
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
  return data
}
