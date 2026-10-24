import { DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { codigoDeErrores } from '../../shared/domain/flujo'
import {
  borrarPersonas,
  comoUsuario,
  crearPersonas,
  entrar,
  identidad,
  limpiarDatos,
  registrarCreado,
  salidas,
  sembrar,
} from './apoyo'

/**
 * Documentos del expediente (T17) contra el sandbox y S3 real: ana y beto son las partes;
 * carla es ajena.
 */
type Respuesta = {
  data?: Record<string, unknown> | null
  errors?: readonly { message?: string }[]
}
const resultado = (r: Respuesta) =>
  r.errors?.length ? (codigoDeErrores(r.errors) ?? 'DENEGADA') : 'OK'

const PERFIL_BETO = 'test-documentos-beto'
const perfil = {
  nombre: 'Beto Abogado',
  materias: ['CIVIL'],
  ubicacion: 'Puebla',
  modalidad: 'AMBAS',
}
const bucket = salidas.custom?.documentosBucket ?? ''
const s3 = new S3Client({ region: salidas.auth.aws_region })
const claves: string[] = []
let expedienteId = ''
let documentoId = ''

const CONTENIDO = new TextEncoder().encode('%PDF-1.4\nDocumento de prueba de Specter\n')

async function autorizar(
  quien: 'ana' | 'beto' | 'carla',
  archivo = { nombre: 'acta.pdf', tipo: 'application/pdf', tamano: CONTENIDO.length },
) {
  await entrar(quien)
  return (await comoUsuario().mutations.solicitarSubida({
    expedienteId,
    ...archivo,
  })) as Respuesta
}

async function subirA(
  autorizacion: Respuesta,
  cuerpo: Uint8Array,
  cambios: Record<string, string> = {},
) {
  const {
    url,
    campos,
    documentoId: id,
  } = autorizacion.data as { url: string; campos: string; documentoId: string }
  const formulario = new FormData()
  for (const [k, v] of Object.entries({ ...JSON.parse(campos), ...cambios }))
    formulario.append(k, String(v))
  formulario.append('file', new Blob([cuerpo as BlobPart]))
  claves.push(`expedientes/${expedienteId}/${id}`)
  return fetch(url, { method: 'POST', body: formulario })
}

beforeAll(async () => {
  await crearPersonas()
  await sembrar('PerfilAbogado', PERFIL_BETO, { ...perfil, owner: identidad.beto })
  await sembrar('PerfilPublico', PERFIL_BETO, { ...perfil, verificadoManual: true })

  await entrar('ana')
  const asunto = await comoUsuario().models.Asunto.create({
    titulo: 'Asunto con documentos',
    descripcion: 'Descripción suficientemente larga para el asunto de prueba.',
    materia: 'CIVIL',
    ubicacion: 'Puebla',
    modalidad: 'AMBAS',
    abierto: true,
  })
  const asuntoId = asunto.data!.id
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
  expedienteId = (
    await comoUsuario().models.Expediente.listExpedienteByAsuntoId({ asuntoId })
  ).data[0].id
  registrarCreado('Expediente', expedienteId)
})

afterAll(async () => {
  await entrar('ana')
  const cliente = comoUsuario()
  for (const d of (
    await cliente.models.Documento.listDocumentoByExpedienteIdAndCreadoEn({
      expedienteId,
    })
  ).data) {
    registrarCreado('Documento', d.id)
  }
  for (const a of (
    await cliente.models.Actuacion.listActuacionByExpedienteIdAndCreadoEn({
      expedienteId,
    })
  ).data) {
    registrarCreado('Actuacion', a.id)
  }
  for (const Key of claves)
    await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key })).catch(() => undefined)
  await limpiarDatos()
  await borrarPersonas()
})

