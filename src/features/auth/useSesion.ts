import { fetchAuthSession } from 'aws-amplify/auth'
import { Hub } from 'aws-amplify/utils'
import { useEffect, useState } from 'react'
import { rolDeGrupos, type Rol } from '../../../shared/domain/roles'
import { backendConfigurado } from '../../app/amplify'

export type Sesion =
  | { estado: 'cargando' }
  | { estado: 'anonimo' }
  | { estado: 'autenticado'; nombre: string; rol: Rol | null }

async function leerSesion(): Promise<Sesion> {
  try {
    const token = (await fetchAuthSession()).tokens?.idToken
    if (!token) return { estado: 'anonimo' }
    const nombre = typeof token.payload.name === 'string' ? token.payload.name : ''
    return {
      estado: 'autenticado',
      nombre,
      rol: rolDeGrupos(token.payload['cognito:groups']),
    }
  } catch {
    return { estado: 'anonimo' }
  }
}

export function useSesion(): Sesion {
  const [sesion, setSesion] = useState<Sesion>({
    estado: backendConfigurado ? 'cargando' : 'anonimo',
  })

  useEffect(() => {
    if (!backendConfigurado) return
    const actualizar = () => void leerSesion().then(setSesion)
    actualizar()
    return Hub.listen('auth', actualizar)
  }, [])

  return sesion
}
