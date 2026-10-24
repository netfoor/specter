/** Iniciales de un nombre para el avatar: «Lic. Ana María Pérez» → «AP». */
export function iniciales(nombre: string): string {
  const palabras = nombre
    .replace(/^(lic|licda|mtro|mtra|dr|dra)\.?\s+/i, '')
    .split(/\s+/)
    .filter(Boolean)
  if (palabras.length === 0) return '?'
  const primera = palabras[0][0]
  const ultima = palabras.length > 1 ? palabras[palabras.length - 1][0] : ''
  return (primera + ultima).toUpperCase()
}

/** Tono estable por nombre, para que cada persona conserve su color. */
function tono(nombre: string): number {
  let suma = 0
  for (const letra of nombre) suma = (suma + letra.charCodeAt(0)) % 3
  return suma
}

type Props = { nombre: string; tamano?: 'normal' | 'grande'; anillo?: boolean }

/** Avatar con iniciales; decorativo, porque el nombre siempre aparece junto a él. */
export function Avatar({ nombre, tamano = 'normal', anillo = false }: Props) {
  const clases = [
    'avatar',
    `avatar--${tono(nombre)}`,
    tamano === 'grande' && 'avatar--grande',
    anillo && 'avatar--anillo',
  ]
  return (
    <span className={clases.filter(Boolean).join(' ')} aria-hidden="true">
      {iniciales(nombre)}
    </span>
  )
}
