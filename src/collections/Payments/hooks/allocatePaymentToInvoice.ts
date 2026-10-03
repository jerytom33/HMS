import type { CollectionAfterChangeHook } from 'payload'

export const allocatePaymentToInvoice: CollectionAfterChangeHook = async ({
  doc,
  previousDoc,
  req,
  operation,
}) => {
  const { payload } = req
  const becameVerified =
    doc.status === 'VERIFIED' &&
    (operation === 'create' || (operation === 'update' && previousDoc?.status !== 'VERIFIED'))

  if (becameVerified) {
    if (doc.invoice) {
      try {
        const invoiceId = typeof doc.invoice === 'object' ? doc.invoice.id : doc.invoice

        // Fetch the invoice
        const invoice = await payload.findByID({
          collection: 'invoices',
          id: invoiceId,
          req,
        })

        if (!invoice) return doc

        // Fetch all verified payments for this invoice
        const payments = await payload.find({
          collection: 'payments',
          where: {
            and: [
              { invoice: { equals: invoiceId } },
              { status: { equals: 'VERIFIED' } }
            ]
          },
          pagination: false,
          req,
        })

        const totalPaid = payments.docs.reduce((sum, payment) => sum + (payment.amount || 0), 0)

        let newStatus = invoice.status
        let amountOutstanding = invoice.amount_due - totalPaid
        let amountOverpaid = 0

        if (totalPaid >= invoice.amount_due) {
          newStatus = 'PAID'
          amountOutstanding = 0
          amountOverpaid = totalPaid - invoice.amount_due
        } else if (totalPaid > 0) {
          newStatus = 'PARTIALLY_PAID'
        }

        await payload.update({
          collection: 'invoices',
          id: invoiceId,
          data: {
            status: newStatus,
            amount_paid: totalPaid,
            amount_outstanding: amountOutstanding,
            amount_overpaid: amountOverpaid,
          },
          req,
        })
      } catch (err) {
        payload.logger.error(`Failed to allocate payment ${doc.id} to invoice: ${err}`)
      }
    }
  }

  return doc
}
