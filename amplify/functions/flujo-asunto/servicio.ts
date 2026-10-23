import { TransactionCanceledException } from '@aws-sdk/client-dynamodb'
import {
  GetCommand,
  TransactWriteCommand,
  type DynamoDBDocumentClient,
  type TransactWriteCommandInput,
} from '@aws-sdk/lib-dynamodb'
import {
  ErrorFlujo,
  MAX_SOLICITUDES_ACTIVAS,
  asuntoDisponible,
  lectoresDe,
  quitarLector,
  transicion,
  validarPropuesta,
  verificarEnvio,
  type AccionSolicitud,
  type AsuntoDelFlujo,
} from '../../../shared/domain/flujo'

export type Tablas = {
  asunto: string
  solicitud: string
  propuesta: string
  perfilAbogado: string
  perfilPublico: string
}

type Db = Pick<DynamoDBDocumentClient, 'send'>
type Item = Record<string, unknown>
type Transaccion = NonNullable<TransactWriteCommandInput['TransactItems']>

export type Resultado = { solicitudId: string; estado: string }

/** Condición de un asunto que sigue abierto y sin contratar (la etapa vacía cuenta como sin contratar). */
const CONDICION_ASUNTO_DISPONIBLE =
  'abierto = :verdadero AND (attribute_not_exists(etapa) OR attribute_type(etapa, :tipoNulo) OR etapa = :sinContratar)'
const VALORES_ASUNTO_DISPONIBLE = {
  ':verdadero': true,
  ':tipoNulo': 'NULL',
  ':sinContratar': 'SIN_CONTRATAR',
}

export class Servicio {
  constructor(
    private readonly db: Db,
    private readonly tablas: Tablas,
    private readonly ahora: () => string = () => new Date().toISOString(),
    private readonly nuevoId: () => string = () => crypto.randomUUID(),
  ) {}

  private async leer(tabla: string, id: string): Promise<Item | null> {
    const { Item } = await this.db.send(
      new GetCommand({ TableName: tabla, Key: { id }, ConsistentRead: true }),
    )
    return (Item as Item | undefined) ?? null
  }

  /** Las condiciones de la transacción repiten las reglas: si algo cambió desde la lectura, falla. */
  private async escribir(operaciones: Transaccion): Promise<void> {
    try {
      await this.db.send(new TransactWriteCommand({ TransactItems: operaciones }))
    } catch (error) {
      if (error instanceof TransactionCanceledException) throw new ErrorFlujo('CONFLICTO')
      throw error
    }
  }

  async enviarSolicitud(
    cliente: string,
    asuntoId: string,
    perfilId: string,
  ): Promise<Resultado> {
    const [asunto, publico, perfil] = await Promise.all([
      this.leer(this.tablas.asunto, asuntoId),
      this.leer(this.tablas.perfilPublico, perfilId),
      this.leer(this.tablas.perfilAbogado, perfilId),
    ])
    // Solo se puede solicitar a un abogado con perfil publicado.
    const abogado = publico && typeof perfil?.owner === 'string' ? perfil.owner : null

    const codigo = verificarEnvio(asunto as AsuntoDelFlujo | null, cliente, abogado)
    if (codigo) throw new ErrorFlujo(codigo)

    const id = this.nuevoId()
    const ahora = this.ahora()
    await this.escribir([
      {
        Put: {
          TableName: this.tablas.solicitud,
          Item: {
            id,
            __typename: 'Solicitud',
            asuntoId,
            perfilId,
            clienteId: cliente,
            abogadoId: abogado,
            participantes: [cliente, abogado],
            estado: 'ENVIADA',
            createdAt: ahora,
            updatedAt: ahora,
          },
          ConditionExpression: 'attribute_not_exists(id)',
        },
      },
      {
        Update: {
          TableName: this.tablas.asunto,
          Key: { id: asuntoId },
          UpdateExpression:
            'SET lectores = list_append(if_not_exists(lectores, :vacia), :abogadoEnLista), updatedAt = :ahora',
          ConditionExpression:
            `#owner = :cliente AND ${CONDICION_ASUNTO_DISPONIBLE} ` +
            'AND NOT contains(lectores, :abogado) ' +
            'AND (attribute_not_exists(lectores) OR size(lectores) < :maximo)',
          ExpressionAttributeNames: { '#owner': 'owner' },
          ExpressionAttributeValues: {
            ':vacia': [],
            ':abogadoEnLista': [abogado],
            ':abogado': abogado,
            ':cliente': cliente,
            ':maximo': MAX_SOLICITUDES_ACTIVAS,
            ':ahora': ahora,
            ...VALORES_ASUNTO_DISPONIBLE,
          },
        },
      },
    ])
    return { solicitudId: id, estado: 'ENVIADA' }
  }

