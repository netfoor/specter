import {
  ConditionalCheckFailedException,
  type DynamoDBClient,
} from '@aws-sdk/client-dynamodb'
import { LimiteDiarioError, registrarUso } from './uso'

const cliente = (resultado: object | Error) => {
  const send = vi.fn()
  if (resultado instanceof Error) send.mockRejectedValue(resultado)
  else send.mockResolvedValue(resultado)
  return { send } as unknown as Pick<DynamoDBClient, 'send'> & {
    send: ReturnType<typeof vi.fn>
  }
}

describe('registrarUso', () => {
  it('cuenta el mensaje y devuelve cuántos quedan hoy', async () => {
    const db = cliente({ Attributes: { mensajes: { N: '3' } } })
    expect(await registrarUso(db, 'Tabla', 'sub-1', '2026-10-22', 30)).toBe(27)
  })

  it('usa una clave por persona y día, con tope condicional y vencimiento', async () => {
    const db = cliente({ Attributes: { mensajes: { N: '1' } } })
    const ahora = Date.UTC(2026, 9, 22)
    await registrarUso(db, 'Tabla', 'sub-1', '2026-10-22', 30, ahora)
    const entrada = db.send.mock.calls[0][0].input
    expect(entrada.TableName).toBe('Tabla')
    expect(entrada.Key).toEqual({ clave: { S: 'sub-1#2026-10-22' } })
    expect(entrada.ConditionExpression).toContain('mensajes < :tope')
    expect(entrada.ExpressionAttributeValues[':tope']).toEqual({ N: '30' })
    expect(Number(entrada.ExpressionAttributeValues[':expira'].N)).toBe(
      Math.floor(ahora / 1000) + 172800,
    )
  })

  it('al llegar al tope lanza el error de límite diario', async () => {
    const db = cliente(
      new ConditionalCheckFailedException({ message: 'tope', $metadata: {} }),
    )
    await expect(registrarUso(db, 'T', 's', 'd', 30)).rejects.toBeInstanceOf(
      LimiteDiarioError,
    )
  })

  it('el último mensaje permitido deja cero restantes', async () => {
    expect(
      await registrarUso(
        cliente({ Attributes: { mensajes: { N: '30' } } }),
        'T',
        's',
        'd',
        30,
      ),
    ).toBe(0)
  })

  it('propaga otros errores', async () => {
    await expect(
      registrarUso(cliente(new Error('boom')), 'T', 's', 'd', 30),
    ).rejects.toThrow('boom')
  })
})
