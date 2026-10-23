import { estadoDeAsunto, etapaDe, type EstadoSolicitud } from './asunto'

/**
 * Flujo de contratación (T14). Invariante central: `Asunto.lectores` contiene exactamente a los
 * abogados con una solicitud activa (ENVIADA o ACEPTADA) sobre ese asunto. De ahí salen el límite
 * de solicitudes, la prohibición de duplicados y quién puede leer el asunto.
 */
export const MAX_SOLICITUDES_ACTIVAS = 3

export const ESTADOS_ACTIVOS: readonly EstadoSolicitud[] = ['ENVIADA', 'ACEPTADA']

export type CodigoFlujo =
  | 'NO_ENCONTRADO'
  | 'NO_PERMITIDO'
  | 'ASUNTO_NO_DISPONIBLE'
  | 'LIMITE_SOLICITUDES'
  | 'SOLICITUD_DUPLICADA'
  | 'ESTADO_INVALIDO'
  | 'DECLARACION_REQUERIDA'
  | 'DATOS_INVALIDOS'
  | 'SIN_PROPUESTA'
  | 'SIN_CONTRATO'
  | 'CONTRATO_EN_CURSO'
  | 'ACEPTACION_REQUERIDA'
  | 'EXPEDIENTE_CONCLUIDO'
  | 'CONFLICTO'

export class ErrorFlujo extends Error {
  constructor(public readonly codigo: CodigoFlujo) {
    super(codigo)
  }
}

export type AsuntoDelFlujo = {
  owner?: string | null
  abierto?: boolean | null
  etapa?: string | null
  lectores?: readonly (string | null | undefined)[] | null
}

export const lectoresDe = (asunto: AsuntoDelFlujo): string[] =>
  (asunto.lectores ?? []).filter((l): l is string => Boolean(l))

/**
 * Comprueba si `cliente` puede enviar su asunto a `abogado`. Devuelve el código del problema o
 * null si puede. Un asunto ajeno se trata como inexistente para no revelar que existe.
 */
export function verificarEnvio(
  asunto: AsuntoDelFlujo | null,
  cliente: string,
  abogado: string | null,
): CodigoFlujo | null {
  if (!asunto || asunto.owner !== cliente) return 'NO_ENCONTRADO'
  if (!abogado) return 'NO_ENCONTRADO'
  if (abogado === cliente) return 'NO_PERMITIDO'
  if (estadoDeAsunto(asunto) !== 'ABIERTO') return 'ASUNTO_NO_DISPONIBLE'
  const lectores = lectoresDe(asunto)
  if (lectores.includes(abogado)) return 'SOLICITUD_DUPLICADA'
  if (lectores.length >= MAX_SOLICITUDES_ACTIVAS) return 'LIMITE_SOLICITUDES'
  return null
}

/** Mientras no se contrata, el asunto admite aceptar solicitudes y recibir propuestas. */
export function asuntoDisponible(asunto: AsuntoDelFlujo): boolean {
  return estadoDeAsunto(asunto) === 'ABIERTO' && etapaDe(asunto.etapa) === 'SIN_CONTRATAR'
}

export type AccionSolicitud = 'ACEPTAR' | 'RECHAZAR' | 'RETIRAR'
export type Actor = 'CLIENTE' | 'ABOGADO'

const TRANSICIONES: Record<
  AccionSolicitud,
  { actor: Actor; desde: readonly EstadoSolicitud[]; hacia: EstadoSolicitud }
> = {
  ACEPTAR: { actor: 'ABOGADO', desde: ['ENVIADA'], hacia: 'ACEPTADA' },
  RECHAZAR: { actor: 'ABOGADO', desde: ['ENVIADA'], hacia: 'RECHAZADA' },
  // Solo el cliente retira, también una solicitud ya aceptada (antes del contrato).
  RETIRAR: { actor: 'CLIENTE', desde: ['ENVIADA', 'ACEPTADA'], hacia: 'RETIRADA' },
}

export type SolicitudDelFlujo = { clienteId: string; abogadoId: string; estado: string }

/** Papel de la persona en la solicitud, o null si no participa. */
export function actorDe(solicitud: SolicitudDelFlujo, identidad: string): Actor | null {
  if (solicitud.clienteId === identidad) return 'CLIENTE'
  if (solicitud.abogadoId === identidad) return 'ABOGADO'
  return null
}

export type ResultadoTransicion =
  | { ok: true; desde: EstadoSolicitud; hacia: EstadoSolicitud; liberaLector: boolean }
  | { ok: false; codigo: CodigoFlujo }

/** Aplica una acción a una solicitud según quién la pide. No toca datos: solo decide. */
export function transicion(
  solicitud: SolicitudDelFlujo,
  accion: AccionSolicitud,
  identidad: string,
): ResultadoTransicion {
  const actor = actorDe(solicitud, identidad)
  if (!actor) return { ok: false, codigo: 'NO_ENCONTRADO' }
  const regla = TRANSICIONES[accion]
  if (regla.actor !== actor) return { ok: false, codigo: 'NO_PERMITIDO' }
  const desde = regla.desde.find((e) => e === solicitud.estado)
  if (!desde) return { ok: false, codigo: 'ESTADO_INVALIDO' }
  return {
    ok: true,
    desde,
    hacia: regla.hacia,
    liberaLector: !ESTADOS_ACTIVOS.includes(regla.hacia),
  }
}

