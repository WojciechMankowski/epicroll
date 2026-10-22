import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RegisterRequest, RegisterResponse } from './api'
import App from './App'
import type { StoredRegistration } from './storage'

const success: RegisterResponse = {
  ok: true, id: 17, nickname: 'ksywa 4', ticketType: 'Gość', registeredAt: '2026-12-05T08:42:05.000Z',
}

const stored: StoredRegistration = {
  id: 5, orderNumber: '3023567', firstName: 'Jasmina', lastInitial: 'K',
  nickname: 'ksywa 4', ticketType: 'Gość', registeredAt: '2026-12-05T08:42:05.000Z',
}

function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial))
  return {
    get length() { return data.size },
    clear: () => data.clear(),
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => { data.set(k, String(v)) },
    removeItem: (k) => { data.delete(k) },
  }
}

/** register zwracający kolejno podane odpowiedzi. */
function fakeRegister(...responses: RegisterResponse[]) {
  return vi.fn(async (_request: RegisterRequest) => responses.shift() ?? success)
}

async function fillAndSubmit(values = { orderNumber: '3023 567', firstName: ' Jasmina ', lastInitial: 'k' }) {
  const user = userEvent.setup()
  if (values.orderNumber) await user.type(screen.getByLabelText('Numer zamówienia'), values.orderNumber)
  if (values.firstName) await user.type(screen.getByLabelText('Imię'), values.firstName)
  if (values.lastInitial) await user.type(screen.getByLabelText('Pierwsza litera nazwiska'), values.lastInitial)
  await user.click(screen.getByRole('button', { name: 'Zarejestruj' }))
  return user
}

