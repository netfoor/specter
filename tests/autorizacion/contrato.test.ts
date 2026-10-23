import { codigoDeErrores } from '../../shared/domain/flujo'
import {
  borrarPersonas,
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
 * Contrato y cierre de la contratación (T15) contra el sandbox: ana (CLIENTE) contrata a beto
 * (ABOGADO); otra solicitud activa con un abogado sembrado debe quedar retirada al cerrar.
 */
type Respuesta = {
  data?: { solicitudId: string; estado: string } | null
  errors?: readonly { message?: string }[]
}
const resultado = (r: Respuesta) =>
  r.errors?.length ? (codigoDeErrores(r.errors) ?? 'DENEGADA') : 'OK'

const PERFIL_BETO = 'test-contrato-beto'
const PERFIL_OTRO = 'test-contrato-otro'
const perfil = (nombre: string) => ({
  nombre,
  materias: ['CIVIL'],
  ubicacion: 'Puebla',
  modalidad: 'AMBAS',
})
const PROPUESTA = {
  monto: 10000,
  alcance: 'Revisión del contrato de arrendamiento y negociación con el arrendador.',
  formaDePago: 'Mitad al inicio y mitad al terminar',
}

const registrarSolicitud = (id: string) => {
  for (const modelo of ['Solicitud', 'Propuesta', 'Contrato']) registrarCreado(modelo, id)
}

/** Crea un asunto abierto de ana, lo envía a beto, beto acepta y propone. Devuelve los ids. */
async function prepararEscenario(conOtro: boolean) {
  await entrar('ana')
  const cliente = comoUsuario()
  const asunto = await cliente.models.Asunto.create({
    titulo: 'Asunto para contratar',
    descripcion: 'Descripción suficientemente larga para el asunto de prueba.',
    materia: 'CIVIL',
    ubicacion: 'Puebla',
    modalidad: 'AMBAS',
    abierto: true,
  })
  const asuntoId = asunto.data!.id
  registrarCreado('Asunto', asuntoId)

  const envio = (await cliente.mutations.enviarSolicitud({
    asuntoId,
    perfilId: PERFIL_BETO,
  })) as Respuesta
  const solicitudId = envio.data!.solicitudId
  registrarSolicitud(solicitudId)
  let otraId = ''
  if (conOtro) {
    const otra = (await cliente.mutations.enviarSolicitud({
      asuntoId,
      perfilId: PERFIL_OTRO,
    })) as Respuesta
    otraId = otra.data!.solicitudId
    registrarSolicitud(otraId)
  }

  await entrar('beto')
  await comoUsuario().mutations.responderSolicitud({
    solicitudId,
    aceptar: true,
    declaracionNoConflicto: true,
  })
  await comoUsuario().mutations.proponerHonorarios({ solicitudId, ...PROPUESTA })
  return { asuntoId, solicitudId, otraId }
}

async function registrarExpediente(asuntoId: string) {
  await entrar('ana')
  const { data } = await comoUsuario().models.Expediente.listExpedienteByAsuntoId({
    asuntoId,
  })
  for (const e of data) {
    registrarCreado('Expediente', e.id)
    const actuaciones =
      await comoUsuario().models.Actuacion.listActuacionByExpedienteIdAndCreadoEn({
        expedienteId: e.id,
      })
    for (const a of actuaciones.data) registrarCreado('Actuacion', a.id)
  }
  return data
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
  await sembrar('PerfilAbogado', PERFIL_OTRO, {
    ...perfil('Otro Abogado'),
    owner: 'fake-otro::fake-otro',
  })
  await sembrar('PerfilPublico', PERFIL_OTRO, {
    ...perfil('Otro Abogado'),
    verificadoManual: false,
  })
})

afterAll(async () => {
  await limpiarDatos()
  await borrarPersonas()
})