export function quitarLector(
  lectores: readonly (string | null | undefined)[],
  identidad: string,
): string[] {
  return lectores.filter((l): l is string => Boolean(l) && l !== identidad)
}

export type FormularioPropuesta = { monto: string; alcance: string; formaDePago: string }
export type DatosPropuesta = { monto: number; alcance: string; formaDePago: string }
export type ErroresPropuesta = Partial<Record<keyof FormularioPropuesta, string>>

export const LIMITES_PROPUESTA = {
  montoMin: 1,
  montoMax: 10_000_000,
  alcanceMin: 20,
  alcanceMax: 2000,
  formaMin: 5,
  formaMax: 300,
} as const

export function validarPropuesta(
  f: FormularioPropuesta,
): { ok: true; datos: DatosPropuesta } | { ok: false; errores: ErroresPropuesta } {
  const errores: ErroresPropuesta = {}
  const L = LIMITES_PROPUESTA

  const monto = Number(f.monto.trim().replace(/,/g, ''))
  if (!f.monto.trim() || !Number.isFinite(monto)) {
    errores.monto = 'Escribe el monto de tus honorarios en pesos, sin letras.'
  } else if (monto < L.montoMin || monto > L.montoMax) {
    errores.monto = 'El monto debe ser mayor que cero y menor que diez millones de pesos.'
  }

  const alcance = f.alcance.trim()
  if (alcance.length < L.alcanceMin) {
    errores.alcance = `Describe qué incluye tu servicio (al menos ${L.alcanceMin} caracteres).`
  } else if (alcance.length > L.alcanceMax) {
    errores.alcance = `El alcance admite hasta ${L.alcanceMax} caracteres.`
  }

  const formaDePago = f.formaDePago.trim()
  if (formaDePago.length < L.formaMin) {
    errores.formaDePago = 'Indica cómo se pagarían tus honorarios.'
  } else if (formaDePago.length > L.formaMax) {
    errores.formaDePago = `La forma de pago admite hasta ${L.formaMax} caracteres.`
  }

  if (Object.keys(errores).length > 0) return { ok: false, errores }
  return {
    ok: true,
    datos: { monto: Math.round(monto * 100) / 100, alcance, formaDePago },
  }
}

export const ETIQUETA_ESTADO_SOLICITUD: Record<EstadoSolicitud, string> = {
  ENVIADA: 'Enviada',
  ACEPTADA: 'Aceptada',
  RECHAZADA: 'Rechazada',
  RETIRADA: 'Retirada',
}

/** Mensajes para la persona según el código de error del servidor. */
export const MENSAJE_FLUJO: Record<CodigoFlujo, string> = {
  NO_ENCONTRADO: 'No encontramos la solicitud o el asunto. Recarga la página.',
  NO_PERMITIDO: 'Tu cuenta no puede hacer este cambio.',
  ASUNTO_NO_DISPONIBLE: 'El asunto ya no está abierto para recibir solicitudes.',
  LIMITE_SOLICITUDES: `Un asunto puede tener hasta ${MAX_SOLICITUDES_ACTIVAS} solicitudes activas. Retira una para enviar otra.`,
  SOLICITUD_DUPLICADA: 'Ya tienes una solicitud activa con este abogado.',
  ESTADO_INVALIDO:
    'La solicitud cambió mientras tanto. Recarga la página para ver su estado.',
  DECLARACION_REQUERIDA:
    'Para aceptar debes declarar que no tienes conflicto de interés.',
  DATOS_INVALIDOS: 'Revisa los datos e inténtalo de nuevo.',
  SIN_PROPUESTA: 'El abogado todavía no envía su propuesta de honorarios.',
  SIN_CONTRATO: 'Todavía no hay un contrato preparado para esta solicitud.',
  CONTRATO_EN_CURSO:
    'Ya hay un contrato aceptado por una de las partes; la propuesta ya no puede cambiar.',
  EXPEDIENTE_CONCLUIDO: 'El expediente está concluido; ya no admite cambios.',
  ACEPTACION_REQUERIDA:
    'Para aceptar, confirma que leíste el contrato y que es una demostración sin validez jurídica.',
  CONFLICTO:
    'Otra persona hizo un cambio al mismo tiempo. Recarga la página e inténtalo de nuevo.',
}

const CODIGOS = Object.keys(MENSAJE_FLUJO) as CodigoFlujo[]

/** Extrae el código de flujo de los errores de la API, o null si no hay uno conocido. */
export function codigoDeErrores(
  errores?: readonly { message?: string }[],
): CodigoFlujo | null {
  const texto = errores?.map((e) => e.message ?? '').join(' ') ?? ''
  return CODIGOS.find((c) => texto.includes(c)) ?? null
}
