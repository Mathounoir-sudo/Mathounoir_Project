import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

function Boom(): never {
  throw new TypeError("Cannot read properties of undefined (reading 'split')")
}

afterEach(cleanup)

describe('écran de secours', () => {
  it('affiche le détail technique de l’erreur au lieu de le cacher', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    )
    expect(screen.getByText('Oups, un problème d’affichage')).toBeTruthy()
    expect(screen.getByText(/TypeError : Cannot read properties of undefined \(reading 'split'\)/)).toBeTruthy()
    expect(screen.getByText(/Boom/)).toBeTruthy()
    spy.mockRestore()
  })
})
