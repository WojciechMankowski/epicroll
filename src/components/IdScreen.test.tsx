import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { StoredRegistration } from '../storage'
import { formatRegisteredAt } from '../format'
import { IdScreen } from './IdScreen'

const registration: StoredRegistration = {
  id: 17,
  orderNumber: '3023567',
  firstName: 'Jasmina',
  lastInitial: 'K',
  nickname: 'ksywa 4',
  ticketType: 'Gość',
  registeredAt: '2026-12-05T08:42:05.000Z',
}

describe('IdScreen', () => {
  it('pokazuje numer, osobę, ksywę, typ biletu, zamówienie, godzinę i polecenie (F10)', () => {
    render(<IdScreen registration={registration} saved />)
    expect(screen.getByRole('img', { name: 'Numer rejestracji 17' })).toHaveTextContent('17')
    expect(screen.getByText('Pokaż ten ekran obsłudze.')).toBeInTheDocument()
    expect(screen.getByText('Jasmina K.')).toBeInTheDocument()
    expect(screen.getByText('ksywa 4')).toBeInTheDocument()
    expect(screen.getByText('Gość')).toBeInTheDocument()
    expect(screen.getByText('Zamówienie 3023567')).toBeInTheDocument()
    expect(screen.getByText('Zarejestrowano 5 grudnia, 09:42')).toBeInTheDocument()
    expect(screen.queryByText(/zrzut ekranu/)).not.toBeInTheDocument()
  })

  it('osoba spoza listy: bez ksywy i typu biletu (T9)', () => {
    render(<IdScreen registration={{ ...registration, nickname: null, ticketType: null }} saved />)
    expect(screen.queryByText('ksywa 4')).not.toBeInTheDocument()
    expect(screen.queryByText('Gość')).not.toBeInTheDocument()
    expect(screen.getByText('Zamówienie 3023567')).toBeInTheDocument()
  })

  it('zapis w przeglądarce się nie udał: prośba o zrzut ekranu (T8)', () => {
    render(<IdScreen registration={registration} saved={false} />)
    expect(screen.getByText('Ta przeglądarka nie zapamięta rejestracji. Zrób zrzut ekranu.')).toBeInTheDocument()
  })

  it.each([5, 17, 128])('numer %i mieści się w kostce (rozmiar zależny od liczby cyfr)', (id) => {
    render(<IdScreen registration={{ ...registration, id }} saved />)
    const text = screen.getByRole('img').querySelector('text')
    expect(text).toHaveTextContent(String(id))
    expect(Number(text?.getAttribute('font-size'))).toBeLessThanOrEqual(100)
  })
})

describe('formatRegisteredAt', () => {
  it('czas polski: zima UTC+1', () => {
    expect(formatRegisteredAt('2026-12-05T23:30:00.000Z')).toBe('Zarejestrowano 6 grudnia, 00:30')
  })

  it('czas polski: lato UTC+2', () => {
    expect(formatRegisteredAt('2026-10-22T13:38:50.726Z')).toBe('Zarejestrowano 22 października, 15:38')
  })

  it('błędna data: brak linii z godziną', () => {
    expect(formatRegisteredAt('wczoraj')).toBeNull()
  })
})
