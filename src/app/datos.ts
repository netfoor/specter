import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

export const datosComoUsuario = () => generateClient<Schema>({ authMode: 'userPool' })
export const datosComoInvitado = () =>
  generateClient<Schema>({ authMode: 'identityPool' })
