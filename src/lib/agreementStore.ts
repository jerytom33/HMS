// Generated lease agreements. An agreement is generated once per booking and kept as it was
// generated (the signed paper copy must match it); staff then view and download that copy.
// Stored in a plain MongoDB collection that no Payload REST endpoint exposes.
import type { Payload } from 'payload'

const AGREEMENTS = 'lease-agreements'

const agreements = (payload: Payload) => (payload.db as any).connection.collection(AGREEMENTS)

/**
 * Save the generated agreement for a booking. Returns false when one already exists
 * (unique index on bookingId, so two clicks at once can't both save).
 */
export async function saveAgreement(payload: Payload, booking: any, data: Uint8Array, generatedBy: string): Promise<boolean> {
  try {
    await agreements(payload).insertOne({
      bookingId: String(booking.id),
      ref: booking.ref,
      data: Buffer.from(data),
      size: data.length,
      generatedAt: new Date(),
      generatedBy,
    })
    return true
  } catch (error: any) {
    if (error?.code === 11000) return false
    throw error
  }
}

/** The stored agreement of a booking, or null when it hasn't been generated. */
export async function getAgreement(payload: Payload, bookingId: string) {
  const doc = await agreements(payload).findOne({ bookingId: String(bookingId) })
  if (!doc) return null
  const data: Uint8Array = doc.data?.buffer ? new Uint8Array(doc.data.buffer) : new Uint8Array(doc.data)
  return { data, generatedAt: doc.generatedAt as Date, generatedBy: (doc.generatedBy as string) || '' }
}
