import { TransactionCanceledException } from '@aws-sdk/client-dynamodb'
import {
  GetCommand,
  QueryCommand,
  TransactWriteCommand,
  type DynamoDBDocumentClient,
  type TransactWriteCommandInput,
} from '@aws-sdk/lib-dynamodb'
import {
  aceptadoPorAlguien,
  calcularDesglose,
  textoDeContrato,
} from '../../../shared/domain/contrato'
import {
  ESTADOS_ACTIVOS,
  ErrorFlujo,
  MAX_SOLICITUDES_ACTIVAS,
  actorDe,
  asuntoDisponible,
  lectoresDe,
  quitarLector,
  transicion,
  validarPropuesta,
  verificarEnvio,
  type AccionSolicitud,
  type AsuntoDelFlujo,
} from '../../../shared/domain/flujo'
import { etapaDe, type EstadoSolicitud } from '../../../shared/domain/asunto'

export type Tablas = {
  asunto: string
  solicitud: string
  propuesta: string
  perfilAbogado: string
  perfilPublico: string
  contrato: string
  expediente: string
  actuacion: string
}

/** Índice secundario de Amplify Data para `Solicitud.asuntoId`. */
export const INDICE_SOLICITUDES_POR_ASUNTO = 'solicitudsByAsuntoId'

type Db = Pick<DynamoDBDocumentClient, 'send'>
type Item = Record<string, unknown>
type Transaccion = NonNullable<TransactWriteCommandInput['TransactItems']>

export type Resultado = { solicitudId: string; estado: string }

/** Nombre visible de una persona a partir de su identidad (`sub::username`). */
export type NombreDePersona = (identidad: string) => Promise<string>

/** Condición de un asunto que sigue abierto y sin contratar (la etapa vacía cuenta como sin contratar). */
const CONDICION_SIN_CONTRATAR =
  '(attribute_not_exists(etapa) OR attribute_type(etapa, :tipoNulo) OR etapa = :sinContratar)'
const CONDICION_ASUNTO_DISPONIBLE = `abierto = :verdadero AND ${CONDICION_SIN_CONTRATAR}`
const VALORES_SIN_CONTRATAR = { ':tipoNulo': 'NULL', ':sinContratar': 'SIN_CONTRATAR' }
const VALORES_ASUNTO_DISPONIBLE = { ':verdadero': true, ...VALORES_SIN_CONTRATAR }

