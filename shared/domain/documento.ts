/** Documentos del expediente (T17). */
export const MAX_BYTES_DOCUMENTO = 10 * 1024 * 1024

export const TIPOS_DOCUMENTO = {
  'application/pdf': 'PDF',
  'image/jpeg': 'Imagen JPG',
  'image/png': 'Imagen PNG',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'Word (DOCX)',
} as const

export type TipoDocumento = keyof typeof TIPOS_DOCUMENTO

export const ACEPTA_DOCUMENTOS = Object.keys(TIPOS_DOCUMENTO).join(',')

export const esTipoPermitido = (tipo: unknown): tipo is TipoDocumento =>
  typeof tipo === 'string' && tipo in TIPOS_DOCUMENTO

/**
 * Nombre visible del archivo: sin rutas ni caracteres de control, recortado conservando la
 * extensión. Nunca se usa para la ruta en S3 (esa la genera el servidor).
 */
export function limpiarNombre(nombre: unknown, max = 120): string {
  const sinControl = [...String(nombre ?? '')]
    .filter((c) => c.codePointAt(0)! >= 32 && c.codePointAt(0) !== 127)
    .join('')
  const base = sinControl.split(/[\\/]/).pop()!.trim()
  if (!base) return 'documento'
  if (base.length <= max) return base
  const punto = base.lastIndexOf('.')
  const extension = punto > 0 && base.length - punto <= 10 ? base.slice(punto) : ''
  return base.slice(0, max - extension.length) + extension
}

export type ArchivoPorSubir = { nombre: unknown; tipo: unknown; tamano: unknown }

export function validarArchivo(
  a: ArchivoPorSubir,
):
  | { ok: true; nombre: string; tipo: TipoDocumento; tamano: number }
  | { ok: false; motivo: string } {
  if (!esTipoPermitido(a.tipo)) {
    return { ok: false, motivo: 'Solo se aceptan archivos PDF, JPG, PNG o Word (DOCX).' }
  }
  const tamano = Number(a.tamano)
  if (!Number.isInteger(tamano) || tamano <= 0)
    return { ok: false, motivo: 'El archivo está vacío.' }
  if (tamano > MAX_BYTES_DOCUMENTO)
    return { ok: false, motivo: 'El archivo pasa de 10 MB.' }
  return { ok: true, nombre: limpiarNombre(a.nombre), tipo: a.tipo, tamano }
}

export function formatoTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
