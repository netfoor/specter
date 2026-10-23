import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Sesion } from '../auth/useSesion'
import { Panel } from './Panel'

const simulado = vi.hoisted(() => ({
  listar: vi.fn(),
  actualizarPerfil: vi.fn(),
  obtenerCopia: vi.fn(),
  crearCopia: vi.fn(),
  actualizarCopia: vi.fn(),
  borrarCopia: vi.fn(),
  indicadores: vi.fn(),
  sesion: {} as Sesion,
}))

vi.mock('../../app/amplify', () => ({ backendConfigurado: true }))
vi.mock('../../app/datos', () => ({
  datosComoUsuario: () => ({
    models: {
      PerfilAbogado: { list: simulado.listar, update: simulado.actualizarPerfil },
      PerfilPublico: {
        get: simulado.obtenerCopia,
        create: simulado.crearCopia,
        update: simulado.actualizarCopia,
        delete: simulado.borrarCopia,
      },
    },
    queries: { indicadores: simulado.indicadores },
  }),
}))
vi.mock('../auth/useSesion', () => ({ useSesion: () => simulado.sesion }))

const perfil = (id: string, extra: object = {}) => ({
  id,
  nombre: `Abogado ${id}`,
  materias: ['CIVIL'],
  especialidades: ['Contratos'],
  ubicacion: 'Puebla',
  jurisdicciones: [],
  idiomas: [],
  modalidad: 'AMBAS',
  aniosExperiencia: 6,
  cedula: 'DEMO-0001',
  estadoVerificacion: null,
  publicado: null,
  ...extra,
})

const indicadores = {
  abogadosRegistrados: 12,
  clientesRegistrados: 5,
  abogadosVerificados: 8,
  abogadosPublicados: 10,
  asuntos: 7,
  solicitudes: 3,
  contrataciones: 2,
  concluidos: 1,
}

function renderizar() {
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route path="/admin" element={<Panel />} />
        <Route path="/ingresar" element={<p>Pantalla de ingreso</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  for (const f of [
    simulado.listar,
    simulado.actualizarPerfil,
    simulado.obtenerCopia,
    simulado.crearCopia,
    simulado.actualizarCopia,
    simulado.borrarCopia,
    simulado.indicadores,
  ]) {
    f.mockReset()
  }
  simulado.sesion = { estado: 'autenticado', nombre: 'Admin', rol: 'ADMIN' }
  simulado.indicadores.mockResolvedValue({ data: indicadores })
  simulado.listar.mockResolvedValue({
    data: [
      perfil('pendiente'),
      perfil('publicado', { publicado: true, estadoVerificacion: 'VERIFICADO_MANUAL' }),
      perfil('rechazado', { estadoVerificacion: 'RECHAZADO' }),
    ],
  })
  simulado.obtenerCopia.mockResolvedValue({ data: null })
  simulado.crearCopia.mockResolvedValue({ data: { id: 'x' } })
  simulado.actualizarCopia.mockResolvedValue({ data: { id: 'x' } })
  simulado.borrarCopia.mockResolvedValue({ data: { id: 'x' } })
  simulado.actualizarPerfil.mockResolvedValue({ data: { id: 'x' } })
})

const fila = (nombre: string) =>
  screen.getByRole('heading', { name: nombre }).closest('li')!

