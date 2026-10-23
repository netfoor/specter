import { ScanCommand, type DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  ListUsersInGroupCommand,
  type CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider'

export type Filtro = { campo: string; valor: string }

/** Cuenta las filas de una tabla (opcionalmente las que cumplen `campo = valor`), sin leer su contenido. */
export async function contarFilas(
  db: Pick<DynamoDBClient, 'send'>,
  tabla: string,
  filtro?: Filtro,
): Promise<number> {
  let total = 0
  let siguiente: Record<string, never> | undefined
  do {
    const respuesta = await db.send(
      new ScanCommand({
        TableName: tabla,
        Select: 'COUNT',
        ExclusiveStartKey: siguiente,
        ...(filtro && {
          FilterExpression: '#campo = :valor',
          ExpressionAttributeNames: { '#campo': filtro.campo },
          ExpressionAttributeValues: { ':valor': { S: filtro.valor } },
        }),
      }),
    )
    total += respuesta.Count ?? 0
    siguiente = respuesta.LastEvaluatedKey as Record<string, never> | undefined
  } while (siguiente)
  return total
}

export async function contarUsuariosEnGrupo(
  cognito: Pick<CognitoIdentityProviderClient, 'send'>,
  userPoolId: string,
  grupo: string,
): Promise<number> {
  let total = 0
  let token: string | undefined
  do {
    const respuesta = await cognito.send(
      new ListUsersInGroupCommand({
        UserPoolId: userPoolId,
        GroupName: grupo,
        NextToken: token,
      }),
    )
    total += respuesta.Users?.length ?? 0
    token = respuesta.NextToken
  } while (token)
  return total
}
