// Pure tests for portal passwords, personal links, sessions and login limits. Run alone with:
//   npx jest src/tests/studentPassword.spec.ts --config '{"preset":"ts-jest","testEnvironment":"node","moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1"}}'
import { beforeAll, describe, expect, it } from '@jest/globals'
import { createHmac } from 'crypto'

import { IP_LIMITS, NUMBER_LIMITS, waitSeconds } from '@/lib/loginLimits'
import { hashPassword, linkToken, passwordMatches, passwordProblem, signSession, signToken, verifySession, verifyToken } from '@/lib/studentAuth'

beforeAll(() => {
  process.env.PAYLOAD_SECRET = 'unit-test-secret'
})

describe('passwords', () => {
  it('stores a salted hash, never the password', async () => {
    const a = await hashPassword('correct horse')
    const b = await hashPassword('correct horse')
    expect(a).toMatch(/^scrypt\$/)
    expect(a).not.toContain('correct horse')
    expect(a).not.toBe(b)
  })

  it('accepts the right password only', async () => {
    const stored = await hashPassword('correct horse')
    await expect(passwordMatches('correct horse', stored)).resolves.toBe(true)
    await expect(passwordMatches('correct hors', stored)).resolves.toBe(false)
    await expect(passwordMatches('anything', undefined)).resolves.toBe(false)
  })

  it('asks for at least 8 characters', () => {
    expect(passwordProblem('short')).toMatch(/8/)
    expect(passwordProblem('        ')).toMatch(/spaces/)
    expect(passwordProblem(12345678)).not.toBeNull()
    expect(passwordProblem('long enough')).toBeNull()
  })
})

describe('personal link and session tokens', () => {
  it('accepts a fresh link and carries the password version', () => {
    expect(verifyToken(linkToken('stu1', '48500111222', 2), 'l')).toMatchObject({ sid: 'stu1', wa: '48500111222', pv: 2 })
  })

  it('rejects an expired link', () => {
    expect(verifyToken(linkToken('stu1', '48500111222', 0, Date.now() - 8 * 86400_000), 'l')).toBeNull()
  })

  it('rejects a forged link', () => {
    const real = linkToken('stu1', '48500111222', 0)
    const forged = Buffer.from(JSON.stringify({ k: 'l', sid: 'other', wa: '48500111222', pv: 0, exp: Date.now() + 1e6 })).toString('base64url')
    expect(verifyToken(`${forged}.${real.split('.')[1]}`, 'l')).toBeNull()
  })

  it('never lets a link act as a session or the other way round', () => {
    expect(verifySession(linkToken('stu1', '48500111222', 0))).toBeNull()
    expect(verifyToken(signSession('stu1', '48500111222', 0), 'l')).toBeNull()
    expect(verifySession(signToken('s', 'stu1', '48500111222', 3, Date.now() + 1e6))).toMatchObject({ pv: 3 })
  })

  it('reads sessions from before passwords as version 0', () => {
    const body = Buffer.from(JSON.stringify({ sid: 'stu1', wa: '48500111222', exp: Date.now() + 1e6 })).toString('base64url')
    const mac = createHmac('sha256', 'unit-test-secret').update(body).digest('base64url')
    expect(verifySession(`${body}.${mac}`)).toMatchObject({ sid: 'stu1', pv: 0 })
  })
})

describe('login limits', () => {
  const now = new Date('2026-10-04T12:00:00Z')
  const ago = (s: number) => new Date(now.getTime() - s * 1000)

  it('allows 5 wrong tries for a number, then waits out the 15 minutes', () => {
    const four = [ago(800), ago(600), ago(400), ago(200)]
    expect(waitSeconds(four, NUMBER_LIMITS, now)).toBe(0)
    expect(waitSeconds([...four, ago(10)], NUMBER_LIMITS, now)).toBe(100)
    expect(waitSeconds([ago(901), ...four], NUMBER_LIMITS, now)).toBe(0)
  })

  it('limits one IP across numbers', () => {
    const thirty = Array.from({ length: 30 }, (_, i) => ago(i))
    expect(waitSeconds(thirty, IP_LIMITS, now)).toBeGreaterThan(0)
    expect(waitSeconds(thirty.slice(1), IP_LIMITS, now)).toBe(0)
  })

  it('never asks anyone to wait more than 15 minutes', () => {
    const burst = Array.from({ length: 100 }, (_, i) => ago(i))
    expect(waitSeconds(burst, NUMBER_LIMITS, now)).toBeLessThanOrEqual(900)
    expect(waitSeconds(burst, IP_LIMITS, now)).toBeLessThanOrEqual(900)
  })
})
