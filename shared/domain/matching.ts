import { ETIQUETA_MATERIA, type Materia } from './catalogos'

/**
 * Coincidencia entre un asunto y un perfil público. Los pesos son provisionales: la decisión
 * de qué importa más es de negocio (docs/dominio/dudas.md, D10).
 */
export const PESOS = {
  MATERIA: 40,
  UBICACION: 25,
  MODALIDAD: 15,
  PRESUPUESTO: 15,
  VERIFICACION: 5,
} as const

export type ClaveCriterio = keyof typeof PESOS
export type EstadoCriterio = 'cumple' | 'parcial' | 'no_cumple' | 'no_aplica'

export type Criterio = {
  clave: ClaveCriterio
  etiqueta: string
  estado: EstadoCriterio
  puntos: number
  maximo: number
  detalle: string
}

export type AsuntoParaMatching = {
  materia: string
  ubicacion: string
  modalidad: string
  presupuestoMin?: number | null
  presupuestoMax?: number | null
}

export type PerfilParaMatching = {
  id: string
  nombre: string
  materias: readonly (string | null | undefined)[]
  ubicacion: string
  modalidad: string
  honorariosDesde?: number | null
  honorariosHasta?: number | null
  verificadoManual: boolean
  aniosExperiencia?: number | null
}

export type Coincidencia<T extends PerfilParaMatching = PerfilParaMatching> = {
  perfil: T
  /** De 0 a 100, sobre los criterios que aplican al asunto. */
  puntuacion: number
  criterios: Criterio[]
}

const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

const pesos = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
})

const atiendeADistancia = (modalidad: string) =>
  modalidad === 'VIRTUAL' || modalidad === 'AMBAS'
const atiendeEnPersona = (modalidad: string) =>
  modalidad === 'PRESENCIAL' || modalidad === 'AMBAS'

function criterio(
  clave: ClaveCriterio,
  etiqueta: string,
  estado: EstadoCriterio,
  detalle: string,
  puntos = 0,
): Criterio {
  return {
    clave,
    etiqueta,
    estado,
    puntos: estado === 'no_aplica' ? 0 : puntos,
    maximo: PESOS[clave],
    detalle,
  }
}

function evaluarMateria(
  asunto: AsuntoParaMatching,
  perfil: PerfilParaMatching,
): Criterio | null {
  if (asunto.materia === 'OTRA') {
    return criterio(
      'MATERIA',
      'Materia',
      'no_aplica',
      'Tu asunto no tiene una materia definida.',
    )
  }
  if (!perfil.materias.includes(asunto.materia)) return null
  const nombre = ETIQUETA_MATERIA[asunto.materia as Materia] ?? asunto.materia
  return criterio(
    'MATERIA',
    'Materia',
    'cumple',
    `Atiende asuntos de materia ${nombre.toLowerCase()}.`,
    PESOS.MATERIA,
  )
}

function evaluarUbicacion(
  asunto: AsuntoParaMatching,
  perfil: PerfilParaMatching,
): Criterio {
  if (normalizar(asunto.ubicacion) === normalizar(perfil.ubicacion)) {
    return criterio(
      'UBICACION',
      'Ubicación',
      'cumple',
      `Ejerce en ${perfil.ubicacion}.`,
      PESOS.UBICACION,
    )
  }
  if (atiendeADistancia(perfil.modalidad) && asunto.modalidad !== 'PRESENCIAL') {
    return criterio(
      'UBICACION',
      'Ubicación',
      'parcial',
      `Ejerce en ${perfil.ubicacion}, pero puede atenderte a distancia.`,
      Math.round(PESOS.UBICACION / 2),
    )
  }
  return criterio(
    'UBICACION',
    'Ubicación',
    'no_cumple',
    `Ejerce en ${perfil.ubicacion} y tú estás en ${asunto.ubicacion}.`,
  )
}

function evaluarModalidad(
  asunto: AsuntoParaMatching,
  perfil: PerfilParaMatching,
): Criterio {
  if (asunto.modalidad === 'AMBAS') {
    return criterio(
      'MODALIDAD',
      'Modalidad',
      'no_aplica',
      'No indicaste una preferencia de atención.',
    )
  }
  const cumple =
    asunto.modalidad === 'PRESENCIAL'
      ? atiendeEnPersona(perfil.modalidad)
      : atiendeADistancia(perfil.modalidad)
  const deseada = asunto.modalidad === 'PRESENCIAL' ? 'presencial' : 'virtual'
  return cumple
    ? criterio(
        'MODALIDAD',
        'Modalidad',
        'cumple',
        `Ofrece atención ${deseada}.`,
        PESOS.MODALIDAD,
      )
    : criterio('MODALIDAD', 'Modalidad', 'no_cumple', `No ofrece atención ${deseada}.`)
}

