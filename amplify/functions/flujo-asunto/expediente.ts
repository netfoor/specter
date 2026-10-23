import { TransactionCanceledException } from '@aws-sdk/client-dynamodb'
import {
  GetCommand,
  TransactWriteCommand,
  type DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb'
import { validarMensaje } from '../../../shared/domain/expediente'
import { ErrorFlujo } from '../../../shared/domain/flujo'
import type { Tablas } from './servicio'

type Db = Pick<DynamoDBDocumentClient, 'send'>
type Item = Record<string, unknown>

export type NuevoMensaje = {
  expedienteId: string
  participantes: string[]
  autor: string
  texto: string
  creadoEn: string
}

/**
 * Crea el mensaje a través de la API de AppSync (no directo en DynamoDB) para que se disparen
 * las suscripciones de los participantes.
 */
export type CrearMensaje = (mensaje: NuevoMensaje) => Promise<{ id: string }>

export type ResultadoExpediente = { id: string; estado: string }

export class ServicioExpediente {
  constructor(
    private readonly db: Db,
    private readonly tablas: Tablas,
    private readonly crearMensaje: CrearMensaje,
    private readonly ahora: () => string = () => new Date().toISOString(),
    private readonly nuevoId: () => string = () => crypto.randomUUID(),
  ) {}

  private async leer(tabla: string, id: string): Promise<Item | null> {
    const { Item } = await this.db.send(
      new GetCommand({ TableName: tabla, Key: { id }, ConsistentRead: true }),
    )
    return (Item as Item | undefined) ?? null
  }

  /** Solo las partes ven el expediente; para cualquier otra persona no existe. */
  private async expedienteDe(identidad: string, expedienteId: string) {
    const expediente = await this.leer(this.tablas.expediente, expedienteId)
    const participantes = (expediente?.participantes ?? []) as string[]
    if (!expediente || !participantes.includes(identidad))
      throw new ErrorFlujo('NO_ENCONTRADO')
    return { expediente, participantes }
  }

  async enviarMensaje(
    identidad: string,
    expedienteId: string,
    texto: unknown,
  ): Promise<ResultadoExpediente> {
    const validacion = validarMensaje(texto)
    if (!validacion.ok) throw new ErrorFlujo('DATOS_INVALIDOS')
    const { expediente, participantes } = await this.expedienteDe(identidad, expedienteId)
    if (expediente.estado !== 'EN_GESTION') throw new ErrorFlujo('EXPEDIENTE_CONCLUIDO')

    const { id } = await this.crearMensaje({
      expedienteId,
      participantes,
      autor: identidad,
      texto: validacion.texto,
      creadoEn: this.ahora(),
    })
    return { id, estado: 'ENVIADO' }
  }

  /** Solo el abogado concluye; el asunto pasa a concluido y queda una actuación en la bitácora. */
  async concluirExpediente(
    identidad: string,
    expedienteId: string,
  ): Promise<ResultadoExpediente> {
    const { expediente, participantes } = await this.expedienteDe(identidad, expedienteId)
    const solicitud = await this.leer(
      this.tablas.solicitud,
      String(expediente.contratoId),
    )
    if (solicitud?.abogadoId !== identidad) throw new ErrorFlujo('NO_PERMITIDO')
    if (expediente.estado !== 'EN_GESTION') throw new ErrorFlujo('EXPEDIENTE_CONCLUIDO')

    const ahora = this.ahora()
    try {
      await this.db.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Update: {
                TableName: this.tablas.expediente,
                Key: { id: expedienteId },
                UpdateExpression: 'SET estado = :concluido, updatedAt = :ahora',
                ConditionExpression: 'estado = :enGestion',
                ExpressionAttributeValues: {
                  ':concluido': 'CONCLUIDO',
                  ':enGestion': 'EN_GESTION',
                  ':ahora': ahora,
                },
              },
            },
            {
              Update: {
                TableName: this.tablas.asunto,
                Key: { id: String(expediente.asuntoId) },
                UpdateExpression: 'SET etapa = :concluido, updatedAt = :ahora',
                ConditionExpression: 'etapa = :contratado',
                ExpressionAttributeValues: {
                  ':concluido': 'CONCLUIDO',
                  ':contratado': 'CONTRATADO',
                  ':ahora': ahora,
                },
              },
            },
            {
              Put: {
                TableName: this.tablas.actuacion,
                Item: {
                  id: this.nuevoId(),
                  __typename: 'Actuacion',
                  expedienteId,
                  participantes,
                  tipo: 'CONCLUSION',
                  detalle:
                    'El abogado concluyó el expediente y el asunto quedó concluido.',
                  creadoEn: ahora,
                  createdAt: ahora,
                  updatedAt: ahora,
                },
                ConditionExpression: 'attribute_not_exists(id)',
              },
            },
          ],
        }),
      )
    } catch (error) {
      if (error instanceof TransactionCanceledException) throw new ErrorFlujo('CONFLICTO')
      throw error
    }
    return { id: expedienteId, estado: 'CONCLUIDO' }
  }
}
