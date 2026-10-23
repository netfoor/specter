import type { Modalidad } from '../../../shared/domain/catalogos'

/** Para el asunto, «ambas» se presenta como «me da igual»: es una preferencia del cliente. */
export const ETIQUETA_MODALIDAD_ASUNTO: Record<Modalidad, string> = {
  PRESENCIAL: 'Presencial',
  VIRTUAL: 'Virtual',
  AMBAS: 'Me da igual',
}

export const etiquetaModalidadAsunto = (valor: string) =>
  ETIQUETA_MODALIDAD_ASUNTO[valor as Modalidad] ?? valor

const fecha = new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' })

export function fechaLarga(iso: string | null | undefined): string {
  return iso ? fecha.format(new Date(iso)) : ''
}
