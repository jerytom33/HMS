// Pure tests for recognising profile photos by their bytes. Run alone with:
//   npx jest src/tests/studentPhoto.spec.ts --config '{"preset":"ts-jest","testEnvironment":"node","moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1"}}'
import { describe, expect, it } from '@jest/globals'

import { staffPhotoUrl } from '@/lib/photoClient'
import { sniffPhotoType } from '@/lib/studentPhoto'

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)))

describe('profile photos', () => {
  it('accepts JPEG, PNG and WebP by their content', () => {
    expect(sniffPhotoType(bytes([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
    expect(sniffPhotoType(bytes([0x89], 'PNG\r\n'))).toBe('image/png')
    expect(sniffPhotoType(bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 '))).toBe('image/webp')
  })

  it('refuses anything else, whatever it is called', () => {
    expect(sniffPhotoType(bytes('%PDF-1.7'))).toBeNull()
    expect(sniffPhotoType(bytes('<svg onload=alert(1)>'))).toBeNull()
    expect(sniffPhotoType(bytes('<html>'))).toBeNull()
    expect(sniffPhotoType(new Uint8Array())).toBeNull()
  })

  it('builds the staff photo link only when a photo exists', () => {
    expect(staffPhotoUrl({ id: 's1', photoUploadedAt: '2026-10-10T10:00:00.000Z' })).toBe('/api/staff/students/s1/photo?v=2026-10-10T10%3A00%3A00.000Z')
    expect(staffPhotoUrl({ id: 's1' })).toBeNull()
    expect(staffPhotoUrl(null)).toBeNull()
  })
})
