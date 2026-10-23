import { etapaDe } from '../../shared/domain/asunto'
import { estadoVerificacionDe } from '../../shared/domain/catalogos'
import {
  actualizarDirecto,
  borrarPersonas,
  comoInvitado,
  comoUsuario,
  crearPersonas,
  denegada,
  entrar,
  identidad,
  limpiarDatos,
  registrarCreado,
  sembrar,
} from './apoyo'

/**
 * Pruebas de autorización contra el sandbox desplegado:
 * ana (CLIENTE), beto (ABOGADO), carla (CLIENTE ajena a todo) y admin (ADMIN).
 */
const perfilBasico = {
  nombre: 'Beto Abogado',
  materias: ['CIVIL' as const],
  ubicacion: 'Puebla',
  modalidad: 'AMBAS' as const,
}

const asuntoBasico = {
  titulo: 'Contrato de arrendamiento',
  descripcion: 'Necesito revisar un contrato.',
  materia: 'CIVIL' as const,
  ubicacion: 'Puebla',
  modalidad: 'VIRTUAL' as const,
}

beforeAll(async () => {
  await crearPersonas()
})

afterAll(async () => {
  await limpiarDatos()
  await borrarPersonas()
})

describe('PerfilAbogado y directorio público', () => {
  let perfilId = ''

  it('el abogado crea su perfil: queda pendiente y sin publicar', async () => {
    await entrar('beto')
    const res = await comoUsuario().models.PerfilAbogado.create(perfilBasico)
    expect(res.errors).toBeUndefined()
    perfilId = res.data!.id
    registrarCreado('PerfilAbogado', perfilId)
    expect(estadoVerificacionDe(res.data!.estadoVerificacion)).toBe('PENDIENTE')
    expect(res.data!.publicado ?? false).toBe(false)
  })

  it('el abogado no puede publicarse ni verificarse al crear', async () => {
    await entrar('beto')
    const res = await comoUsuario().models.PerfilAbogado.create({
      ...perfilBasico,
      publicado: true,
    })
    expect(denegada(res)).toBe(true)
    const res2 = await comoUsuario().models.PerfilAbogado.create({
      ...perfilBasico,
      estadoVerificacion: 'VERIFICADO_MANUAL',
    })
    expect(denegada(res2)).toBe(true)
  })

  it('el abogado edita sus datos pero no publicado ni verificación', async () => {
    await entrar('beto')
    const cliente = comoUsuario()
    expect(
      denegada(
        await cliente.models.PerfilAbogado.update({ id: perfilId, semblanza: 'Hola' }),
      ),
    ).toBe(false)
    expect(
      denegada(
        await cliente.models.PerfilAbogado.update({ id: perfilId, publicado: true }),
      ),
    ).toBe(true)
    expect(
      denegada(
        await cliente.models.PerfilAbogado.update({
          id: perfilId,
          estadoVerificacion: 'VERIFICADO_MANUAL',
        }),
      ),
    ).toBe(true)
  })

  it('nadie más lee el perfil completo: cliente ajeno ni invitado', async () => {
    await entrar('ana')
    expect(denegada(await comoUsuario().models.PerfilAbogado.get({ id: perfilId }))).toBe(
      true,
    )
    const lista = await comoUsuario().models.PerfilAbogado.list()
    expect(lista.data?.some((p) => p.id === perfilId) ?? false).toBe(false)
    expect(
      denegada(await (await comoInvitado()).models.PerfilAbogado.get({ id: perfilId })),
    ).toBe(true)
  })

  it('el administrador lee, verifica, publica y crea la copia pública', async () => {
    await entrar('admin')
    const cliente = comoUsuario()
    expect(denegada(await cliente.models.PerfilAbogado.get({ id: perfilId }))).toBe(false)
    const act = await cliente.models.PerfilAbogado.update({
      id: perfilId,
      publicado: true,
      estadoVerificacion: 'VERIFICADO_MANUAL',
    })
    expect(act.errors).toBeUndefined()
    const {
      cedula: _cedula,
      publicado: _p,
      estadoVerificacion: _e,
      ...visibles
    } = {
      ...perfilBasico,
      cedula: '',
      publicado: true,
      estadoVerificacion: '',
    }
    void _cedula
    void _p
    void _e
    const pub = await cliente.models.PerfilPublico.create({
      id: perfilId,
      ...visibles,
      verificadoManual: true,
    })
    expect(pub.errors).toBeUndefined()
    registrarCreado('PerfilPublico', perfilId)
  })

  it('el invitado y cualquier usuario leen el directorio público', async () => {
    const comoGuest = await (await comoInvitado()).models.PerfilPublico.list()
    expect(comoGuest.errors).toBeUndefined()
    expect(comoGuest.data.some((p) => p.id === perfilId)).toBe(true)
    await entrar('carla')
    const comoCarla = await comoUsuario().models.PerfilPublico.list()
    expect(comoCarla.data.some((p) => p.id === perfilId)).toBe(true)
  })

  it('el directorio público no se puede escribir salvo por un administrador', async () => {
    await entrar('beto')
    const cliente = comoUsuario()
    expect(
      denegada(
        await cliente.models.PerfilPublico.create({
          ...perfilBasico,
          verificadoManual: true,
        }),
      ),
    ).toBe(true)
    expect(
      denegada(
        await cliente.models.PerfilPublico.update({ id: perfilId, nombre: 'Otro' }),
      ),
    ).toBe(true)
    expect(denegada(await cliente.models.PerfilPublico.delete({ id: perfilId }))).toBe(
      true,
    )
    expect(
      denegada(
        await (await comoInvitado()).models.PerfilPublico.delete({ id: perfilId }),
      ),
    ).toBe(true)
  })

  it('el perfil público no expone la cédula', async () => {
    const res = await (await comoInvitado()).models.PerfilPublico.get({ id: perfilId })
    expect(res.data?.nombre).toBe('Beto Abogado')
    expect(Object.keys(res.data ?? {})).not.toContain('cedula')
  })
})

