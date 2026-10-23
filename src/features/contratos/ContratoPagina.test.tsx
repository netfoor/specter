import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Sesion } from '../auth/useSesion'
import { ContratoPagina } from './ContratoPagina'

const simulado = vi.hoisted(() => ({
  obtener: vi.fn(),
  aceptar: vi.fn(),
  sesion: {} as Sesion,
}))

vi.mock('../../app/amplify', () => ({ backendConfigurado: true }))
vi.mock('../../app/datos', () => ({
  esNoAutorizado: (e?: readonly { errorType?: string }[]) =>
    e?.some((x) => x.errorType === 'Unauthorized') ?? false,
  datosComoUsuario: () => ({
    models: { Contrato: { get: simulado.obtener } },
    mutations: { aceptarContrato: simulado.aceptar },
  }),
}))
vi.mock('../auth/useSesion', () => ({ useSesion: () => simulado.sesion }))

const contrato = (extra: object = {}) => ({
  id: 's1',
  asuntoId: 'a1',
  honorarios: 10000,
  comision: 1000,
  abogadoRecibe: 9000,
  estado: 'PENDIENTE',
  texto: 'CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES (DEMOSTRACIÓN)\n\n1. Partes.',
  aceptadoCliente: null,
  aceptadoAbogado: null,
  ...extra,
})

function renderizar() {
  render(
    <MemoryRouter initialEntries={['/contratos/s1']}>
      <Routes>
        <Route path="/contratos/:id" element={<ContratoPagina />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  simulado.obtener.mockReset().mockResolvedValue({ data: contrato() })
  simulado.aceptar
    .mockReset()
    .mockResolvedValue({ data: { solicitudId: 's1', estado: 'PENDIENTE' } })
  simulado.sesion = { estado: 'autenticado', nombre: 'Ana', rol: 'CLIENTE' }
})

describe('ContratoPagina', () => {
  it('muestra la leyenda de demostración, el desglose y el texto', async () => {
    renderizar()
    expect(
      await screen.findByRole('heading', { name: 'Contrato de prestación de servicios' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/No tiene validez jurídica/)).toBeInTheDocument()
    expect(screen.getByText('$10,000.00')).toBeInTheDocument()
    expect(screen.getByText('$1,000.00')).toBeInTheDocument()
    expect(screen.getByText('$9,000.00')).toBeInTheDocument()
    expect(screen.getByText(/1\. Partes\./)).toBeInTheDocument()
  })

  it('aceptar exige confirmar que es una demostración', async () => {
    renderizar()
    const boton = await screen.findByRole('button', { name: 'Aceptar contrato' })
    expect(boton).toBeDisabled()
    await userEvent.click(screen.getByLabelText(/no tiene validez jurídica/))
    await userEvent.click(boton)
    expect(simulado.aceptar).toHaveBeenCalledWith({
      solicitudId: 's1',
      aceptoDemostracion: true,
    })
  })

  it('si la persona ya aceptó, espera a la otra parte', async () => {
    simulado.obtener.mockResolvedValue({
      data: contrato({ aceptadoCliente: '2026-10-23T12:00:00Z' }),
    })
    renderizar()
    expect(
      await screen.findByText('Ya aceptaste. Falta la aceptación de la otra parte.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Aceptó el 23 de octubre de 2026')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Aceptar contrato' }),
    ).not.toBeInTheDocument()
  })

  it('el abogado ve su propia aceptación pendiente aunque el cliente ya aceptó', async () => {
    simulado.sesion = { estado: 'autenticado', nombre: 'Beto', rol: 'ABOGADO' }
    simulado.obtener.mockResolvedValue({
      data: contrato({ aceptadoCliente: '2026-10-23T12:00:00Z' }),
    })
    renderizar()
    expect(
      await screen.findByRole('button', { name: 'Aceptar contrato' }),
    ).toBeInTheDocument()
  })

  it('aceptado por ambas partes informa que se abrió el expediente', async () => {
    simulado.obtener.mockResolvedValue({
      data: contrato({
        estado: 'ACEPTADO',
        aceptadoCliente: '2026-10-23',
        aceptadoAbogado: '2026-10-23',
      }),
    })
    renderizar()
    expect(
      await screen.findByText(/se abrió el expediente del asunto/),
    ).toBeInTheDocument()
  })

  it('muestra el motivo si el servidor rechaza la aceptación', async () => {
    simulado.aceptar.mockResolvedValue({
      data: null,
      errors: [{ message: 'ASUNTO_NO_DISPONIBLE' }],
    })
    renderizar()
    await userEvent.click(await screen.findByLabelText(/no tiene validez jurídica/))
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar contrato' }))
    expect(
      await screen.findByText('El asunto ya no está abierto para recibir solicitudes.'),
    ).toBeInTheDocument()
  })

  it('un contrato ajeno se presenta como no encontrado', async () => {
    simulado.obtener.mockResolvedValue({
      data: null,
      errors: [{ errorType: 'Unauthorized' }],
    })
    renderizar()
    expect(await screen.findByText('No encontramos este contrato')).toBeInTheDocument()
  })

  it('no es para administradores', () => {
    simulado.sesion = { estado: 'autenticado', nombre: 'Admin', rol: 'ADMIN' }
    renderizar()
    expect(
      screen.getByText('Esta sección es para clientes y abogados'),
    ).toBeInTheDocument()
  })
})
