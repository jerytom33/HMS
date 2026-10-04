// Pure tests for WhatsApp student notifications. Run alone with:
//   npx jest src/tests/notify.spec.ts --config '{"preset":"ts-jest","testEnvironment":"node","moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1"}}'
import { afterEach, describe, expect, it, jest } from '@jest/globals'

import { bookingPlace, sendStudentNotification } from '@/lib/notify'

describe('bookingPlace', () => {
  it('joins hostel, room and bed', () => {
    expect(bookingPlace({ hostel: 'Bukowiecka 11', room: 'Room 202', bed: 'Bed B' })).toBe('Bukowiecka 11, Room 202, Bed B')
    expect(bookingPlace({ hostel: 'Bukowiecka 11', room: 'Room 202', bed: 'B' })).toBe('Bukowiecka 11, Room 202, Bed B')
    expect(bookingPlace({ hostel: 'Bukowiecka 11', room: 'FRONT studio 1 · Bedroom 1', bed: 'Bedroom 1 · Bed A' })).toBe('Bukowiecka 11, FRONT studio 1 · Bedroom 1, Bed A')
  })
  it('leaves no stray commas and never comes out empty', () => {
    expect(bookingPlace({ hostel: 'Bukowiecka 11', bed: 'Bed A' })).toBe('Bukowiecka 11, Bed A')
    expect(bookingPlace({ hostel: ' ', room: '', bed: '' })).toBe('your room')
    expect(bookingPlace(null)).toBe('your room')
  })
})

describe('sendStudentNotification', () => {
  const realFetch = global.fetch
  afterEach(() => {
    global.fetch = realFetch
    delete process.env.NOTIFY_WEBHOOK_URL
    delete process.env.NOTIFY_WEBHOOK_SECRET
    jest.restoreAllMocks()
  })

  it('sends nothing without a webhook URL', async () => {
    const fetchMock = jest.fn()
    global.fetch = fetchMock as any
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(sendStudentNotification('booking_paid', { whatsapp: '48500111222' })).resolves.toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts the event, the details and the secret', async () => {
    process.env.NOTIFY_WEBHOOK_URL = 'https://hooks.test/notify'
    process.env.NOTIFY_WEBHOOK_SECRET = 's3cret'
    const fetchMock = jest.fn(async () => new Response('{}', { status: 200 }))
    global.fetch = fetchMock as any
    await expect(sendStudentNotification('booking_paid', { whatsapp: '+48 500 111 222', name: 'Anna', place: 'Bukowiecka 11, Room 202, Bed B', link: 'https://x/student/profile#documents' })).resolves.toBe(true)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://hooks.test/notify')
    expect(JSON.parse(String(init.body))).toEqual({ event: 'booking_paid', whatsapp: '48500111222', name: 'Anna', place: 'Bukowiecka 11, Room 202, Bed B', link: 'https://x/student/profile#documents', secret: 's3cret' })
  })

  it('fills empty names and places, and sends no link for contract_generated', async () => {
    process.env.NOTIFY_WEBHOOK_URL = 'https://hooks.test/notify'
    const fetchMock = jest.fn(async () => new Response('{}', { status: 200 }))
    global.fetch = fetchMock as any
    await sendStudentNotification('contract_generated', { whatsapp: '48500111222', name: ' ', place: '', link: 'https://x' })
    const body = JSON.parse(String((fetchMock.mock.calls[0] as any)[1].body))
    expect(body).toMatchObject({ event: 'contract_generated', name: 'there', place: 'your room' })
    expect(body).not.toHaveProperty('link')
  })

  it('sends nothing without a WhatsApp number', async () => {
    process.env.NOTIFY_WEBHOOK_URL = 'https://hooks.test/notify'
    const fetchMock = jest.fn()
    global.fetch = fetchMock as any
    await expect(sendStudentNotification('booking_paid', { whatsapp: '' })).resolves.toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('never throws when the call fails or times out', async () => {
    process.env.NOTIFY_WEBHOOK_URL = 'https://hooks.test/notify'
    jest.spyOn(console, 'error').mockImplementation(() => {})
    global.fetch = jest.fn(async () => { throw new DOMException('The operation timed out.', 'TimeoutError') }) as any
    await expect(sendStudentNotification('booking_paid', { whatsapp: '48500111222' })).resolves.toBe(false)
    global.fetch = jest.fn(async () => new Response('', { status: 500 })) as any
    await expect(sendStudentNotification('booking_paid', { whatsapp: '48500111222' })).resolves.toBe(false)
  })
})
