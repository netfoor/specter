import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { Sesion } from '../auth/useSesion'
import { Directorio } from './Directorio'

const simulado = vi.hoisted(() => ({
  lista: vi.fn(),
  sesion: { estado: 'anonimo' } as Sesion,
  cliente: vi.fn(),
}))

vi.mock('../../app/amplify', () => ({ backendConfigurado: true }))
vi.mock('../../app/datos', () => {
  const crear = (nombre: string) => () => {
    simulado.cliente(nombre)
    return { models: { PerfilPublico: { list: simulado.lista } } }
  }
  return { datosComoInvitado: crear('invitado'), datosComoUsuario: crear('usuario') }
})
vi.mock('../auth/useSesion', () => ({ useSesion: () => simulado.sesion }))

const perfil = (id: string, extra: object = {}) => ({
  id,
  nombre: `Abogado ${id}`,
  materias: ['CIVIL'],
  especialidades: [],
  ubicacion: 'Puebla',
  modalidad: 'AMBAS',
  aniosExperiencia: 5,
  verificadoManual: false,
  ...extra,
})

function renderizar() {
  render(
    <MemoryRouter>
      <Directorio />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  simulado.lista.mockReset()
  simulado.cliente.mockReset()
  simulado.sesion = { estado: 'anonimo' }
})

describe('Directorio', () => {
  it('lista los perfiles publicados con enlace al detalle', async () => {
    simulado.lista.mockResolvedValue({ data: [perfil('a'), perfil('b')] })
    renderizar()
    expect(await screen.findByRole('link', { name: 'Abogado a' })).toHaveAttribute(
      'href',
      '/abogados/a',
    )
    expect(screen.getByRole('link', { name: 'Abogado b' })).toBeInTheDocument()
    expect(screen.getByText('2 abogados')).toBeInTheDocument()
  })

  it('muestra el sello solo en los perfiles verificados', async () => {
    simulado.lista.mockResolvedValue({
      data: [perfil('a', { verificadoManual: true }), perfil('b')],
    })
    renderizar()
    await screen.findByRole('link', { name: 'Abogado a' })
    expect(screen.getAllByText('Verificado manualmente por Specter')).toHaveLength(1)
  })

  it('un invitado consulta como invitado y una persona con sesión como usuario', async () => {
    simulado.lista.mockResolvedValue({ data: [] })
    renderizar()
    await screen.findByText('Todavía no hay abogados publicados.')
    expect(simulado.cliente).toHaveBeenCalledWith('invitado')
  })

  it('filtra por materia y permite borrar los filtros', async () => {
    simulado.lista.mockResolvedValue({
      data: [perfil('a'), perfil('b', { materias: ['PENAL'] })],
    })
    renderizar()
    await screen.findByRole('link', { name: 'Abogado a' })

    await userEvent.selectOptions(screen.getByLabelText('Materia'), 'PENAL')
    expect(screen.queryByRole('link', { name: 'Abogado a' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abogado b' })).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Materia'), 'FISCAL')
    expect(
      screen.getByText('Ningún abogado coincide con tu búsqueda.'),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Borrar filtros' }))
    expect(within(screen.getByRole('list')).getAllByRole('listitem')).toHaveLength(2)
  })

  it('avisa cuando falla la carga', async () => {
    simulado.lista.mockRejectedValue(new Error('red'))
    renderizar()
    expect(await screen.findByText('No pudimos cargar el directorio')).toBeInTheDocument()
  })
})
