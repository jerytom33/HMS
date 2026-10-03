import type { CollectionBeforeChangeHook } from 'payload'
import { APIError } from 'payload'

export const checkOverlappingBookings: CollectionBeforeChangeHook = async ({
  data,
  req,
  operation,
  originalDoc,
}) => {
  const { payload } = req
  const bed = data.bed || originalDoc?.bed
  const startDate = data.start_date || originalDoc?.start_date
  const endDate = data.end_date || originalDoc?.end_date
  const status = data.status || originalDoc?.status

  const activeStates = ['PENDING_PAYMENT_VERIFICATION', 'PENDING_ADMIN_REVIEW', 'APPROVED']
  
  if (!activeStates.includes(status)) {
    return data
  }

  if (bed && startDate && endDate) {
    const lockId = typeof bed === 'object' ? bed.id : bed
    
    // Validate operational status via Domain Service
    const { BookingService } = await import('../../../services/BookingService')
    await BookingService.validateBedStatus(payload, lockId)

    // Lock the bed by writing to its document inside the current transaction.
    // MongoDB raises a write conflict for any concurrent transaction that touches
    // the same bed, which serializes concurrent booking requests for that bed.
    const transactionID = await req.transactionID
    const session = transactionID ? payload.db.sessions?.[transactionID] : undefined
    if (session?.inTransaction()) {
      await payload.db.collections.beds.updateOne(
        { _id: lockId },
        { $set: { updatedAt: new Date() } },
        { session },
      )
    } else {
      payload.logger.warn(`No transaction available to lock bed ${lockId}`)
    }


    const overlappingBookings = await payload.find({
      collection: 'bookings',
      where: {
        and: [
          { bed: { equals: bed } },
          { status: { in: activeStates } },
          { start_date: { less_than: endDate } },
          { end_date: { greater_than: startDate } }
        ],
        ...(operation === 'update' && originalDoc?.id
          ? { id: { not_equals: originalDoc.id } }
          : {})
      },
    })

    if (overlappingBookings.totalDocs > 0) {
      throw new APIError('INVARIANT_VIOLATION: This bed is already booked for the selected dates.', 409)
    }
  }

  return data
}
