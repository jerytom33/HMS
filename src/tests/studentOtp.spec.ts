// Pure tests for portal links, sessions, OTP rate limits and the OTP webhook call. Run alone with:
//   npx jest src/tests/studentOtp.spec.ts --config '{"preset":"ts-jest","testEnvironment":"node","moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1"}}'
import { afterEach, beforeAll, describe, expect, it, jest } from '@jest/globals'

import { NUMBER_LIMITS, IP_LIMITS, sendOtpWebhook, waitSeconds } from '@/lib/otp'
import { linkToken, signSession, signToken, verifySession, verifyToken } from '@/lib/studentAuth'

beforeAll(() => {
  process.env.PAYLOAD_SECRET = 'unit-test-secret'
})

describe('personal link and session tokens', () => {
  it('accepts a fresh link token', () => {
    expect(verifyToken(linkToken('stu1', '48500111222'), 'l')).toMatchObject({ sid: 'stu1', wa: '48500111222' })
  })

  it('rejects an expired link token', () => {
    const old = linkToken('stu1', '48500111222', Date.now() - 8 * 86400_000)
    expect(verifyToken(old, 'l')).toBeNull()
  })

  it('rejects a forged token', () => {
    const [body] = linkToken('stu1', '48500111222').split('.')
    const forgedBody = Buffer.from(JSON.stringify({ k: 'l', sid: 'other', wa: '48500111222', exp: Date.now() + 1e6 })).toString('base64url')
    expect(verifyToken(`${forgedBody}.${linkToken('stu1', '48500111222').split('.')[1]}`, 'l')).toBeNull()
    expect(verifyToken(`${body}.not-a-signature`, 'l')).toBeNull()
  })

  it('never lets a link or browse token act as a full session', () => {
    expect(verifySession(linkToken('stu1', '48500111222'))).toBeNull()
    expect(verifySession(signToken('b', 'stu1', '48500111222', Date.now() + 1e6))).toBeNull()
    expect(verifyToken(signSession('stu1', '48500111222'), 'l')).toBeNull()
    expect(verifySession(signSession('stu1', '48500111222'))).toMatchObject({ sid: 'stu1' })
  })

  it('still accepts session tokens issued before token kinds', () => {
    const { createHmac } = require('crypto')
    const body = Buffer.from(JSON.stringify({ sid: 'stu1', wa: '48500111222', exp: Date.now() + 1e6 })).toString('base64url')
    const mac = createHmac('sha256', 'unit-test-secret').update(body).digest('base64url')
    expect(verifySession(`${body}.${mac}`)).toMatchObject({ sid: 'stu1' })
  })
})

describe('OTP rate limits', () => {
  const now = new Date('2026-10-04T12:00:00Z')
  const ago = (s: number) => new Date(now.getTime() - s * 1000)

  it('allows the first code', () => {
    expect(waitSeconds([], NUMBER_LIMITS, now)).toBe(0)
  })

  it('refuses a second code within 60 seconds', () => {
    expect(waitSeconds([ago(20)], NUMBER_LIMITS, now)).toBe(40)
    expect(waitSeconds([ago(61)], NUMBER_LIMITS, now)).toBe(0)
  })

  it('refuses a sixth code within an hour', () => {
    const five = [ago(3500), ago(3000), ago(2000), ago(1000), ago(100)]
    expect(waitSeconds(five, NUMBER_LIMITS, now)).toBe(100)
    expect(waitSeconds(five.slice(1), NUMBER_LIMITS, now)).toBe(0)
  })

  it('limits one IP across numbers', () => {
    const ten = Array.from({ length: 10 }, (_, i) => ago(30 + i))
    expect(waitSeconds(ten, IP_LIMITS, now)).toBeGreaterThan(0)
    expect(waitSeconds(ten.slice(1), IP_LIMITS, now)).toBe(0)
  })
})

describe('OTP webhook', () => {
  const realFetch = global.fetch
  afterEach(() => {
    global.fetch = realFetch
    delete process.env.OTP_WEBHOOK_URL
    delete process.env.OTP_WEBHOOK_SECRET
  })

  it('posts the number, the code and the configured secret', async () => {
    process.env.OTP_WEBHOOK_URL = 'https://hooks.test/otp'
    process.env.OTP_WEBHOOK_SECRET = 's3cret'
    const fetchMock = jest.fn(async () => new Response('{}', { status: 200 }))
    global.fetch = fetchMock as any
    await expect(sendOtpWebhook('+48 500 111 222', '123456')).resolves.toBe(true)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://hooks.test/otp')
    expect(JSON.parse(String(init.body))).toEqual({ whatsapp: '48500111222', code: '123456', secret: 's3cret' })
  })

  it('sends nothing when the webhook is not configured', async () => {
    const fetchMock = jest.fn()
    global.fetch = fetchMock as any
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
    await expect(sendOtpWebhook('48500111222', '123456')).resolves.toBe(false)
    expect(fetchMock).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
