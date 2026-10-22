import { Amplify, type ResourcesConfig } from 'aws-amplify'

/**
 * `amplify_outputs.json` lo genera Amplify al desplegar el backend y no se versiona.
 * Si no existe (CI, pruebas, entorno sin backend), la app funciona sin autenticación.
 */
const salidas = Object.values(
  import.meta.glob('../../amplify_outputs.json', { eager: true, import: 'default' }),
)[0] as ResourcesConfig | undefined

if (salidas) Amplify.configure(salidas)

export const backendConfigurado = Boolean(salidas)
