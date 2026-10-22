/** Catálogo propuesto de materias (docs/dominio/modelo.md); pendiente de validar con un abogado. */
export const MATERIAS = [
  'CIVIL',
  'FAMILIAR',
  'MERCANTIL',
  'LABORAL',
  'PENAL',
  'ADMINISTRATIVO',
  'FISCAL',
  'AMPARO',
  'OTRA',
] as const
export type Materia = (typeof MATERIAS)[number]

export const ETIQUETA_MATERIA: Record<Materia, string> = {
  CIVIL: 'Civil',
  FAMILIAR: 'Familiar',
  MERCANTIL: 'Mercantil',
  LABORAL: 'Laboral',
  PENAL: 'Penal',
  ADMINISTRATIVO: 'Administrativo',
  FISCAL: 'Fiscal',
  AMPARO: 'Amparo y constitucional',
  OTRA: 'Otra',
}

export const MODALIDADES = ['PRESENCIAL', 'VIRTUAL', 'AMBAS'] as const
export type Modalidad = (typeof MODALIDADES)[number]

export const ESTADOS_VERIFICACION = [
  'PENDIENTE',
  'VERIFICADO_MANUAL',
  'RECHAZADO',
] as const
export type EstadoVerificacion = (typeof ESTADOS_VERIFICACION)[number]

/** Vacío o desconocido es PENDIENTE: nadie queda verificado por omisión. */
export function estadoVerificacionDe(
  valor: string | null | undefined,
): EstadoVerificacion {
  return ESTADOS_VERIFICACION.find((estado) => estado === valor) ?? 'PENDIENTE'
}
