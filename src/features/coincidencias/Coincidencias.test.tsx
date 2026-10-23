import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Sesion } from '../auth/useSesion'
import { Comparar } from './Comparar'
import { Coincidencias } from './Coincidencias'

const simulado = vi.hoisted(() => ({
  obtenerAsunto: vi.fn(),
  listarPerfiles: vi.fn(),
  sesion: {} as Sesion,
}))

vi.mock('../../app/amplify', () => ({ backendConfigurado: true }))
vi.mock('../../app/datos', () => ({
  esNoAutorizado: (e?: readonly { errorType?: string }[]) =>
    e?.some((x) => x.errorType === 'Unauthorized') ?? false,
  datosComoUsuario: () => ({
    models: {
      Asunto: { get: simulado.obtenerAsunto },
      PerfilPublico: { list: simulado.listarPerfiles },
    },
  }),
}))
vi.mock('../auth/useSesion', () => ({ useSesion: () => simulado.sesion }))

const asunto = (extra: object = {}) => ({
  id: 'a1',
  titulo: 'Mi arrendador quiere subir la renta',
  descripcion: 'Descripción del asunto de prueba.',
  materia: 'CIVIL',
  ubicacion: 'Puebla',
  modalidad: 'PRESENCIAL',
  presupuestoMin: 3000,
  presupuestoMax: 9000,
  abierto: true,
  etapa: null,
  ...extra,
})

const perfil = (id: string, nombre: string, extra: object = {}) => ({
  id,
  nombre,
  materias: ['CIVIL'],
  especialidades: [],
  ubicacion: 'Puebla',
  jurisdicciones: [],
  idiomas: [],
  modalidad: 'PRESENCIAL',
  aniosExperiencia: 5,
  honorariosDesde: 4000,
  honorariosHasta: 8000,
  disponibilidad: null,
  verificadoManual: true,
  ...extra,
})

const perfiles = [
  perfil('lejos', 'Lorena Lejos', { ubicacion: 'Atlixco', verificadoManual: false }),
  perfil('penal', 'Pablo Penal', { materias: ['PENAL'] }),
  perfil('ideal', 'Irene Ideal'),
  perfil('medio', 'Mario Medio', {
    modalidad: 'VIRTUAL',
    honorariosDesde: 20000,
    honorariosHasta: 30000,
  }),
]

function renderizar(ruta: string) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/mi-espacio/asuntos/:id" element={<p>Detalle del asunto</p>} />
        <Route path="/mi-espacio/asuntos/:id/coincidencias" element={<Coincidencias />} />
        <Route path="/mi-espacio/asuntos/:id/comparar" element={<Comparar />} />
        <Route path="/ingresar" element={<p>Pantalla de ingreso</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  simulado.obtenerAsunto.mockReset().mockResolvedValue({ data: asunto() })
  simulado.listarPerfiles.mockReset().mockResolvedValue({ data: perfiles })
  simulado.sesion = { estado: 'autenticado', nombre: 'Ana', rol: 'CLIENTE' }
})

