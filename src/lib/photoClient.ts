// Browser helpers for student profile photos.

/** Shrink a photo to at most `max` px on its longest side, as JPEG (the original when the browser can't read it). */
export async function shrinkPhoto(file: File, max = 512): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    return blob || file
  } catch {
    return file
  }
}

/** Upload a profile photo to `url` (the staff or the student photo route). */
export async function uploadPhoto(url: string, file: File): Promise<{ ok: boolean; photoUploadedAt?: string; message?: string }> {
  try {
    const form = new FormData()
    form.set('photo', await shrinkPhoto(file), 'photo.jpg')
    const res = await fetch(url, { method: 'POST', body: form })
    const data = await res.json().catch(() => ({}))
    return res.ok && data.ok ? { ok: true, photoUploadedAt: data.photoUploadedAt } : { ok: false, message: data.message || "Couldn't upload the photo. Please try again." }
  } catch {
    return { ok: false, message: "Couldn't upload the photo. Please try again." }
  }
}

/** Staff URL of a student's photo, or null when they have none; `v` busts the cache after a new upload. */
export const staffPhotoUrl = (student: { id?: string; photoUploadedAt?: string | null } | null | undefined) =>
  student?.id && student.photoUploadedAt ? `/api/staff/students/${student.id}/photo?v=${encodeURIComponent(student.photoUploadedAt)}` : null