describe('PerfilCliente', () => {
  let id = ''

  it('solo su dueña lo crea, lee y edita', async () => {
    await entrar('ana')
    const res = await comoUsuario().models.PerfilCliente.create({ nombre: 'Ana Cliente' })
    expect(res.errors).toBeUndefined()
    id = res.data!.id
    registrarCreado('PerfilCliente', id)
    expect(
      denegada(await comoUsuario().models.PerfilCliente.update({ id, ciudad: 'Puebla' })),
    ).toBe(false)
  })

  it('nadie más lo lee: abogado, otra clienta, administrador ni invitado', async () => {
    for (const quien of ['beto', 'carla', 'admin'] as const) {
      await entrar(quien)
      expect(denegada(await comoUsuario().models.PerfilCliente.get({ id }))).toBe(true)
      expect(
        denegada(await comoUsuario().models.PerfilCliente.update({ id, ciudad: 'X' })),
      ).toBe(true)
    }
    expect(denegada(await (await comoInvitado()).models.PerfilCliente.get({ id }))).toBe(
      true,
    )
  })
})

describe('Asunto', () => {
  let id = ''
  const soloCampos = ['id', 'titulo', 'etapa'] as const

  it('la clienta lo crea sin contratar y no controla etapa ni lectores', async () => {
    await entrar('ana')
    const cliente = comoUsuario()
    const res = await cliente.models.Asunto.create(asuntoBasico)
    expect(res.errors).toBeUndefined()
    id = res.data!.id
    registrarCreado('Asunto', id)
    const leido = await cliente.models.Asunto.get(
      { id },
      { selectionSet: [...soloCampos, 'abierto'] },
    )
    expect(etapaDe(leido.data?.etapa)).toBe('SIN_CONTRATAR')
    expect(leido.data?.abierto).toBe(false)

    expect(
      denegada(
        await cliente.models.Asunto.create({ ...asuntoBasico, etapa: 'CONTRATADO' }),
      ),
    ).toBe(true)
    expect(
      denegada(
        await cliente.models.Asunto.create({
          ...asuntoBasico,
          lectores: [identidad.carla],
        }),
      ),
    ).toBe(true)
    expect(denegada(await cliente.models.Asunto.update({ id, etapa: 'CONCLUIDO' }))).toBe(
      true,
    )
    expect(
      denegada(await cliente.models.Asunto.update({ id, lectores: [identidad.carla] })),
    ).toBe(true)
    expect(
      denegada(
        await cliente.models.Asunto.update({ id, abierto: true, titulo: 'Nuevo' }),
      ),
    ).toBe(false)
  })

  it('la clienta no elimina su asunto desde el cliente: el borrado es del servidor', async () => {
    await entrar('ana')
    expect(denegada(await comoUsuario().models.Asunto.delete({ id }))).toBe(true)
    const sigue = await comoUsuario().models.Asunto.get({ id }, { selectionSet: ['id'] })
    expect(sigue.data?.id).toBe(id)
  })

  it('no puede crear un asunto a nombre de otra persona', async () => {
    await entrar('ana')
    const res = await comoUsuario().models.Asunto.create({
      ...asuntoBasico,
      owner: identidad.carla,
    })
    expect(denegada(res)).toBe(true)
  })

  it('una persona ajena o el abogado sin solicitud no lo ve', async () => {
    for (const quien of ['carla', 'beto', 'admin'] as const) {
      await entrar(quien)
      expect(
        denegada(
          await comoUsuario().models.Asunto.get(
            { id },
            { selectionSet: [...soloCampos] },
          ),
        ),
      ).toBe(true)
      const lista = await comoUsuario().models.Asunto.list({ selectionSet: ['id'] })
      expect(lista.data?.some((a) => a.id === id) ?? false).toBe(false)
    }
    expect(denegada(await (await comoInvitado()).models.Asunto.get({ id }))).toBe(true)
  })

  it('con una solicitud, el abogado lo lee pero no lo modifica ni ve la lista de lectores', async () => {
    await actualizarDirecto('Asunto', id, { lectores: [identidad.beto] })
    await entrar('beto')
    const cliente = comoUsuario()
    const leido = await cliente.models.Asunto.get(
      { id },
      { selectionSet: [...soloCampos] },
    )
    expect(leido.errors).toBeUndefined()
    expect(leido.data?.titulo).toBe('Nuevo')
    expect(
      denegada(
        await cliente.models.Asunto.get({ id }, { selectionSet: ['id', 'lectores'] }),
      ),
    ).toBe(true)
    expect(denegada(await cliente.models.Asunto.update({ id, titulo: 'Hackeado' }))).toBe(
      true,
    )
    expect(denegada(await cliente.models.Asunto.delete({ id }))).toBe(true)

    await entrar('carla')
    expect(
      denegada(
        await comoUsuario().models.Asunto.get({ id }, { selectionSet: [...soloCampos] }),
      ),
    ).toBe(true)
  })
})

