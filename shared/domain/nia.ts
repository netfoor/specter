import { MATERIAS, type Materia } from './catalogos'
import type { FormularioAsunto } from './asunto'

export const NIA_LIMITES = {
  maxMensajes: 10,
  maxCaracteresMensaje: 1500,
  topeDiario: 30,
} as const

export type MensajeNia = { rol: 'usuario' | 'nia'; texto: string }

export type RespuestaNia = {
  respuesta: string
  materia: Materia | null
  titulo: string | null
  resumen: string | null
  datosFaltantes: string[]
  derivarAAbogado: boolean
}

export const AVISO_NIA = 'NIA no sustituye a un abogado ni presta servicios jurídicos.'

/** Texto que se entrega cuando la respuesta del modelo no pasa los filtros de seguridad. */
export const RESPUESTA_DE_RESPALDO =
  'Gracias por contarme tu situación. Lo que me describes necesita la revisión de un abogado, que puede ' +
  'analizar tus documentos y las reglas que aplican en tu caso. Puedo ayudarte a ordenar los datos ' +
  'importantes para que se los expliques con claridad.'

type ResultadoMensajes =
  { ok: true; mensajes: MensajeNia[] } | { ok: false; motivo: string }

/**
 * Valida la conversación que llega del cliente: conserva los últimos mensajes, exige que empiece y
 * termine con un mensaje de la persona y une los mensajes consecutivos del mismo autor.
 */
export function validarMensajes(entrada: unknown): ResultadoMensajes {
  const lista = typeof entrada === 'string' ? parsear(entrada) : entrada
  if (!Array.isArray(lista) || lista.length === 0)
    return { ok: false, motivo: 'Escribe un mensaje.' }

  const limpios: MensajeNia[] = []
  for (const elemento of lista.slice(-NIA_LIMITES.maxMensajes)) {
    const rol = (elemento as { rol?: unknown })?.rol
    const texto = (elemento as { texto?: unknown })?.texto
    if ((rol !== 'usuario' && rol !== 'nia') || typeof texto !== 'string') {
      return { ok: false, motivo: 'Los mensajes no tienen el formato esperado.' }
    }
    const recortado = texto.trim()
    if (!recortado) continue
    if (recortado.length > NIA_LIMITES.maxCaracteresMensaje) {
      return {
        ok: false,
        motivo: `Cada mensaje admite hasta ${NIA_LIMITES.maxCaracteresMensaje} caracteres.`,
      }
    }
    const anterior = limpios.at(-1)
    if (anterior && anterior.rol === rol) anterior.texto += `\n${recortado}`
    else limpios.push({ rol, texto: recortado })
  }

  while (limpios[0]?.rol === 'nia') limpios.shift()
  if (limpios.length === 0 || limpios.at(-1)?.rol !== 'usuario') {
    return { ok: false, motivo: 'Escribe un mensaje.' }
  }
  return { ok: true, mensajes: limpios }
}

function parsear(texto: string): unknown {
  try {
    return JSON.parse(texto)
  } catch {
    return null
  }
}

const recorte = (valor: unknown, max: number): string | null =>
  typeof valor === 'string' && valor.trim() ? valor.trim().slice(0, max) : null

/** Convierte la salida estructurada del modelo en una respuesta tipada, o null si no es válida. */
export function interpretarSalida(entrada: unknown): RespuestaNia | null {
  if (typeof entrada !== 'object' || entrada === null) return null
  const e = entrada as Record<string, unknown>
  const respuesta = recorte(e.respuesta, 1200)
  if (!respuesta) return null

  const materia = MATERIAS.find((m) => m === e.materia) ?? null
  const faltantes = Array.isArray(e.datos_faltantes)
    ? e.datos_faltantes.flatMap((d) => recorte(d, 140) ?? []).slice(0, 4)
    : []

  return {
    respuesta,
    materia,
    titulo: recorte(e.titulo, 120),
    resumen: recorte(e.resumen, 1000),
    datosFaltantes: faltantes,
    derivarAAbogado: e.derivar_a_abogado === true,
  }
}

const GARANTIAS = [
  /\bgarantiz\w*/i,
  /\bseguro que (ganas|ganar[aá]s|vas a ganar)\b/i,
  /\b(ganar[aá]s|perder[aá]s) (el|tu) (juicio|caso|asunto)\b/i,
  /\bvas a (ganar|perder)\b/i,
  /\bsin (duda|ning[uú]n riesgo)\b/i,
]

const CITAS_LEGALES = [
  /\bart[ií]culos?\.? ?\d+/i,
  /\bart\.? ?\d+/i,
  /\bfracci[oó]n [ivxlc\d]+/i,
  /\bla ley (establece|dice|dispone|obliga|marca)\b/i,
  /\b(el|la) (c[oó]digo|constituci[oó]n|ley federal)\b[^.]{0,60}\b(establece|dice|dispone|obliga|marca|prohíbe)\b/i,
]

const CIFRAS_CON_UNIDAD =
  /\b\d[\d.,]*\s*(d[ií]as|semanas|meses|a[ñn]os|%|por ciento|pesos|mxn)\b/gi

const normalizarCifra = (c: string) => c.toLowerCase().replace(/\s+/g, ' ').trim()

/**
 * Filtro de seguridad de la respuesta: rechaza garantías de resultado, citas legales concretas y
 * cifras con unidad (plazos, porcentajes, montos) que la persona no haya mencionado antes.
 * `conversacion` es el texto escrito por la persona.
 */
export function esRespuestaSegura(respuesta: string, conversacion: string): boolean {
  if (GARANTIAS.some((r) => r.test(respuesta))) return false
  if (CITAS_LEGALES.some((r) => r.test(respuesta))) return false

  const dichas = new Set(
    (conversacion.match(CIFRAS_CON_UNIDAD) ?? []).map(normalizarCifra),
  )
  const nuevas = (respuesta.match(CIFRAS_CON_UNIDAD) ?? []).map(normalizarCifra)
  return nuevas.every((c) => dichas.has(c))
}

/** Día calendario (AAAA-MM-DD) en la zona indicada; sirve para el tope diario. */
export function fechaDelDia(ahora: Date, zona = 'America/Mexico_City'): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: zona,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ahora)
}

/**
 * Prellena el formulario del asunto con lo que NIA entendió, sin pisar lo que la persona ya
 * escribió: solo llena campos vacíos.
 */
export function prellenarAsunto(
  form: FormularioAsunto,
  nia: RespuestaNia,
): FormularioAsunto {
  return {
    ...form,
    titulo: form.titulo.trim() ? form.titulo : (nia.titulo ?? ''),
    descripcion: form.descripcion.trim() ? form.descripcion : (nia.resumen ?? ''),
    materia: form.materia ? form.materia : (nia.materia ?? ''),
  }
}

export function hayAlgoQueUsar(nia: RespuestaNia): boolean {
  return Boolean(nia.titulo || nia.resumen || nia.materia)
}
