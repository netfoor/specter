/** Etapas del recorrido del cliente (contexto inicial, sec. XXV). */
export const RECORRIDO = [
  'Identificar la necesidad',
  'Determinar la materia',
  'Seleccionar especialistas',
  'Comparar perfiles',
  'Elegir abogado',
  'Contratar',
  'Crear el expediente',
  'Gestionar el asunto',
  'Concluir',
] as const

/** Alcance del prototipo (docs/spec.md, categorías A y B). */
export const INCLUIRA = [
  {
    titulo: 'Registro por rol',
    detalle: 'Cuentas para clientes y abogados, con confirmación de correo.',
  },
  {
    titulo: 'Perfiles y directorio',
    detalle:
      'Cada abogado publica su perfil; un administrador lo revisa antes de mostrarlo.',
  },
  {
    titulo: 'Coincidencias explicadas',
    detalle:
      'Los abogados compatibles con tu asunto aparecen con los criterios que coincidieron.',
  },
  {
    titulo: 'Solicitud, propuesta y contrato',
    detalle:
      'El flujo completo de contratación, con aceptación de demostración sin validez jurídica.',
  },
  {
    titulo: 'Expediente digital',
    detalle:
      'Chat en tiempo real, documentos y bitácora de actuaciones para cliente y abogado.',
  },
  {
    titulo: 'NIA',
    detalle: 'Asistente que orienta y clasifica la materia de tu asunto.',
  },
] as const

/** Capacidades fuera del prototipo (docs/spec.md, categoría C). No están implementadas. */
export const PROXIMAMENTE = [
  'Pagos y facturación',
  'Firma electrónica con validez jurídica',
  'Verificación de identidad y de cédula profesional',
  'Videollamadas, agenda y recordatorios',
  'Valoraciones verificadas',
  'Herramientas para despachos y empresas',
] as const

/** Ejemplo ilustrativo del desglose (contexto inicial, sec. XVII). */
export const EJEMPLO_HONORARIOS = 10000
