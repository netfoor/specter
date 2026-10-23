import { AppSyncClient, ListGraphqlApisCommand } from '@aws-sdk/client-appsync'
import { readFileSync } from 'node:fs'

export type Salidas = {
  auth: { aws_region: string; user_pool_id: string }
  data: { url: string }
  custom?: { niaUsoTabla?: string; documentosBucket?: string }
}

/** Lee `amplify_outputs.json` (o el archivo indicado en AMPLIFY_OUTPUTS) del backend de destino. */
export function leerSalidas(
  ruta = process.env.AMPLIFY_OUTPUTS ?? 'amplify_outputs.json',
): Salidas {
  return JSON.parse(readFileSync(ruta, 'utf-8'))
}

/** El id de la API (no el del endpoint) forma parte del nombre de las tablas de DynamoDB. */
export async function resolverApiId(salidas: Salidas): Promise<string> {
  const appsync = new AppSyncClient({ region: salidas.auth.aws_region })
  let siguiente: string | undefined
  do {
    const pagina = await appsync.send(
      new ListGraphqlApisCommand({ nextToken: siguiente }),
    )
    const api = pagina.graphqlApis?.find((a) => a.uris?.GRAPHQL === salidas.data.url)
    if (api?.apiId) return api.apiId
    siguiente = pagina.nextToken
  } while (siguiente)
  throw new Error('No se encontró la API de AppSync de este backend.')
}

export const nombreTabla = (modelo: string, apiId: string) => `${modelo}-${apiId}-NONE`