describe('Contratación y expediente (lectura para participantes, escritura del servidor)', () => {
  const ahora = new Date().toISOString()
  const base = () => ({ participantes: [identidad.ana, identidad.beto] })
  const modelos = {
    Solicitud: () => ({
      asuntoId: 'test-asunto',
      clienteId: identidad.ana,
      abogadoId: identidad.beto,
      estado: 'ENVIADA',
      ...base(),
    }),
    Propuesta: () => ({
      solicitudId: 'test-sol',
      monto: 10000,
      alcance: 'a',
      formaDePago: 'f',
      ...base(),
    }),
    Contrato: () => ({
      propuestaId: 'test-prop',
      asuntoId: 'test-asunto',
      texto: 't',
      honorarios: 10000,
      comision: 1000,
      abogadoRecibe: 9000,
      estado: 'PENDIENTE',
      ...base(),
    }),
    Expediente: () => ({
      asuntoId: 'test-asunto',
      contratoId: 'test-con',
      estado: 'EN_GESTION',
      ...base(),
    }),
    Mensaje: () => ({
      expedienteId: 'test-exp',
      autor: identidad.ana,
      texto: 'hola',
      creadoEn: ahora,
      ...base(),
    }),
    Documento: () => ({
      expedienteId: 'test-exp',
      nombre: 'a.pdf',
      ruta: 'x/a.pdf',
      tipo: 'application/pdf',
      tamano: 10,
      subidoPor: identidad.ana,
      creadoEn: ahora,
      ...base(),
    }),
    Actuacion: () => ({
      expedienteId: 'test-exp',
      tipo: 'CONTRATO',
      detalle: 'd',
      creadoEn: ahora,
      ...base(),
    }),
  } as const

  type Operaciones = {
    get(a: { id: string }): Promise<{ data?: unknown; errors?: readonly unknown[] }>
    list(): Promise<{ data?: { id: string }[]; errors?: readonly unknown[] }>
    create(a: object): Promise<{ data?: unknown; errors?: readonly unknown[] }>
    update(a: object): Promise<{ data?: unknown; errors?: readonly unknown[] }>
    delete(a: { id: string }): Promise<{ data?: unknown; errors?: readonly unknown[] }>
  }
  const operaciones = (nombre: keyof typeof modelos) =>
    comoUsuario().models[nombre] as unknown as Operaciones

  beforeAll(async () => {
    for (const [nombre, campos] of Object.entries(modelos)) {
      await sembrar(nombre, `test-${nombre.toLowerCase()}`, campos())
    }
  })

  describe.each(Object.keys(modelos) as (keyof typeof modelos)[])('%s', (nombre) => {
    const id = `test-${nombre.toLowerCase()}`

    it('lo leen los dos participantes', async () => {
      for (const quien of ['ana', 'beto'] as const) {
        await entrar(quien)
        expect(denegada(await operaciones(nombre).get({ id }))).toBe(false)
      }
    })

    it('no lo lee una persona ajena, un administrador ni un invitado', async () => {
      for (const quien of ['carla', 'admin'] as const) {
        await entrar(quien)
        expect(denegada(await operaciones(nombre).get({ id }))).toBe(true)
        const lista = await operaciones(nombre).list()
        expect(lista.data?.some((x) => x.id === id) ?? false).toBe(false)
      }
      expect(
        denegada(
          await ((await comoInvitado()).models[nombre] as unknown as Operaciones).get({
            id,
          }),
        ),
      ).toBe(true)
    })

    it('ningún participante lo crea, modifica ni borra desde el cliente', async () => {
      for (const quien of ['ana', 'beto'] as const) {
        await entrar(quien)
        const ops = operaciones(nombre)
        expect(denegada(await ops.create(modelos[nombre]()))).toBe(true)
        expect(denegada(await ops.update({ id }))).toBe(true)
        expect(denegada(await ops.delete({ id }))).toBe(true)
      }
    })
  })
})