  async cambiarSolicitud(
    identidad: string,
    solicitudId: string,
    accion: AccionSolicitud,
    declaracionNoConflicto = false,
  ): Promise<Resultado> {
    const solicitud = await this.leer(this.tablas.solicitud, solicitudId)
    if (!solicitud) throw new ErrorFlujo('NO_ENCONTRADO')

    const cambio = transicion(
      {
        clienteId: String(solicitud.clienteId),
        abogadoId: String(solicitud.abogadoId),
        estado: String(solicitud.estado),
      },
      accion,
      identidad,
    )
    if (!cambio.ok) throw new ErrorFlujo(cambio.codigo)
    if (accion === 'ACEPTAR' && declaracionNoConflicto !== true) {
      throw new ErrorFlujo('DECLARACION_REQUERIDA')
    }

    const asuntoId = String(solicitud.asuntoId)
    const asunto = (await this.leer(
      this.tablas.asunto,
      asuntoId,
    )) as AsuntoDelFlujo | null
    if (accion === 'ACEPTAR' && (!asunto || !asuntoDisponible(asunto))) {
      throw new ErrorFlujo('ASUNTO_NO_DISPONIBLE')
    }

    const ahora = this.ahora()
    const campoActor = accion === 'RETIRAR' ? 'clienteId' : 'abogadoId'
    const operaciones: Transaccion = [
      {
        Update: {
          TableName: this.tablas.solicitud,
          Key: { id: solicitudId },
          UpdateExpression:
            accion === 'ACEPTAR'
              ? 'SET estado = :hacia, updatedAt = :ahora, declaracionNoConflicto = :verdadero, fechaDeclaracion = :ahora'
              : 'SET estado = :hacia, updatedAt = :ahora',
          ConditionExpression: `estado = :desde AND ${campoActor} = :identidad`,
          ExpressionAttributeValues: {
            ':hacia': cambio.hacia,
            ':desde': cambio.desde,
            ':identidad': identidad,
            ':ahora': ahora,
            ...(accion === 'ACEPTAR' && { ':verdadero': true }),
          },
        },
      },
    ]

    if (accion === 'ACEPTAR') {
      operaciones.push({
        ConditionCheck: {
          TableName: this.tablas.asunto,
          Key: { id: asuntoId },
          ConditionExpression: CONDICION_ASUNTO_DISPONIBLE,
          ExpressionAttributeValues: VALORES_ASUNTO_DISPONIBLE,
        },
      })
    }

    // Al retirar o rechazar, el abogado deja de leer el asunto (invariante de `lectores`).
    const abogado = String(solicitud.abogadoId)
    if (cambio.liberaLector && asunto && lectoresDe(asunto).includes(abogado)) {
      const anteriores = (asunto.lectores ?? []) as unknown[]
      operaciones.push({
        Update: {
          TableName: this.tablas.asunto,
          Key: { id: asuntoId },
          UpdateExpression: 'SET lectores = :nuevos, updatedAt = :ahora',
          ConditionExpression: 'lectores = :anteriores',
          ExpressionAttributeValues: {
            ':nuevos': quitarLector(lectoresDe(asunto), abogado),
            ':anteriores': anteriores,
            ':ahora': ahora,
          },
        },
      })
    }

    await this.escribir(operaciones)
    return { solicitudId, estado: cambio.hacia }
  }

  async proponerHonorarios(
    abogado: string,
    solicitudId: string,
    entrada: { monto: unknown; alcance: unknown; formaDePago: unknown },
  ): Promise<Resultado> {
    const validacion = validarPropuesta({
      monto: String(entrada.monto ?? ''),
      alcance: String(entrada.alcance ?? ''),
      formaDePago: String(entrada.formaDePago ?? ''),
    })
    if (!validacion.ok) throw new ErrorFlujo('DATOS_INVALIDOS')

    const solicitud = await this.leer(this.tablas.solicitud, solicitudId)
    if (!solicitud) throw new ErrorFlujo('NO_ENCONTRADO')
    if (solicitud.abogadoId !== abogado) {
      throw new ErrorFlujo(
        solicitud.clienteId === abogado ? 'NO_PERMITIDO' : 'NO_ENCONTRADO',
      )
    }
    if (solicitud.estado !== 'ACEPTADA') throw new ErrorFlujo('ESTADO_INVALIDO')

    const asuntoId = String(solicitud.asuntoId)
    const asunto = (await this.leer(
      this.tablas.asunto,
      asuntoId,
    )) as AsuntoDelFlujo | null
    if (!asunto || !asuntoDisponible(asunto)) throw new ErrorFlujo('ASUNTO_NO_DISPONIBLE')

    const ahora = this.ahora()
    const { monto, alcance, formaDePago } = validacion.datos
    await this.escribir([
      {
        ConditionCheck: {
          TableName: this.tablas.solicitud,
          Key: { id: solicitudId },
          ConditionExpression: 'estado = :aceptada AND abogadoId = :abogado',
          ExpressionAttributeValues: { ':aceptada': 'ACEPTADA', ':abogado': abogado },
        },
      },
      {
        ConditionCheck: {
          TableName: this.tablas.asunto,
          Key: { id: asuntoId },
          ConditionExpression: CONDICION_ASUNTO_DISPONIBLE,
          ExpressionAttributeValues: VALORES_ASUNTO_DISPONIBLE,
        },
      },
      {
        // Una propuesta por solicitud: su id es el de la solicitud y se reemplaza al actualizarla.
        Update: {
          TableName: this.tablas.propuesta,
          Key: { id: solicitudId },
          UpdateExpression:
            'SET #tipo = :tipo, solicitudId = :solicitudId, participantes = :participantes, monto = :monto, ' +
            'alcance = :alcance, formaDePago = :formaDePago, updatedAt = :ahora, createdAt = if_not_exists(createdAt, :ahora)',
          ExpressionAttributeNames: { '#tipo': '__typename' },
          ExpressionAttributeValues: {
            ':tipo': 'Propuesta',
            ':solicitudId': solicitudId,
            ':participantes': solicitud.participantes,
            ':monto': monto,
            ':alcance': alcance,
            ':formaDePago': formaDePago,
            ':ahora': ahora,
          },
        },
      },
    ])
    return { solicitudId, estado: 'ACEPTADA' }
  }
}
