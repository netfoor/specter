import { MATERIAS, MODALIDADES, type Materia, type Modalidad } from './catalogos'

/** Valores tal como los captura el formulario: todo texto. */
export type FormularioPerfil = {
  nombre: string
  materias: string[]
  especialidades: string
  ubicacion: string
  jurisdicciones: string
  idiomas: string
  aniosExperiencia: string
  modalidad: string
  honorariosDesde: string
  honorariosHasta: string
  disponibilidad: string
  semblanza: string
  cedula: string
}

export type DatosPerfil = {
  nombre: string
  materias: Materia[]
  especialidades: string[]
  ubicacion: string
  jurisdicciones: string[]
  idiomas: string[]
  aniosExperiencia: number | null
  modalidad: Modalidad
  honorariosDesde: number | null
  honorariosHasta: number | null
  disponibilidad: string | null
  semblanza: string | null
  cedula: string | null
}

export type ErroresPerfil = Partial<Record<keyof FormularioPerfil, string>>

export const MAX_SEMBLANZA = 1500

/** "a, b\nc" → ["a", "b", "c"], sin vacíos ni repetidos. */
export function listaDeTexto(texto: string): string[] {
  const elementos = texto
    .split(/[,\n]/)
    .map((e) => e.trim())
    .filter(Boolean)
  return [...new Set(elementos)]
}

function numeroOpcional(texto: string): number | null | undefined {
  const limpio = texto.trim()
  if (!limpio) return null
  const numero = Number(limpio.replace(/,/g, ''))
  return Number.isFinite(numero) ? numero : undefined
}

export function validarPerfil(
  f: FormularioPerfil,
): { ok: true; datos: DatosPerfil } | { ok: false; errores: ErroresPerfil } {
  const errores: ErroresPerfil = {}

  if (f.nombre.trim().length < 3) errores.nombre = 'Escribe tu nombre completo.'
  if (!f.ubicacion.trim()) errores.ubicacion = 'Indica la ciudad donde ejerces.'

  const materias = MATERIAS.filter((m) => f.materias.includes(m))
  if (materias.length === 0) errores.materias = 'Elige al menos una materia.'

  const modalidad = MODALIDADES.find((m) => m === f.modalidad)
  if (!modalidad) errores.modalidad = 'Elige cómo atiendes a tus clientes.'

  const anios = numeroOpcional(f.aniosExperiencia)
  if (
    anios === undefined ||
    (anios !== null && (!Number.isInteger(anios) || anios < 0 || anios > 70))
  ) {
    errores.aniosExperiencia = 'Escribe un número entero de años, entre 0 y 70.'
  }

  const desde = numeroOpcional(f.honorariosDesde)
  const hasta = numeroOpcional(f.honorariosHasta)
  if (desde === undefined || (desde !== null && desde < 0)) {
    errores.honorariosDesde = 'Escribe un monto en pesos, sin letras.'
  }
  if (hasta === undefined || (hasta !== null && hasta < 0)) {
    errores.honorariosHasta = 'Escribe un monto en pesos, sin letras.'
  }
  if (
    !errores.honorariosDesde &&
    !errores.honorariosHasta &&
    desde != null &&
    hasta != null &&
    desde > hasta
  ) {
    errores.honorariosHasta = 'El monto máximo no puede ser menor que el mínimo.'
  }

  if (f.semblanza.length > MAX_SEMBLANZA) {
    errores.semblanza = `La semblanza admite hasta ${MAX_SEMBLANZA} caracteres.`
  }
  if (f.cedula.trim().length > 20)
    errores.cedula = 'La cédula admite hasta 20 caracteres.'

  if (Object.keys(errores).length > 0 || !modalidad) return { ok: false, errores }

  return {
    ok: true,
    datos: {
      nombre: f.nombre.trim(),
      materias,
      especialidades: listaDeTexto(f.especialidades),
      ubicacion: f.ubicacion.trim(),
      jurisdicciones: listaDeTexto(f.jurisdicciones),
      idiomas: listaDeTexto(f.idiomas),
      aniosExperiencia: anios ?? null,
      modalidad,
      honorariosDesde: desde ?? null,
      honorariosHasta: hasta ?? null,
      disponibilidad: f.disponibilidad.trim() || null,
      semblanza: f.semblanza.trim() || null,
      cedula: f.cedula.trim() || null,
    },
  }
}

/** Datos del perfil completo que pueden publicarse; la cédula nunca sale de aquí. */
export type PerfilCompleto = Omit<DatosPerfil, 'cedula'> & {
  cedula?: string | null
  fotoUrl?: string | null
}

export type PerfilPublicable = Omit<PerfilCompleto, 'cedula'> & {
  verificadoManual: boolean
}

export function aPerfilPublico(
  perfil: PerfilCompleto,
  verificadoManual: boolean,
): PerfilPublicable {
  return {
    nombre: perfil.nombre,
    fotoUrl: perfil.fotoUrl ?? null,
    materias: perfil.materias,
    especialidades: perfil.especialidades,
    ubicacion: perfil.ubicacion,
    jurisdicciones: perfil.jurisdicciones,
    idiomas: perfil.idiomas,
    aniosExperiencia: perfil.aniosExperiencia,
    modalidad: perfil.modalidad,
    honorariosDesde: perfil.honorariosDesde,
    honorariosHasta: perfil.honorariosHasta,
    disponibilidad: perfil.disponibilidad,
    semblanza: perfil.semblanza,
    verificadoManual,
  }
}

export type ResumenDirectorio = {
  id: string
  nombre: string
  materias: readonly (string | null)[]
  especialidades?: readonly (string | null)[] | null
  ubicacion: string
  modalidad: string
  verificadoManual: boolean
}

export type FiltrosDirectorio = {
  materia?: Materia | ''
  modalidad?: Modalidad | ''
  texto?: string
}

const normalizar = (t: string) =>
  t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** Filtra y ordena: primero los verificados, luego por nombre. */
export function filtrarDirectorio<T extends ResumenDirectorio>(
  perfiles: readonly T[],
  f: FiltrosDirectorio,
): T[] {
  const texto = normalizar(f.texto ?? '').trim()
  return perfiles
    .filter((p) => !f.materia || p.materias.includes(f.materia))
    .filter((p) => !f.modalidad || p.modalidad === f.modalidad || p.modalidad === 'AMBAS')
    .filter((p) => {
      if (!texto) return true
      const campos = [p.nombre, p.ubicacion, ...(p.especialidades ?? [])]
      return campos.some((c) => c && normalizar(c).includes(texto))
    })
    .sort(
      (a, b) =>
        Number(b.verificadoManual) - Number(a.verificadoManual) ||
        a.nombre.localeCompare(b.nombre, 'es'),
    )
}
