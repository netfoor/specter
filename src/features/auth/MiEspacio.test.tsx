import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Sesion } from './useSesion'
import { MiEspacio } from './MiEspacio'

const sesionActual = vi.hoisted(() => ({ valor: { estado: 'anonimo' } as Sesion }))
vi.mock('./useSesion', () => ({ useSesion: () => sesionActual.valor }))
vi.mock('aws-amplify/auth', () => ({ signOut: vi.fn() }))

function renderizar() {
  render(
    <MemoryRouter initialEntries={['/mi-espacio']}>
      <Routes>
        <Route path="/mi-espacio" element={<MiEspacio />} />
        <Route path="/ingresar" element={<p>Pantalla de ingreso</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('MiEspacio', () => {
  it('manda a ingresar a quien no tiene sesión', () => {
    sesionActual.valor = { estado: 'anonimo' }
    renderizar()
    expect(screen.getByText('Pantalla de ingreso')).toBeInTheDocument()
  })

  it('muestra el nombre y el rol de la persona autenticada', () => {
    sesionActual.valor = { estado: 'autenticado', nombre: 'Ana Pérez', rol: 'ABOGADO' }
    renderizar()
    expect(screen.getByRole('heading', { name: 'Hola, Ana Pérez' })).toBeInTheDocument()
    expect(screen.getByText(/cuenta de abogado/i)).toBeInTheDocument()
  })

  it('avisa cuando la cuenta no tiene rol', () => {
    sesionActual.valor = { estado: 'autenticado', nombre: 'Ana', rol: null }
    renderizar()
    expect(screen.getByText(/no tiene un rol asignado/i)).toBeInTheDocument()
  })
})
