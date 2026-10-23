import { MATERIAS, MODALIDADES, type Materia, type Modalidad } from './catalogos'

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

/** Valores tal como los captura el formulario: todo texto. */
export type FormularioAsunto = {
  titulo: string
  descripcion: string
  materia: string
  ubicacion: string
  modalidad: string
  presupuestoMin: string
  presupuestoMax: string
}

export type DatosAsunto = {
  titulo: string
  descripcion: string
  materia: Materia
  ubicacion: string
  modalidad: Modalidad
  presupuestoMin: number | null
  presupuestoMax: number | null
}

export type ErroresAsunto = Partial<Record<keyof FormularioAsunto, string>>

export const LIMITES_ASUNTO = {
  tituloMin: 5,
  tituloMax: 120,
  descripcionMin: 20,
  descripcionMax: 3000,
}

function monto(texto: string): number | null | undefined {
  const limpio = texto.trim()
  if (!limpio) return null
  const numero = Number(limpio.replace(/,/g, ''))
  return Number.isFinite(numero) ? numero : undefined
}

export function validarAsunto(
  f: FormularioAsunto,
): { ok: true; datos: DatosAsunto } | { ok: false; errores: ErroresAsunto } {
  const errores: ErroresAsunto = {}
  const { tituloMin, tituloMax, descripcionMin, descripcionMax } = LIMITES_ASUNTO

  const titulo = f.titulo.trim()
  if (titulo.length < tituloMin) errores.titulo = 'Resume tu asunto en una frase corta.'
  else if (titulo.length > tituloMax)
    errores.titulo = `El título admite hasta ${tituloMax} caracteres.`

  const descripcion = f.descripcion.trim()
  if (descripcion.length < descripcionMin) {
    errores.descripcion = `Cuéntanos un poco más: escribe al menos ${descripcionMin} caracteres.`
  } else if (descripcion.length > descripcionMax) {
    errores.descripcion = `La descripción admite hasta ${descripcionMax} caracteres.`
  }

  const materia = MATERIAS.find((m) => m === f.materia)
  if (!materia) errores.materia = 'Elige la materia que más se parezca a tu asunto.'

  if (!f.ubicacion.trim())
    errores.ubicacion = 'Indica la ciudad donde necesitas el servicio.'

  const modalidad = MODALIDADES.find((m) => m === f.modalidad)
  if (!modalidad) errores.modalidad = 'Elige cómo prefieres que te atiendan.'

  const min = monto(f.presupuestoMin)
  const max = monto(f.presupuestoMax)
  if (min === undefined || (min !== null && min < 0)) {
    errores.presupuestoMin = 'Escribe un monto en pesos, sin letras.'
  }
  if (max === undefined || (max !== null && max < 0)) {
    errores.presupuestoMax = 'Escribe un monto en pesos, sin letras.'
  }
  if (
    !errores.presupuestoMin &&
    !errores.presupuestoMax &&
    min != null &&
    max != null &&
    min > max
  ) {
    errores.presupuestoMax = 'El monto máximo no puede ser menor que el mínimo.'
  }

  if (Object.keys(errores).length > 0 || !materia || !modalidad)
    return { ok: false, errores }

  return {
    ok: true,
    datos: {
      titulo,
      descripcion,
      materia,
      ubicacion: f.ubicacion.trim(),
      modalidad,
      presupuestoMin: min ?? null,
      presupuestoMax: max ?? null,
    },
  }
}

/** Mientras no se contrata, el cliente puede editar, publicar y retirar su asunto. */
export function asuntoEditable(asunto: { etapa?: string | null }): boolean {
  return etapaDe(asunto.etapa) === 'SIN_CONTRATAR'
}

export const ETIQUETA_ESTADO_ASUNTO: Record<EstadoAsunto, string> = {
  BORRADOR: 'Borrador',
  ABIERTO: 'Abierto',
  CONTRATADO: 'Contratado',
  CONCLUIDO: 'Concluido',
}
