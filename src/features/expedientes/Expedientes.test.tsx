import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Sesion } from '../auth/useSesion'
import { ExpedientePagina } from './ExpedientePagina'
import { MisExpedientes } from './MisExpedientes'

type Observador = { next: (m: unknown) => void; error: (e: unknown) => void }

const simulado = vi.hoisted(() => ({
  expediente: vi.fn(),
  listar: vi.fn(),
  asunto: vi.fn(),
  mensajes: vi.fn(),
  actuaciones: vi.fn(),
  enviar: vi.fn(),
  concluir: vi.fn(),
  observador: null as Observador | null,
  filtro: null as unknown,
  sesion: {} as Sesion,
}))

vi.mock('../../app/amplify', () => ({ backendConfigurado: true }))
vi.mock('../../app/datos', () => ({
  esNoAutorizado: (e?: readonly { errorType?: string }[]) =>
    e?.some((x) => x.errorType === 'Unauthorized') ?? false,
  datosComoUsuario: () => ({
    models: {
      Expediente: { get: simulado.expediente, list: simulado.listar },
      Asunto: { get: simulado.asunto },
      Mensaje: {
        listMensajeByExpedienteIdAndCreadoEn: simulado.mensajes,
        onCreate: (opciones: unknown) => {
          simulado.filtro = opciones
          return {
            subscribe: (o: Observador) => {
              simulado.observador = o
              return { unsubscribe: () => undefined }
            },
          }
        },
      },
      Actuacion: { listActuacionByExpedienteIdAndCreadoEn: simulado.actuaciones },
    },
    mutations: { enviarMensaje: simulado.enviar, concluirExpediente: simulado.concluir },
  }),
}))
vi.mock('../auth/useSesion', () => ({ useSesion: () => simulado.sesion }))

// La API devuelve participantes solo con el `sub`; el autor guarda `sub::username`.
const expediente = (extra: object = {}) => ({
  id: 'e1',
  asuntoId: 'a1',
  contratoId: 's1',
  participantes: ['sub-c', 'sub-a'],
  estado: 'EN_GESTION',
  createdAt: '2026-10-23T10:00:00Z',
  ...extra,
})
const mensaje = (id: string, autor: string, texto: string, creadoEn: string) => ({
  id,
  autor,
  texto,
  creadoEn,
  expedienteId: 'e1',
})

function renderizar(ruta = '/expedientes/e1') {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/expedientes/:id" element={<ExpedientePagina />} />
        <Route path="/mi-espacio/expedientes" element={<MisExpedientes />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  for (const f of [
    simulado.expediente,
    simulado.listar,
    simulado.asunto,
    simulado.mensajes,
    simulado.actuaciones,
    simulado.enviar,
    simulado.concluir,
  ]) {
    f.mockReset()
  }
  simulado.observador = null
  simulado.sesion = { estado: 'autenticado', nombre: 'Ana', rol: 'CLIENTE' }
  simulado.expediente.mockResolvedValue({ data: expediente() })
  simulado.asunto.mockResolvedValue({ data: { id: 'a1', titulo: 'Aumento de renta' } })
  simulado.mensajes.mockResolvedValue({
    data: [
      mensaje('m1', 'sub-c::sub-c', 'Hola, licenciada.', '2026-10-23T10:01:00Z'),
      mensaje(
        'm2',
        'sub-a::sub-a',
        'Hola, revisemos el contrato.',
        '2026-10-23T10:02:00Z',
      ),
    ],
  })
  simulado.actuaciones.mockResolvedValue({
    data: [
      {
        id: 'act1',
        tipo: 'CONTRATACION',
        detalle: 'Ambas partes aceptaron el contrato.',
        creadoEn: '2026-10-23T10:00:00Z',
      },
    ],
  })
  simulado.enviar.mockResolvedValue({ data: { id: 'm3', estado: 'ENVIADO' } })
  simulado.concluir.mockResolvedValue({ data: { id: 'e1', estado: 'CONCLUIDO' } })
})

