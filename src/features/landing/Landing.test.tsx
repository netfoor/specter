import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from '../../app/App'
import { TEXTO_DEMO } from '../../ui/DemoBanner'
import { PROXIMAMENTE, RECORRIDO } from './contenido'

function renderizar(ruta = '/') {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Landing', () => {
  it('muestra siempre el aviso de entorno de demostración', () => {
    renderizar()
    expect(screen.getByRole('note')).toHaveTextContent(TEXTO_DEMO)
  })

  it('lista todas las etapas del recorrido', () => {
    renderizar()
    const recorrido = screen.getByRole('group', { name: /recorrido de un asunto/i })
    expect(recorrido.querySelectorAll('li')).toHaveLength(RECORRIDO.length)
  })

  it('declara como no existentes las capacidades futuras', () => {
    renderizar()
    expect(screen.getByRole('heading', { name: 'Próximamente' })).toBeInTheDocument()
    expect(screen.getByText(/estas capacidades no existen todavía/i)).toBeInTheDocument()
    for (const item of PROXIMAMENTE) {
      expect(screen.getByText(item)).toBeInTheDocument()
    }
  })

  it('muestra el desglose del ejemplo: 1,000 de comisión y 9,000 para el abogado', () => {
    renderizar()
    expect(screen.getByText('$1,000.00')).toBeInTheDocument()
    expect(screen.getByText('$9,000.00')).toBeInTheDocument()
  })

  it('aclara que NIA no sustituye a un abogado', () => {
    renderizar()
    expect(screen.getByText(/NIA no sustituye a un abogado/i)).toBeInTheDocument()
  })

  it('responde con una página útil en rutas desconocidas', () => {
    renderizar('/no-existe')
    expect(
      screen.getByRole('heading', { name: 'No encontramos esta página' }),
    ).toBeInTheDocument()
  })
})
