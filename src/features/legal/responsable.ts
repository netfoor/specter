/**
 * Datos del responsable del tratamiento (LFPDPPP 2025, art. 15 fr. I). Están pendientes de definir
 * (docs/dominio/dudas.md, D5); mientras sean null, los avisos lo dicen explícitamente.
 */
export const RESPONSABLE: {
  nombre: string | null
  domicilio: string | null
  correo: string | null
} = {
  nombre: null,
  domicilio: null,
  correo: null,
}

export const PENDIENTE = 'Pendiente de definir'

export const ULTIMA_ACTUALIZACION = '23 de octubre de 2026'
