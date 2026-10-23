import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import type { Sesion } from '../auth/useSesion'
import { SolicitudesAbogado } from './SolicitudesAbogado'
import { SolicitudesDelAsunto } from './SolicitudesDelAsunto'

const simulado = vi.hoisted(() => ({
  porAsunto: vi.fn(),
  listar: vi.fn(),
  perfil: vi.fn(),
  propuesta: vi.fn(),
  asunto: vi.fn(),
  retirar: vi.fn(),
  responder: vi.fn(),
  proponer: vi.fn(),
  sesion: {} as Sesion,
}))

vi.mock('../../app/amplify', () => ({ backendConfigurado: true }))
vi.mock('../../app/datos', () => ({
  esNoAutorizado: (e?: readonly { errorType?: string }[]) =>
    e?.some((x) => x.errorType === 'Unauthorized') ?? false,
  datosComoUsuario: () => ({
    models: {
      Solicitud: { listSolicitudByAsuntoId: simulado.porAsunto, list: simulado.listar },
      PerfilPublico: { get: simulado.perfil },
      Propuesta: { get: simulado.propuesta },
      Asunto: { get: simulado.asunto },
    },
    mutations: {
      retirarSolicitud: simulado.retirar,
      responderSolicitud: simulado.responder,
      proponerHonorarios: simulado.proponer,
    },
  }),
}))
vi.mock('../auth/useSesion', () => ({ useSesion: () => simulado.sesion }))

const solicitud = (id: string, estado: string, extra: object = {}) => ({
  id,
  asuntoId: 'a1',
  perfilId: `perfil-${id}`,
  estado,
  createdAt: '2026-10-23T10:00:00.000Z',
  ...extra,
})

const propuesta = {
  id: 's1',
  monto: 12500,
  alcance: 'Revisión del contrato y negociación con el arrendador.',
  formaDePago: 'Mitad al inicio y mitad al terminar',
}

const asunto = {
  id: 'a1',
  titulo: 'Aumento de renta',
  descripcion: 'Mi arrendador quiere subir la renta.',
  materia: 'CIVIL',
  ubicacion: 'Puebla',
  modalidad: 'AMBAS',
  presupuestoMin: 3000,
  presupuestoMax: 9000,
}

beforeEach(() => {
  for (const f of Object.values(simulado))
    if (typeof f === 'function') (f as ReturnType<typeof vi.fn>).mockReset()
  simulado.perfil.mockResolvedValue({ data: { nombre: 'Elena Rivas' } })
  simulado.propuesta.mockResolvedValue({ data: null })
  simulado.asunto.mockResolvedValue({ data: asunto })
  simulado.sesion = { estado: 'autenticado', nombre: 'Beto', rol: 'ABOGADO' }
})

describe('Solicitudes del asunto (cliente)', () => {
  function renderizar() {
    render(
      <MemoryRouter>
        <SolicitudesDelAsunto asuntoId="a1" alCambiar={vi.fn()} />
      </MemoryRouter>,
    )
  }

  it('invita a enviar el asunto cuando no hay solicitudes', async () => {
    simulado.porAsunto.mockResolvedValue({ data: [] })
    renderizar()
    expect(
      await screen.findByText(/Todavía no has enviado este asunto/),
    ).toBeInTheDocument()
  })

  it('muestra cada solicitud con el nombre del abogado, su estado y la propuesta', async () => {
    simulado.porAsunto.mockResolvedValue({ data: [solicitud('s1', 'ACEPTADA')] })
    simulado.propuesta.mockResolvedValue({ data: propuesta })
    renderizar()
    expect(await screen.findByRole('link', { name: 'Elena Rivas' })).toHaveAttribute(
      'href',
      '/abogados/perfil-s1',
    )
    expect(screen.getByText('Aceptada')).toBeInTheDocument()
    expect(screen.getByText(/declaró no tener conflicto de interés/)).toBeInTheDocument()
    expect(screen.getByText('$12,500')).toBeInTheDocument()
    expect(screen.getByText(propuesta.formaDePago)).toBeInTheDocument()
  })

  it('retira una solicitud activa tras confirmar', async () => {
    simulado.porAsunto.mockResolvedValue({ data: [solicitud('s1', 'ENVIADA')] })
    simulado.retirar.mockResolvedValue({
      data: { solicitudId: 's1', estado: 'RETIRADA' },
    })
    renderizar()
    await userEvent.click(
      await screen.findByRole('button', { name: 'Retirar solicitud' }),
    )
    expect(simulado.retirar).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Sí, retirar' }))
    expect(simulado.retirar).toHaveBeenCalledWith({ solicitudId: 's1' })
  })

  it('las solicitudes rechazadas o retiradas no ofrecen retirar', async () => {
    simulado.porAsunto.mockResolvedValue({
      data: [solicitud('s1', 'RECHAZADA'), solicitud('s2', 'RETIRADA')],
    })
    renderizar()
    await screen.findByText('Rechazada')
    expect(
      screen.queryByRole('button', { name: 'Retirar solicitud' }),
    ).not.toBeInTheDocument()
  })
})

