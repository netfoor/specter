import { useEffect, useRef, useState } from 'react'

type Resultado<T> =
  { clave: string; estado: 'listo'; datos: T } | { clave: string; estado: 'error' }

/**
 * Ejecuta `consulta` cuando cambia `clave` (null la pospone). Mientras no haya un resultado
 * para la clave actual, el estado es «cargando». Con `conservar`, una recarga sigue mostrando
 * los datos anteriores hasta que llegan los nuevos (útil al refrescar tras una acción, para que
 * la pantalla no se desmonte ni pierda mensajes).
 */
export function useConsulta<T>(
  clave: string | null,
  consulta: () => Promise<T>,
  { conservar = false }: { conservar?: boolean } = {},
) {
  const [resultado, setResultado] = useState<Resultado<T> | null>(null)
  const consultaActual = useRef(consulta)

  useEffect(() => {
    consultaActual.current = consulta
  })

  useEffect(() => {
    if (clave === null) return
    let vigente = true
    consultaActual
      .current()
      .then((datos) => vigente && setResultado({ clave, estado: 'listo', datos }))
      .catch(() => vigente && setResultado({ clave, estado: 'error' }))
    return () => {
      vigente = false
    }
  }, [clave])

  if (
    clave !== null &&
    resultado?.clave !== clave &&
    conservar &&
    resultado?.estado === 'listo'
  ) {
    return { estado: 'listo' as const, datos: resultado.datos }
  }
  if (clave === null || resultado?.clave !== clave) return { estado: 'cargando' as const }
  return resultado.estado === 'listo'
    ? { estado: 'listo' as const, datos: resultado.datos }
    : { estado: 'error' as const }
}