function evaluarPresupuesto(
  asunto: AsuntoParaMatching,
  perfil: PerfilParaMatching,
): Criterio {
  const sinPresupuesto = asunto.presupuestoMin == null && asunto.presupuestoMax == null
  if (sinPresupuesto) {
    return criterio(
      'PRESUPUESTO',
      'Presupuesto',
      'no_aplica',
      'No indicaste un presupuesto.',
    )
  }
  if (perfil.honorariosDesde == null && perfil.honorariosHasta == null) {
    return criterio(
      'PRESUPUESTO',
      'Presupuesto',
      'no_aplica',
      'No publica un rango de honorarios.',
    )
  }
  const minimoAsunto = asunto.presupuestoMin ?? 0
  const maximoAsunto = asunto.presupuestoMax ?? Infinity
  const minimoPerfil = perfil.honorariosDesde ?? 0
  const maximoPerfil = perfil.honorariosHasta ?? Infinity
  const rango = [
    perfil.honorariosDesde != null ? pesos.format(perfil.honorariosDesde) : null,
    perfil.honorariosHasta != null ? pesos.format(perfil.honorariosHasta) : null,
  ]
  const textoRango =
    rango[0] && rango[1]
      ? `${rango[0]} a ${rango[1]}`
      : rango[0]
        ? `desde ${rango[0]}`
        : `hasta ${rango[1]}`
  return minimoPerfil <= maximoAsunto && minimoAsunto <= maximoPerfil
    ? criterio(
        'PRESUPUESTO',
        'Presupuesto',
        'cumple',
        `Su rango orientativo (${textoRango}) coincide con tu presupuesto.`,
        PESOS.PRESUPUESTO,
      )
    : criterio(
        'PRESUPUESTO',
        'Presupuesto',
        'no_cumple',
        `Su rango orientativo (${textoRango}) queda fuera de tu presupuesto.`,
      )
}

function evaluarVerificacion(perfil: PerfilParaMatching): Criterio {
  return perfil.verificadoManual
    ? criterio(
        'VERIFICACION',
        'Verificación',
        'cumple',
        'Perfil verificado manualmente por Specter.',
        PESOS.VERIFICACION,
      )
    : criterio(
        'VERIFICACION',
        'Verificación',
        'no_cumple',
        'Perfil publicado, todavía sin verificar.',
      )
}

/** Evalúa un perfil; devuelve null si no atiende la materia del asunto. */
export function evaluarPerfil(
  asunto: AsuntoParaMatching,
  perfil: PerfilParaMatching,
): { puntuacion: number; criterios: Criterio[] } | null {
  const materia = evaluarMateria(asunto, perfil)
  if (!materia) return null

  const criterios = [
    materia,
    evaluarUbicacion(asunto, perfil),
    evaluarModalidad(asunto, perfil),
    evaluarPresupuesto(asunto, perfil),
    evaluarVerificacion(perfil),
  ]
  const maximo = criterios.reduce(
    (suma, c) => suma + (c.estado === 'no_aplica' ? 0 : c.maximo),
    0,
  )
  const obtenido = criterios.reduce((suma, c) => suma + c.puntos, 0)
  return {
    puntuacion: maximo === 0 ? 0 : Math.round((obtenido / maximo) * 100),
    criterios,
  }
}

/**
 * Perfiles que atienden la materia del asunto, de mayor a menor puntuación. Empata primero el
 * verificado, luego más años de experiencia y luego el nombre.
 */
export function coincidencias<T extends PerfilParaMatching>(
  asunto: AsuntoParaMatching,
  perfiles: readonly T[],
): Coincidencia<T>[] {
  return perfiles
    .flatMap((perfil) => {
      const evaluacion = evaluarPerfil(asunto, perfil)
      return evaluacion ? [{ perfil, ...evaluacion }] : []
    })
    .sort(
      (a, b) =>
        b.puntuacion - a.puntuacion ||
        Number(b.perfil.verificadoManual) - Number(a.perfil.verificadoManual) ||
        (b.perfil.aniosExperiencia ?? 0) - (a.perfil.aniosExperiencia ?? 0) ||
        a.perfil.nombre.localeCompare(b.perfil.nombre, 'es'),
    )
}

/** Máximo de perfiles que se comparan a la vez. */
export const MAX_COMPARACION = 3
