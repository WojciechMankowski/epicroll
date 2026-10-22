import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('pokazuje nazwę, datę i miejsce wydarzenia', () => {
    render(<App />)
    expect(screen.getByRole('heading', { level: 1, name: 'EPIC ROLL' })).toBeInTheDocument()
    expect(screen.getByText(/5 grudnia 2026/)).toHaveTextContent('Conradinum, Gdańsk')
  })
})