export class Servicio {
  constructor(
    private readonly db: Db,
    private readonly tablas: Tablas,
    private readonly nombreDePersona: NombreDePersona = async () => 'Cliente',
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

  private chequeoAsuntoDisponible(asuntoId: string) {
    return {
      ConditionCheck: {
        TableName: this.tablas.asunto,
        Key: { id: asuntoId },
        ConditionExpression: CONDICION_ASUNTO_DISPONIBLE,
        ExpressionAttributeValues: VALORES_ASUNTO_DISPONIBLE,
      },
    }
  }

  private chequeoSolicitudAceptada(solicitudId: string) {
    return {
      ConditionCheck: {
        TableName: this.tablas.solicitud,
        Key: { id: solicitudId },
        ConditionExpression: 'estado = :aceptada',
        ExpressionAttributeValues: { ':aceptada': 'ACEPTADA' },
      },
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
    // Un asunto ya contratado no admite retirar ni rechazar: la relación sigue en el expediente.
    if (asunto && etapaDe(asunto.etapa) !== 'SIN_CONTRATAR')
      throw new ErrorFlujo('ASUNTO_NO_DISPONIBLE')

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
      operaciones.push(this.chequeoAsuntoDisponible(asuntoId))
    }

    // Al retirar o rechazar, el abogado deja de leer el asunto (invariante de `lectores`).
    const abogado = String(solicitud.abogadoId)
    if (cambio.liberaLector && asunto && lectoresDe(asunto).includes(abogado)) {
      operaciones.push({
        Update: {
          TableName: this.tablas.asunto,
          Key: { id: asuntoId },
          UpdateExpression: 'SET lectores = :nuevos, updatedAt = :ahora',
          ConditionExpression: `lectores = :anteriores AND ${CONDICION_SIN_CONTRATAR}`,
          ExpressionAttributeValues: {
            ':nuevos': quitarLector(lectoresDe(asunto), abogado),
            ':anteriores': (asunto.lectores ?? []) as unknown[],
            ':ahora': ahora,
            ...VALORES_SIN_CONTRATAR,
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
    const [asunto, contrato] = await Promise.all([
      this.leer(this.tablas.asunto, asuntoId) as Promise<AsuntoDelFlujo | null>,
      this.leer(this.tablas.contrato, solicitudId),
    ])
    if (!asunto || !asuntoDisponible(asunto)) throw new ErrorFlujo('ASUNTO_NO_DISPONIBLE')
    // Una vez que alguien aceptó el contrato, la propuesta queda fija.
    if (contrato && aceptadoPorAlguien(contrato))
      throw new ErrorFlujo('CONTRATO_EN_CURSO')

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
      this.chequeoAsuntoDisponible(asuntoId),
      // Un contrato preparado y sin aceptar se descarta: describía la propuesta anterior.
      contrato
        ? {
            Delete: {
              TableName: this.tablas.contrato,
              Key: { id: solicitudId },
              ConditionExpression:
                'attribute_not_exists(aceptadoCliente) AND attribute_not_exists(aceptadoAbogado)',
            },
          }
        : {
            ConditionCheck: {
              TableName: this.tablas.contrato,
              Key: { id: solicitudId },
              ConditionExpression: 'attribute_not_exists(id)',
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

  /**
   * El cliente decide seguir con la propuesta: se guarda una instantánea del contrato (texto,
   * montos y versión de la propuesta) que ambas partes aceptarán. Mientras nadie lo acepte, se
   * puede volver a preparar.
   */
  async prepararContrato(cliente: string, solicitudId: string): Promise<Resultado> {
    const solicitud = await this.leer(this.tablas.solicitud, solicitudId)
    if (!solicitud) throw new ErrorFlujo('NO_ENCONTRADO')
    const actor = actorDe(
      {
        clienteId: String(solicitud.clienteId),
        abogadoId: String(solicitud.abogadoId),
        estado: '',
      },
      cliente,
    )
    if (!actor) throw new ErrorFlujo('NO_ENCONTRADO')
    if (actor !== 'CLIENTE') throw new ErrorFlujo('NO_PERMITIDO')
    if (solicitud.estado !== 'ACEPTADA') throw new ErrorFlujo('ESTADO_INVALIDO')

    const asuntoId = String(solicitud.asuntoId)
    const [propuesta, asunto, existente, perfil] = await Promise.all([
      this.leer(this.tablas.propuesta, solicitudId),
      this.leer(this.tablas.asunto, asuntoId),
      this.leer(this.tablas.contrato, solicitudId),
      solicitud.perfilId
        ? this.leer(this.tablas.perfilAbogado, String(solicitud.perfilId))
        : null,
    ])
    if (!propuesta) throw new ErrorFlujo('SIN_PROPUESTA')
    if (!asunto || !asuntoDisponible(asunto as AsuntoDelFlujo))
      throw new ErrorFlujo('ASUNTO_NO_DISPONIBLE')
    if (existente && existente.propuestaVersion === propuesta.updatedAt) {
      return { solicitudId, estado: String(existente.estado) }
    }
    if (existente && aceptadoPorAlguien(existente))
      throw new ErrorFlujo('CONTRATO_EN_CURSO')

    const desglose = calcularDesglose(Number(propuesta.monto))
    const [nombreCliente, nombreAbogado] = await Promise.all([
      this.nombreDePersona(cliente),
      typeof perfil?.nombre === 'string'
        ? perfil.nombre
        : this.nombreDePersona(String(solicitud.abogadoId)),
    ])
    const ahora = this.ahora()
    const texto = textoDeContrato({
      fecha: new Date(ahora),
      cliente: nombreCliente,
      abogado: nombreAbogado,
      asunto: {
        titulo: String(asunto.titulo),
        materia: String(asunto.materia),
        descripcion: String(asunto.descripcion),
      },
      alcance: String(propuesta.alcance),
      formaDePago: String(propuesta.formaDePago),
      desglose,
    })

    await this.escribir([
      {
        Put: {
          TableName: this.tablas.contrato,
          Item: {
            id: solicitudId,
            __typename: 'Contrato',
            propuestaId: solicitudId,
            asuntoId,
            participantes: solicitud.participantes,
            texto,
            honorarios: desglose.honorarios,
            comision: desglose.comision,
            abogadoRecibe: desglose.abogadoRecibe,
            estado: 'PENDIENTE',
            propuestaVersion: propuesta.updatedAt,
            createdAt: ahora,
            updatedAt: ahora,
          },
          ConditionExpression:
            'attribute_not_exists(id) OR (attribute_not_exists(aceptadoCliente) AND attribute_not_exists(aceptadoAbogado))',
        },
      },
      {
        ConditionCheck: {
          TableName: this.tablas.solicitud,
          Key: { id: solicitudId },
          ConditionExpression: 'estado = :aceptada AND clienteId = :cliente',
          ExpressionAttributeValues: { ':aceptada': 'ACEPTADA', ':cliente': cliente },
        },
      },
      {
        ConditionCheck: {
          TableName: this.tablas.propuesta,
          Key: { id: solicitudId },
          ConditionExpression: 'updatedAt = :version',
          ExpressionAttributeValues: { ':version': propuesta.updatedAt },
        },
      },
      this.chequeoAsuntoDisponible(asuntoId),
    ])
    return { solicitudId, estado: 'PENDIENTE' }
  }

  /**
   * Una parte acepta el contrato. Con la segunda aceptación, en una sola transacción: el contrato
   * queda aceptado, se abre el expediente con su primera actuación, el asunto pasa a contratado,
   * solo el abogado contratado sigue leyéndolo y las demás solicitudes activas pasan a retiradas.
   * Si las dos partes aceptan a la vez, la segunda escritura falla por condición y se reintenta una vez.
   */
  async aceptarContrato(
    identidad: string,
    solicitudId: string,
    acepto: boolean,
  ): Promise<Resultado> {
    if (acepto !== true) throw new ErrorFlujo('ACEPTACION_REQUERIDA')
    try {
      return await this.intentarAceptar(identidad, solicitudId)
    } catch (error) {
      if (error instanceof ErrorFlujo && error.codigo === 'CONFLICTO') {
        return this.intentarAceptar(identidad, solicitudId)
      }
      throw error
    }
  }

  private async intentarAceptar(
    identidad: string,
    solicitudId: string,
  ): Promise<Resultado> {
    const solicitud = await this.leer(this.tablas.solicitud, solicitudId)
    if (!solicitud) throw new ErrorFlujo('NO_ENCONTRADO')
    const actor = actorDe(
      {
        clienteId: String(solicitud.clienteId),
        abogadoId: String(solicitud.abogadoId),
        estado: '',
      },
      identidad,
    )
    if (!actor) throw new ErrorFlujo('NO_ENCONTRADO')

    const contrato = await this.leer(this.tablas.contrato, solicitudId)
    if (contrato?.estado === 'ACEPTADO') return { solicitudId, estado: 'ACEPTADO' }
    if (solicitud.estado !== 'ACEPTADA') throw new ErrorFlujo('ESTADO_INVALIDO')
    if (!contrato) throw new ErrorFlujo('SIN_CONTRATO')

    const asuntoId = String(solicitud.asuntoId)
    const [propuesta, asunto] = await Promise.all([
      this.leer(this.tablas.propuesta, solicitudId),
      this.leer(this.tablas.asunto, asuntoId) as Promise<AsuntoDelFlujo | null>,
    ])
    if (!propuesta || propuesta.updatedAt !== contrato.propuestaVersion)
      throw new ErrorFlujo('CONFLICTO')
    if (!asunto || !asuntoDisponible(asunto)) throw new ErrorFlujo('ASUNTO_NO_DISPONIBLE')

    const campo = actor === 'CLIENTE' ? 'aceptadoCliente' : 'aceptadoAbogado'
    const otro = actor === 'CLIENTE' ? 'aceptadoAbogado' : 'aceptadoCliente'
    if (contrato[campo]) return { solicitudId, estado: 'PENDIENTE' }

    const ahora = this.ahora()
    const version = contrato.propuestaVersion
    const comunes: Transaccion = [
      this.chequeoSolicitudAceptada(solicitudId),
      {
        ConditionCheck: {
          TableName: this.tablas.propuesta,
          Key: { id: solicitudId },
          ConditionExpression: 'updatedAt = :version',
          ExpressionAttributeValues: { ':version': version },
        },
      },
    ]

    if (!contrato[otro]) {
      await this.escribir([
        {
          Update: {
            TableName: this.tablas.contrato,
            Key: { id: solicitudId },
            UpdateExpression: `SET ${campo} = :ahora, updatedAt = :ahora`,
            ConditionExpression: `estado = :pendiente AND attribute_not_exists(${campo}) AND attribute_not_exists(${otro}) AND propuestaVersion = :version`,
            ExpressionAttributeValues: {
              ':ahora': ahora,
              ':pendiente': 'PENDIENTE',
              ':version': version,
            },
          },
        },
        ...comunes,
        this.chequeoAsuntoDisponible(asuntoId),
      ])
      return { solicitudId, estado: 'PENDIENTE' }
    }

    // Segunda aceptación: cierre de la contratación.
    const { Items = [] } = await this.db.send(
      new QueryCommand({
        TableName: this.tablas.solicitud,
        IndexName: INDICE_SOLICITUDES_POR_ASUNTO,
        KeyConditionExpression: 'asuntoId = :asunto',
        ExpressionAttributeValues: { ':asunto': asuntoId },
      }),
    )
    const otras = (Items as Item[]).filter(
      (s) =>
        s.id !== solicitudId && ESTADOS_ACTIVOS.includes(s.estado as EstadoSolicitud),
    )
    const abogado = String(solicitud.abogadoId)
    const esperados = new Set([abogado, ...otras.map((s) => String(s.abogadoId))])
    const lectores = lectoresDe(asunto)
    // El índice es eventualmente consistente: si no cuadra con `lectores`, se reintenta.
    if (lectores.length !== esperados.size || !lectores.every((l) => esperados.has(l))) {
      throw new ErrorFlujo('CONFLICTO')
    }

    const participantes = solicitud.participantes
    const expedienteId = this.nuevoId()
    await this.escribir([
      {
        Update: {
          TableName: this.tablas.contrato,
          Key: { id: solicitudId },
          UpdateExpression: `SET ${campo} = :ahora, estado = :aceptado, updatedAt = :ahora`,
          ConditionExpression: `estado = :pendiente AND attribute_not_exists(${campo}) AND attribute_exists(${otro}) AND propuestaVersion = :version`,
          ExpressionAttributeValues: {
            ':ahora': ahora,
            ':aceptado': 'ACEPTADO',
            ':pendiente': 'PENDIENTE',
            ':version': version,
          },
        },
      },
      ...comunes,
      {
        Update: {
          TableName: this.tablas.asunto,
          Key: { id: asuntoId },
          UpdateExpression:
            'SET etapa = :contratado, lectores = :soloAbogado, updatedAt = :ahora',
          ConditionExpression: `${CONDICION_ASUNTO_DISPONIBLE} AND lectores = :anteriores`,
          ExpressionAttributeValues: {
            ':contratado': 'CONTRATADO',
            ':soloAbogado': [abogado],
            ':anteriores': (asunto.lectores ?? []) as unknown[],
            ':ahora': ahora,
            ...VALORES_ASUNTO_DISPONIBLE,
          },
        },
      },
      {
        Put: {
          TableName: this.tablas.expediente,
          Item: {
            id: expedienteId,
            __typename: 'Expediente',
            asuntoId,
            contratoId: solicitudId,
            participantes,
            estado: 'EN_GESTION',
            createdAt: ahora,
            updatedAt: ahora,
          },
          ConditionExpression: 'attribute_not_exists(id)',
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
            tipo: 'CONTRATACION',
            detalle:
              'Ambas partes aceptaron el contrato de demostración y se abrió el expediente.',
            creadoEn: ahora,
            createdAt: ahora,
            updatedAt: ahora,
          },
          ConditionExpression: 'attribute_not_exists(id)',
        },
      },
      ...otras.map((s) => ({
        Update: {
          TableName: this.tablas.solicitud,
          Key: { id: String(s.id) },
          UpdateExpression: 'SET estado = :retirada, updatedAt = :ahora',
          ConditionExpression: 'estado = :leido',
          ExpressionAttributeValues: {
            ':retirada': 'RETIRADA',
            ':leido': s.estado,
            ':ahora': ahora,
          },
        },
      })),
    ])
    return { solicitudId, estado: 'ACEPTADO' }
  }
}
