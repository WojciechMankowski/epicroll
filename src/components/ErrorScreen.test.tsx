import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ErrorScreen } from './ErrorScreen'

const values = { orderNumber: '3023567', firstName: 'Jasmina', lastInitial: 'K' }

describe('ErrorScreen', () => {
  it.each([
    ['DUPLICATE', 'Ta rejestracja już istnieje', 'Ta osoba jest już zarejestrowana z tym numerem zamówienia. Podejdź do obsługi.'],
    ['BUSY', 'Wiele zgłoszeń naraz', 'Wiele osób rejestruje się naraz. Spróbuj za chwilę.'],
    ['SERVER', 'Zgłoszenie nie dotarło', 'Nie udało się wysłać. Sprawdź internet i spróbuj ponownie.'],
  ] as const)('%s: tytuł i komunikat ze SPEC.md', (error, title, message) => {
    render(<ErrorScreen error={error} values={values} onRetry={vi.fn()} onEdit={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(message)
  })

  it('pokazuje wpisane dane, żeby było widać literówkę', () => {
    render(<ErrorScreen error="DUPLICATE" values={values} onRetry={vi.fn()} onEdit={vi.fn()} />)
    expect(screen.getByText('3023567')).toBeInTheDocument()
    expect(screen.getByText('Jasmina K.')).toBeInTheDocument()
  })

  it('fokus trafia na tytuł', () => {
    render(<ErrorScreen error="SERVER" values={values} onRetry={vi.fn()} onEdit={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 2 })).toHaveFocus()
  })

  it('DUPLICATE: tylko „Popraw dane”, bez ponawiania', async () => {
    const onEdit = vi.fn()
    render(<ErrorScreen error="DUPLICATE" values={values} onRetry={vi.fn()} onEdit={onEdit} />)
    expect(screen.queryByRole('button', { name: 'Spróbuj ponownie' })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Popraw dane' }))
    expect(onEdit).toHaveBeenCalledOnce()
  })

  it.each(['BUSY', 'SERVER'] as const)('%s: „Spróbuj ponownie” i „Popraw dane”', async (error) => {
    const onRetry = vi.fn()
    const onEdit = vi.fn()
    const user = userEvent.setup()
    render(<ErrorScreen error={error} values={values} onRetry={onRetry} onEdit={onEdit} />)
    await user.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }))
    await user.click(screen.getByRole('button', { name: 'Popraw dane' }))
    expect(onRetry).toHaveBeenCalledOnce()
    expect(onEdit).toHaveBeenCalledOnce()
  })
})