describe('preparar y aceptar el contrato', () => {
  let ids = { asuntoId: '', solicitudId: '', otraId: '' }

  beforeAll(async () => {
    ids = await prepararEscenario(true)
  })

  it('solo el cliente de la solicitud lo prepara', async () => {
    await entrar('beto')
    expect(
      denegada(
        await comoUsuario().mutations.prepararContrato({ solicitudId: ids.solicitudId }),
      ),
    ).toBe(true)
    await entrar('carla')
    const r = (await comoUsuario().mutations.prepararContrato({
      solicitudId: ids.solicitudId,
    })) as Respuesta
    expect(resultado(r)).toBe('NO_ENCONTRADO')
  })

  it('el contrato preparado lleva el texto, el desglose y los nombres; solo lo leen las partes', async () => {
    await entrar('ana')
    const r = (await comoUsuario().mutations.prepararContrato({
      solicitudId: ids.solicitudId,
    })) as Respuesta
    expect(resultado(r)).toBe('OK')
    for (const quien of ['ana', 'beto'] as const) {
      await entrar(quien)
      const c = (await comoUsuario().models.Contrato.get({ id: ids.solicitudId })).data!
      expect(c).toMatchObject({
        estado: 'PENDIENTE',
        honorarios: 10000,
        comision: 1000,
        abogadoRecibe: 9000,
      })
      expect(c.texto).toContain('Ana Cliente')
      expect(c.texto).toContain('Beto Abogado')
      expect(c.texto).toContain('No tiene validez jurídica')
    }
    for (const quien of ['carla', 'admin'] as const) {
      await entrar(quien)
      expect(
        denegada(await comoUsuario().models.Contrato.get({ id: ids.solicitudId })),
      ).toBe(true)
    }
  })

  it('aceptar exige confirmar que es una demostración', async () => {
    await entrar('ana')
    const r = (await comoUsuario().mutations.aceptarContrato({
      solicitudId: ids.solicitudId,
      aceptoDemostracion: false,
    })) as Respuesta
    expect(resultado(r)).toBe('ACEPTACION_REQUERIDA')
  })

  it('tras la primera aceptación la propuesta queda fija', async () => {
    await entrar('ana')
    const r = (await comoUsuario().mutations.aceptarContrato({
      solicitudId: ids.solicitudId,
      aceptoDemostracion: true,
    })) as Respuesta
    expect(r.data?.estado).toBe('PENDIENTE')

    await entrar('beto')
    const cambio = (await comoUsuario().mutations.proponerHonorarios({
      solicitudId: ids.solicitudId,
      ...PROPUESTA,
      monto: 20000,
    })) as Respuesta
    expect(resultado(cambio)).toBe('CONTRATO_EN_CURSO')
  })

  it('con la segunda aceptación se cierra la contratación', async () => {
    await entrar('beto')
    const r = (await comoUsuario().mutations.aceptarContrato({
      solicitudId: ids.solicitudId,
      aceptoDemostracion: true,
    })) as Respuesta
    expect(r.data?.estado).toBe('ACEPTADO')

    // Asunto contratado y solo el abogado contratado lo sigue leyendo.
    await entrar('ana')
    const asunto = await comoUsuario().models.Asunto.get(
      { id: ids.asuntoId },
      { selectionSet: ['id', 'etapa', 'lectores'] },
    )
    expect(asunto.data?.etapa).toBe('CONTRATADO')
    expect((asunto.data?.lectores ?? []).map((l) => l?.split('::')[0])).toEqual([
      identidad.beto.split('::')[0],
    ])

    // La otra solicitud activa quedó retirada.
    const otra = await comoUsuario().models.Solicitud.get({ id: ids.otraId })
    expect(otra.data?.estado).toBe('RETIRADA')

    // Hay exactamente un expediente, con su primera actuación, que solo leen las partes.
    const expedientes = await registrarExpediente(ids.asuntoId)
    expect(expedientes).toHaveLength(1)
    expect(expedientes[0]).toMatchObject({
      estado: 'EN_GESTION',
      contratoId: ids.solicitudId,
    })
    await entrar('beto')
    expect(
      (await comoUsuario().models.Expediente.get({ id: expedientes[0].id })).data?.id,
    ).toBe(expedientes[0].id)
    const actuaciones =
      await comoUsuario().models.Actuacion.listActuacionByExpedienteIdAndCreadoEn({
        expedienteId: expedientes[0].id,
      })
    expect(actuaciones.data.map((a) => a.tipo)).toEqual(['CONTRATACION'])
    await entrar('carla')
    expect(
      denegada(await comoUsuario().models.Expediente.get({ id: expedientes[0].id })),
    ).toBe(true)
  })

  it('un asunto contratado ya no admite retirar, enviar, proponer ni aceptar otra vez', async () => {
    await entrar('ana')
    const cliente = comoUsuario()
    expect(
      resultado(
        (await cliente.mutations.retirarSolicitud({
          solicitudId: ids.solicitudId,
        })) as Respuesta,
      ),
    ).toBe('ASUNTO_NO_DISPONIBLE')
    expect(
      resultado(
        (await cliente.mutations.enviarSolicitud({
          asuntoId: ids.asuntoId,
          perfilId: PERFIL_OTRO,
        })) as Respuesta,
      ),
    ).toBe('ASUNTO_NO_DISPONIBLE')
    await entrar('beto')
    expect(
      resultado(
        (await comoUsuario().mutations.proponerHonorarios({
          solicitudId: ids.solicitudId,
          ...PROPUESTA,
        })) as Respuesta,
      ),
    ).toBe('ASUNTO_NO_DISPONIBLE')
    const repetida = (await comoUsuario().mutations.aceptarContrato({
      solicitudId: ids.solicitudId,
      aceptoDemostracion: true,
    })) as Respuesta
    expect(repetida.data?.estado).toBe('ACEPTADO')
    expect(await registrarExpediente(ids.asuntoId)).toHaveLength(1)
  })
})