describe('App', () => {
  it('pokazuje nazwę, datę i miejsce wydarzenia', () => {
    render(<App deps={{ register: fakeRegister(), storage: memoryStorage() }} />)
    expect(screen.getByRole('heading', { level: 1, name: 'EPIC ROLL' })).toBeInTheDocument()
    expect(screen.getByText(/5 grudnia 2026/)).toHaveTextContent('Conradinum, Gdańsk')
  })

  it('wpis w localStorage przy starcie: ekran z ID bez formularza i bez wywołania API (T2)', () => {
    const register = fakeRegister()
    const storage = memoryStorage({ 'rejestracja-epic-roll-v1': JSON.stringify(stored) })
    render(<App deps={{ register, storage }} />)
    expect(screen.getByTestId('registration-id')).toHaveTextContent('5')
    expect(screen.getByText('Pokaż ten ekran obsłudze.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Zarejestruj' })).not.toBeInTheDocument()
    expect(register).not.toHaveBeenCalled()
  })

  it('puste pola: komunikaty przy polach, bez wywołania API', async () => {
    const register = fakeRegister()
    render(<App deps={{ register, storage: memoryStorage() }} />)
    await fillAndSubmit({ orderNumber: '', firstName: '', lastInitial: '' })
    expect(screen.getAllByText('Uzupełnij to pole.')).toHaveLength(3)
    expect(screen.getByLabelText('Imię')).toHaveAttribute('aria-invalid', 'true')
    expect(register).not.toHaveBeenCalled()
  })

  it('poprawne dane: wysyła znormalizowane wartości, pokazuje ekran z ID i zapisuje go (T1)', async () => {
    const register = fakeRegister(success)
    const storage = memoryStorage()
    render(<App deps={{ register, storage }} />)
    await fillAndSubmit()
    expect(register).toHaveBeenCalledWith({ orderNumber: '3023567', firstName: 'Jasmina', lastInitial: 'K', website: '' })
    expect(await screen.findByTestId('registration-id')).toHaveTextContent('17')
    expect(screen.getByText('Jasmina K.')).toBeInTheDocument()
    expect(screen.getByText('Ksywa: ksywa 4')).toBeInTheDocument()
    expect(screen.getByText('Typ biletu: Gość')).toBeInTheDocument()
    expect(JSON.parse(storage.getItem('rejestracja-epic-roll-v1') ?? '{}')).toMatchObject({ id: 17, orderNumber: '3023567' })
  })

  it('w trakcie wysyłania przycisk jest zablokowany i drugie kliknięcie nic nie wysyła', async () => {
    let resolve: (r: RegisterResponse) => void = () => {}
    const register = vi.fn(() => new Promise<RegisterResponse>((r) => { resolve = r }))
    render(<App deps={{ register, storage: memoryStorage() }} />)
    const user = await fillAndSubmit()
    const button = screen.getByRole('button', { name: 'Rejestruję…' })
    expect(button).toBeDisabled()
    await user.click(button)
    expect(register).toHaveBeenCalledOnce()
    resolve(success)
    expect(await screen.findByTestId('registration-id')).toHaveTextContent('17')
  })

  it('VALIDATION z serwera: powrót do formularza z komunikatem przy polu i wpisanymi danymi', async () => {
    const register = fakeRegister({ ok: false, error: 'VALIDATION', field: 'firstName' })
    render(<App deps={{ register, storage: memoryStorage() }} />)
    await fillAndSubmit()
    expect(await screen.findByText('Wpisz imię (same litery).')).toBeInTheDocument()
    expect(screen.getByLabelText('Numer zamówienia')).toHaveValue('3023567')
  })

  it('DUPLICATE: komunikat bez ponawiania, „Popraw dane” wraca do formularza (T3)', async () => {
    const register = fakeRegister({ ok: false, error: 'DUPLICATE' })
    const user = userEvent.setup()
    render(<App deps={{ register, storage: memoryStorage() }} />)
    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Ta osoba jest już zarejestrowana z tym numerem zamówienia.')
    expect(screen.queryByRole('button', { name: 'Spróbuj ponownie' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Popraw dane' }))
    expect(screen.getByLabelText('Imię')).toHaveValue('Jasmina')
  })

  it('BUSY: komunikat i „Spróbuj ponownie” wysyła te same dane jeszcze raz', async () => {
    const register = fakeRegister({ ok: false, error: 'BUSY' }, success)
    const user = userEvent.setup()
    render(<App deps={{ register, storage: memoryStorage() }} />)
    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Wiele osób rejestruje się naraz.')
    await user.click(screen.getByRole('button', { name: 'Spróbuj ponownie' }))
    expect(await screen.findByTestId('registration-id')).toHaveTextContent('17')
    expect(register).toHaveBeenCalledTimes(2)
    expect(register.mock.calls[1][0]).toEqual(register.mock.calls[0][0])
  })

  it('SERVER: komunikat o braku połączenia (T6)', async () => {
    render(<App deps={{ register: fakeRegister({ ok: false, error: 'SERVER' }), storage: memoryStorage() }} />)
    await fillAndSubmit()
    expect(await screen.findByRole('alert')).toHaveTextContent('Nie udało się wysłać. Sprawdź internet i spróbuj ponownie.')
  })

  it('zapis w przeglądarce niemożliwy: ekran z ID i prośba o zrzut ekranu (T8)', async () => {
    render(<App deps={{ register: fakeRegister(success), storage: null }} />)
    await fillAndSubmit()
    expect(await screen.findByTestId('registration-id')).toHaveTextContent('17')
    expect(screen.getByText(/Zrób zrzut ekranu/)).toBeInTheDocument()
  })

  it('osoba spoza listy: bez ksywy i typu biletu na ekranie (T9)', async () => {
    const outsider: RegisterResponse = { ...success, nickname: null, ticketType: null } as RegisterResponse
    render(<App deps={{ register: fakeRegister(outsider), storage: memoryStorage() }} />)
    await fillAndSubmit()
    expect(await screen.findByTestId('registration-id')).toHaveTextContent('17')
    expect(screen.queryByText(/Ksywa:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Typ biletu:/)).not.toBeInTheDocument()
  })
})
