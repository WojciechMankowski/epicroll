import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MESSAGES } from '../validation'
import { RegistrationForm } from './RegistrationForm'

const empty = { orderNumber: '', firstName: '', lastInitial: '' }

describe('RegistrationForm', () => {
  it('pole numeru: klawiatura numeryczna i podpowiedź powiązana z polem', () => {
    render(<RegistrationForm values={empty} errors={{}} sending={false} onSubmit={vi.fn()} />)
    const order = screen.getByLabelText('Numer zamówienia')
    expect(order).toHaveAttribute('inputmode', 'numeric')
    expect(order).toHaveAccessibleDescription('7 cyfr, np. 3078012')
  })

  it('komunikat błędu jest opisem pola, a fokus trafia na pierwsze błędne pole', () => {
    render(
      <RegistrationForm
        values={empty}
        errors={{ firstName: MESSAGES.firstName, lastInitial: MESSAGES.lastInitial }}
        sending={false}
        onSubmit={vi.fn()}
      />,
    )
    const first = screen.getByLabelText('Imię')
    expect(first).toHaveFocus()
    expect(first).toHaveAttribute('aria-invalid', 'true')
    expect(first).toHaveAccessibleDescription(MESSAGES.firstName)
  })

  it('pole-pułapka jest poza kolejnością tabulacji', async () => {
    const user = userEvent.setup()
    render(<RegistrationForm values={empty} errors={{}} sending={false} onSubmit={vi.fn()} />)
    await user.tab()
    await user.tab()
    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Zarejestruj' })).toHaveFocus()
  })

  it('przekazuje wpisane wartości i pole-pułapkę', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<RegistrationForm values={empty} errors={{}} sending={false} onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Numer zamówienia'), '3078012')
    await user.type(screen.getByLabelText('Imię'), 'Anna')
    await user.type(screen.getByLabelText('Pierwsza litera nazwiska'), 'k')
    await user.click(screen.getByRole('button', { name: 'Zarejestruj' }))
    expect(onSubmit).toHaveBeenCalledWith({ orderNumber: '3078012', firstName: 'Anna', lastInitial: 'k' }, '')
  })

  it('w trakcie wysyłania pola i przycisk są zablokowane', () => {
    render(<RegistrationForm values={empty} errors={{}} sending onSubmit={vi.fn()} />)
    expect(screen.getByLabelText('Imię')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Rejestruję…' })).toBeDisabled()
  })
})
