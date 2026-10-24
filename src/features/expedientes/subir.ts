import { datosComoUsuario } from '../../app/datos'
import { validarArchivo } from '../../../shared/domain/documento'
import { codigoDeErrores, MENSAJE_FLUJO } from '../../../shared/domain/flujo'

export type ResultadoSubida = { ok: true } | { ok: false; mensaje: string }

const errorDe = (errores?: readonly { message?: string }[]) => {
  const codigo = codigoDeErrores(errores)
  return codigo
    ? MENSAJE_FLUJO[codigo]
    : 'No pudimos subir el documento. Inténtalo de nuevo.'
}

/**
 * Sube un archivo en tres pasos: el servidor autoriza la subida, el navegador la envía directo a
 * S3 con esa autorización (S3 aplica tipo y tamaño) y el servidor confirma y registra.
 */
export async function subirDocumento(
  expedienteId: string,
  archivo: File,
  enviar: typeof fetch = fetch,
): Promise<ResultadoSubida> {
  const validacion = validarArchivo({
    nombre: archivo.name,
    tipo: archivo.type,
    tamano: archivo.size,
  })
  if (!validacion.ok) return { ok: false, mensaje: validacion.motivo }

  try {
    const { mutations } = datosComoUsuario()
    const autorizacion = await mutations.solicitarSubida({
      expedienteId,
      nombre: validacion.nombre,
      tipo: validacion.tipo,
      tamano: validacion.tamano,
    })
    if (autorizacion.errors?.length || !autorizacion.data)
      return { ok: false, mensaje: errorDe(autorizacion.errors) }

    const { documentoId, url } = autorizacion.data
    const campos =
      typeof autorizacion.data.campos === 'string'
        ? (JSON.parse(autorizacion.data.campos) as Record<string, string>)
        : (autorizacion.data.campos as Record<string, string>)
    const formulario = new FormData()
    for (const [clave, valor] of Object.entries(campos)) formulario.append(clave, valor)
    formulario.append('file', archivo)
    const respuesta = await enviar(url, { method: 'POST', body: formulario })
    if (!respuesta.ok) {
      return {
        ok: false,
        mensaje: 'El almacenamiento rechazó el archivo. Revisa su tipo y tamaño.',
      }
    }

    const confirmacion = await mutations.confirmarSubida({ expedienteId, documentoId })
    if (confirmacion.errors?.length || !confirmacion.data)
      return { ok: false, mensaje: errorDe(confirmacion.errors) }
    return { ok: true }
  } catch {
    return {
      ok: false,
      mensaje: 'No pudimos subir el documento. Revisa tu conexión e inténtalo de nuevo.',
    }
  }
}

export async function enlaceDeDescarga(documentoId: string): Promise<string | null> {
  try {
    const r = await datosComoUsuario().queries.urlDeDescarga({ documentoId })
    return r.errors?.length || !r.data ? null : r.data.url
  } catch {
    return null
  }
}
