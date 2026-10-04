// Pure tests for recognising passport copy files by their bytes. Run alone with:
//   npx jest src/tests/passportCopy.spec.ts --config '{"preset":"ts-jest","testEnvironment":"node","moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1"}}'
import { describe, expect, it } from '@jest/globals'

import { copyExtension, sniffCopyType } from '@/lib/passportCopy'

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === 'string' ? [...p].map((c) => c.charCodeAt(0)) : p)))

describe('passport copy type', () => {
  it('recognises photos and PDFs by their content', () => {
    expect(sniffCopyType(bytes([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg')
    expect(sniffCopyType(bytes([0x89], 'PNG\r\n'))).toBe('image/png')
    expect(sniffCopyType(bytes('%PDF-1.7'))).toBe('application/pdf')
    expect(sniffCopyType(bytes('RIFF', [0, 0, 0, 0], 'WEBPVP8 '))).toBe('image/webp')
    expect(sniffCopyType(bytes([0, 0, 0, 24], 'ftypheic'))).toBe('image/heic')
  })

  it('refuses anything else, whatever its name', () => {
    expect(sniffCopyType(bytes('<html><script>'))).toBeNull()
    expect(sniffCopyType(bytes('GIF89a'))).toBeNull()
    expect(sniffCopyType(bytes([0x4d, 0x5a]))).toBeNull()
    expect(sniffCopyType(new Uint8Array())).toBeNull()
  })

  it('names files by type', () => {
    expect(copyExtension('application/pdf')).toBe('pdf')
    expect(copyExtension('image/heic')).toBe('heic')
  })
})
