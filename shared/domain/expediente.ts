/** Expediente (T16): conversación entre las partes, bitácora y conclusión del asunto. */
export const LIMITE_MENSAJE = 2000

export function validarMensaje(
  texto: unknown,
): { ok: true; texto: string } | { ok: false; motivo: string } {
  if (typeof texto !== 'string' || !texto.trim())
    return { ok: false, motivo: 'Escribe un mensaje.' }
  const limpio = texto.trim()
  if (limpio.length > LIMITE_MENSAJE) {
    return { ok: false, motivo: `Un mensaje admite hasta ${LIMITE_MENSAJE} caracteres.` }
  }
  return { ok: true, texto: limpio }
}

export const TIPOS_ACTUACION = ['CONTRATACION', 'CONCLUSION', 'DOCUMENTO'] as const
export type TipoActuacion = (typeof TIPOS_ACTUACION)[number]

export const ETIQUETA_ACTUACION: Record<TipoActuacion, string> = {
  CONTRATACION: 'Contratación',
  CONCLUSION: 'Conclusión',
  DOCUMENTO: 'Documento',
}

export const etiquetaActuacion = (tipo: string) =>
  ETIQUETA_ACTUACION[tipo as TipoActuacion] ?? tipo

export const ETIQUETA_ESTADO_EXPEDIENTE: Record<string, string> = {
  EN_GESTION: 'En gestión',
  CONCLUIDO: 'Concluido',
}

type ConFecha = { id: string; creadoEn: string }

/**
 * Une mensajes o actuaciones que llegan por varias vías (carga inicial y suscripción) sin
 * duplicarlos, en orden cronológico.
 */
export function fusionarPorFecha<T extends ConFecha>(
  actuales: readonly T[],
  nuevos: readonly T[],
): T[] {
  const porId = new Map<string, T>()
  for (const x of [...actuales, ...nuevos]) porId.set(x.id, x)
  return [...porId.values()].sort(
    (a, b) => a.creadoEn.localeCompare(b.creadoEn) || a.id.localeCompare(b.id),
  )
}
