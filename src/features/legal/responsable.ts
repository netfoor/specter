/**
 * Datos del responsable del tratamiento (LFPDPPP 2025, art. 15 fr. I). El responsable es provisional
 * mientras se define la figura (docs/dominio/dudas.md, D5); los datos en null se muestran como pendientes.
 */
export const RESPONSABLE: {
  nombre: string | null
  domicilio: string | null
  correo: string | null
} = {
  nombre: 'Fortino Romero Mantilla',
  domicilio: null,
  correo: null,
}

export const PENDIENTE = 'Pendiente de definir'

export const ULTIMA_ACTUALIZACION = '24 de octubre de 2026'
