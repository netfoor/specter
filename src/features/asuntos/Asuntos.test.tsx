import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Sesion } from '../auth/useSesion'
import { AsuntoDetalle } from './AsuntoDetalle'
import { MisAsuntos } from './MisAsuntos'
import { EditarAsunto, NuevoAsunto } from './NuevoAsunto'

const simulado = vi.hoisted(() => ({
  listar: vi.fn(),
  nia: vi.fn(),
  obtener: vi.fn(),
  crear: vi.fn(),
  actualizar: vi.fn(),
  sesion: {} as Sesion,
}))

vi.mock('../../app/amplify', () => ({ backendConfigurado: true }))
vi.mock('../../app/datos', () => ({
  esNoAutorizado: (e?: readonly { errorType?: string }[]) =>
    e?.some((x) => x.errorType === 'Unauthorized') ?? false,
  datosComoUsuario: () => ({
    mutations: { nia: simulado.nia },
    models: {
      Solicitud: { listSolicitudByAsuntoId: async () => ({ data: [] }) },
      PerfilPublico: { get: async () => ({ data: null }) },
      Propuesta: { get: async () => ({ data: null }) },
      Asunto: {
        list: simulado.listar,
        get: simulado.obtener,
        create: simulado.crear,
        update: simulado.actualizar,
      },
    },
  }),
}))
vi.mock('../auth/useSesion', () => ({ useSesion: () => simulado.sesion }))

const asunto = (id: string, extra: object = {}) => ({
  id,
  titulo: `Asunto ${id}`,
  descripcion: 'Descripción suficientemente larga del asunto de prueba.',
  materia: 'CIVIL',
  ubicacion: 'Puebla',
  modalidad: 'VIRTUAL',
  presupuestoMin: null,
  presupuestoMax: null,
  abierto: false,
  etapa: null,
  createdAt: '2026-10-20T12:00:00.000Z',
  ...extra,
})

function renderizar(ruta: string) {
  render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/mi-espacio/asuntos" element={<MisAsuntos />} />
        <Route path="/mi-espacio/asuntos/nuevo" element={<NuevoAsunto />} />
        <Route path="/mi-espacio/asuntos/:id" element={<AsuntoDetalle />} />
        <Route path="/mi-espacio/asuntos/:id/editar" element={<EditarAsunto />} />
        <Route path="/ingresar" element={<p>Pantalla de ingreso</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  for (const f of [
    simulado.listar,
    simulado.obtener,
    simulado.crear,
    simulado.actualizar,
    simulado.nia,
  ]) {
    f.mockReset()
  }
  simulado.sesion = { estado: 'autenticado', nombre: 'Ana', rol: 'CLIENTE' }
  simulado.listar.mockResolvedValue({ data: [] })
  simulado.actualizar.mockResolvedValue({ data: { id: 'x' } })
})

describe('acceso', () => {
  it('manda a ingresar a quien no tiene sesión', () => {
    simulado.sesion = { estado: 'anonimo' }
    renderizar('/mi-espacio/asuntos')
    expect(screen.getByText('Pantalla de ingreso')).toBeInTheDocument()
  })

  it.each(['ABOGADO', 'ADMIN'] as const)('niega el acceso a una cuenta %s', (rol) => {
    simulado.sesion = { estado: 'autenticado', nombre: 'X', rol }
    renderizar('/mi-espacio/asuntos')
    expect(screen.getByText('Esta sección es para clientes')).toBeInTheDocument()
    expect(simulado.listar).not.toHaveBeenCalled()
  })
})

describe('Mis asuntos', () => {
  it('invita a describir el primer asunto cuando no hay ninguno', async () => {
    renderizar('/mi-espacio/asuntos')
    expect(
      await screen.findByText(/Todavía no has descrito ningún asunto/),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Describir un asunto' })).toHaveAttribute(
      'href',
      '/mi-espacio/asuntos/nuevo',
    )
  })

  it('lista los asuntos del más reciente al más antiguo con su estado', async () => {
    simulado.listar.mockResolvedValue({
      data: [
        asunto('viejo', { createdAt: '2026-10-01T12:00:00.000Z' }),
        asunto('nuevo', { abierto: true, createdAt: '2026-10-21T12:00:00.000Z' }),
        asunto('cerrado', { etapa: 'CONTRATADO', createdAt: '2026-10-10T12:00:00.000Z' }),
      ],
    })
    renderizar('/mi-espacio/asuntos')
    const filas = await screen.findAllByRole('listitem')
    expect(filas.map((f) => within(f).getByRole('link').textContent)).toEqual([
      'Asunto nuevo',
      'Asunto cerrado',
      'Asunto viejo',
    ])
    expect(within(filas[0]).getByText('Abierto')).toBeInTheDocument()
    expect(within(filas[1]).getByText('Contratado')).toBeInTheDocument()
    expect(within(filas[2]).getByText('Borrador')).toBeInTheDocument()
  })

  it('avisa cuando no se pueden cargar', async () => {
    simulado.listar.mockRejectedValue(new Error('red'))
    renderizar('/mi-espacio/asuntos')
    expect(await screen.findByText('No pudimos cargar tus asuntos')).toBeInTheDocument()
  })
})