describe('ExpedientePagina', () => {
  it('muestra la conversación con quién escribió, la bitácora y el enlace al contrato', async () => {
    renderizar()
    expect(
      await screen.findByRole('heading', { name: 'Aumento de renta' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Hola, licenciada.').closest('p')).toHaveTextContent(/^Tú/)
    expect(
      screen.getByText('Hola, revisemos el contrato.').closest('p'),
    ).toHaveTextContent(/^Abogado/)
    expect(screen.getByText('Contratación')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Ver el contrato aceptado' }),
    ).toHaveAttribute('href', '/contratos/s1')
  })

  it('se suscribe solo a los mensajes de este expediente y muestra los que llegan en vivo', async () => {
    renderizar()
    await screen.findByText('Hola, licenciada.')
    expect(simulado.filtro).toEqual({ filter: { expedienteId: { eq: 'e1' } } })
    act(() =>
      simulado.observador!.next(
        mensaje('m9', 'sub-a::sub-a', 'Ya lo revisé.', '2026-10-23T10:05:00Z'),
      ),
    )
    expect(await screen.findByText('Ya lo revisé.')).toBeInTheDocument()
  })

  it('envía el mensaje recortado y limpia el campo', async () => {
    renderizar()
    await screen.findByText('Hola, licenciada.')
    await userEvent.type(
      screen.getByLabelText('Escribe un mensaje'),
      '  ¿Cuándo nos vemos?  ',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(simulado.enviar).toHaveBeenCalledWith({
      expedienteId: 'e1',
      texto: '¿Cuándo nos vemos?',
    })
    expect(screen.getByLabelText('Escribe un mensaje')).toHaveValue('')
  })

  it('si la conexión en vivo falla, lo dice y permite traer los mensajes nuevos', async () => {
    renderizar()
    await screen.findByText('Hola, licenciada.')
    act(() => simulado.observador!.error(new Error('ws')))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Ver mensajes nuevos' }),
    )
    expect(simulado.mensajes).toHaveBeenCalledTimes(2)
  })

  it('el cliente no ve la opción de concluir', async () => {
    renderizar()
    await screen.findByText('Hola, licenciada.')
    expect(
      screen.queryByRole('button', { name: 'Concluir expediente' }),
    ).not.toBeInTheDocument()
  })

  it('el abogado concluye tras confirmar', async () => {
    simulado.sesion = { estado: 'autenticado', nombre: 'Beto', rol: 'ABOGADO' }
    renderizar()
    await screen.findByText('Hola, licenciada.')
    expect(
      screen.getByText('Hola, revisemos el contrato.').closest('p'),
    ).toHaveTextContent(/^Tú/)
    await userEvent.click(screen.getByRole('button', { name: 'Concluir expediente' }))
    expect(simulado.concluir).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Sí, concluir' }))
    expect(simulado.concluir).toHaveBeenCalledWith({ expedienteId: 'e1' })
  })

  it('un expediente concluido ya no admite mensajes', async () => {
    simulado.sesion = { estado: 'autenticado', nombre: 'Beto', rol: 'ABOGADO' }
    simulado.expediente.mockResolvedValue({ data: expediente({ estado: 'CONCLUIDO' }) })
    renderizar()
    expect(
      await screen.findByText(/la conversación queda como registro/),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Escribe un mensaje')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Concluir expediente' }),
    ).not.toBeInTheDocument()
  })

  it('muestra el motivo si el servidor rechaza el mensaje', async () => {
    simulado.enviar.mockResolvedValue({
      data: null,
      errors: [{ message: 'EXPEDIENTE_CONCLUIDO' }],
    })
    renderizar()
    await screen.findByText('Hola, licenciada.')
    await userEvent.type(screen.getByLabelText('Escribe un mensaje'), 'Hola')
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    expect(
      await screen.findByText('El expediente está concluido; ya no admite cambios.'),
    ).toBeInTheDocument()
  })

  it('un expediente ajeno se presenta como no encontrado', async () => {
    simulado.expediente.mockResolvedValue({
      data: null,
      errors: [{ errorType: 'Unauthorized' }],
    })
    renderizar()
    expect(await screen.findByText('No encontramos este expediente')).toBeInTheDocument()
  })
})

describe('MisExpedientes', () => {
  it('lista los expedientes con el título del asunto y su estado', async () => {
    simulado.listar.mockResolvedValue({ data: [expediente()] })
    renderizar('/mi-espacio/expedientes')
    expect(await screen.findByRole('link', { name: 'Aumento de renta' })).toHaveAttribute(
      'href',
      '/expedientes/e1',
    )
    expect(screen.getByText('En gestión')).toBeInTheDocument()
  })

  it('explica cuándo se abre un expediente si aún no hay', async () => {
    simulado.listar.mockResolvedValue({ data: [] })
    renderizar('/mi-espacio/expedientes')
    expect(
      await screen.findByText(/Se abren cuando ambas partes aceptan un contrato/),
    ).toBeInTheDocument()
  })
})
