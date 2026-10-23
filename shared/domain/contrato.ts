import { ETIQUETA_MATERIA, type Materia } from './catalogos'

/** Comisión de Specter: se descuenta de los honorarios del abogado (contexto, sec. XVII). */
export const COMISION_PCT = 0.1

export const LEYENDA_DEMO =
  'Documento de demostración generado por Specter. No tiene validez jurídica y no sustituye un contrato revisado por un abogado.'

export type Desglose = {
  honorarios: number
  comision: number
  abogadoRecibe: number
  /** El cliente paga los honorarios; los impuestos aplicables están por definir. */
  totalCliente: number
}

const centavos = (n: number) => Math.round(n * 100) / 100

export function calcularDesglose(honorarios: number, pct = COMISION_PCT): Desglose {
  if (!Number.isFinite(honorarios) || honorarios <= 0) {
    throw new Error('Los honorarios deben ser un monto positivo.')
  }
  const total = centavos(honorarios)
  const comision = centavos(total * pct)
  return {
    honorarios: total,
    comision,
    abogadoRecibe: centavos(total - comision),
    totalCliente: total,
  }
}

const pesos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })
export const formatoMonto = (n: number) => pesos.format(n)

const fechaLarga = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'long',
  timeZone: 'America/Mexico_City',
})

export type DatosContrato = {
  fecha: Date
  cliente: string
  abogado: string
  asunto: { titulo: string; materia: string; descripcion: string }
  alcance: string
  formaDePago: string
  desglose: Desglose
}

/**
 * Texto del contrato a partir de la plantilla de demostración. Es una instantánea: se guarda tal
 * cual y es lo que ambas partes aceptan. Pendiente de revisión jurídica (duda D9).
 */
export function textoDeContrato(d: DatosContrato): string {
  const materia = ETIQUETA_MATERIA[d.asunto.materia as Materia] ?? d.asunto.materia
  const { honorarios, comision, abogadoRecibe } = d.desglose
  return [
    'CONTRATO DE PRESTACIÓN DE SERVICIOS PROFESIONALES (DEMOSTRACIÓN)',
    LEYENDA_DEMO,
    `Fecha: ${fechaLarga.format(d.fecha)}.`,
    `1. Partes. Celebran este contrato ${d.cliente}, como cliente, y ${d.abogado}, como abogado o abogada que presta el servicio.`,
    `2. Objeto. Atención del asunto «${d.asunto.titulo}», de materia ${materia.toLowerCase()}, descrito por el cliente así: ${d.asunto.descripcion}`,
    `3. Alcance. ${d.alcance}`,
    `4. Honorarios. ${formatoMonto(honorarios)} por el alcance descrito. De ese monto, Specter retiene una comisión de ${formatoMonto(comision)} (${COMISION_PCT * 100}%) y el abogado recibe ${formatoMonto(abogadoRecibe)}. Los impuestos aplicables están por definir.`,
    `5. Forma de pago. ${d.formaDePago} En esta demostración no se cobra ni se mueve dinero.`,
    '6. Obligaciones. El abogado atenderá el asunto con diligencia y mantendrá informado al cliente. El cliente entregará la información y los documentos que se le pidan con veracidad.',
    '7. Confidencialidad y datos personales. Ambas partes guardarán reserva sobre la información del asunto y tratarán los datos personales conforme a la legislación aplicable.',
    '8. Comunicación. Las partes se comunicarán por el expediente del asunto en Specter.',
    '9. Terminación. Cualquiera de las partes podrá dar por terminado el servicio en los términos que acuerden por escrito.',
    '10. Jurisdicción. Pendiente de definir.',
  ].join('\n\n')
}

export type EstadoAceptacion = {
  aceptadoCliente?: string | null
  aceptadoAbogado?: string | null
}

export const aceptadoPorAmbos = (c: EstadoAceptacion) =>
  Boolean(c.aceptadoCliente && c.aceptadoAbogado)
export const aceptadoPorAlguien = (c: EstadoAceptacion) =>
  Boolean(c.aceptadoCliente || c.aceptadoAbogado)
