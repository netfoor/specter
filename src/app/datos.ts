import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

export const datosComoUsuario = () => generateClient<Schema>({ authMode: 'userPool' })
export const datosComoInvitado = () =>
  generateClient<Schema>({ authMode: 'identityPool' })

/** AppSync responde «Unauthorized» cuando el registro existe pero no es de quien pregunta. */
export const esNoAutorizado = (errores?: readonly unknown[]) =>
  errores?.some((e) => (e as { errorType?: string }).errorType === 'Unauthorized') ??
  false
