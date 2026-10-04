// Pure tests for the English -> Polish UI translation. Run alone with:
//   npx jest src/tests/translate.spec.ts --config '{"preset":"ts-jest","testEnvironment":"node","moduleNameMapper":{"^@/(.*)$":"<rootDir>/src/$1"}}'
import { describe, expect, it } from '@jest/globals'

import { toPolish } from '@/i18n/translate'

describe('toPolish', () => {
  it('translates known texts, keeping surrounding spaces', () => {
    expect(toPolish('Dashboard')).toBe('Pulpit')
    expect(toPolish('  Hold this bed ')).toBe('  Zarezerwuj to łóżko ')
    expect(toPolish('Mark   paid')).toBe('Oznacz jako opłaconą')
  })

  it('fills texts with names, numbers and dates', () => {
    expect(toPolish('Welcome back, Anna')).toBe('Witaj ponownie, Anna')
    expect(toPolish('5 / 7 beds')).toBe('5 / 7 łóżek')
    expect(toPolish('2 on hold, awaiting payment')).toBe('2 wstrzymane, oczekują na płatność')
    expect(toPolish('1 100 PLN/month')).toBe('1 100 PLN/mies.')
    expect(toPolish('Booked 04 Oct, 12:19')).toBe('Zarezerwowano 04 Oct, 12:19')
    expect(toPolish('Room 102, Bed C')).toBe('Pokój 102, Łóżko C')
    expect(toPolish('KLS-ABC234: Paid.')).toBe('KLS-ABC234: Opłacona.')
    expect(toPolish('Total Revenue (All Time)')).toBe('Przychód (cały okres)')
  })

  it('translates server messages line by line', () => {
    expect(toPolish('You already have a booking: KLS-ABC234 (Room 102, Bed C — Bukowiecka 11).\n\nYou can book only one bed. To book a different bed, cancel this booking first, then book again.'))
      .toBe('Masz już rezerwację: KLS-ABC234 (Pokój 102, Łóżko C — Bukowiecka 11).\n\nMożesz zarezerwować tylko jedno łóżko. Aby zarezerwować inne, najpierw anuluj tę rezerwację, a potem zarezerwuj ponownie.')
  })

  it('leaves names, data and unknown texts alone', () => {
    expect(toPolish('Anna Nowak')).toBeNull()
    expect(toPolish('KLS-ABC234')).toBeNull()
    expect(toPolish('48500111222')).toBeNull()
    expect(toPolish('Bukowiecka 11')).toBeNull()
  })
})

describe('toPolish lists and labels', () => {
  it('translates each part of a " · " list', () => {
    expect(toPolish('Kitchen · Washroom · Washing Machine · WiFi')).toBe('Kuchnia · Łazienka · Pralka · WiFi')
    expect(toPolish('Kitchen (shared) · WiFi')).toBe('Kuchnia (wspólne) · WiFi')
    expect(toPolish('Bedroom 2 · Bed A')).toBe('Sypialnia 2 · Łóżko A')
    expect(toPolish('FRONT studio 1 · Bedroom 2')).toBe('FRONT studio 1 · Sypialnia 2')
    expect(toPolish('Apartment 102 · Bedroom 1')).toBe('Apartament 102 · Sypialnia 1')
    expect(toPolish('· Female')).toBe('· Kobieta')
    expect(toPolish('· Arrival 20/11/2026')).toBe('· przyjazd 20/11/2026')
  })
})

it('translates the popup sentence around the booked room', () => {
  expect(toPolish(' (FRONT studio 1 · Bedroom 2, Bedroom 2 · Bed A — Bukowiecka 11). You can book only one bed.'))
    .toBe(' (FRONT studio 1 · Sypialnia 2, Sypialnia 2 · Łóżko A — Bukowiecka 11). Możesz zarezerwować tylko jedno łóżko.')
})
