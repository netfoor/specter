import { BadgeCheck } from 'lucide-react'

/** Palomita junto al nombre; el texto «Verificado manualmente por Specter» va aparte. */
export function Verificado({ tamano = 18 }: { tamano?: number }) {
  return <BadgeCheck className="verificado" size={tamano} aria-hidden="true" />
}