describe('Solicitudes recibidas (abogado)', () => {
  function renderizar() {
    render(
      <MemoryRouter>
        <SolicitudesAbogado />
      </MemoryRouter>,
    )
  }
  const tarjeta = () =>
    within(screen.getByRole('heading', { name: 'Aumento de renta' }).closest('li')!)

  it('solo es para abogados', () => {
    simulado.sesion = { estado: 'autenticado', nombre: 'Ana', rol: 'CLIENTE' }
    renderizar()
    expect(screen.getByText('Esta sección es para abogados')).toBeInTheDocument()
    expect(simulado.listar).not.toHaveBeenCalled()
  })

  it('muestra el asunto y pide la declaración de no conflicto antes de aceptar', async () => {
    simulado.listar.mockResolvedValue({ data: [solicitud('s1', 'ENVIADA')] })
    simulado.responder.mockResolvedValue({
      data: { solicitudId: 's1', estado: 'ACEPTADA' },
    })
    renderizar()
    await screen.findByRole('heading', { name: 'Aumento de renta' })
    expect(
      tarjeta().getByText('Mi arrendador quiere subir la renta.'),
    ).toBeInTheDocument()
    expect(tarjeta().getByText('$3,000 a $9,000')).toBeInTheDocument()

    const aceptar = tarjeta().getByRole('button', { name: 'Aceptar solicitud' })
    expect(aceptar).toBeDisabled()
    await userEvent.click(tarjeta().getByLabelText(/no tengo conflicto de interés/))
    await userEvent.click(aceptar)
    expect(simulado.responder).toHaveBeenCalledWith({
      solicitudId: 's1',
      aceptar: true,
      declaracionNoConflicto: true,
    })
  })

  it('puede rechazar sin declarar', async () => {
    simulado.listar.mockResolvedValue({ data: [solicitud('s1', 'ENVIADA')] })
    simulado.responder.mockResolvedValue({
      data: { solicitudId: 's1', estado: 'RECHAZADA' },
    })
    renderizar()
    await screen.findByRole('heading', { name: 'Aumento de renta' })
    await userEvent.click(tarjeta().getByRole('button', { name: 'Rechazar' }))
    expect(simulado.responder).toHaveBeenCalledWith({
      solicitudId: 's1',
      aceptar: false,
      declaracionNoConflicto: false,
    })
  })

  it('una solicitud aceptada no se puede rechazar y pide la propuesta de honorarios', async () => {
    simulado.listar.mockResolvedValue({ data: [solicitud('s1', 'ACEPTADA')] })
    simulado.proponer.mockResolvedValue({
      data: { solicitudId: 's1', estado: 'ACEPTADA' },
    })
    renderizar()
    await screen.findByRole('heading', { name: 'Aumento de renta' })
    expect(tarjeta().queryByRole('button', { name: 'Rechazar' })).not.toBeInTheDocument()

    await userEvent.click(tarjeta().getByRole('button', { name: 'Enviar propuesta' }))
    expect(tarjeta().getByText(/Escribe el monto de tus honorarios/)).toBeInTheDocument()
    expect(simulado.proponer).not.toHaveBeenCalled()

    await userEvent.type(tarjeta().getByLabelText('Honorarios (MXN)'), '12,500')
    await userEvent.type(
      tarjeta().getByLabelText('Qué incluye tu servicio'),
      propuesta.alcance,
    )
    await userEvent.type(tarjeta().getByLabelText('Forma de pago'), propuesta.formaDePago)
    await userEvent.click(tarjeta().getByRole('button', { name: 'Enviar propuesta' }))
    expect(simulado.proponer).toHaveBeenCalledWith({
      solicitudId: 's1',
      monto: 12500,
      alcance: propuesta.alcance,
      formaDePago: propuesta.formaDePago,
    })
  })

  it('tras retirarse la solicitud ya no muestra el asunto', async () => {
    simulado.listar.mockResolvedValue({ data: [solicitud('s1', 'RETIRADA')] })
    simulado.asunto.mockResolvedValue({
      data: null,
      errors: [{ errorType: 'Unauthorized' }],
    })
    renderizar()
    expect(await screen.findByText('Asunto no disponible')).toBeInTheDocument()
    expect(screen.getByText(/El cliente retiró la solicitud/)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('muestra el motivo cuando el servidor rechaza la acción', async () => {
    simulado.listar.mockResolvedValue({ data: [solicitud('s1', 'ENVIADA')] })
    simulado.responder.mockResolvedValue({
      data: null,
      errors: [{ message: 'ASUNTO_NO_DISPONIBLE' }],
    })
    renderizar()
    await screen.findByRole('heading', { name: 'Aumento de renta' })
    await userEvent.click(tarjeta().getByLabelText(/no tengo conflicto de interés/))
    await userEvent.click(tarjeta().getByRole('button', { name: 'Aceptar solicitud' }))
    expect(
      await screen.findByText('El asunto ya no está abierto para recibir solicitudes.'),
    ).toBeInTheDocument()
  })
})
