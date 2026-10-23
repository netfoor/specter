import { datosComoUsuario } from '../../app/datos'
import { codigoDeErrores, MENSAJE_FLUJO } from '../../../shared/domain/flujo'

type Respuesta = { data?: unknown; errors?: readonly { message?: string }[] }

export type ResultadoAccion = { ok: true } | { ok: false; mensaje: string }

const GENERICO =
  'No pudimos completar la acción. Revisa tu conexión e inténtalo de nuevo.'

async function ejecutar(llamada: () => Promise<Respuesta>): Promise<ResultadoAccion> {
  try {
    const r = await llamada()
    if (!r.errors?.length && r.data) return { ok: true }
    const codigo = codigoDeErrores(r.errors)
    return { ok: false, mensaje: codigo ? MENSAJE_FLUJO[codigo] : GENERICO }
  } catch {
    return { ok: false, mensaje: GENERICO }
  }
}

const mutaciones = () => datosComoUsuario().mutations

export const enviarSolicitud = (asuntoId: string, perfilId: string) =>
  ejecutar(() => mutaciones().enviarSolicitud({ asuntoId, perfilId }))

export const retirarSolicitud = (solicitudId: string) =>
  ejecutar(() => mutaciones().retirarSolicitud({ solicitudId }))

export const responderSolicitud = (
  solicitudId: string,
  aceptar: boolean,
  declaracionNoConflicto = false,
) =>
  ejecutar(() =>
    mutaciones().responderSolicitud({ solicitudId, aceptar, declaracionNoConflicto }),
  )

export const proponerHonorarios = (
  solicitudId: string,
  datos: { monto: number; alcance: string; formaDePago: string },
) => ejecutar(() => mutaciones().proponerHonorarios({ solicitudId, ...datos }))

export const prepararContrato = (solicitudId: string) =>
  ejecutar(() => mutaciones().prepararContrato({ solicitudId }))
