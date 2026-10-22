import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { Sesion } from '../auth/useSesion'
import { EditarPerfil } from './EditarPerfil'

const simulado = vi.hoisted(() => ({
  lista: vi.fn(),
  crear: vi.fn(),
  actualizar: vi.fn(),
  sesion: {} as Sesion,
}))

vi.mock('../../app/amplify', () => ({ backendConfigurado: true }))
vi.mock('../../app/datos', () => ({
  datosComoUsuario: () => ({
    models: {
      PerfilAbogado: {
        list: simulado.lista,
        create: simulado.crear,
        update: simulado.actualizar,
      },
    },
  }),
}))
vi.mock('../auth/useSesion', () => ({ useSesion: () => simulado.sesion }))

const abogado: Sesion = { estado: 'autenticado', nombre: 'Beto Gil', rol: 'ABOGADO' }

function renderizar() {
  render(
    <MemoryRouter>
      <EditarPerfil />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  simulado.lista.mockReset().mockResolvedValue({ data: [] })
  simulado.crear.mockReset()
  simulado.actualizar.mockReset()
  simulado.sesion = abogado
})

describe('EditarPerfil', () => {
  it('solo está disponible para abogados', () => {
    simulado.sesion = { estado: 'autenticado', nombre: 'Ana', rol: 'CLIENTE' }
    renderizar()
    expect(screen.getByText('Esta sección es para abogados')).toBeInTheDocument()
  })

  it('precarga el nombre de la cuenta y avisa que aún no hay perfil', async () => {
    renderizar()
    expect(await screen.findByLabelText('Nombre completo')).toHaveValue('Beto Gil')
    expect(screen.getByText(/Aún no tienes perfil/)).toBeInTheDocument()
  })

  it('marca los campos obligatorios y no guarda un formulario incompleto', async () => {
    renderizar()
    await userEvent.clear(await screen.findByLabelText('Nombre completo'))
    await userEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }))
    expect(screen.getByText('Escribe tu nombre completo.')).toBeInTheDocument()
    expect(screen.getByText('Elige al menos una materia.')).toBeInTheDocument()
    expect(simulado.crear).not.toHaveBeenCalled()
  })

  it('crea el perfil sin enviar publicado ni verificación', async () => {
    simulado.crear.mockResolvedValue({ data: { id: 'p1', nombre: 'Beto Gil' } })
    renderizar()
    await screen.findByLabelText('Nombre completo')
    await userEvent.type(screen.getByLabelText('Ciudad donde ejerces'), 'Puebla')
    await userEvent.click(screen.getByLabelText('Civil'))
    await userEvent.selectOptions(screen.getByLabelText('Modalidad de atención'), 'AMBAS')
    await userEvent.type(
      screen.getByLabelText('Especialidades'),
      'Arrendamiento, Contratos',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }))

    expect(simulado.crear).toHaveBeenCalledTimes(1)
    const enviado = simulado.crear.mock.calls[0][0]
    expect(enviado).toMatchObject({
      nombre: 'Beto Gil',
      materias: ['CIVIL'],
      modalidad: 'AMBAS',
      ubicacion: 'Puebla',
      especialidades: ['Arrendamiento', 'Contratos'],
    })
    expect(enviado).not.toHaveProperty('publicado')
    expect(enviado).not.toHaveProperty('estadoVerificacion')
    expect(await screen.findByText('Perfil guardado.')).toBeInTheDocument()
  })

  it('edita un perfil existente y explica que sigue pendiente de revisión', async () => {
    simulado.lista.mockResolvedValue({
      data: [
        {
          id: 'p1',
          nombre: 'Beto Gil',
          materias: ['PENAL'],
          ubicacion: 'Cholula',
          modalidad: 'VIRTUAL',
          publicado: null,
          estadoVerificacion: null,
        },
      ],
    })
    simulado.actualizar.mockResolvedValue({ data: { id: 'p1', publicado: null } })
    renderizar()
    expect(await screen.findByLabelText('Ciudad donde ejerces')).toHaveValue('Cholula')
    expect(screen.getByText(/pendiente de revisión/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }))
    expect(simulado.actualizar).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'p1' }),
    )
    expect(simulado.crear).not.toHaveBeenCalled()
  })

  it('informa cuando el perfil es público y verificado', async () => {
    simulado.lista.mockResolvedValue({
      data: [
        {
          id: 'p1',
          nombre: 'Beto',
          materias: ['PENAL'],
          ubicacion: 'Puebla',
          modalidad: 'VIRTUAL',
          publicado: true,
          estadoVerificacion: 'VERIFICADO_MANUAL',
        },
      ],
    })
    renderizar()
    expect(
      await screen.findByText('Tu perfil es público y está verificado manualmente.'),
    ).toBeInTheDocument()
  })

  it('avisa cuando no se pudo guardar', async () => {
    simulado.crear.mockResolvedValue({ data: null, errors: [{ message: 'x' }] })
    renderizar()
    await screen.findByLabelText('Nombre completo')
    await userEvent.type(screen.getByLabelText('Ciudad donde ejerces'), 'Puebla')
    await userEvent.click(screen.getByLabelText('Civil'))
    await userEvent.selectOptions(
      screen.getByLabelText('Modalidad de atención'),
      'VIRTUAL',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }))
    expect(await screen.findByText(/No pudimos guardar tu perfil/)).toBeInTheDocument()
  })
})
