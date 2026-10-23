import type { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import type { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider'
import { contarFilas, contarUsuariosEnGrupo } from './conteo'

type Cliente = Pick<DynamoDBClient, 'send'> & Pick<CognitoIdentityProviderClient, 'send'>
const simulado = (respuestas: object[]) => {
  const send = vi.fn()
  respuestas.forEach((r) => send.mockResolvedValueOnce(r))
  return { send } as unknown as Cliente & { send: ReturnType<typeof vi.fn> }
}

describe('contarFilas', () => {
  it('suma todas las páginas del escaneo', async () => {
    const db = simulado([
      { Count: 3, LastEvaluatedKey: { id: { S: 'x' } } },
      { Count: 2 },
    ])
    expect(await contarFilas(db, 'Tabla')).toBe(5)
    expect(db.send).toHaveBeenCalledTimes(2)
    expect(db.send.mock.calls[1][0].input.ExclusiveStartKey).toEqual({ id: { S: 'x' } })
  })

  it('cuenta sin leer contenido y aplica el filtro pedido', async () => {
    const db = simulado([{ Count: 1 }])
    await contarFilas(db, 'Tabla', { campo: 'estado', valor: 'CONCLUIDO' })
    const entrada = db.send.mock.calls[0][0].input
    expect(entrada.Select).toBe('COUNT')
    expect(entrada.ExpressionAttributeNames).toEqual({ '#campo': 'estado' })
    expect(entrada.ExpressionAttributeValues).toEqual({ ':valor': { S: 'CONCLUIDO' } })
  })

  it('trata una respuesta sin conteo como cero', async () => {
    expect(await contarFilas(simulado([{}]), 'Tabla')).toBe(0)
  })
})

describe('contarUsuariosEnGrupo', () => {
  it('recorre las páginas de usuarios del grupo', async () => {
    const cognito = simulado([{ Users: [{}, {}], NextToken: 'sig' }, { Users: [{}] }])
    expect(await contarUsuariosEnGrupo(cognito, 'pool', 'ABOGADO')).toBe(3)
    expect(cognito.send.mock.calls[1][0].input.NextToken).toBe('sig')
  })
})
