import { TransactionCanceledException } from '@aws-sdk/client-dynamodb'
import {
  GetCommand,
  QueryCommand,
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
  contrato: 'TContrato',
  expediente: 'TExpediente',
  actuacion: 'TActuacion',
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
    if (comando instanceof QueryCommand) {
      const asuntoId = comando.input.ExpressionAttributeValues![':asunto']
      return {
        Items: Object.values(datos.TSolicitud ?? {}).filter(
          (x) => x.asuntoId === asuntoId,
        ),
      }
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
      async () => 'Cliente Demo',
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
      expect(lectores.Update!.ConditionExpression).toContain('lectores = :anteriores')
      expect(lectores.Update!.ConditionExpression).toContain('etapa = :sinContratar')
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
    const [chequeoSolicitud, chequeoAsunto, sinContrato, guardar] =
      transacciones[0].TransactItems!
    expect(sinContrato.ConditionCheck!.ConditionExpression).toBe(
      'attribute_not_exists(id)',
    )
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

describe('proponerHonorarios con contrato', () => {
  const propuesta = {
    monto: 12000,
    alcance: 'Revisión del contrato y negociación con el arrendador.',
    formaDePago: 'Mitad al inicio y mitad al final',
  }

  it('si alguien ya aceptó el contrato, la propuesta no cambia', async () => {
    const { servicio, transacciones } = simular(
      base({
        TSolicitud: { s1: solicitud('ACEPTADA') },
        TContrato: { s1: { id: 's1', aceptadoCliente: AHORA } },
      }),
    )
    expect(await codigo(servicio.proponerHonorarios(ABOGADO, 's1', propuesta))).toBe(
      'CONTRATO_EN_CURSO',
    )
    expect(transacciones).toHaveLength(0)
  })

  it('un contrato preparado y sin aceptar se descarta al cambiar la propuesta', async () => {
    const { servicio, transacciones } = simular(
      base({
        TSolicitud: { s1: solicitud('ACEPTADA') },
        TContrato: { s1: { id: 's1', estado: 'PENDIENTE' } },
      }),
    )
    await servicio.proponerHonorarios(ABOGADO, 's1', propuesta)
    const borrar = transacciones[0].TransactItems![2]
    expect(borrar.Delete!.TableName).toBe('TContrato')
    expect(borrar.Delete!.ConditionExpression).toContain(
      'attribute_not_exists(aceptadoCliente)',
    )
  })
})

describe('prepararContrato', () => {
  const conPropuesta = (extra: Partial<Datos> = {}) =>
    base({
      TSolicitud: { s1: { ...solicitud('ACEPTADA'), perfilId: 'p1' } },
      TPropuesta: {
        s1: {
          id: 's1',
          monto: 10000,
          alcance: 'Revisión del contrato.',
          formaDePago: 'Al terminar.',
          updatedAt: 'v1',
        },
      },
      TPerfilAbogado: { p1: { id: 'p1', owner: ABOGADO, nombre: 'Elena Rivas' } },
      TAsunto: {
        as1: asunto({
          titulo: 'Aumento de renta',
          materia: 'CIVIL',
          descripcion: 'Quiere subir la renta.',
          lectores: [ABOGADO],
        }),
      },
      ...extra,
    })

  it('guarda la instantánea con texto, desglose y versión de la propuesta', async () => {
    const { servicio, transacciones } = simular(conPropuesta())
    expect(await servicio.prepararContrato(CLIENTE, 's1')).toEqual({
      solicitudId: 's1',
      estado: 'PENDIENTE',
    })
    const [put, ...chequeos] = transacciones[0].TransactItems!
    expect(put.Put!.Item).toMatchObject({
      id: 's1',
      __typename: 'Contrato',
      asuntoId: 'as1',
      honorarios: 10000,
      comision: 1000,
      abogadoRecibe: 9000,
      estado: 'PENDIENTE',
      propuestaVersion: 'v1',
      participantes: [CLIENTE, ABOGADO],
    })
    const texto = String(put.Put!.Item!.texto)
    expect(texto).toContain('Cliente Demo')
    expect(texto).toContain('Elena Rivas')
    expect(texto).toContain('No tiene validez jurídica')
    expect(put.Put!.ConditionExpression).toContain(
      'attribute_not_exists(aceptadoCliente)',
    )
    expect(chequeos.map((c) => c.ConditionCheck!.TableName)).toEqual([
      'TSolicitud',
      'TPropuesta',
      'TAsunto',
    ])
  })

  it('solo lo prepara el cliente de la solicitud', async () => {
    const { servicio } = simular(conPropuesta())
    expect(await codigo(servicio.prepararContrato(ABOGADO, 's1'))).toBe('NO_PERMITIDO')
    expect(await codigo(servicio.prepararContrato('otra::otra', 's1'))).toBe(
      'NO_ENCONTRADO',
    )
  })

  it('exige una propuesta', async () => {
    const { servicio } = simular(conPropuesta({ TPropuesta: {} }))
    expect(await codigo(servicio.prepararContrato(CLIENTE, 's1'))).toBe('SIN_PROPUESTA')
  })

  it('si ya está preparado con la misma propuesta, no vuelve a escribir', async () => {
    const { servicio, transacciones } = simular(
      conPropuesta({
        TContrato: { s1: { id: 's1', estado: 'PENDIENTE', propuestaVersion: 'v1' } },
      }),
    )
    expect(await servicio.prepararContrato(CLIENTE, 's1')).toEqual({
      solicitudId: 's1',
      estado: 'PENDIENTE',
    })
    expect(transacciones).toHaveLength(0)
  })
})

describe('aceptarContrato', () => {
  const OTRO = 'otro::otro'
  const escenario = (contrato: Record<string, unknown>, extra: Partial<Datos> = {}) =>
    base({
      TSolicitud: {
        s1: solicitud('ACEPTADA'),
        s2: {
          id: 's2',
          asuntoId: 'as1',
          clienteId: CLIENTE,
          abogadoId: OTRO,
          estado: 'ENVIADA',
        },
        s3: {
          id: 's3',
          asuntoId: 'as1',
          clienteId: CLIENTE,
          abogadoId: 'x::x',
          estado: 'RECHAZADA',
        },
      },
      TPropuesta: { s1: { id: 's1', updatedAt: 'v1' } },
      TContrato: {
        s1: { id: 's1', estado: 'PENDIENTE', propuestaVersion: 'v1', ...contrato },
      },
      TAsunto: { as1: asunto({ lectores: [ABOGADO, OTRO] }) },
      ...extra,
    })

  it('exige confirmar que es una demostración', async () => {
    const { servicio } = simular(escenario({}))
    expect(await codigo(servicio.aceptarContrato(CLIENTE, 's1', false))).toBe(
      'ACEPTACION_REQUERIDA',
    )
  })

  it('la primera aceptación solo registra a quien acepta', async () => {
    const { servicio, transacciones } = simular(escenario({}))
    expect(await servicio.aceptarContrato(CLIENTE, 's1', true)).toEqual({
      solicitudId: 's1',
      estado: 'PENDIENTE',
    })
    const update = transacciones[0].TransactItems![0].Update!
    expect(update.UpdateExpression).toContain('aceptadoCliente = :ahora')
    expect(update.ConditionExpression).toContain('attribute_not_exists(aceptadoAbogado)')
  })

  it('la segunda aceptación cierra todo en una transacción', async () => {
    const { servicio, transacciones } = simular(escenario({ aceptadoCliente: AHORA }))
    expect(await servicio.aceptarContrato(ABOGADO, 's1', true)).toEqual({
      solicitudId: 's1',
      estado: 'ACEPTADO',
    })
    const items = transacciones[0].TransactItems!
    const contrato = items.find((i) => i.Update?.TableName === 'TContrato')!.Update!
    expect(contrato.UpdateExpression).toContain('estado = :aceptado')
    expect(contrato.ConditionExpression).toContain('attribute_exists(aceptadoCliente)')

    const asuntoActualizado = items.find(
      (i) => i.Update?.TableName === 'TAsunto',
    )!.Update!
    expect(asuntoActualizado.ExpressionAttributeValues).toMatchObject({
      ':contratado': 'CONTRATADO',
      ':soloAbogado': [ABOGADO],
      ':anteriores': [ABOGADO, OTRO],
    })

    const expediente = items.find((i) => i.Put?.TableName === 'TExpediente')!.Put!.Item!
    expect(expediente).toMatchObject({
      contratoId: 's1',
      estado: 'EN_GESTION',
      participantes: [CLIENTE, ABOGADO],
    })
    const actuacion = items.find((i) => i.Put?.TableName === 'TActuacion')!.Put!.Item!
    expect(actuacion).toMatchObject({ expedienteId: expediente.id, tipo: 'CONTRATACION' })

    const retiradas = items.filter((i) => i.Update?.TableName === 'TSolicitud')
    expect(retiradas.map((i) => i.Update!.Key)).toEqual([{ id: 's2' }])
    expect(retiradas[0].Update!.ExpressionAttributeValues).toMatchObject({
      ':retirada': 'RETIRADA',
      ':leido': 'ENVIADA',
    })
  })

  it('si los lectores no cuadran con las solicitudes activas, informa conflicto tras reintentar', async () => {
    const { servicio, send } = simular(
      escenario(
        { aceptadoCliente: AHORA },
        { TAsunto: { as1: asunto({ lectores: [ABOGADO, OTRO, 'fantasma::f'] }) } },
      ),
    )
    expect(await codigo(servicio.aceptarContrato(ABOGADO, 's1', true))).toBe('CONFLICTO')
    const consultas = send.mock.calls.filter(([c]) => c instanceof QueryCommand)
    expect(consultas).toHaveLength(2)
  })

  it('sin contrato preparado no hay nada que aceptar', async () => {
    const { servicio } = simular(escenario({}, { TContrato: {} }))
    expect(await codigo(servicio.aceptarContrato(CLIENTE, 's1', true))).toBe(
      'SIN_CONTRATO',
    )
  })

  it('un contrato ya aceptado se informa como aceptado', async () => {
    const { servicio, transacciones } = simular(escenario({ estado: 'ACEPTADO' }))
    expect(await servicio.aceptarContrato(CLIENTE, 's1', true)).toEqual({
      solicitudId: 's1',
      estado: 'ACEPTADO',
    })
    expect(transacciones).toHaveLength(0)
  })

  it('una persona ajena no lo encuentra', async () => {
    const { servicio } = simular(escenario({}))
    expect(await codigo(servicio.aceptarContrato('nadie::nadie', 's1', true))).toBe(
      'NO_ENCONTRADO',
    )
  })
})
