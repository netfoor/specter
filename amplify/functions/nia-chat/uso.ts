import {
  ConditionalCheckFailedException,
  UpdateItemCommand,
  type DynamoDBClient,
} from '@aws-sdk/client-dynamodb'

export class LimiteDiarioError extends Error {
  constructor() {
    super('LIMITE_DIARIO')
  }
}

const DOS_DIAS_EN_SEGUNDOS = 2 * 24 * 60 * 60

/**
 * Cuenta un mensaje más de la persona en el día indicado. Es atómico: si ya llegó al tope no
 * incrementa y lanza LimiteDiarioError. Devuelve cuántos mensajes le quedan hoy.
 */
export async function registrarUso(
  db: Pick<DynamoDBClient, 'send'>,
  tabla: string,
  persona: string,
  dia: string,
  tope: number,
  ahoraMs = Date.now(),
): Promise<number> {
  try {
    const respuesta = await db.send(
      new UpdateItemCommand({
        TableName: tabla,
        Key: { clave: { S: `${persona}#${dia}` } },
        UpdateExpression: 'ADD mensajes :uno SET expira = :expira',
        ConditionExpression: 'attribute_not_exists(mensajes) OR mensajes < :tope',
        ExpressionAttributeValues: {
          ':uno': { N: '1' },
          ':tope': { N: String(tope) },
          ':expira': { N: String(Math.floor(ahoraMs / 1000) + DOS_DIAS_EN_SEGUNDOS) },
        },
        ReturnValues: 'UPDATED_NEW',
      }),
    )
    const usados = Number(respuesta.Attributes?.mensajes?.N ?? 1)
    return Math.max(0, tope - usados)
  } catch (error) {
    if (error instanceof ConditionalCheckFailedException) throw new LimiteDiarioError()
    throw error
  }
}
