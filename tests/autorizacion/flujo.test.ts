import { codigoDeErrores } from '../../shared/domain/flujo'
import {
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
 * Flujo de contratación (T14) contra el sandbox: ana (CLIENTE) envía su asunto, beto (ABOGADO)
 * responde y propone, carla (CLIENTE) es ajena. Los abogados p1 a p3 solo tienen perfil sembrado.
 */
type Respuesta = {
  data?: { solicitudId: string; estado: string } | null
  errors?: readonly { message?: string }[]
}
const resultado = (r: Respuesta) =>
  r.errors?.length ? (codigoDeErrores(r.errors) ?? 'DENEGADA') : 'OK'

const PERFIL_BETO = 'test-flujo-beto'
const OTROS = ['test-flujo-p1', 'test-flujo-p2', 'test-flujo-p3']
const OCULTO = 'test-flujo-oculto'

const perfil = (nombre: string) => ({
  nombre,
  materias: ['CIVIL'],
  ubicacion: 'Puebla',
  modalidad: 'AMBAS',
})

let asunto = ''
const solicitudes: Record<string, string> = {}

async function enviar(perfilId: string, asuntoId = asunto) {
  await entrar('ana')
  const r = (await comoUsuario().mutations.enviarSolicitud({
    asuntoId,
    perfilId,
  })) as Respuesta
  if (r.data?.solicitudId) {
    registrarCreado('Solicitud', r.data.solicitudId)
    solicitudes[perfilId] = r.data.solicitudId
  }
  return r
}

/**
 * Lectores del asunto como `sub`. En la base se guardan como `sub::username`, pero la API de
 * Amplify devuelve solo el `sub` de los campos de propietario; se compara con esa forma.
 */
async function lectores(): Promise<string[]> {
  await entrar('ana')
  const r = await comoUsuario().models.Asunto.get(
    { id: asunto },
    { selectionSet: ['id', 'lectores'] },
  )
  return (r.data?.lectores ?? [])
    .filter((x): x is string => Boolean(x))
    .map((x) => x.split('::')[0])
}
const subDe = (quien: 'beto') => identidad[quien].split('::')[0]

async function betoLeeElAsunto(): Promise<boolean> {
  await entrar('beto')
  const r = await comoUsuario().models.Asunto.get(
    { id: asunto },
    { selectionSet: ['id', 'titulo'] },
  )
  return !denegada(r)
}

beforeAll(async () => {
  await crearPersonas()
  await sembrar('PerfilAbogado', PERFIL_BETO, {
    ...perfil('Beto Abogado'),
    owner: identidad.beto,
  })
  await sembrar('PerfilPublico', PERFIL_BETO, {
    ...perfil('Beto Abogado'),
    verificadoManual: true,
  })
  for (const [i, id] of OTROS.entries()) {
    await sembrar('PerfilAbogado', id, {
      ...perfil(`Abogado ${i}`),
      owner: `fake-${i}::fake-${i}`,
    })
    await sembrar('PerfilPublico', id, {
      ...perfil(`Abogado ${i}`),
      verificadoManual: false,
    })
  }
  await sembrar('PerfilAbogado', OCULTO, {
    ...perfil('Sin publicar'),
    owner: 'fake-x::fake-x',
  })

  await entrar('ana')
  const creado = await comoUsuario().models.Asunto.create({
    titulo: 'Asunto del flujo',
    descripcion: 'Descripción suficientemente larga para el asunto de prueba.',
    materia: 'CIVIL',
    ubicacion: 'Puebla',
    modalidad: 'AMBAS',
    abierto: true,
  })
  asunto = creado.data!.id
  registrarCreado('Asunto', asunto)
})

afterAll(async () => {
  for (const id of Object.values(solicitudes)) registrarCreado('Propuesta', id)
  await limpiarDatos()
  await borrarPersonas()
})

describe('enviar una solicitud', () => {
  it('solo la dueña del asunto puede enviarlo; para otra clienta no existe', async () => {
    await entrar('carla')
    const r = (await comoUsuario().mutations.enviarSolicitud({
      asuntoId: asunto,
      perfilId: PERFIL_BETO,
    })) as Respuesta
    expect(resultado(r)).toBe('NO_ENCONTRADO')
  })

  it('abogado, administrador e invitado no pueden enviar solicitudes', async () => {
    for (const quien of ['beto', 'admin'] as const) {
      await entrar(quien)
      expect(
        denegada(
          await comoUsuario().mutations.enviarSolicitud({
            asuntoId: asunto,
            perfilId: PERFIL_BETO,
          }),
        ),
      ).toBe(true)
    }
    expect(
      denegada(
        await (
          await comoInvitado()
        ).mutations.enviarSolicitud({ asuntoId: asunto, perfilId: PERFIL_BETO }),
      ),
    ).toBe(true)
  })

  it('no se puede enviar a un abogado sin perfil publicado', async () => {
    expect(resultado(await enviar(OCULTO))).toBe('NO_ENCONTRADO')
  })

  it('al enviarla, el abogado pasa a leer el asunto; una persona ajena no lee la solicitud', async () => {
    expect(await betoLeeElAsunto()).toBe(false)
    expect(resultado(await enviar(PERFIL_BETO))).toBe('OK')
    expect(await lectores()).toEqual([subDe('beto')])
    expect(await betoLeeElAsunto()).toBe(true)

    const id = solicitudes[PERFIL_BETO]
    for (const quien of ['ana', 'beto'] as const) {
      await entrar(quien)
      const s = await comoUsuario().models.Solicitud.get({ id })
      expect(s.data?.estado).toBe('ENVIADA')
      expect(s.data?.perfilId).toBe(PERFIL_BETO)
    }
    await entrar('carla')
    expect(denegada(await comoUsuario().models.Solicitud.get({ id }))).toBe(true)
  })

  it('no admite una segunda solicitud activa al mismo abogado', async () => {
    expect(resultado(await enviar(PERFIL_BETO))).toBe('SOLICITUD_DUPLICADA')
  })

  it('admite hasta tres solicitudes activas', async () => {
    expect(resultado(await enviar(OTROS[0]))).toBe('OK')
    expect(resultado(await enviar(OTROS[1]))).toBe('OK')
    expect(resultado(await enviar(OTROS[2]))).toBe('LIMITE_SOLICITUDES')
    expect((await lectores()).length).toBe(3)
  })
})

describe('responder y proponer', () => {
  const responder = async (
    aceptar: boolean,
    declaracionNoConflicto?: boolean,
    quien: 'beto' | 'ana' = 'beto',
  ) => {
    await entrar(quien)
    return (await comoUsuario().mutations.responderSolicitud({
      solicitudId: solicitudes[PERFIL_BETO],
      aceptar,
      declaracionNoConflicto,
    })) as Respuesta
  }
  const proponer = async (monto: number) => {
    await entrar('beto')
    return (await comoUsuario().mutations.proponerHonorarios({
      solicitudId: solicitudes[PERFIL_BETO],
      monto,
      alcance: 'Revisión del contrato de arrendamiento y negociación con el arrendador.',
      formaDePago: 'Mitad al inicio y mitad al terminar',
    })) as Respuesta
  }

  it('no se propone antes de aceptar', async () => {
    expect(resultado(await proponer(10000))).toBe('ESTADO_INVALIDO')
  })

  it('la clienta no puede responder por el abogado', async () => {
    expect(denegada(await responder(true, true, 'ana'))).toBe(true)
  })

  it('aceptar exige la declaración de no conflicto y la registra', async () => {
    expect(resultado(await responder(true))).toBe('DECLARACION_REQUERIDA')
    expect(resultado(await responder(true, false))).toBe('DECLARACION_REQUERIDA')
    expect(resultado(await responder(true, true))).toBe('OK')
    await entrar('ana')
    const s = await comoUsuario().models.Solicitud.get({ id: solicitudes[PERFIL_BETO] })
    expect(s.data).toMatchObject({ estado: 'ACEPTADA', declaracionNoConflicto: true })
    expect(s.data?.fechaDeclaracion).toBeTruthy()
  })

  it('el abogado no puede rechazar una solicitud ya aceptada', async () => {
    expect(resultado(await responder(false))).toBe('ESTADO_INVALIDO')
  })

  it('propone honorarios válidos, los puede actualizar, y solo los participantes los leen', async () => {
    expect(resultado(await proponer(-5))).toBe('DATOS_INVALIDOS')
    expect(resultado(await proponer(10000))).toBe('OK')
    // La propuesta usa el id de la solicitud; se registra ahora porque la solicitud se reenviará.
    registrarCreado('Propuesta', solicitudes[PERFIL_BETO])
    expect(resultado(await proponer(12500))).toBe('OK')
    const id = solicitudes[PERFIL_BETO]
    for (const quien of ['ana', 'beto'] as const) {
      await entrar(quien)
      expect((await comoUsuario().models.Propuesta.get({ id })).data?.monto).toBe(12500)
    }
    await entrar('carla')
    expect(denegada(await comoUsuario().models.Propuesta.get({ id }))).toBe(true)
  })
})

describe('retirar, rechazar y reenviar', () => {
  it('la clienta retira una solicitud aceptada y el abogado deja de leer el asunto', async () => {
    await entrar('beto')
    expect(
      denegada(
        await comoUsuario().mutations.retirarSolicitud({
          solicitudId: solicitudes[PERFIL_BETO],
        }),
      ),
    ).toBe(true)

    await entrar('ana')
    const r = (await comoUsuario().mutations.retirarSolicitud({
      solicitudId: solicitudes[PERFIL_BETO],
    })) as Respuesta
    expect(resultado(r)).toBe('OK')
    expect(r.data?.estado).toBe('RETIRADA')
    expect(await lectores()).not.toContain(subDe('beto'))
    expect(await betoLeeElAsunto()).toBe(false)
  })

  it('una solicitud retirada ya no admite cambios', async () => {
    await entrar('ana')
    const r = (await comoUsuario().mutations.retirarSolicitud({
      solicitudId: solicitudes[PERFIL_BETO],
    })) as Respuesta
    expect(resultado(r)).toBe('ESTADO_INVALIDO')
  })

  it('tras retirarla, se puede reenviar al mismo abogado; tras rechazarla, también', async () => {
    expect(resultado(await enviar(PERFIL_BETO))).toBe('OK')
    await entrar('beto')
    const rechazo = (await comoUsuario().mutations.responderSolicitud({
      solicitudId: solicitudes[PERFIL_BETO],
      aceptar: false,
    })) as Respuesta
    expect(rechazo.data?.estado).toBe('RECHAZADA')
    expect(await lectores()).not.toContain(subDe('beto'))
    expect(await betoLeeElAsunto()).toBe(false)
    expect(resultado(await enviar(PERFIL_BETO))).toBe('OK')
  })

  it('con un solo lugar libre, dos envíos simultáneos no pasan el límite', async () => {
    await entrar('ana')
    expect(
      resultado(
        (await comoUsuario().mutations.retirarSolicitud({
          solicitudId: solicitudes[OTROS[0]],
        })) as Respuesta,
      ),
    ).toBe('OK')
    expect((await lectores()).length).toBe(2)

    const cliente = comoUsuario()
    const [a, b] = (await Promise.all([
      cliente.mutations.enviarSolicitud({ asuntoId: asunto, perfilId: OTROS[0] }),
      cliente.mutations.enviarSolicitud({ asuntoId: asunto, perfilId: OTROS[2] }),
    ])) as Respuesta[]
    for (const r of [a, b])
      if (r.data?.solicitudId) registrarCreado('Solicitud', r.data.solicitudId)
    const resultados = [resultado(a), resultado(b)].sort()
    expect(resultados.filter((x) => x === 'OK')).toHaveLength(1)
    expect(['CONFLICTO', 'LIMITE_SOLICITUDES']).toContain(
      resultados.find((x) => x !== 'OK'),
    )
    expect((await lectores()).length).toBe(3)
  })
})

describe('asunto que deja de estar disponible', () => {
  it('si la clienta vuelve el asunto a borrador, el abogado ya no puede aceptar', async () => {
    await entrar('ana')
    const otro = await comoUsuario().models.Asunto.create({
      titulo: 'Segundo asunto',
      descripcion: 'Otra descripción suficientemente larga para la prueba.',
      materia: 'CIVIL',
      ubicacion: 'Puebla',
      modalidad: 'AMBAS',
      abierto: true,
    })
    const id = otro.data!.id
    registrarCreado('Asunto', id)
    const envio = (await comoUsuario().mutations.enviarSolicitud({
      asuntoId: id,
      perfilId: PERFIL_BETO,
    })) as Respuesta
    expect(resultado(envio)).toBe('OK')
    registrarCreado('Solicitud', envio.data!.solicitudId)
    await comoUsuario().models.Asunto.update({ id, abierto: false })

    await entrar('beto')
    const r = (await comoUsuario().mutations.responderSolicitud({
      solicitudId: envio.data!.solicitudId,
      aceptar: true,
      declaracionNoConflicto: true,
    })) as Respuesta
    expect(resultado(r)).toBe('ASUNTO_NO_DISPONIBLE')
  })
})