describe('Nuevo asunto', () => {
  async function llenar() {
    await userEvent.type(
      screen.getByLabelText('Título'),
      'Mi arrendador quiere subir la renta',
    )
    await userEvent.type(
      screen.getByLabelText('¿Qué pasó?'),
      'El contrato vence en marzo y quiere un aumento del 30 por ciento.',
    )
    await userEvent.selectOptions(screen.getByLabelText('Materia'), 'CIVIL')
    await userEvent.type(
      screen.getByLabelText('Ciudad donde necesitas el servicio'),
      'Puebla',
    )
    await userEvent.selectOptions(
      screen.getByLabelText('¿Cómo prefieres que te atiendan?'),
      'AMBAS',
    )
  }

  it('marca los campos obligatorios y no guarda un formulario incompleto', async () => {
    renderizar('/mi-espacio/asuntos/nuevo')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }))
    expect(screen.getByText('Resume tu asunto en una frase corta.')).toBeInTheDocument()
    expect(
      screen.getByText('Elige la materia que más se parezca a tu asunto.'),
    ).toBeInTheDocument()
    expect(simulado.crear).not.toHaveBeenCalled()
  })

  it('guarda un borrador sin publicar y sin campos que solo escribe el servidor', async () => {
    simulado.crear.mockResolvedValue({ data: { id: 'a1' } })
    simulado.obtener.mockResolvedValue({ data: asunto('a1') })
    renderizar('/mi-espacio/asuntos/nuevo')
    await llenar()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }))

    expect(simulado.crear).toHaveBeenCalledTimes(1)
    const enviado = simulado.crear.mock.calls[0][0]
    expect(enviado).toMatchObject({
      materia: 'CIVIL',
      modalidad: 'AMBAS',
      ubicacion: 'Puebla',
      abierto: false,
    })
    for (const prohibido of ['etapa', 'lectores', 'owner', 'estado']) {
      expect(enviado).not.toHaveProperty(prohibido)
    }
    expect(await screen.findByRole('heading', { name: 'Asunto a1' })).toBeInTheDocument()
  })

  it('guardar y publicar crea el asunto abierto', async () => {
    simulado.crear.mockResolvedValue({ data: { id: 'a2' } })
    simulado.obtener.mockResolvedValue({ data: asunto('a2', { abierto: true }) })
    renderizar('/mi-espacio/asuntos/nuevo')
    await llenar()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar y publicar' }))
    expect(simulado.crear.mock.calls[0][0]).toMatchObject({ abierto: true })
  })

  it('avisa cuando no se pudo guardar', async () => {
    simulado.crear.mockResolvedValue({ data: null, errors: [{ message: 'x' }] })
    renderizar('/mi-espacio/asuntos/nuevo')
    await llenar()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }))
    expect(await screen.findByText(/No pudimos guardar tu asunto/)).toBeInTheDocument()
  })
})

describe('Nuevo asunto con NIA', () => {
  it('NIA prellena los campos vacíos sin pisar lo que la persona ya escribió', async () => {
    simulado.nia.mockResolvedValue({
      data: {
        respuesta: 'Parece un tema de arrendamiento.',
        materia: 'CIVIL',
        titulo: 'Aumento de renta',
        resumen: 'Mi arrendador quiere subir la renta antes de que termine el contrato.',
        datosFaltantes: [],
        derivarAAbogado: true,
        restantes: 29,
      },
    })
    renderizar('/mi-espacio/asuntos/nuevo')
    await userEvent.type(screen.getByLabelText('Título'), 'Mi propio título')
    await userEvent.type(
      screen.getByLabelText('Escribe tu mensaje'),
      'Mi arrendador quiere subir la renta',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }))
    await userEvent.click(
      await screen.findByRole('button', { name: 'Usar en el formulario' }),
    )

    expect(screen.getByLabelText('Título')).toHaveValue('Mi propio título')
    expect(screen.getByLabelText('¿Qué pasó?')).toHaveValue(
      'Mi arrendador quiere subir la renta antes de que termine el contrato.',
    )
    expect(screen.getByLabelText('Materia')).toHaveValue('CIVIL')
  })

  it('NIA no aparece al editar un asunto existente', async () => {
    simulado.obtener.mockResolvedValue({ data: asunto('a1') })
    renderizar('/mi-espacio/asuntos/a1/editar')
    await screen.findByLabelText('Título')
    expect(screen.queryByText('Cuéntaselo a NIA')).not.toBeInTheDocument()
  })
})

