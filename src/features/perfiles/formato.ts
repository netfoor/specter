import {
  ETIQUETA_MATERIA,
  type Materia,
  type Modalidad,
} from '../../../shared/domain/catalogos'

export const ETIQUETA_MODALIDAD: Record<Modalidad, string> = {
  PRESENCIAL: 'Presencial',
  VIRTUAL: 'Virtual',
  AMBAS: 'Presencial y virtual',
}

const pesos = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
})

export function etiquetaMateria(valor: string | null | undefined): string {
  return valor ? (ETIQUETA_MATERIA[valor as Materia] ?? valor) : ''
}

export function etiquetaModalidad(valor: string): string {
  return ETIQUETA_MODALIDAD[valor as Modalidad] ?? valor
}

export function rangoHonorarios(
  desde?: number | null,
  hasta?: number | null,
): string | null {
  if (desde != null && hasta != null)
    return `${pesos.format(desde)} a ${pesos.format(hasta)}`
  if (desde != null) return `Desde ${pesos.format(desde)}`
  if (hasta != null) return `Hasta ${pesos.format(hasta)}`
  return null
}

export const formatoPesos = (monto: number) => pesos.format(monto)
