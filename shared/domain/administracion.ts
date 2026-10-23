import { estadoVerificacionDe, type EstadoVerificacion } from './catalogos'

export type AccionPerfil =
  | 'VERIFICAR_Y_PUBLICAR'
  | 'PUBLICAR'
  | 'VERIFICAR'
  | 'ACTUALIZAR_COPIA'
  | 'OCULTAR'
  | 'RECHAZAR'
  | 'REABRIR'

export type SituacionPerfil = {
  estadoVerificacion?: string | null
  publicado?: boolean | null
}

/** Qué hacer con la copia pública (`PerfilPublico`) al aplicar una acción. */
export type CopiaPublica = 'publicar' | 'retirar' | 'ninguna'

export type PlanPerfil = {
  estadoVerificacion: EstadoVerificacion
  publicado: boolean
  copiaPublica: CopiaPublica
  verificadoManual: boolean
}

export type GrupoPerfil = 'PENDIENTE' | 'PUBLICADO' | 'OCULTO' | 'RECHAZADO'

export function grupoDePerfil(s: SituacionPerfil): GrupoPerfil {
  const estado = estadoVerificacionDe(s.estadoVerificacion)
  if (s.publicado) return 'PUBLICADO'
  if (estado === 'RECHAZADO') return 'RECHAZADO'
  return estado === 'VERIFICADO_MANUAL' ? 'OCULTO' : 'PENDIENTE'
}

export function accionesDisponibles(s: SituacionPerfil): AccionPerfil[] {
  const estado = estadoVerificacionDe(s.estadoVerificacion)
  switch (grupoDePerfil(s)) {
    case 'PENDIENTE':
      return ['VERIFICAR_Y_PUBLICAR', 'PUBLICAR', 'RECHAZAR']
    case 'OCULTO':
      return ['PUBLICAR', 'RECHAZAR']
    case 'RECHAZADO':
      return ['REABRIR']
    case 'PUBLICADO':
      // Un perfil publicado y rechazado a la vez es inconsistente: solo se puede ocultar.
      if (estado === 'RECHAZADO') return ['OCULTAR']
      return estado === 'VERIFICADO_MANUAL'
        ? ['ACTUALIZAR_COPIA', 'OCULTAR', 'RECHAZAR']
        : ['VERIFICAR', 'ACTUALIZAR_COPIA', 'OCULTAR', 'RECHAZAR']
  }
}

/**
 * Resultado de aplicar una acción, o null si no está permitida en esa situación.
 * Quien ejecuta el plan debe cambiar primero la copia pública y después el perfil: la copia
 * es lo que expone el perfil, así que nunca debe quedar visible algo marcado como oculto.
 */
export function planDeAccion(
  s: SituacionPerfil,
  accion: AccionPerfil,
): PlanPerfil | null {
  if (!accionesDisponibles(s).includes(accion)) return null
  const estado = estadoVerificacionDe(s.estadoVerificacion)

  switch (accion) {
    case 'VERIFICAR_Y_PUBLICAR':
      return plan('VERIFICADO_MANUAL', true, 'publicar')
    case 'VERIFICAR':
      return plan('VERIFICADO_MANUAL', true, 'publicar')
    case 'PUBLICAR':
    case 'ACTUALIZAR_COPIA':
      return plan(estado, true, 'publicar')
    case 'OCULTAR':
      return plan(estado, false, 'retirar')
    case 'RECHAZAR':
      return plan('RECHAZADO', false, 'retirar')
    case 'REABRIR':
      return plan('PENDIENTE', false, 'ninguna')
  }
}

function plan(
  estado: EstadoVerificacion,
  publicado: boolean,
  copia: CopiaPublica,
): PlanPerfil {
  return {
    estadoVerificacion: estado,
    publicado,
    copiaPublica: copia,
    verificadoManual: estado === 'VERIFICADO_MANUAL',
  }
}

/** Contadores del panel de administración (los calcula el servidor). */
export type Indicadores = {
  abogadosRegistrados: number
  clientesRegistrados: number
  abogadosVerificados: number
  abogadosPublicados: number
  asuntos: number
  solicitudes: number
  contrataciones: number
  concluidos: number
}

export const ETIQUETAS_INDICADORES: Record<keyof Indicadores, string> = {
  abogadosRegistrados: 'Abogados registrados',
  abogadosVerificados: 'Abogados verificados',
  abogadosPublicados: 'Abogados publicados',
  clientesRegistrados: 'Clientes registrados',
  asuntos: 'Asuntos creados',
  solicitudes: 'Solicitudes enviadas',
  contrataciones: 'Asuntos contratados',
  concluidos: 'Asuntos concluidos',
}
