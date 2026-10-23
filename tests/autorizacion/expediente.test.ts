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
 * Expediente (T16) contra el sandbox: ana (CLIENTE) y beto (ABOGADO) contratan y conversan;
 * carla (CLIENTE) y admin son ajenos.
 */
type Respuesta = {
  data?: { id?: string; estado?: string } | null
  errors?: readonly { message?: string }[]
}
const resultado = (r: Respuesta) =>
  r.errors?.length ? (codigoDeErrores(r.errors) ?? 'DENEGADA') : 'OK'

const PERFIL_BETO = 'test-expediente-beto'
const perfil = {
  nombre: 'Beto Abogado',
  materias: ['CIVIL'],
  ubicacion: 'Puebla',
  modalidad: 'AMBAS',
}
let asuntoId = ''
let expedienteId = ''

beforeAll(async () => {
  await crearPersonas()
  await sembrar('PerfilAbogado', PERFIL_BETO, { ...perfil, owner: identidad.beto })
  await sembrar('PerfilPublico', PERFIL_BETO, { ...perfil, verificadoManual: true })

  await entrar('ana')
  const asunto = await comoUsuario().models.Asunto.create({
    titulo: 'Asunto con expediente',
    descripcion: 'Descripción suficientemente larga para el asunto de prueba.',
    materia: 'CIVIL',
    ubicacion: 'Puebla',
    modalidad: 'AMBAS',
    abierto: true,
  })
  asuntoId = asunto.data!.id
  registrarCreado('Asunto', asuntoId)
  const envio = await comoUsuario().mutations.enviarSolicitud({
    asuntoId,
    perfilId: PERFIL_BETO,
  })
  const solicitudId = envio.data!.solicitudId
  for (const modelo of ['Solicitud', 'Propuesta', 'Contrato'])
    registrarCreado(modelo, solicitudId)

  await entrar('beto')
  await comoUsuario().mutations.responderSolicitud({
    solicitudId,
    aceptar: true,
    declaracionNoConflicto: true,
  })
  await comoUsuario().mutations.proponerHonorarios({
    solicitudId,
    monto: 10000,
    alcance: 'Revisión del contrato de arrendamiento y negociación con el arrendador.',
    formaDePago: 'Mitad al inicio y mitad al terminar',
  })
  await entrar('ana')
  await comoUsuario().mutations.prepararContrato({ solicitudId })
  await comoUsuario().mutations.aceptarContrato({ solicitudId, aceptoDemostracion: true })
  await entrar('beto')
  await comoUsuario().mutations.aceptarContrato({ solicitudId, aceptoDemostracion: true })

  await entrar('ana')
  const expedientes = await comoUsuario().models.Expediente.listExpedienteByAsuntoId({
    asuntoId,
  })
  expedienteId = expedientes.data[0].id
  registrarCreado('Expediente', expedienteId)
})

afterAll(async () => {
  await entrar('ana')
  const cliente = comoUsuario()
  const mensajes = await cliente.models.Mensaje.listMensajeByExpedienteIdAndCreadoEn({
    expedienteId,
  })
  for (const m of mensajes.data) registrarCreado('Mensaje', m.id)
  const actuaciones =
    await cliente.models.Actuacion.listActuacionByExpedienteIdAndCreadoEn({
      expedienteId,
    })
  for (const a of actuaciones.data) registrarCreado('Actuacion', a.id)
  await limpiarDatos()
  await borrarPersonas()
})

const enviar = async (quien: 'ana' | 'beto' | 'carla' | 'admin', texto: string) => {
  await entrar(quien)
  return (await comoUsuario().mutations.enviarMensaje({
    expedienteId,
    texto,
  })) as Respuesta
}

describe('conversación', () => {
  it('las dos partes escriben y leen la conversación con su autor', async () => {
    expect(resultado(await enviar('ana', 'Hola, licenciado.'))).toBe('OK')
    expect(resultado(await enviar('beto', 'Hola, revisemos su contrato.'))).toBe('OK')
    for (const quien of ['ana', 'beto'] as const) {
      await entrar(quien)
      const { data } =
        await comoUsuario().models.Mensaje.listMensajeByExpedienteIdAndCreadoEn({
          expedienteId,
        })
      expect(data.map((m) => m.texto)).toEqual([
        'Hola, licenciado.',
        'Hola, revisemos su contrato.',
      ])
      expect(data[0].autor.split('::')[0]).toBe(identidad.ana.split('::')[0])
      expect(data[1].autor.split('::')[0]).toBe(identidad.beto.split('::')[0])
    }
  })

  it('una clienta ajena no escribe ni lee, y el administrador ni el invitado pueden usarlo', async () => {
    expect(resultado(await enviar('carla', 'Intruso'))).toBe('NO_ENCONTRADO')
    await entrar('carla')
    const lectura =
      await comoUsuario().models.Mensaje.listMensajeByExpedienteIdAndCreadoEn({
        expedienteId,
      })
    expect(lectura.data ?? []).toHaveLength(0)
    expect(
      denegada(await comoUsuario().models.Expediente.get({ id: expedienteId })),
    ).toBe(true)
    expect(denegada(await enviar('admin', 'Hola'))).toBe(true)
    expect(
      denegada(
        await (
          await comoInvitado()
        ).mutations.enviarMensaje({ expedienteId, texto: 'Hola' }),
      ),
    ).toBe(true)
  })

  it('nadie crea mensajes directamente con la API, ni siquiera las partes', async () => {
    await entrar('ana')
    const directo = await comoUsuario().models.Mensaje.create({
      expedienteId,
      participantes: [identidad.ana, identidad.beto],
      autor: identidad.ana,
      texto: 'Directo',
      creadoEn: new Date().toISOString(),
    })
    expect(denegada(directo)).toBe(true)
  })

  it('rechaza mensajes vacíos', async () => {
    expect(resultado(await enviar('ana', '   '))).toBe('DATOS_INVALIDOS')
  })
})

describe('conclusión', () => {
  it('la clienta no puede concluir', async () => {
    await entrar('ana')
    expect(
      denegada(await comoUsuario().mutations.concluirExpediente({ expedienteId })),
    ).toBe(true)
  })

  it('el abogado concluye: expediente y asunto concluidos, con su actuación en la bitácora', async () => {
    await entrar('beto')
    const r = (await comoUsuario().mutations.concluirExpediente({
      expedienteId,
    })) as Respuesta
    expect(r.data?.estado).toBe('CONCLUIDO')

    await entrar('ana')
    expect(
      (await comoUsuario().models.Expediente.get({ id: expedienteId })).data?.estado,
    ).toBe('CONCLUIDO')
    const asunto = await comoUsuario().models.Asunto.get(
      { id: asuntoId },
      { selectionSet: ['id', 'etapa'] },
    )
    expect(asunto.data?.etapa).toBe('CONCLUIDO')
    const actuaciones =
      await comoUsuario().models.Actuacion.listActuacionByExpedienteIdAndCreadoEn({
        expedienteId,
      })
    expect(actuaciones.data.map((a) => a.tipo)).toEqual(['CONTRATACION', 'CONCLUSION'])
  })

  it('un expediente concluido ya no admite mensajes ni otra conclusión', async () => {
    expect(resultado(await enviar('ana', 'Una pregunta más'))).toBe(
      'EXPEDIENTE_CONCLUIDO',
    )
    await entrar('beto')
    expect(
      resultado(
        (await comoUsuario().mutations.concluirExpediente({ expedienteId })) as Respuesta,
      ),
    ).toBe('EXPEDIENTE_CONCLUIDO')
  })
})
