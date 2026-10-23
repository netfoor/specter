import { TransactionCanceledException } from '@aws-sdk/client-dynamodb'
import {
  GetCommand,
  TransactWriteCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb'
import { ErrorFlujo } from '../../../shared/domain/flujo'
import { ServicioExpediente } from './expediente'
import type { Tablas } from './servicio'

const tablas = {
  asunto: 'TAsunto',
  solicitud: 'TSolicitud',
  expediente: 'TExpediente',
  actuacion: 'TActuacion',
} as Tablas
const CLIENTE = 'c::c'
const ABOGADO = 'a::a'
const AHORA = '2026-10-23T12:00:00.000Z'

function simular(estado = 'EN_GESTION', falla = false) {
  const datos: Record<string, Record<string, Record<string, unknown>>> = {
    TExpediente: {
      e1: {
        id: 'e1',
        asuntoId: 'as1',
        contratoId: 's1',
        participantes: [CLIENTE, ABOGADO],
        estado,
      },
    },
    TSolicitud: { s1: { id: 's1', clienteId: CLIENTE, abogadoId: ABOGADO } },
  }
  const transacciones: TransactWriteCommand['input'][] = []
  const send = vi.fn(async (c: unknown) => {
    if (c instanceof GetCommand)
      return { Item: datos[c.input.TableName!]?.[String(c.input.Key!.id)] }
    if (c instanceof TransactWriteCommand) {
      if (falla) throw new TransactionCanceledException({ message: 'x', $metadata: {} })
      transacciones.push(c.input)
      return {}
    }
    throw new Error('inesperado')
  })
  const crear = vi.fn(async () => ({ id: 'm1' }))
  const servicio = new ServicioExpediente(
    { send } as unknown as Pick<DynamoDBDocumentClient, 'send'>,
    tablas,
    crear,
    () => AHORA,
    () => 'act-1',
  )
  return { servicio, crear, transacciones }
}

async function codigo(p: Promise<unknown>) {
  try {
    await p
  } catch (e) {
    return (e as ErrorFlujo).codigo
  }
  return 'sin error'
}

describe('enviarMensaje', () => {
  it('crea el mensaje por la API con los participantes del expediente y su autor', async () => {
    const { servicio, crear } = simular()
    expect(await servicio.enviarMensaje(CLIENTE, 'e1', '  Hola  ')).toEqual({
      id: 'm1',
      estado: 'ENVIADO',
    })
    expect(crear).toHaveBeenCalledWith({
      expedienteId: 'e1',
      participantes: [CLIENTE, ABOGADO],
      autor: CLIENTE,
      texto: 'Hola',
      creadoEn: AHORA,
    })
  })

  it('una persona ajena no encuentra el expediente y no se crea nada', async () => {
    const { servicio, crear } = simular()
    expect(await codigo(servicio.enviarMensaje('otra::otra', 'e1', 'Hola'))).toBe(
      'NO_ENCONTRADO',
    )
    expect(await codigo(servicio.enviarMensaje(CLIENTE, 'nada', 'Hola'))).toBe(
      'NO_ENCONTRADO',
    )
    expect(crear).not.toHaveBeenCalled()
  })

  it('rechaza mensajes vacíos y no admite mensajes en un expediente concluido', async () => {
    expect(await codigo(simular().servicio.enviarMensaje(CLIENTE, 'e1', '  '))).toBe(
      'DATOS_INVALIDOS',
    )
    expect(
      await codigo(simular('CONCLUIDO').servicio.enviarMensaje(CLIENTE, 'e1', 'Hola')),
    ).toBe('EXPEDIENTE_CONCLUIDO')
  })
})

describe('concluirExpediente', () => {
  it('solo el abogado lo concluye: expediente, asunto y bitácora en una transacción', async () => {
    const { servicio, transacciones } = simular()
    expect(await servicio.concluirExpediente(ABOGADO, 'e1')).toEqual({
      id: 'e1',
      estado: 'CONCLUIDO',
    })
    const [expediente, asunto, actuacion] = transacciones[0].TransactItems!
    expect(expediente.Update!.ConditionExpression).toBe('estado = :enGestion')
    expect(asunto.Update!.ExpressionAttributeValues).toMatchObject({
      ':concluido': 'CONCLUIDO',
      ':contratado': 'CONTRATADO',
    })
    expect(actuacion.Put!.Item).toMatchObject({
      tipo: 'CONCLUSION',
      expedienteId: 'e1',
      participantes: [CLIENTE, ABOGADO],
    })
  })

  it('el cliente no puede concluir y una persona ajena no lo encuentra', async () => {
    expect(await codigo(simular().servicio.concluirExpediente(CLIENTE, 'e1'))).toBe(
      'NO_PERMITIDO',
    )
    expect(await codigo(simular().servicio.concluirExpediente('otra::otra', 'e1'))).toBe(
      'NO_ENCONTRADO',
    )
  })

  it('no se concluye dos veces y un cambio simultáneo se informa como conflicto', async () => {
    expect(
      await codigo(simular('CONCLUIDO').servicio.concluirExpediente(ABOGADO, 'e1')),
    ).toBe('EXPEDIENTE_CONCLUIDO')
    expect(
      await codigo(
        simular('EN_GESTION', true).servicio.concluirExpediente(ABOGADO, 'e1'),
      ),
    ).toBe('CONFLICTO')
  })
})
