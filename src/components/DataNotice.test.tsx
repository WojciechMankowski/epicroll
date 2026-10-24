import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataNotice } from './DataNotice'

describe('DataNotice', () => {
  it('pola puste: pełne zdania bez administratora, terminu i kontaktu', () => {
    render(<DataNotice controller="" retention="" contact="" />)
    expect(screen.getByTestId('data-notice')).toHaveTextContent(
      'Numer zamówienia, imię i pierwszą literę nazwiska zbieramy, żeby potwierdzić Twój bilet przy wejściu na EPIC ROLL. '
      + 'Dane trafiają do arkusza obsługi wydarzenia. '
      + 'Na tym telefonie zostaje zapis rejestracji, żeby ekran z numerem był pod ręką.',
    )
  })

  it('pola uzupełnione: administrator, termin usunięcia i kontakt', () => {
    render(<DataNotice controller="Stowarzyszenie Przykład" retention="do 31 grudnia 2026" contact="dane@example.pl" />)
    const text = screen.getByTestId('data-notice')
    expect(text).toHaveTextContent('nazwiska zbiera Stowarzyszenie Przykład, żeby potwierdzić')
    expect(text).toHaveTextContent('zostaną usunięte do 31 grudnia 2026.')
    expect(text).toHaveTextContent('Pytania: dane@example.pl.')
  })
})