describe('Coincidencias', () => {
  it('solo es para clientes con sesión', () => {
    simulado.sesion = { estado: 'anonimo' }
    renderizar('/mi-espacio/asuntos/a1/coincidencias')
    expect(screen.getByText('Pantalla de ingreso')).toBeInTheDocument()
  })

  it('ordena por coincidencia, excluye a quien no atiende la materia y explica por qué', async () => {
    renderizar('/mi-espacio/asuntos/a1/coincidencias')
    await screen.findByRole('heading', { name: 'Abogados compatibles' })
    const nombres = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    // Lorena y Mario empatan en 70 puntos; gana el verificado.
    expect(nombres).toEqual(['Irene Ideal', 'Mario Medio', 'Lorena Lejos'])
    expect(screen.queryByText('Pablo Penal')).not.toBeInTheDocument()

    const ideal = within(
      screen.getByRole('heading', { name: 'Irene Ideal' }).closest('li')!,
    )
    expect(ideal.getByText('100')).toBeInTheDocument()
    expect(ideal.getByText(/Ejerce en Puebla\./)).toBeInTheDocument()
    expect(ideal.getAllByText('Cumple').length).toBe(5)
    expect(ideal.getByText('Verificado manualmente por Specter')).toBeInTheDocument()

    const lejos = within(
      screen.getByRole('heading', { name: 'Lorena Lejos' }).closest('li')!,
    )
    expect(lejos.getByText(/tú estás en Puebla/)).toBeInTheDocument()
    expect(lejos.getAllByText('No cumple').length).toBeGreaterThan(0)
  })

  it('permite elegir hasta tres abogados y bloquea el cuarto', async () => {
    simulado.listarPerfiles.mockResolvedValue({
      data: [
        perfil('a', 'Ana A'),
        perfil('b', 'Beto B'),
        perfil('c', 'Carla C'),
        perfil('d', 'Dani D'),
      ],
    })
    renderizar('/mi-espacio/asuntos/a1/coincidencias')
    await screen.findByRole('heading', { name: 'Abogados compatibles' })
    const comparar = screen.getByRole('button', { name: 'Comparar elegidos' })
    expect(comparar).toBeDisabled()

    await userEvent.click(screen.getByLabelText('Comparar a Ana A'))
    expect(comparar).toBeDisabled()
    await userEvent.click(screen.getByLabelText('Comparar a Beto B'))
    expect(comparar).toBeEnabled()
    await userEvent.click(screen.getByLabelText('Comparar a Carla C'))
    expect(screen.getByLabelText('Comparar a Dani D')).toBeDisabled()
    expect(screen.getByText('3 de 3 elegidos.')).toBeInTheDocument()

    await userEvent.click(screen.getByLabelText('Comparar a Carla C'))
    expect(screen.getByLabelText('Comparar a Dani D')).toBeEnabled()
  })

  it('lleva a la comparación con los abogados elegidos', async () => {
    renderizar('/mi-espacio/asuntos/a1/coincidencias')
    await screen.findByRole('heading', { name: 'Abogados compatibles' })
    await userEvent.click(screen.getByLabelText('Comparar a Irene Ideal'))
    await userEvent.click(screen.getByLabelText('Comparar a Lorena Lejos'))
    await userEvent.click(screen.getByRole('button', { name: 'Comparar elegidos' }))
    expect(
      await screen.findByRole('heading', { name: 'Comparar abogados' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Irene Ideal' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Lorena Lejos' })).toBeInTheDocument()
  })

  it('un asunto que no está abierto no muestra abogados', async () => {
    simulado.obtenerAsunto.mockResolvedValue({ data: asunto({ abierto: false }) })
    renderizar('/mi-espacio/asuntos/a1/coincidencias')
    expect(
      await screen.findByText('Todavía no hay abogados para este asunto'),
    ).toBeInTheDocument()
    expect(simulado.listarPerfiles).not.toHaveBeenCalled()
  })

  it('un asunto de otra persona se presenta como no encontrado', async () => {
    simulado.obtenerAsunto.mockResolvedValue({
      data: null,
      errors: [{ errorType: 'Unauthorized' }],
    })
    renderizar('/mi-espacio/asuntos/ajeno/coincidencias')
    expect(await screen.findByText('No encontramos este asunto')).toBeInTheDocument()
  })

  it('avisa cuando nadie atiende la materia', async () => {
    simulado.listarPerfiles.mockResolvedValue({
      data: [perfil('p', 'Pablo Penal', { materias: ['PENAL'] })],
    })
    renderizar('/mi-espacio/asuntos/a1/coincidencias')
    expect(
      await screen.findByText(/ningún abogado publicado atiende la materia/),
    ).toBeInTheDocument()
  })

  it('avisa cuando falla la búsqueda', async () => {
    simulado.listarPerfiles.mockResolvedValue({
      data: null,
      errors: [{ errorType: 'InternalFailure' }],
    })
    renderizar('/mi-espacio/asuntos/a1/coincidencias')
    expect(await screen.findByText('No pudimos buscar abogados')).toBeInTheDocument()
  })
})

describe('Comparar', () => {
  const ruta = (ids: string) => `/mi-espacio/asuntos/a1/comparar?perfiles=${ids}`

  it('muestra los abogados elegidos lado a lado con su coincidencia y sus datos', async () => {
    renderizar(ruta('ideal,lejos'))
    await screen.findByRole('heading', { name: 'Comparar abogados' })
    const tabla = screen.getByRole('table')
    expect(
      within(tabla)
        .getAllByRole('columnheader')
        .map((c) => c.textContent)
        .filter(Boolean),
    ).toEqual(['Irene Ideal', 'Lorena Lejos'])
    const fila = (etiqueta: string) =>
      within(within(tabla).getByRole('rowheader', { name: etiqueta }).closest('tr')!)
    expect(fila('Coincidencia con tu asunto').getByText('100')).toBeInTheDocument()
    expect(fila('Ubicación').getByText('Atlixco')).toBeInTheDocument()
    expect(fila('Honorarios orientativos').getAllByText('$4,000 a $8,000')).toHaveLength(
      2,
    )
    expect(fila('Verificación').getByText('Sin verificar')).toBeInTheDocument()
    expect(fila('Criterio: presupuesto').getAllByText('Cumple')).toHaveLength(2)
  })

  it('pide elegir al menos dos abogados', async () => {
    renderizar(ruta('ideal'))
    expect(await screen.findByText('Elige al menos dos abogados')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Ver abogados compatibles' }),
    ).toHaveAttribute('href', '/mi-espacio/asuntos/a1/coincidencias')
  })

  it('ignora identificadores que no corresponden a un abogado compatible', async () => {
    renderizar(ruta('ideal,penal,inexistente'))
    expect(await screen.findByText('Elige al menos dos abogados')).toBeInTheDocument()
  })

  it('compara como máximo tres abogados aunque se pidan más', async () => {
    simulado.listarPerfiles.mockResolvedValue({
      data: ['a', 'b', 'c', 'd'].map((x) => perfil(x, `Abogado ${x}`)),
    })
    renderizar(ruta('a,b,c,d'))
    await screen.findByRole('heading', { name: 'Comparar abogados' })
    expect(screen.getAllByRole('columnheader').filter((c) => c.textContent)).toHaveLength(
      3,
    )
    expect(
      screen.queryByRole('columnheader', { name: 'Abogado d' }),
    ).not.toBeInTheDocument()
  })
})