describe('cambios de la propuesta antes de aceptar', () => {
  it('cambiar la propuesta descarta el contrato preparado; hay que prepararlo de nuevo', async () => {
    const { solicitudId } = await prepararEscenario(false)
    await entrar('ana')
    await comoUsuario().mutations.prepararContrato({ solicitudId })

    await entrar('beto')
    expect(
      resultado(
        (await comoUsuario().mutations.proponerHonorarios({
          solicitudId,
          ...PROPUESTA,
          monto: 15000,
        })) as Respuesta,
      ),
    ).toBe('OK')
    expect((await comoUsuario().models.Contrato.get({ id: solicitudId })).data).toBeNull()

    await entrar('ana')
    const sin = (await comoUsuario().mutations.aceptarContrato({
      solicitudId,
      aceptoDemostracion: true,
    })) as Respuesta
    expect(resultado(sin)).toBe('SIN_CONTRATO')
    await comoUsuario().mutations.prepararContrato({ solicitudId })
    expect(
      (await comoUsuario().models.Contrato.get({ id: solicitudId })).data?.honorarios,
    ).toBe(15000)
  })
})

describe('aceptación repetida al mismo tiempo', () => {
  // El cliente de Amplify en Node mantiene una sola sesión, así que no se puede simular a las dos
  // partes en paralelo; se prueba el doble envío simultáneo de la aceptación final (doble clic).
  it('si la última parte acepta dos veces a la vez, queda un solo expediente', async () => {
    const { asuntoId, solicitudId } = await prepararEscenario(false)
    await entrar('ana')
    await comoUsuario().mutations.prepararContrato({ solicitudId })
    const primera = (await comoUsuario().mutations.aceptarContrato({
      solicitudId,
      aceptoDemostracion: true,
    })) as Respuesta
    expect(resultado(primera)).toBe('OK')

    await entrar('beto')
    const [b1, b2] = (await Promise.all([
      comoUsuario().mutations.aceptarContrato({ solicitudId, aceptoDemostracion: true }),
      comoUsuario().mutations.aceptarContrato({ solicitudId, aceptoDemostracion: true }),
    ])) as Respuesta[]
    expect([resultado(b1), resultado(b2)]).toEqual(['OK', 'OK'])

    await entrar('ana')
    expect(
      (await comoUsuario().models.Contrato.get({ id: solicitudId })).data?.estado,
    ).toBe('ACEPTADO')
    expect(await registrarExpediente(asuntoId)).toHaveLength(1)
  })
})
