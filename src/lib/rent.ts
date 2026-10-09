// Monthly rent for students with a lease agreement. Rent starts when staff generate the
// agreement: the first rent is due 30 days later, then on the same day of each following month
// (the last day of shorter months), for as long as the booking is paid and not cancelled.
// Staff record each month's payment (v1-rent-payments, keyed by booking + due date).
// Pure, so the staff pages, the dashboard and the student portal all agree.

import { parseAmount } from './currency'

export const FIRST_RENT_AFTER_DAYS = 30
/** Rent due within this many days counts as "due soon". */
export const DUE_SOON_DAYS = 7

export type RentPayment = {
  id?: string
  bookingId: string
  dueDate: string // YYYY-MM-DD, the period it pays
  amount: number
  paidAt?: string
  method?: string
  note?: string
  recordedBy?: string
}

export type RentPeriodStatus = 'paid' | 'overdue' | 'due' | 'upcoming'
export type RentPeriod = { dueDate: string; status: RentPeriodStatus; amount: number; payment: RentPayment | null }

export type RentSchedule = {
  amount: number | null
  firstDue: string
  periods: RentPeriod[]
  /** The earliest unpaid period (overdue first), or null when all known periods are paid. */
  next: RentPeriod | null
  overdue: RentPeriod[]
  overdueAmount: number
  paidAmount: number
}

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
const parseYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Today's date in Poland as YYYY-MM-DD. */
export function warsawDate(now: Date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Warsaw', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)?.value
  return `${get('year')}-${get('month')}-${get('day')}`
}

export const addDays = (date: string, days: number) => {
  const d = parseYmd(date)
  d.setUTCDate(d.getUTCDate() + days)
  return ymd(d)
}

/** Same day `months` later, or that month's last day when it is shorter. */
export const addMonths = (date: string, months: number) => {
  const d = parseYmd(date)
  const day = d.getUTCDate()
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months + 1, 0)).getUTCDate()
  return ymd(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, Math.min(day, last))))
}

/** "2026-11-08" -> "08/11/2026" (the app's date style). */
export const showDate = (date: string) => {
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

/** Days from today to `date` (negative when it is past). */
export const daysUntil = (date: string, today: string) => Math.round((parseYmd(date).getTime() - parseYmd(today).getTime()) / 86400_000)

/**
 * The rent schedule of a booking with a generated agreement: every period from the first due
 * date up to the next one after today, each paid / overdue / due (within DUE_SOON_DAYS) /
 * upcoming. `monthly` is the monthly amount (the booking's price, or the unit's current one).
 * Null when the booking has no agreement or is cancelled.
 */
export function rentSchedule(
  booking: { id: string; status?: string; agreementGeneratedAt?: string | null },
  monthly: number | null,
  payments: RentPayment[],
  today: string = warsawDate(),
): RentSchedule | null {
  if (!booking?.agreementGeneratedAt || booking.status === 'cancelled') return null
  const firstDue = addDays(warsawDate(new Date(booking.agreementGeneratedAt)), FIRST_RENT_AFTER_DAYS)
  const paidBy = new Map(payments.filter((p) => String(p.bookingId) === String(booking.id)).map((p) => [p.dueDate, p]))
  const amount = monthly ?? null

  const periods: RentPeriod[] = []
  // Every period due up to today, plus the next one; capped to keep old records cheap
  for (let k = 0; k < 600; k++) {
    const dueDate = addMonths(firstDue, k)
    const payment = paidBy.get(dueDate) || null
    const days = daysUntil(dueDate, today)
    const status: RentPeriodStatus = payment ? 'paid' : days < 0 ? 'overdue' : days <= DUE_SOON_DAYS ? 'due' : 'upcoming'
    periods.push({ dueDate, status, amount: payment?.amount ?? amount ?? 0, payment })
    if (days > 0) break
  }

  const overdue = periods.filter((p) => p.status === 'overdue')
  const next = overdue[0] || periods.find((p) => p.status !== 'paid') || null
  return {
    amount,
    firstDue,
    periods,
    next,
    overdue,
    overdueAmount: overdue.reduce((s, p) => s + p.amount, 0),
    paidAmount: periods.filter((p) => p.payment).reduce((s, p) => s + (p.payment?.amount || 0), 0),
  }
}

export const RENT_STATUS_LABEL: Record<RentPeriodStatus, string> = { paid: 'Paid', overdue: 'Overdue', due: 'Due soon', upcoming: 'Upcoming' }

/** Monthly rent of a booking: the price agreed at booking, else the unit's current price. */
export const monthlyRent = (booking: { price?: number | null }, unit?: { roomPrice?: string } | null) =>
  typeof booking?.price === 'number' ? booking.price : parseAmount(unit?.roomPrice)