describe('Panel de administración', () => {
  it('manda a ingresar a quien no tiene sesión', () => {
    simulado.sesion = { estado: 'anonimo' }
    renderizar()
    expect(screen.getByText('Pantalla de ingreso')).toBeInTheDocument()
  })

  it('niega el acceso a quien no es administrador', () => {
    simulado.sesion = { estado: 'autenticado', nombre: 'Ana', rol: 'CLIENTE' }
    renderizar()
    expect(screen.getByText('Esta sección es para administradores')).toBeInTheDocument()
    expect(simulado.listar).not.toHaveBeenCalled()
    expect(simulado.indicadores).not.toHaveBeenCalled()
  })

  it('muestra los indicadores y los perfiles agrupados por situación', async () => {
    renderizar()
    expect(await screen.findByText('Abogados registrados')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('Asuntos concluidos')).toBeInTheDocument()
    expect(await screen.findByText('Pendientes de revisión (1)')).toBeInTheDocument()
    expect(screen.getByText('Publicados (1)')).toBeInTheDocument()
    expect(screen.getByText('Rechazados (1)')).toBeInTheDocument()
    expect(screen.getByText('Verificados y ocultos (0)')).toBeInTheDocument()
  })

  it('muestra la cédula al revisor y las acciones que corresponden', async () => {
    renderizar()
    await screen.findByText('Pendientes de revisión (1)')
    const pendiente = within(fila('Abogado pendiente'))
    expect(pendiente.getByText('Cédula: DEMO-0001')).toBeInTheDocument()
    expect(
      pendiente.getByRole('button', { name: 'Verificar y publicar' }),
    ).toBeInTheDocument()
    expect(
      pendiente.getByRole('button', { name: 'Publicar sin verificar' }),
    ).toBeInTheDocument()
    expect(pendiente.getByRole('button', { name: 'Rechazar' })).toBeInTheDocument()
    expect(
      within(fila('Abogado publicado')).getByRole('button', { name: 'Ocultar' }),
    ).toBeInTheDocument()
    expect(
      within(fila('Abogado rechazado')).getByRole('button', {
        name: 'Volver a pendiente',
      }),
    ).toBeInTheDocument()
  })

  it('verificar y publicar crea la copia sin cédula antes de actualizar el perfil', async () => {
    renderizar()
    await screen.findByText('Pendientes de revisión (1)')
    await userEvent.click(
      within(fila('Abogado pendiente')).getByRole('button', {
        name: 'Verificar y publicar',
      }),
    )

    expect(simulado.crearCopia).toHaveBeenCalledTimes(1)
    const copia = simulado.crearCopia.mock.calls[0][0]
    expect(copia).toMatchObject({
      id: 'pendiente',
      nombre: 'Abogado pendiente',
      verificadoManual: true,
    })
    expect(copia).not.toHaveProperty('cedula')
    expect(JSON.stringify(copia)).not.toContain('DEMO-0001')

    expect(simulado.actualizarPerfil).toHaveBeenCalledWith({
      id: 'pendiente',
      estadoVerificacion: 'VERIFICADO_MANUAL',
      publicado: true,
    })
    expect(simulado.crearCopia.mock.invocationCallOrder[0]).toBeLessThan(
      simulado.actualizarPerfil.mock.invocationCallOrder[0],
    )
  })

  it('ocultar retira la copia pública antes de marcar el perfil como oculto', async () => {
    renderizar()
    await screen.findByText('Publicados (1)')
    await userEvent.click(
      within(fila('Abogado publicado')).getByRole('button', { name: 'Ocultar' }),
    )

    expect(simulado.borrarCopia).toHaveBeenCalledWith({ id: 'publicado' })
    expect(simulado.actualizarPerfil).toHaveBeenCalledWith({
      id: 'publicado',
      estadoVerificacion: 'VERIFICADO_MANUAL',
      publicado: false,
    })
    expect(simulado.borrarCopia.mock.invocationCallOrder[0]).toBeLessThan(
      simulado.actualizarPerfil.mock.invocationCallOrder[0],
    )
  })

  it('actualiza la copia existente en lugar de crear otra', async () => {
    simulado.obtenerCopia.mockResolvedValue({ data: { id: 'publicado' } })
    renderizar()
    await screen.findByText('Publicados (1)')
    await userEvent.click(
      within(fila('Abogado publicado')).getByRole('button', {
        name: 'Actualizar copia pública',
      }),
    )
    expect(simulado.actualizarCopia).toHaveBeenCalledTimes(1)
    expect(simulado.crearCopia).not.toHaveBeenCalled()
  })

  it('si falla la copia pública no cambia el perfil y avisa del error', async () => {
    simulado.crearCopia.mockResolvedValue({ data: null, errors: [{ message: 'x' }] })
    renderizar()
    await screen.findByText('Pendientes de revisión (1)')
    await userEvent.click(
      within(fila('Abogado pendiente')).getByRole('button', {
        name: 'Verificar y publicar',
      }),
    )
    expect(
      await screen.findByText('No pudimos aplicar el cambio. Inténtalo de nuevo.'),
    ).toBeInTheDocument()
    expect(simulado.actualizarPerfil).not.toHaveBeenCalled()
  })

  it('avisa cuando no se pueden calcular los indicadores', async () => {
    simulado.indicadores.mockResolvedValue({ data: null, errors: [{ message: 'x' }] })
    renderizar()
    expect(
      await screen.findByText(/No pudimos calcular los indicadores/),
    ).toBeInTheDocument()
    expect(await screen.findByText('Pendientes de revisión (1)')).toBeInTheDocument()
  })
})
