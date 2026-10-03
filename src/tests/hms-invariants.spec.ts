import { describe, it, expect, beforeAll } from '@jest/globals'
import { getPayload } from 'payload'
import config from '@payload-config'

let payload: any
let personId: string
let propertyId: string
let bedAvailableId: string
let bedMaintenanceId: string
let invoiceId: string
let tenancyId: string
let contractId: string

beforeAll(async () => {
  payload = await getPayload({ config })
  
  const person = await payload.create({ collection: 'people', data: { first_name: 'Test', last_name: 'User', email: 'test@hms.com', type: 'STUDENT' } })
  personId = person.id as string

  const property = await payload.create({ collection: 'properties', data: { name: 'Test Property', organization: 'org_1' } })
  propertyId = property.id as string

  const room = await payload.create({ collection: 'rooms', data: { room_number: '101', room_type: 'SINGLE', bed_count: 2, floor: 'floor_1' } })
  
  const bed1 = await payload.create({ collection: 'beds', data: { bed_identifier: '101-A', room: room.id, price: 100, operational_status: 'AVAILABLE', occupancy_status: 'VACANT' } })
  bedAvailableId = bed1.id as string

  const bed2 = await payload.create({ collection: 'beds', data: { bed_identifier: '101-B', room: room.id, price: 100, operational_status: 'MAINTENANCE', occupancy_status: 'VACANT' } })
  bedMaintenanceId = bed2.id as string
})

describe('HMS Invariants Verification', () => {
  it('1 & 2. Booking state machine allows valid transitions and blocks invalid', async () => {
    const booking = await payload.create({
      collection: 'bookings',
      data: { person: personId, property: propertyId, bed: bedAvailableId, start_date: '2027-01-01T00:00:00Z', end_date: '2027-01-15T00:00:00Z', status: 'DRAFT' }
    })

    // Valid
    await expect(payload.update({ collection: 'bookings', id: booking.id, data: { status: 'PENDING_PAYMENT_VERIFICATION' } })).resolves.not.toThrow()
    await expect(payload.update({ collection: 'bookings', id: booking.id, data: { status: 'PENDING_ADMIN_REVIEW' } })).resolves.not.toThrow()
    
    // Invalid (skip APPROVED directly to COMPLETED from PENDING_ADMIN_REVIEW)
    await expect(payload.update({ collection: 'bookings', id: booking.id, data: { status: 'COMPLETED' } })).rejects.toThrow(/INVARIANT_VIOLATION/)
  })

  it('4. Double booking concurrency fails', async () => {
    const bookingData = {
      collection: 'bookings' as const,
      data: { person: personId, property: propertyId, bed: bedAvailableId, start_date: '2027-02-01T00:00:00Z', end_date: '2027-02-15T00:00:00Z', status: 'PENDING_ADMIN_REVIEW' as const }
    }
    const results = await Promise.allSettled([payload.create(bookingData), payload.create(bookingData)])
    expect(results.filter((r: any) => r.status === 'fulfilled').length).toBe(1)
    expect(results.filter((r: any) => r.status === 'rejected').length).toBe(1)
  })

  it('5. Booking a maintenance bed fails', async () => {
    await expect(payload.create({
      collection: 'bookings',
      data: { person: personId, property: propertyId, bed: bedMaintenanceId, start_date: '2027-03-01T00:00:00Z', end_date: '2027-03-15T00:00:00Z', status: 'DRAFT' }
    })).rejects.toThrow(/INVARIANT_VIOLATION/)
  })

  it('8. Check-in transitions tenancy and bed', async () => {
    // Approve booking to create UPCOMING tenancy
    const booking = await payload.create({
      collection: 'bookings',
      data: { person: personId, property: propertyId, bed: bedAvailableId, start_date: '2027-04-01T00:00:00Z', end_date: '2027-04-15T00:00:00Z', status: 'PENDING_ADMIN_REVIEW' }
    })
    await payload.update({ collection: 'bookings', id: booking.id, data: { status: 'APPROVED' } })
    
    const tenancies = await payload.find({ collection: 'tenancies', where: { bed: { equals: bedAvailableId } } })
    tenancyId = tenancies.docs[0].id

    const { CheckInService } = await import('../../src/services/CheckInService')
    await CheckInService.execute(payload, tenancyId)
    
    const bed = await payload.findByID({ collection: 'beds', id: bedAvailableId })
    expect(bed.occupancy_status).toBe('OCCUPIED')
  })

  it('11. Payment idempotency avoids double counting', async () => {
    const invoice = await payload.create({ collection: 'invoices', data: { invoice_number: 'INV-1', person: personId, amount_due: 500, due_date: '2027-01-01T00:00:00Z' } })
    invoiceId = invoice.id

    const { PaymentService } = await import('../../src/services/PaymentService')
    const paymentData = { person: personId, property: propertyId, invoice: invoiceId, amount: 200, currency: 'PLN', payment_method: 'CASH', payment_type: 'RENT', status: 'VERIFIED', transaction_reference: 'TXN-123' }
    
    await PaymentService.processPayment(payload, paymentData)
    // Duplicate process
    await PaymentService.processPayment(payload, paymentData)

    const payments = await payload.find({ collection: 'payments', where: { transaction_reference: { equals: 'TXN-123' } } })
    expect(payments.totalDocs).toBe(1)
  })

  it('12 & 14. Financial integrity handles partial and overpayment', async () => {
    const { PaymentService } = await import('../../src/services/PaymentService')
    // Invoice is 500, we paid 200 already (TXN-123)
    let inv = await payload.findByID({ collection: 'invoices', id: invoiceId })
    expect(inv.amount_paid).toBe(200)
    expect(inv.status).toBe('PARTIALLY_PAID')

    // Pay 400 (600 total, 100 overpaid)
    await PaymentService.processPayment(payload, { person: personId, property: propertyId, invoice: invoiceId, amount: 400, currency: 'PLN', payment_method: 'CASH', payment_type: 'RENT', status: 'VERIFIED', transaction_reference: 'TXN-456' })
    
    inv = await payload.findByID({ collection: 'invoices', id: invoiceId })
    expect(inv.amount_paid).toBe(600)
    expect(inv.amount_outstanding).toBe(0)
    expect(inv.amount_overpaid).toBe(100)
    expect(inv.status).toBe('PAID')
  })

  it('15 & 16. Contract immutability and renewal', async () => {
    const contract = await payload.create({ collection: 'contracts', data: { contract_number: 'C-1', person: personId, property: propertyId, tenancy: tenancyId, status: 'SIGNED' } })
    contractId = contract.id

    await expect(payload.update({ collection: 'contracts', id: contractId, data: { status: 'DRAFT' } })).rejects.toThrow(/INVARIANT_VIOLATION/)

    const { ContractRenewalService } = await import('../../src/services/ContractRenewalService')
    const renewed = await ContractRenewalService.renew(payload, contractId)
    
    expect(renewed.version).toBe(2)
    expect(typeof renewed.previous_contract === 'object' ? renewed.previous_contract.id : renewed.previous_contract).toBe(contractId)
  })
})
