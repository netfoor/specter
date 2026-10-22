/**
 * Etapa del asunto que solo cambia en el servidor. Antes de contratar, el cliente decide
 * únicamente si el asunto está abierto (visible para solicitar) o es un borrador.
 */
export const ETAPAS_ASUNTO = ['SIN_CONTRATAR', 'CONTRATADO', 'CONCLUIDO'] as const
export type EtapaAsunto = (typeof ETAPAS_ASUNTO)[number]

export type EstadoAsunto = 'BORRADOR' | 'ABIERTO' | 'CONTRATADO' | 'CONCLUIDO'

/** La etapa se guarda vacía hasta que el servidor la cambia; vacío o desconocido es SIN_CONTRATAR. */
export function etapaDe(valor: string | null | undefined): EtapaAsunto {
  return ETAPAS_ASUNTO.find((etapa) => etapa === valor) ?? 'SIN_CONTRATAR'
}

export function estadoDeAsunto(asunto: {
  abierto?: boolean | null
  etapa?: string | null
}): EstadoAsunto {
  const etapa = etapaDe(asunto.etapa)
  if (etapa !== 'SIN_CONTRATAR') return etapa
  return asunto.abierto ? 'ABIERTO' : 'BORRADOR'
}

export const ESTADOS_SOLICITUD = ['ENVIADA', 'ACEPTADA', 'RECHAZADA', 'RETIRADA'] as const
export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number]

export const ESTADOS_CONTRATO = ['PENDIENTE', 'ACEPTADO'] as const
export const ESTADOS_EXPEDIENTE = ['EN_GESTION', 'CONCLUIDO'] as const
