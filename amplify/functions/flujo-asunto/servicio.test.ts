import { TransactionCanceledException } from '@aws-sdk/client-dynamodb'
import {
  GetCommand,
  TransactWriteCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb'
import { ErrorFlujo } from '../../../shared/domain/flujo'
import { Servicio, type Tablas } from './servicio'

const tablas: Tablas = {
  asunto: 'TAsunto',
  solicitud: 'TSolicitud',
  propuesta: 'TPropuesta',
  perfilAbogado: 'TPerfilAbogado',
  perfilPublico: 'TPerfilPublico',
}
const CLIENTE = 'sub-c::sub-c'
const ABOGADO = 'sub-a::sub-a'
const AHORA = '2026-10-23T12:00:00.000Z'

type Datos = Record<string, Record<string, Record<string, unknown>>>

function simular(datos: Datos, fallaTransaccion = false) {
  const transacciones: TransactWriteCommand['input'][] = []
  const send = vi.fn(async (comando: unknown) => {
    if (comando instanceof GetCommand) {
      const { TableName, Key } = comando.input
      return { Item: datos[TableName!]?.[String(Key!.id)] }
    }
    if (comando instanceof TransactWriteCommand) {
      if (fallaTransaccion) {
        throw new TransactionCanceledException({ message: 'cancelada', $metadata: {} })
      }
      transacciones.push(comando.input)
      return {}
    }
    throw new Error('comando inesperado')
  })
  const db = { send } as unknown as Pick<DynamoDBDocumentClient, 'send'>
  return {
    servicio: new Servicio(
      db,
      tablas,
      () => AHORA,
      () => 'sol-nueva',
    ),
    transacciones,
    send,
  }
}

const asunto = (extra: object = {}) => ({
  id: 'as1',
  owner: CLIENTE,
  abierto: true,
  lectores: [],
  ...extra,
})
const base = (extra: Partial<Datos> = {}): Datos => ({
  TAsunto: { as1: asunto() },
  TPerfilPublico: { p1: { id: 'p1' } },
  TPerfilAbogado: { p1: { id: 'p1', owner: ABOGADO } },
  TSolicitud: {},
  ...extra,
})
const solicitud = (estado: string) => ({
  id: 's1',
  asuntoId: 'as1',
  clienteId: CLIENTE,
  abogadoId: ABOGADO,
  participantes: [CLIENTE, ABOGADO],
  estado,
})

async function codigo(promesa: Promise<unknown>) {
  try {
    await promesa
  } catch (error) {
    return (error as ErrorFlujo).codigo
  }
  return 'sin error'
}

describe('enviarSolicitud', () => {
  it('crea la solicitud y agrega al abogado a los lectores en una transacción condicionada', async () => {
    const { servicio, transacciones } = simular(base())
    expect(await servicio.enviarSolicitud(CLIENTE, 'as1', 'p1')).toEqual({
      solicitudId: 'sol-nueva',
      estado: 'ENVIADA',
    })

    const [put, update] = transacciones[0].TransactItems!
    expect(put.Put!.Item).toMatchObject({
      id: 'sol-nueva',
      __typename: 'Solicitud',
      asuntoId: 'as1',
      perfilId: 'p1',
      clienteId: CLIENTE,
      abogadoId: ABOGADO,
      participantes: [CLIENTE, ABOGADO],
      estado: 'ENVIADA',
    })
    const condicion = update.Update!.ConditionExpression!
    expect(condicion).toContain('#owner = :cliente')
    expect(condicion).toContain('NOT contains(lectores, :abogado)')
    expect(condicion).toContain('size(lectores) < :maximo')
    expect(update.Update!.ExpressionAttributeValues).toMatchObject({
      ':abogado': ABOGADO,
      ':maximo': 3,
      ':cliente': CLIENTE,
    })
  })

  it('no envía a un abogado sin perfil publicado', async () => {
    const { servicio, transacciones } = simular(base({ TPerfilPublico: {} }))
    expect(await codigo(servicio.enviarSolicitud(CLIENTE, 'as1', 'p1'))).toBe(
      'NO_ENCONTRADO',
    )
    expect(transacciones).toHaveLength(0)
  })

  it('no permite duplicados ni pasar el límite, y no escribe nada', async () => {
    const duplicada = simular(base({ TAsunto: { as1: asunto({ lectores: [ABOGADO] }) } }))
    expect(await codigo(duplicada.servicio.enviarSolicitud(CLIENTE, 'as1', 'p1'))).toBe(
      'SOLICITUD_DUPLICADA',
    )
    const llena = simular(
      base({ TAsunto: { as1: asunto({ lectores: ['a::a', 'b::b', 'c::c'] }) } }),
    )
    expect(await codigo(llena.servicio.enviarSolicitud(CLIENTE, 'as1', 'p1'))).toBe(
      'LIMITE_SOLICITUDES',
    )
    expect([...duplicada.transacciones, ...llena.transacciones]).toHaveLength(0)
  })

  it('un asunto ajeno se trata como inexistente', async () => {
    const { servicio } = simular(base())
    expect(await codigo(servicio.enviarSolicitud('otra::otra', 'as1', 'p1'))).toBe(
      'NO_ENCONTRADO',
    )
  })

  it('si la transacción se cancela por un cambio simultáneo, informa conflicto', async () => {
    const { servicio } = simular(base(), true)
    expect(await codigo(servicio.enviarSolicitud(CLIENTE, 'as1', 'p1'))).toBe('CONFLICTO')
  })
})

describe('cambiarSolicitud', () => {
  it('aceptar exige la declaración de no conflicto', async () => {
    const { servicio, transacciones } = simular(
      base({ TSolicitud: { s1: solicitud('ENVIADA') } }),
    )
    expect(await codigo(servicio.cambiarSolicitud(ABOGADO, 's1', 'ACEPTAR', false))).toBe(
      'DECLARACION_REQUERIDA',
    )
    expect(transacciones).toHaveLength(0)
  })

  it('aceptar registra la declaración y comprueba que el asunto siga disponible', async () => {
    const { servicio, transacciones } = simular(
      base({
        TSolicitud: { s1: solicitud('ENVIADA') },
        TAsunto: { as1: asunto({ lectores: [ABOGADO] }) },
      }),
    )
    expect(await servicio.cambiarSolicitud(ABOGADO, 's1', 'ACEPTAR', true)).toEqual({
      solicitudId: 's1',
      estado: 'ACEPTADA',
    })
    const [update, chequeo] = transacciones[0].TransactItems!
    expect(update.Update!.UpdateExpression).toContain(
      'declaracionNoConflicto = :verdadero',
    )
    expect(update.Update!.ConditionExpression).toBe(
      'estado = :desde AND abogadoId = :identidad',
    )
    expect(chequeo.ConditionCheck!.TableName).toBe('TAsunto')
    expect(transacciones[0].TransactItems).toHaveLength(2)
  })

  it('no se acepta si el asunto ya no está abierto', async () => {
    const { servicio } = simular(
      base({
        TSolicitud: { s1: solicitud('ENVIADA') },
        TAsunto: { as1: asunto({ abierto: false }) },
      }),
    )
    expect(await codigo(servicio.cambiarSolicitud(ABOGADO, 's1', 'ACEPTAR', true))).toBe(
      'ASUNTO_NO_DISPONIBLE',
    )
  })

  it.each([
    ['RECHAZAR', ABOGADO, 'ENVIADA', 'abogadoId'],
    ['RETIRAR', CLIENTE, 'ACEPTADA', 'clienteId'],
  ] as const)(
    '%s quita al abogado de los lectores con control de concurrencia',
    async (accion, quien, desde, campo) => {
      const { servicio, transacciones } = simular(
        base({
          TSolicitud: { s1: solicitud(desde) },
          TAsunto: { as1: asunto({ lectores: [ABOGADO, 'otro::otro'] }) },
        }),
      )
      await servicio.cambiarSolicitud(quien, 's1', accion)
      const [update, lectores] = transacciones[0].TransactItems!
      expect(update.Update!.ConditionExpression).toBe(
        `estado = :desde AND ${campo} = :identidad`,
      )
      expect(lectores.Update!.ExpressionAttributeValues).toMatchObject({
        ':nuevos': ['otro::otro'],
        ':anteriores': [ABOGADO, 'otro::otro'],
      })
      expect(lectores.Update!.ConditionExpression).toBe('lectores = :anteriores')
    },
  )

  it('el abogado no puede rechazar una solicitud ya aceptada', async () => {
    const { servicio } = simular(base({ TSolicitud: { s1: solicitud('ACEPTADA') } }))
    expect(await codigo(servicio.cambiarSolicitud(ABOGADO, 's1', 'RECHAZAR'))).toBe(
      'ESTADO_INVALIDO',
    )
  })

  it('una solicitud inexistente o ajena no se encuentra', async () => {
    const { servicio } = simular(base({ TSolicitud: { s1: solicitud('ENVIADA') } }))
    expect(
      await codigo(servicio.cambiarSolicitud(ABOGADO, 'nada', 'ACEPTAR', true)),
    ).toBe('NO_ENCONTRADO')
    expect(await codigo(servicio.cambiarSolicitud('otra::otra', 's1', 'RETIRAR'))).toBe(
      'NO_ENCONTRADO',
    )
  })
})

describe('proponerHonorarios', () => {
  const propuesta = {
    monto: 12000,
    alcance: 'Revisión del contrato y negociación con el arrendador.',
    formaDePago: 'Mitad al inicio y mitad al final',
  }

  it('guarda la propuesta con el id de la solicitud, solo si sigue aceptada y el asunto disponible', async () => {
    const { servicio, transacciones } = simular(
      base({ TSolicitud: { s1: solicitud('ACEPTADA') } }),
    )
    await servicio.proponerHonorarios(ABOGADO, 's1', propuesta)
    const [chequeoSolicitud, chequeoAsunto, guardar] = transacciones[0].TransactItems!
    expect(chequeoSolicitud.ConditionCheck!.ConditionExpression).toBe(
      'estado = :aceptada AND abogadoId = :abogado',
    )
    expect(chequeoAsunto.ConditionCheck!.TableName).toBe('TAsunto')
    expect(guardar.Update!.Key).toEqual({ id: 's1' })
    expect(guardar.Update!.ExpressionAttributeValues).toMatchObject({
      ':monto': 12000,
      ':participantes': [CLIENTE, ABOGADO],
    })
  })

  it('rechaza datos inválidos sin leer nada', async () => {
    const { servicio, send } = simular(
      base({ TSolicitud: { s1: solicitud('ACEPTADA') } }),
    )
    expect(
      await codigo(
        servicio.proponerHonorarios(ABOGADO, 's1', { ...propuesta, monto: -1 }),
      ),
    ).toBe('DATOS_INVALIDOS')
    expect(send).not.toHaveBeenCalled()
  })

  it('solo el abogado de una solicitud aceptada propone', async () => {
    const enviada = simular(base({ TSolicitud: { s1: solicitud('ENVIADA') } }))
    expect(
      await codigo(enviada.servicio.proponerHonorarios(ABOGADO, 's1', propuesta)),
    ).toBe('ESTADO_INVALIDO')
    const aceptada = simular(base({ TSolicitud: { s1: solicitud('ACEPTADA') } }))
    expect(
      await codigo(aceptada.servicio.proponerHonorarios(CLIENTE, 's1', propuesta)),
    ).toBe('NO_PERMITIDO')
    expect(
      await codigo(aceptada.servicio.proponerHonorarios('otra::otra', 's1', propuesta)),
    ).toBe('NO_ENCONTRADO')
  })
})