describe('Editar asunto', () => {
  it('edita un borrador y conserva que no está publicado', async () => {
    simulado.obtener.mockResolvedValue({ data: asunto('a1') })
    simulado.actualizar.mockResolvedValue({ data: { id: 'a1' } })
    renderizar('/mi-espacio/asuntos/a1/editar')
    expect(await screen.findByLabelText('Título')).toHaveValue('Asunto a1')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar borrador' }))
    expect(simulado.actualizar).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a1', abierto: false }),
    )
  })

  it('un asunto abierto se guarda como abierto', async () => {
    simulado.obtener.mockResolvedValue({ data: asunto('a1', { abierto: true }) })
    renderizar('/mi-espacio/asuntos/a1/editar')
    await screen.findByLabelText('Título')
    expect(
      screen.queryByRole('button', { name: 'Guardar borrador' }),
    ).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }))
    expect(simulado.actualizar).toHaveBeenCalledWith(
      expect.objectContaining({ abierto: true }),
    )
  })

  it('un asunto contratado ya no se edita', async () => {
    simulado.obtener.mockResolvedValue({ data: asunto('a1', { etapa: 'CONTRATADO' }) })
    renderizar('/mi-espacio/asuntos/a1/editar')
    expect(
      await screen.findByText('Este asunto ya no se puede editar'),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText('Título')).not.toBeInTheDocument()
  })

  it('explica cuando el asunto no existe o es de otra persona', async () => {
    simulado.obtener.mockResolvedValue({ data: null })
    renderizar('/mi-espacio/asuntos/ajeno/editar')
    expect(await screen.findByText('No encontramos este asunto')).toBeInTheDocument()
  })
})

describe('Detalle del asunto', () => {
  it('publica un borrador', async () => {
    simulado.obtener.mockResolvedValue({ data: asunto('a1') })
    renderizar('/mi-espacio/asuntos/a1')
    await userEvent.click(await screen.findByRole('button', { name: 'Publicar' }))
    expect(simulado.actualizar).toHaveBeenCalledWith({ id: 'a1', abierto: true })
  })

  it('un asunto abierto se puede volver a borrador y explica que ningún abogado lo ve', async () => {
    simulado.obtener.mockResolvedValue({ data: asunto('a1', { abierto: true }) })
    renderizar('/mi-espacio/asuntos/a1')
    expect(
      await screen.findByText(/Ningún abogado lo ve todavía, salvo/),
    ).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Volver a borrador' }))
    expect(simulado.actualizar).toHaveBeenCalledWith({ id: 'a1', abierto: false })
  })

  it('un asunto contratado no ofrece acciones de edición', async () => {
    simulado.obtener.mockResolvedValue({
      data: asunto('a1', { etapa: 'CONTRATADO', abierto: true }),
    })
    renderizar('/mi-espacio/asuntos/a1')
    await screen.findByRole('heading', { name: 'Asunto a1' })
    expect(screen.getByText('Contratado')).toBeInTheDocument()
    expect(screen.getByText(/Asunto contratado\. Se abrió su expediente/)).toBeInTheDocument()
    for (const nombre of ['Publicar', 'Volver a borrador']) {
      expect(screen.queryByRole('button', { name: nombre })).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('link', { name: 'Editar' })).not.toBeInTheDocument()
  })

  it('no ofrece eliminar: el borrado no está permitido al cliente', async () => {
    simulado.obtener.mockResolvedValue({ data: asunto('a1') })
    renderizar('/mi-espacio/asuntos/a1')
    await screen.findByRole('heading', { name: 'Asunto a1' })
    expect(screen.queryByRole('button', { name: /eliminar/i })).not.toBeInTheDocument()
  })

  it('explica cuando el asunto no existe o no es de la persona', async () => {
    simulado.obtener.mockResolvedValue({ data: null })
    renderizar('/mi-espacio/asuntos/ajeno')
    expect(await screen.findByText('No encontramos este asunto')).toBeInTheDocument()
  })

  it('un asunto de otra persona se presenta como no encontrado', async () => {
    simulado.obtener.mockResolvedValue({
      data: null,
      errors: [{ errorType: 'Unauthorized' }],
    })
    renderizar('/mi-espacio/asuntos/ajeno')
    expect(await screen.findByText('No encontramos este asunto')).toBeInTheDocument()
  })

  it('un error distinto sí se avisa como fallo de carga', async () => {
    simulado.obtener.mockResolvedValue({
      data: null,
      errors: [{ errorType: 'InternalFailure' }],
    })
    renderizar('/mi-espacio/asuntos/a1')
    expect(await screen.findByText('No pudimos cargar tu asunto')).toBeInTheDocument()
  })

  it('avisa cuando falla un cambio', async () => {
    simulado.obtener.mockResolvedValue({ data: asunto('a1') })
    simulado.actualizar.mockResolvedValue({ data: null, errors: [{ message: 'x' }] })
    renderizar('/mi-espacio/asuntos/a1')
    await userEvent.click(await screen.findByRole('button', { name: 'Publicar' }))
    expect(
      await screen.findByText('No pudimos aplicar el cambio. Inténtalo de nuevo.'),
    ).toBeInTheDocument()
  })
})