describe('Indicadores del panel de administración', () => {
  beforeAll(async () => {
    const participantes = [identidad.ana, identidad.beto]
    await sembrar('Solicitud', 'test-ind-solicitud', {
      asuntoId: 'test-asunto',
      clienteId: identidad.ana,
      abogadoId: identidad.beto,
      participantes,
      estado: 'ENVIADA',
    })
    await sembrar('Expediente', 'test-ind-expediente', {
      asuntoId: 'test-asunto',
      contratoId: 'test-con',
      participantes,
      estado: 'CONCLUIDO',
    })
  })

  it('el administrador recibe los contadores calculados por el servidor', async () => {
    await entrar('admin')
    const res = await comoUsuario().queries.indicadores()
    expect(res.errors).toBeUndefined()
    const datos = res.data!
    expect(datos.abogadosRegistrados).toBeGreaterThanOrEqual(1)
    expect(datos.clientesRegistrados).toBeGreaterThanOrEqual(2)
    expect(datos.solicitudes).toBeGreaterThanOrEqual(1)
    expect(datos.contrataciones).toBeGreaterThanOrEqual(1)
    expect(datos.concluidos).toBeGreaterThanOrEqual(1)
    expect(datos.contrataciones).toBeGreaterThanOrEqual(datos.concluidos)
  })

  it('cliente, abogado e invitado no pueden pedirlos', async () => {
    for (const quien of ['ana', 'beto'] as const) {
      await entrar(quien)
      expect(denegada(await comoUsuario().queries.indicadores())).toBe(true)
    }
    expect(denegada(await (await comoInvitado()).queries.indicadores())).toBe(true)
  })
})