describe('subir y descargar', () => {
  it('una parte sube en tres pasos y ambas partes ven el documento', async () => {
    const autorizacion = await autorizar('ana')
    expect(resultado(autorizacion)).toBe('OK')
    documentoId = String(autorizacion.data!.documentoId)
    expect((await subirA(autorizacion, CONTENIDO)).status).toBe(204)

    const confirmacion = (await comoUsuario().mutations.confirmarSubida({
      expedienteId,
      documentoId,
    })) as Respuesta
    expect(resultado(confirmacion)).toBe('OK')
    for (const quien of ['ana', 'beto'] as const) {
      await entrar(quien)
      const { data } =
        await comoUsuario().models.Documento.listDocumentoByExpedienteIdAndCreadoEn({
          expedienteId,
        })
      expect(data.map((d) => [d.nombre, d.tipo, d.tamano])).toEqual([
        ['acta.pdf', 'application/pdf', CONTENIDO.length],
      ])
    }
    const bitacora =
      await comoUsuario().models.Actuacion.listActuacionByExpedienteIdAndCreadoEn({
        expedienteId,
      })
    expect(bitacora.data.map((a) => a.tipo)).toContain('DOCUMENTO')
  })

  it('la descarga entrega el mismo contenido como archivo adjunto', async () => {
    await entrar('beto')
    const enlace = (await comoUsuario().queries.urlDeDescarga({
      documentoId,
    })) as Respuesta
    const respuesta = await fetch(String(enlace.data!.url))
    expect(respuesta.status).toBe(200)
    expect(new Uint8Array(await respuesta.arrayBuffer())).toEqual(CONTENIDO)
    expect(respuesta.headers.get('content-disposition')).toContain('attachment')
  })

  it('confirmar dos veces no duplica el documento', async () => {
    await entrar('ana')
    await comoUsuario().mutations.confirmarSubida({ expedienteId, documentoId })
    const { data } =
      await comoUsuario().models.Documento.listDocumentoByExpedienteIdAndCreadoEn({
        expedienteId,
      })
    expect(data).toHaveLength(1)
  })
})

describe('acceso', () => {
  it('una clienta ajena no obtiene enlaces, no sube y no ve documentos', async () => {
    await entrar('carla')
    expect(
      resultado(
        (await comoUsuario().queries.urlDeDescarga({ documentoId })) as Respuesta,
      ),
    ).toBe('NO_ENCONTRADO')
    expect(resultado(await autorizar('carla'))).toBe('NO_ENCONTRADO')
    const { data } =
      await comoUsuario().models.Documento.listDocumentoByExpedienteIdAndCreadoEn({
        expedienteId,
      })
    expect(data ?? []).toHaveLength(0)
  })

  it('el bucket no permite leer el archivo sin firma', async () => {
    const directo = await fetch(
      `https://${bucket}.s3.amazonaws.com/expedientes/${expedienteId}/${documentoId}`,
    )
    expect(directo.status).toBe(403)
  })
})

describe('reglas que aplica S3', () => {
  it('rechaza un archivo de más de 10 MB aunque la autorización se pidió por menos', async () => {
    const autorizacion = await autorizar('ana')
    const respuesta = await subirA(autorizacion, new Uint8Array(10 * 1024 * 1024 + 1))
    expect(respuesta.status).toBe(400)
    expect(await respuesta.text()).toContain('EntityTooLarge')
  })

  it('rechaza un tipo distinto del autorizado', async () => {
    const autorizacion = await autorizar('ana')
    const respuesta = await subirA(autorizacion, CONTENIDO, {
      'Content-Type': 'text/html',
    })
    expect(respuesta.status).toBe(403)
  })

  it('el servidor rechaza pedir autorización para un tipo no permitido', async () => {
    expect(
      resultado(
        await autorizar('ana', { nombre: 'x.html', tipo: 'text/html', tamano: 10 }),
      ),
    ).toBe('ARCHIVO_INVALIDO')
  })
})

describe('confirmación', () => {
  it('sin archivo subido no registra nada', async () => {
    const autorizacion = await autorizar('ana')
    const r = (await comoUsuario().mutations.confirmarSubida({
      expedienteId,
      documentoId: String(autorizacion.data!.documentoId),
    })) as Respuesta
    expect(resultado(r)).toBe('SIN_ARCHIVO')
  })

  it('no se puede registrar un archivo que subió otra persona', async () => {
    const autorizacion = await autorizar('ana')
    await subirA(autorizacion, CONTENIDO)
    await entrar('beto')
    const r = (await comoUsuario().mutations.confirmarSubida({
      expedienteId,
      documentoId: String(autorizacion.data!.documentoId),
    })) as Respuesta
    expect(resultado(r)).toBe('SIN_ARCHIVO')
  })
})

describe('expediente concluido', () => {
  it('ya no acepta documentos, pero se siguen pudiendo descargar', async () => {
    await entrar('beto')
    await comoUsuario().mutations.concluirExpediente({ expedienteId })
    expect(resultado(await autorizar('ana'))).toBe('EXPEDIENTE_CONCLUIDO')
    const enlace = (await comoUsuario().queries.urlDeDescarga({
      documentoId,
    })) as Respuesta
    expect((await fetch(String(enlace.data!.url))).status).toBe(200)
  })
})
