import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { PerfilDetalle } from './PerfilDetalle'

const simulado = vi.hoisted(() => ({ obtener: vi.fn() }))

vi.mock('../../app/amplify', () => ({ backendConfigurado: true }))
vi.mock('../../app/datos', () => {
  const cliente = () => ({ models: { PerfilPublico: { get: simulado.obtener } } })
  return { datosComoInvitado: cliente, datosComoUsuario: cliente }
})
vi.mock('../auth/useSesion', () => ({ useSesion: () => ({ estado: 'anonimo' }) }))

function renderizar() {
  render(
    <MemoryRouter initialEntries={['/abogados/x1']}>
      <Routes>
        <Route path="/abogados/:id" element={<PerfilDetalle />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('PerfilDetalle', () => {
  it('muestra los datos del perfil publicado', async () => {
    simulado.obtener.mockResolvedValue({
      data: {
        id: 'x1',
        nombre: 'Ana Pérez',
        materias: ['CIVIL', 'FAMILIAR'],
        especialidades: ['Divorcios'],
        ubicacion: 'Puebla',
        jurisdicciones: [],
        idiomas: ['Español'],
        aniosExperiencia: 8,
        modalidad: 'VIRTUAL',
        honorariosDesde: 5000,
        honorariosHasta: 20000,
        disponibilidad: 'Lunes a viernes',
        semblanza: 'Litigante con experiencia.',
        verificadoManual: true,
      },
    })
    renderizar()
    expect(await screen.findByRole('heading', { name: 'Ana Pérez' })).toBeInTheDocument()
    expect(screen.getByText('Verificado manualmente por Specter')).toBeInTheDocument()
    expect(screen.getByText('Civil, Familiar')).toBeInTheDocument()
    expect(screen.getByText('$5,000 a $20,000')).toBeInTheDocument()
    expect(screen.getByText('8 años')).toBeInTheDocument()
    expect(screen.getByText('Litigante con experiencia.')).toBeInTheDocument()
    expect(screen.queryByText('Jurisdicciones')).not.toBeInTheDocument()
  })

  it('no inventa el sello cuando el perfil no está verificado', async () => {
    simulado.obtener.mockResolvedValue({
      data: {
        id: 'x1',
        nombre: 'Beto',
        materias: ['PENAL'],
        ubicacion: 'Cholula',
        modalidad: 'AMBAS',
        verificadoManual: false,
      },
    })
    renderizar()
    await screen.findByRole('heading', { name: 'Beto' })
    expect(
      screen.queryByText('Verificado manualmente por Specter'),
    ).not.toBeInTheDocument()
  })

  it('explica cuando el perfil no existe o no está publicado', async () => {
    simulado.obtener.mockResolvedValue({ data: null })
    renderizar()
    expect(await screen.findByText('Este perfil no está disponible')).toBeInTheDocument()
  })
})
